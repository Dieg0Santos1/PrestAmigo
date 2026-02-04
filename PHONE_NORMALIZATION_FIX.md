# 🔧 Solución: Normalización Estricta de Teléfonos

## 📋 Problema Resuelto

**Bug crítico:** Creación de préstamos fallaba en APK pero funcionaba en local.

**Causa raíz:** Los teléfonos se guardaban y comparaban en diferentes formatos, causando que usuarios registrados no fueran encontrados.

---

## ✅ Cambios Implementados

### 1️⃣ **Normalización Estricta de Teléfonos**

**Archivo:** `src/utils/phoneUtils.ts`

- **Antes:** Solo eliminaba caracteres no numéricos
- **Ahora:** 
  - Fuerza formato único: `+51XXXXXXXXX` para Perú
  - Maneja casos edge:
    - `999999999` → `+51999999999`
    - `51999999999` → `+51999999999`
    - `+51 999 999 999` → `+51999999999`
    - `5151999999999` → `+51999999999` (duplicado)
    - `0999999999` → `+51999999999` (elimina ceros)

### 2️⃣ **Registro de Usuarios**

**Archivo:** `src/services/authService.ts`

**Cambios:**
- ✅ Normaliza teléfono ANTES de verificar duplicados
- ✅ Usa filtro `.eq()` en Supabase en vez de `.find()` en JS
- ✅ Guarda teléfono YA normalizado en BD
- ✅ Valida que el teléfono sea válido antes de continuar

**Logs añadidos:**
```javascript
console.log('📱 Teléfono normalizado:', normalizedPhone);
```

### 3️⃣ **Creación de Préstamos**

**Archivo:** `src/services/prestamosService.ts`

**Cambios en `verificarUsuarioExiste()`:**
- ✅ Usa filtro `.eq('telefono', normalizedPhone)` directo en DB
- ✅ NO trae toda la tabla `perfiles`
- ✅ Logs detallados del proceso

**Cambios en `crearPrestamo()`:**
- ✅ Normaliza teléfono del deudor ANTES de buscar
- ✅ Usa filtro `.eq()` directo en DB
- ✅ Guarda teléfono normalizado en tabla `prestamos`
- ✅ Logs detallados en cada paso

**Logs añadidos:**
```javascript
console.log('📞 CREAR PRÉSTAMO - Teléfono original:', data.deudor.telefono);
console.log('📞 CREAR PRÉSTAMO - Teléfono normalizado:', normalizedPhone);
console.log('🔍 Buscando usuario con teléfono normalizado:', normalizedPhone);
console.log('✅ Usuario encontrado:', profile.nombre, profile.apellido);
console.log('❌ Usuario NO encontrado con teléfono:', normalizedPhone);
```

---

## 🗄️ Script SQL para Normalizar Datos Existentes

**Archivo:** `database/NORMALIZE_ALL_PHONES.sql`

Este script:
1. ✅ Crea función `normalize_phone()` en PostgreSQL
2. ✅ Normaliza TODOS los teléfonos en `perfiles`
3. ✅ Normaliza TODOS los teléfonos en `prestamos.deudor_telefono`
4. ✅ Muestra reporte de cuántos registros fueron actualizados

**Ejecutar en Supabase SQL Editor.**

---

## 📱 Nuevo APK

**Link de instalación:**
https://expo.dev/accounts/programmersa/projects/prestamigo/builds/d25f57f4-8650-438d-a767-49d17f726399

**Build ID:** `d25f57f4-8650-438d-a767-49d17f726399`

---

## 🔍 Cómo Depurar

### En APK:
1. Conecta el dispositivo Android por USB
2. Ejecuta: `adb logcat | grep -E "(📱|📞|🔍|✅|❌)"`
3. Intenta crear un préstamo
4. Verás los logs de normalización en la consola

### Logs esperados (éxito):
```
📞 CREAR PRÉSTAMO - Teléfono original: 942480155
📞 CREAR PRÉSTAMO - Teléfono normalizado: +51942480155
🔍 Buscando usuario con teléfono normalizado: +51942480155
✅ Usuario encontrado: Juan Pérez
✅ Deudor encontrado con ID: abc-123-xyz
```

### Logs si falla:
```
📞 CREAR PRÉSTAMO - Teléfono original: 942480155
📞 CREAR PRÉSTAMO - Teléfono normalizado: +51942480155
🔍 Buscando usuario con teléfono normalizado: +51942480155
❌ Usuario NO encontrado con teléfono: +51942480155
```

Si ves esto último, significa que:
- El usuario NO está registrado con ese número
- O el teléfono en BD tiene un formato diferente (ejecutar SQL)

---

## ✅ Lista de Verificación

Antes de probar:
1. [ ] Ejecutar `NORMALIZE_ALL_PHONES.sql` en Supabase
2. [ ] Instalar nuevo APK
3. [ ] Desinstalar APK anterior primero (opcional pero recomendado)

Para probar:
1. [ ] Registrar usuario con número: `942480155`
2. [ ] Verificar en Supabase que se guardó como: `+51942480155`
3. [ ] Crear préstamo con ese mismo número
4. [ ] Debería encontrar al usuario ✅

---

## 📊 Beneficios

✅ **Consistencia:** Todos los teléfonos en formato único
✅ **Performance:** Filtros directos en DB vs `.find()` en JS
✅ **Confiabilidad:** Funciona igual en APK y local
✅ **Mantenibilidad:** Logs claros para depuración
✅ **Escalabilidad:** No depende del input del dispositivo

---

## 🚨 Importante

**SIEMPRE ejecuta `NORMALIZE_ALL_PHONES.sql` ANTES de usar el nuevo APK.**

Esto asegura que todos los teléfonos existentes en la base de datos estén normalizados al nuevo formato.
