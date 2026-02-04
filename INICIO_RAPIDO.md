# 🚀 Inicio Rápido - Corregir Todos los Problemas

## ⚡ Guía Rápida (5 Pasos)

### 📋 Problemas que vas a resolver:
1. ❌ Error "Database error saving new user"
2. ❌ Préstamos no se vinculan
3. ❌ Deudas incorrectas (Ana Torres)
4. ❌ Email "ya registrado" pero no existe
5. ❌ Números de teléfono duplicados
6. ❌ Tabla "profiles" vs "perfiles" confusión

---

## 🎯 Paso 1: Ejecutar Scripts SQL

Ve a **Supabase Dashboard** → **SQL Editor** y ejecuta estos 4 scripts **EN ORDEN**:

### Script 1: cleanup_profiles_table.sql ⭐
```
database/cleanup_profiles_table.sql
```
**Qué hace:**
- Verifica tabla "profiles" (inglés) vs "perfiles" (español)
- Elimina "profiles" si está vacía
- Muestra usuarios zombies
- Da reporte completo del estado

**Resultado esperado:**
```
✅ Tabla "perfiles" EXISTE - X registros
✅ Tabla "profiles" NO EXISTE (correcto)
✅ No hay usuarios zombies
```

---

### Script 2: fix_registration_trigger.sql
```
database/fix_registration_trigger.sql
```
**Qué hace:**
- Corrige trigger de creación de perfiles
- Mejora vinculación de préstamos

---

### Script 3: fix_all_issues.sql ⭐⭐⭐
```
database/fix_all_issues.sql
```
**Qué hace:**
- Constraint único para teléfonos
- Función de eliminación de usuarios
- Logging de vinculaciones
- Limpieza de datos corruptos

**Resultado esperado:**
```
✅ Unique phone constraint added
✅ User deletion function created
✅ Loan linking improved with logging
✅ Orphaned data cleaned up
```

---

### Script 4: migrate_normalize_phones.sql
```
database/migrate_normalize_phones.sql
```
**Qué hace:**
- Normaliza números existentes
- Formato: +51999999999 (sin espacios)

---

## 🎯 Paso 2: Limpiar (OPCIONAL pero recomendado)

Si quieres empezar limpio, ejecuta:

```sql
-- ⚠️ ESTO ELIMINA TODO - Solo en desarrollo

-- 1. Eliminar préstamos
TRUNCATE prestamos CASCADE;

-- 2. Eliminar perfiles
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

## 🎯 Paso 3: Verificar

Ejecuta esta consulta para verificar que todo está bien:

```sql
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

**Resultado esperado:** Todos los contadores en **0**

---

## 🎯 Paso 4: Probar la App

### Test 1: Registro
1. Abre la app
2. Registra un usuario nuevo:
   - Nombre: Test
   - Teléfono: +51999888777
   - Email: test@ejemplo.com
3. ✅ **No debe** mostrar error "Database error"
4. ✅ Debe registrarse correctamente

### Test 2: Teléfono Único
1. Intenta registrar otro usuario con el **mismo teléfono**
2. ✅ Debe rechazar con: "Este número de teléfono ya está registrado"

### Test 3: Vinculación de Préstamos
1. **Usuario A (prestamista):**
   - Registrar: prestamista@test.com
   - Teléfono: +51999111222

2. **Crear préstamo:**
   - Deudor: Juan Pérez
   - Teléfono: +51999333444
   - Monto: 1000

3. **Usuario B (deudor) se registra:**
   - Registrar: deudor@test.com
   - Teléfono: +51999333444

4. **Iniciar sesión como Usuario B**
5. **Ir a "Mis Deudas"**
6. ✅ Debe aparecer el préstamo de Juan Pérez

---

## 🎯 Paso 5: Consultas Útiles

### Ver todos los usuarios
```sql
SELECT 
  u.email,
  p.nombre,
  p.apellido,
  p.telefono,
  (SELECT COUNT(*) FROM prestamos WHERE deudor_id = u.id) as deudas
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id;
```

### Ver log de vinculaciones
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

### Eliminar un usuario completamente
```sql
SELECT delete_user_completely('usuario@email.com');
```

### Verificar si un teléfono está registrado
```sql
SELECT is_phone_registered('+51999888777');
```

---

## ✅ Checklist Rápido

- [ ] ✅ Script 1: cleanup_profiles_table.sql
- [ ] ✅ Script 2: fix_registration_trigger.sql
- [ ] ✅ Script 3: fix_all_issues.sql
- [ ] ✅ Script 4: migrate_normalize_phones.sql
- [ ] ✅ Verificación: todos los contadores en 0
- [ ] ✅ Test: registro sin errores
- [ ] ✅ Test: no permite teléfonos duplicados
- [ ] ✅ Test: vinculación de préstamos funciona

---

## 🆘 Si Algo Falla

### Problema: Script da error

**Solución:**
1. Verifica que estás en **Supabase SQL Editor**
2. Copia el script completo (todo el archivo)
3. Pega y ejecuta de nuevo
4. Lee los mensajes de error
5. Si dice "table does not exist", ignóralo y continúa

### Problema: "profiles" tiene datos

**Solución:**
El script `cleanup_profiles_table.sql` tiene una sección comentada (sección 8) para migrar datos de `profiles` → `perfiles`. Descomenta esa sección y ejecútala.

### Problema: Usuarios zombies

**Solución:**
```sql
DELETE FROM auth.users
WHERE id IN (
  SELECT u.id FROM auth.users u
  LEFT JOIN perfiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL
);
```

---

## 📚 Documentación Completa

Para más detalles, lee:
- `PLAN_DE_ACCION.md` - Plan completo paso a paso
- `DEBUG_GUIDE.md` - Guía de debugging
- `CAMBIOS_REALIZADOS.md` - Resumen de cambios

---

## 🎉 ¡Listo!

Después de seguir estos 5 pasos:

✅ App funciona sin errores
✅ Usuarios se registran correctamente
✅ Préstamos se vinculan automáticamente
✅ No hay teléfonos duplicados
✅ Base de datos está limpia
✅ Solo existe tabla "perfiles" (no "profiles")

---

## 🔑 Funciones Útiles Creadas

Después de ejecutar los scripts, tendrás estas funciones:

```sql
-- Eliminar usuario completamente
SELECT delete_user_completely('email@ejemplo.com');

-- Ver conflictos de teléfono
SELECT * FROM check_phone_conflicts();

-- Verificar si teléfono está registrado
SELECT is_phone_registered('+51999888777');

-- Buscar usuario por teléfono
SELECT * FROM find_user_by_phone('+51999888777');

-- Normalizar teléfono
SELECT normalize_phone('+51 999 888 777'); -- → +51999888777

-- Validar formato de teléfono
SELECT validate_phone_number('+51999888777'); -- → true
```

---

## 📊 Estado Final Esperado

```
Tabla "perfiles": ✅ EXISTE
Tabla "profiles": ✅ NO EXISTE
Usuarios en auth.users: X
Usuarios zombies: 0
Teléfonos duplicados: 0
Perfiles huérfanos: 0
Préstamos inválidos: 0
```

🎯 **¡Todo correcto!**
