# Guía de Debugging - Problemas de Vinculación de Préstamos

## 🔍 Problema Reportado

> "Cuando el deudor ingresa a su cuenta, no le aparece esa deuda, le aparece otra de una tal 'Ana Torres'"

Este documento te ayudará a diagnosticar y resolver el problema.

## 📋 Pasos de Diagnóstico

### 1. Verificar el Estado Actual de la Base de Datos

Ejecuta estas consultas en **Supabase SQL Editor**:

#### A. Ver todos los préstamos
```sql
SELECT 
  id,
  prestamista_id,
  deudor_id,
  deudor_nombre,
  deudor_apellido,
  deudor_telefono,
  deudor_email,
  monto_total
FROM prestamos
ORDER BY created_at DESC;
```

**Qué verificar:**
- ¿El `deudor_id` está vacío (NULL) o tiene un UUID?
- ¿El `deudor_telefono` está en formato correcto? (ej: `+51999999999`)

#### B. Ver todos los usuarios y sus teléfonos
```sql
SELECT 
  u.id as user_id,
  u.email,
  p.nombre,
  p.apellido,
  p.telefono,
  p.created_at
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
ORDER BY p.created_at DESC;
```

**Qué verificar:**
- ¿Los teléfonos están normalizados? (ej: `+51999999999` sin espacios)
- ¿Hay usuarios duplicados con el mismo teléfono?

#### C. Ver qué préstamos están vinculados a cada usuario
```sql
SELECT 
  u.email as usuario,
  p.nombre || ' ' || p.apellido as nombre_completo,
  p.telefono,
  COUNT(pr.id) as prestamos_como_deudor
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
LEFT JOIN prestamos pr ON pr.deudor_id = u.id
GROUP BY u.id, u.email, p.nombre, p.apellido, p.telefono
ORDER BY prestamos_como_deudor DESC;
```

#### D. Ver historial de vinculaciones
```sql
SELECT 
  user_email,
  user_phone,
  loans_linked,
  created_at
FROM loan_linking_log
ORDER BY created_at DESC
LIMIT 10;
```

**Nota:** Esta tabla solo existe si ejecutaste `fix_all_issues.sql`

### 2. Diagnosticar Problema Específico

#### Caso: "Deudor ve préstamo de otra persona (Ana Torres)"

**Paso 1:** Encuentra el préstamo de Ana Torres
```sql
SELECT 
  id,
  prestamista_id,
  deudor_id,
  deudor_nombre,
  deudor_apellido,
  deudor_telefono
FROM prestamos
WHERE deudor_nombre ILIKE '%ana%' AND deudor_apellido ILIKE '%torres%';
```

**Paso 2:** Verifica quién es el deudor vinculado
```sql
-- Reemplaza {prestamo_id} con el ID del préstamo de Ana Torres
SELECT 
  pr.id as prestamo_id,
  pr.deudor_nombre,
  pr.deudor_apellido,
  pr.deudor_telefono,
  u.email as deudor_email_registrado,
  p.telefono as telefono_registrado
FROM prestamos pr
LEFT JOIN auth.users u ON u.id = pr.deudor_id
LEFT JOIN perfiles p ON p.user_id = pr.deudor_id
WHERE pr.id = '{prestamo_id}';
```

**Paso 3:** Verifica si hay conflicto de teléfonos
```sql
-- Encuentra todos los usuarios con el mismo teléfono de Ana Torres
SELECT 
  u.email,
  p.nombre,
  p.apellido,
  p.telefono,
  p.user_id
FROM perfiles p
JOIN auth.users u ON u.id = p.user_id
WHERE regexp_replace(p.telefono, '[^0-9+]', '', 'g') = 
      regexp_replace('{telefono_ana_torres}', '[^0-9+]', '', 'g');
```

### 3. Verificar Números de Teléfono Duplicados

```sql
-- Esta consulta debe retornar 0 filas después del fix
SELECT * FROM check_phone_conflicts();
```

Si encuentra duplicados:
```sql
-- Ver detalles de los duplicados
SELECT 
  p.telefono,
  u.email,
  p.nombre,
  p.apellido,
  p.created_at
FROM perfiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.telefono IN (
  SELECT telefono 
  FROM perfiles 
  WHERE telefono IS NOT NULL 
  GROUP BY telefono 
  HAVING COUNT(*) > 1
)
ORDER BY p.telefono, p.created_at;
```

### 4. Limpiar Estado Corrupto

#### Si encuentras usuarios duplicados con el mismo teléfono:

```sql
-- OPCIÓN 1: Eliminar usuarios de prueba manualmente
SELECT delete_user_completely('correo@ejemplo.com');

-- OPCIÓN 2: Eliminar TODOS los usuarios (CUIDADO - solo para desarrollo)
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT email FROM auth.users LOOP
    PERFORM delete_user_completely(user_record.email);
    RAISE NOTICE 'Deleted: %', user_record.email;
  END LOOP;
END $$;
```

#### Si hay préstamos con vinculación incorrecta:

```sql
-- Desvincular todos los préstamos (esto los marca como sin usuario)
UPDATE prestamos
SET deudor_id = NULL
WHERE deudor_id IS NOT NULL;

-- Luego, volver a vincularlos manualmente
-- Reemplaza {user_id} y {telefono} con los valores correctos
UPDATE prestamos
SET deudor_id = '{user_id}'
WHERE regexp_replace(deudor_telefono, '[^0-9+]', '', 'g') = 
      regexp_replace('{telefono}', '[^0-9+]', '', 'g')
  AND deudor_id IS NULL;
```

### 5. Probar Escenario Completo

#### Test Case: Crear préstamo y verificar vinculación

```sql
-- 1. Ver estado inicial
SELECT email, (SELECT COUNT(*) FROM prestamos WHERE deudor_id = u.id) as deudas
FROM auth.users u;

-- 2. Crear préstamo de prueba (hazlo desde la app)
-- Anota el teléfono usado: _________________

-- 3. Ver si el préstamo se creó
SELECT id, deudor_nombre, deudor_telefono, deudor_id
FROM prestamos
WHERE deudor_telefono = '{telefono_anotado}'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Registrar usuario con ese teléfono (hazlo desde la app)

-- 5. Verificar vinculación automática
SELECT 
  u.email,
  p.telefono,
  pr.id as prestamo_id,
  pr.deudor_nombre,
  pr.deudor_apellido
FROM auth.users u
JOIN perfiles p ON p.user_id = u.id
LEFT JOIN prestamos pr ON pr.deudor_id = u.id
WHERE p.telefono = '{telefono_anotado}';

-- 6. Ver log de vinculación
SELECT * FROM loan_linking_log
WHERE user_phone = '{telefono_normalizado}'
ORDER BY created_at DESC
LIMIT 1;
```

## 🔧 Soluciones Comunes

### Problema 1: Números no normalizados

**Síntoma:** Préstamo con `999 999 999` no se vincula con usuario que tiene `+51999999999`

**Solución:**
```sql
-- Ejecutar normalización
UPDATE perfiles
SET telefono = regexp_replace(telefono, '[^0-9+]', '', 'g')
WHERE telefono IS NOT NULL;

UPDATE prestamos
SET deudor_telefono = regexp_replace(deudor_telefono, '[^0-9+]', '', 'g')
WHERE deudor_telefono IS NOT NULL;
```

### Problema 2: Usuarios zombies en auth.users

**Síntoma:** Email dice "ya está registrado" pero no aparece en perfiles

**Solución:**
```sql
-- Ver usuarios sin perfil
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Eliminar usuarios sin perfil
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id FROM auth.users u
  LEFT JOIN perfiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL
);
```

### Problema 3: Teléfonos duplicados

**Síntoma:** Dos usuarios tienen el mismo teléfono

**Solución:**
```sql
-- Ejecutar fix_all_issues.sql (elimina duplicados automáticamente)
-- O manualmente:
SELECT delete_user_completely('usuario_duplicado@email.com');
```

## 📊 Consultas de Verificación Final

Después de aplicar las correcciones, ejecuta esto:

```sql
-- ✅ Todo debe mostrar 0
SELECT 'Perfiles huérfanos' as check_name, COUNT(*) as count
FROM perfiles WHERE user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'Préstamos inválidos', COUNT(*)
FROM prestamos WHERE prestamista_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 'Teléfonos duplicados', COUNT(*)
FROM (
  SELECT telefono FROM perfiles 
  WHERE telefono IS NOT NULL 
  GROUP BY telefono HAVING COUNT(*) > 1
) dup
UNION ALL
SELECT 'Usuarios sin perfil', COUNT(*)
FROM auth.users u LEFT JOIN perfiles p ON p.user_id = u.id 
WHERE p.user_id IS NULL;
```

## 🚀 Reset Completo (Solo Desarrollo)

Si quieres empezar de cero:

```sql
-- ⚠️ CUIDADO: Esto elimina TODO
TRUNCATE prestamos CASCADE;
TRUNCATE perfiles CASCADE;
TRUNCATE loan_linking_log;

-- Eliminar usuarios de auth
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
END $$;

-- Verificar que todo está vacío
SELECT 'prestamos' as tabla, COUNT(*) FROM prestamos
UNION ALL SELECT 'perfiles', COUNT(*) FROM perfiles
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users;
```

## 📝 Checklist de Debugging

- [ ] Ejecuté `fix_all_issues.sql`
- [ ] Verifiqué que no hay teléfonos duplicados
- [ ] Verifiqué que los números están normalizados
- [ ] Verifiqué que no hay usuarios huérfanos
- [ ] Probé crear préstamo y registrar usuario
- [ ] Verifiqué que el préstamo se vincula correctamente
- [ ] Revisé los logs de vinculación

## 📞 Necesitas Más Ayuda?

Si después de seguir esta guía el problema persiste:

1. Ejecuta las consultas de diagnóstico (sección 1)
2. Copia los resultados
3. Busca patrones anormales (IDs que no coinciden, teléfonos diferentes, etc.)
4. Comparte los resultados para análisis más profundo
