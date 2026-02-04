# Aplicar Correcciones de Base de Datos

Este documento explica cómo aplicar las correcciones necesarias para resolver los problemas de registro y vinculación de préstamos.

## Problemas Resueltos

1. **Error "Database error saving new user"** durante el registro
2. **Préstamos no se vinculan** cuando el deudor se registra con el mismo número
3. **Estandarización de números telefónicos** con prefijo de país

## Scripts a Ejecutar

Debes ejecutar estos scripts en tu base de datos de Supabase en el siguiente orden:

### 1. fix_registration_trigger.sql (OBLIGATORIO)

Este script corrige:
- El trigger que crea el perfil de usuario al registrarse
- El trigger que vincula préstamos cuando un deudor se registra
- Los permisos RLS para permitir la inserción de perfiles
- La normalización de números telefónicos en las comparaciones

**Cómo aplicar:**

1. Ve a tu proyecto en Supabase Dashboard
2. Navega a: **SQL Editor**
3. Copia y pega el contenido de `fix_registration_trigger.sql`
4. Haz clic en **Run**

### 2. migrate_normalize_phones.sql (RECOMENDADO)

Este script normaliza todos los números telefónicos existentes en la base de datos al formato estándar: `+[código_país][número]` (sin espacios).

**Cómo aplicar:**

1. Ve a: **SQL Editor** en Supabase
2. Copia y pega el contenido de `migrate_normalize_phones.sql`
3. Haz clic en **Run**

Este script:
- Normaliza números en la tabla `perfiles`
- Normaliza números en la tabla `prestamos` (columna `deudor_telefono`)
- Normaliza números en la tabla `invitaciones_prestamo`
- Crea índices para mejorar el rendimiento de búsquedas
- Muestra un resumen de los cambios realizados

## Verificación

Después de aplicar los scripts, verifica que todo funciona correctamente:

### 1. Verificar el Trigger de Registro

```sql
-- Ver la definición del trigger
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'crear_perfil_al_registrarse';
```

Debe incluir `SECURITY DEFINER` y manejo de errores.

### 2. Verificar Números Normalizados

```sql
-- Ver algunos números de perfiles
SELECT telefono FROM perfiles LIMIT 5;

-- Ver algunos números de préstamos
SELECT deudor_telefono FROM prestamos LIMIT 5;
```

Todos deben estar en formato `+51999999999` (sin espacios).

### 3. Probar el Registro

1. Registra un nuevo usuario con un número telefónico
2. Verifica que se cree el perfil en la tabla `perfiles`
3. No debe aparecer el error "Database error saving new user"

### 4. Probar Vinculación de Préstamos

1. Crea un préstamo con el número `+51999999999`
2. Registra un usuario con ese mismo número
3. El préstamo debe aparecer automáticamente en "Mis Deudas" del nuevo usuario

## Cambios en la Aplicación

Los siguientes cambios ya se han realizado en el código de la aplicación:

### 1. Nuevo Componente PhoneInput

- **Ubicación:** `src/components/PhoneInput.tsx`
- **Características:**
  - Selector de código de país con 21 países (Perú por defecto)
  - Búsqueda de países
  - Formato estandarizado: `+[código][número]` sin espacios
  - Validación de números

### 2. Pantallas Actualizadas

- `RegisterScreen.tsx`: Usa el nuevo PhoneInput
- `AddLoanScreen.tsx`: Usa el nuevo PhoneInput

### 3. Utilidades de Teléfono

- **Ubicación:** `src/utils/phoneUtils.ts`
- **Funciones:**
  - `normalizePhoneNumber()`: Normaliza cualquier número
  - `formatPhoneNumberForDisplay()`: Formatea para mostrar
  - `isValidPhoneNumber()`: Valida formato

### 4. Servicio de Préstamos Actualizado

- `prestamosService.ts` ahora normaliza números al buscar usuarios existentes
- Compara números normalizados para evitar problemas de formato

## Formato de Números Telefónicos

### Antes
```
999 999 999
+51 999 999 999
999-999-999
(51) 999999999
```

### Después (Estandarizado)
```
+51999999999
+54123456789
+1234567890
```

## Notas Importantes

1. **Todos los números nuevos** se guardarán automáticamente en el formato estandarizado
2. **Los números antiguos** deben migrarse usando `migrate_normalize_phones.sql`
3. **El trigger de vinculación** ahora compara números normalizados, por lo que funcionará incluso si algunos números antiguos tienen formato diferente
4. **Los usuarios existentes** no necesitan volver a registrarse

## Próximos Pasos

Después de aplicar estos cambios:

1. ✅ Aplica `fix_registration_trigger.sql`
2. ✅ Aplica `migrate_normalize_phones.sql`
3. ✅ Prueba el registro de nuevos usuarios
4. ✅ Prueba la creación de préstamos
5. ✅ Verifica que los préstamos se vinculen correctamente

## Soporte

Si encuentras algún problema:

1. Revisa los logs de Supabase en: **Database** > **Logs**
2. Verifica que los triggers se hayan creado correctamente
3. Confirma que los números estén normalizados
4. Prueba manualmente las queries de vinculación

## Consultas Útiles

### Ver préstamos sin vincular
```sql
SELECT id, deudor_nombre, deudor_apellido, deudor_telefono, deudor_email
FROM prestamos
WHERE deudor_id IS NULL;
```

### Ver usuarios registrados
```sql
SELECT u.id, u.email, p.nombre, p.apellido, p.telefono
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id;
```

### Intentar vinculación manual (para probar)
```sql
-- Esto simula lo que hace el trigger
UPDATE prestamos
SET deudor_id = (
  SELECT user_id FROM perfiles 
  WHERE regexp_replace(telefono, '[^0-9+]', '', 'g') = regexp_replace(prestamos.deudor_telefono, '[^0-9+]', '', 'g')
  LIMIT 1
)
WHERE deudor_id IS NULL
  AND deudor_telefono IS NOT NULL;
```
