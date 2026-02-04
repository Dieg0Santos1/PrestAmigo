# 🎯 Plan de Acción - Resolver Problemas

## 📋 Problemas Identificados

1. ✅ **Error "Database error saving new user"**
2. ✅ **Préstamos no se vinculan correctamente**
3. ✅ **Deudas aparecen incorrectamente** (Ana Torres)
4. ✅ **Usuarios no se eliminan completamente**
5. ✅ **Números de teléfono duplicados**

## 🚀 Solución en 3 Pasos

### Paso 1: Aplicar Scripts SQL (OBLIGATORIO)

#### A. cleanup_profiles_table.sql (PRIMERO)
**Qué hace:**
- ✅ Verifica si existe tabla "profiles" (inglés)
- ✅ Elimina "profiles" si está vacía
- ✅ Limpia usuarios zombies
- ✅ Muestra resumen completo del estado

**Cómo aplicar:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `database/cleanup_profiles_table.sql`
3. Click en **Run**
4. Lee los mensajes de salida - te dirán qué se hizo

#### B. fix_registration_trigger.sql
**Qué hace:**
- ✅ Corrige el trigger de creación de perfiles
- ✅ Mejora la vinculación de préstamos
- ✅ Normaliza números en comparaciones

**Cómo aplicar:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `database/fix_registration_trigger.sql`
3. Click en **Run**

#### C. fix_all_issues.sql (OBLIGATORIO)
**Qué hace:**
- ✅ Añade constraint único para teléfonos (previene duplicados)
- ✅ Limpia datos huérfanos/corruptos
- ✅ Crea función de eliminación de usuarios
- ✅ Mejora trigger con logging
- ✅ Crea funciones de debugging

**Cómo aplicar:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `database/fix_all_issues.sql`
3. Click en **Run**

#### D. migrate_normalize_phones.sql (RECOMENDADO)
**Qué hace:**
- ✅ Normaliza números existentes
- ✅ Crea índices de rendimiento

**Cómo aplicar:**
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido completo de `database/migrate_normalize_phones.sql`
3. Click en **Run**

---

### Paso 2: Limpiar Base de Datos

Después de aplicar los scripts, **LIMPIA los datos corruptos**.

#### Opción A: Limpiar usuarios duplicados/corruptos

```sql
-- 1. Ver usuarios con problemas
SELECT u.id, u.email, u.created_at
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- 2. Eliminar usuarios sin perfil (zombies)
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id FROM auth.users u
  LEFT JOIN perfiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL
);

-- 3. Ver si hay teléfonos duplicados
SELECT * FROM check_phone_conflicts();

-- 4. Eliminar usuarios duplicados (uno por uno)
SELECT delete_user_completely('usuario@email.com');
```

#### Opción B: Reset completo (SOLO para desarrollo)

```sql
-- ⚠️ ESTO ELIMINA TODO - Solo usar en desarrollo

-- 1. Eliminar todos los préstamos
TRUNCATE prestamos CASCADE;

-- 2. Eliminar todos los perfiles
TRUNCATE perfiles CASCADE;

-- 3. Eliminar logs
TRUNCATE loan_linking_log;

-- 4. Eliminar usuarios de auth
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    DELETE FROM auth.users WHERE id = user_record.id;
  END LOOP;
END $$;

-- 5. Verificar que está vacío
SELECT 'prestamos' as tabla, COUNT(*) FROM prestamos
UNION ALL SELECT 'perfiles', COUNT(*) FROM perfiles
UNION ALL SELECT 'auth.users', COUNT(*) FROM auth.users;
-- Todo debe mostrar 0
```

---

### Paso 3: Verificar y Probar

#### A. Verificación de Base de Datos

```sql
-- Esta consulta debe retornar todo en 0
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

**Resultado esperado:** Todos los contadores deben ser `0`

#### B. Test de Registro

1. **Registra un nuevo usuario** con:
   - Nombre: Test User
   - Teléfono: +51999888777
   - Email: test@example.com

2. **Verifica en la BD:**
   ```sql
   -- Debe mostrar el usuario con su perfil
   SELECT u.email, p.nombre, p.telefono
   FROM auth.users u
   JOIN perfiles p ON p.user_id = u.id
   WHERE u.email = 'test@example.com';
   ```

3. **Intenta registrar otro usuario con el MISMO teléfono**
   - Debe mostrar error: "Este número de teléfono ya está registrado"

#### C. Test de Vinculación de Préstamos

1. **Usuario A (prestamista):**
   - Registrar: prestamista@test.com
   - Teléfono: +51999111222

2. **Crear préstamo desde Usuario A:**
   - Deudor: Juan Pérez
   - Teléfono deudor: +51999333444
   - Monto: 1000
   - Cuotas: 12

3. **Verificar préstamo creado:**
   ```sql
   SELECT id, deudor_nombre, deudor_telefono, deudor_id
   FROM prestamos
   WHERE deudor_telefono = '+51999333444';
   -- deudor_id debe ser NULL
   ```

4. **Usuario B (deudor) se registra:**
   - Registrar: deudor@test.com
   - Teléfono: +51999333444

5. **Verificar vinculación automática:**
   ```sql
   -- Ver log de vinculación
   SELECT user_email, user_phone, loans_linked
   FROM loan_linking_log
   WHERE user_email = 'deudor@test.com';
   -- loans_linked debe ser 1
   
   -- Ver préstamo vinculado
   SELECT id, deudor_nombre, deudor_id
   FROM prestamos
   WHERE deudor_telefono = '+51999333444';
   -- deudor_id ya NO debe ser NULL
   ```

6. **Usuario B inicia sesión en la app**
   - Ir a "Mis Deudas"
   - Debe aparecer el préstamo de Juan Pérez con monto 1000

#### D. Test de Eliminación

```sql
-- Eliminar usuario de prueba
SELECT delete_user_completely('test@example.com');

-- Verificar que se eliminó todo
SELECT COUNT(*) FROM auth.users WHERE email = 'test@example.com';
-- Debe ser 0

SELECT COUNT(*) FROM perfiles WHERE user_id NOT IN (SELECT id FROM auth.users);
-- Debe ser 0
```

---

## 🔍 Debugging si Algo Falla

### Problema: "Ana Torres" aparece para otro usuario

**Diagnóstico:**
```sql
-- 1. Ver todos los préstamos
SELECT id, deudor_nombre, deudor_apellido, deudor_id, prestamista_id
FROM prestamos
WHERE deudor_nombre ILIKE '%ana%';

-- 2. Ver quién es el deudor vinculado
SELECT 
  pr.deudor_nombre,
  u.email as deudor_email,
  p.telefono as deudor_telefono
FROM prestamos pr
LEFT JOIN auth.users u ON u.id = pr.deudor_id
LEFT JOIN perfiles p ON p.user_id = pr.deudor_id
WHERE pr.deudor_nombre ILIKE '%ana%';
```

**Solución:**
```sql
-- Desvincular el préstamo incorrecto
UPDATE prestamos
SET deudor_id = NULL
WHERE id = '{id_del_prestamo_de_ana}';

-- Volver a vincular al usuario correcto
UPDATE prestamos
SET deudor_id = '{id_usuario_correcto}'
WHERE id = '{id_del_prestamo_de_ana}';
```

### Problema: "Email ya registrado" pero no aparece

**Diagnóstico:**
```sql
-- Ver usuarios zombies
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;
```

**Solución:**
```sql
-- Eliminar el usuario zombie
SELECT delete_user_completely('email@problema.com');
```

### Problema: Números duplicados

**Diagnóstico:**
```sql
SELECT * FROM check_phone_conflicts();
```

**Solución:**
```sql
-- Eliminar el usuario más reciente (o el que elijas)
SELECT delete_user_completely('usuario_duplicado@email.com');
```

---

## 📊 Checklist de Verificación

### Scripts SQL
- [ ] Ejecuté `cleanup_profiles_table.sql` (PRIMERO)
- [ ] Ejecuté `fix_registration_trigger.sql`
- [ ] Ejecuté `fix_all_issues.sql`
- [ ] Ejecuté `migrate_normalize_phones.sql`

### Limpieza
- [ ] Eliminé usuarios sin perfil (zombies)
- [ ] Verifiqué que no hay teléfonos duplicados
- [ ] Verifiqué que no hay perfiles huérfanos
- [ ] Todos los contadores de verificación están en 0

### Tests
- [ ] ✅ Registro de nuevo usuario funciona
- [ ] ✅ No permite teléfonos duplicados
- [ ] ✅ Préstamo se crea correctamente
- [ ] ✅ Deudor ve su préstamo al registrarse
- [ ] ✅ Eliminación de usuario funciona
- [ ] ✅ No hay error "Database error saving new user"

---

## 🎓 Conceptos Clave

### ¿Por qué normalizar números?
Porque `+51 999 999 999` ≠ `+51999999999` para una computadora, pero SÍ son el mismo número para nosotros. La normalización los convierte al mismo formato.

### ¿Qué es un usuario zombie?
Un registro en `auth.users` que NO tiene perfil en `perfiles`. Ocurre cuando el trigger falla o cuando se eliminan perfiles manualmente sin eliminar el auth user.

### ¿Por qué unique constraint?
Previene que dos usuarios se registren con el mismo teléfono. Como los préstamos se vinculan por teléfono, esto es crítico para evitar confusiones.

### ¿Qué hace el trigger?
Cuando un usuario se registra, el trigger automáticamente:
1. Crea su perfil en `perfiles`
2. Busca préstamos con su teléfono
3. Los vincula a su cuenta

---

## 📞 Soporte

Si después de seguir este plan sigues teniendo problemas:

1. Ejecuta las consultas de diagnóstico del archivo `DEBUG_GUIDE.md`
2. Copia los resultados
3. Revisa los logs en Supabase: **Database** → **Logs**
4. Verifica que los 3 scripts SQL se ejecutaron sin errores

## 🎯 Resultado Final Esperado

Después de seguir este plan:

✅ Usuarios se registran sin errores
✅ Cada teléfono está asociado a una sola cuenta
✅ Préstamos se vinculan automáticamente al deudor correcto
✅ Deudores ven solo SUS préstamos
✅ Usuarios se pueden eliminar completamente
✅ No hay datos huérfanos ni corruptos
✅ La app funciona sin errores

## 📁 Archivos de Referencia

- **Scripts SQL:** `database/`
  - `fix_registration_trigger.sql` - Corrige triggers
  - `fix_all_issues.sql` - Solución completa
  - `migrate_normalize_phones.sql` - Normalización
  
- **Documentación:**
  - `DEBUG_GUIDE.md` - Guía de debugging detallada
  - `APPLY_FIXES.md` - Instrucciones de aplicación
  - `CAMBIOS_REALIZADOS.md` - Resumen de cambios

- **Código:**
  - `src/components/PhoneInput.tsx` - Selector de país
  - `src/utils/phoneUtils.ts` - Utilidades de teléfono
  - `src/services/authService.ts` - Validación de duplicados
  - `src/services/prestamosService.ts` - Búsqueda normalizada
