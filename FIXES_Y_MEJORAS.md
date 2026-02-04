# Correcciones y Mejoras Recientes

## ✅ Problemas Solucionados

### 1. Error de "duplicate key" al añadir capital
**Problema:** Al intentar añadir capital, aparecía el error: `duplicate key value violates unique constraint "capital_usuario_user_id_key"`

**Solución:** Actualicé el método `agregarCapital()` en `capitalService.ts` para usar `upsert` con el parámetro `onConflict: 'user_id'`, lo que permite actualizar el registro existente en lugar de intentar crear uno nuevo.

```typescript
.upsert({ 
  user_id: user.id, 
  monto: nuevoCapital 
}, {
  onConflict: 'user_id'  // ← Esta es la clave
})
```

---

### 2. Botón FAB se sobrepone a las opciones del Speed Dial
**Problema:** Al abrir el menú Speed Dial (+), el botón principal quedaba encima de las opciones.

**Solución:** Eliminé las propiedades `position`, `right` y `bottom` del estilo del FAB. El componente `FAB.Group` maneja automáticamente el posicionamiento y coloca las opciones correctamente encima del botón.

---

### 3. Checkbox y texto de "Recordar credenciales" desalineados
**Problema:** El checkbox y el texto aparecían en líneas separadas.

**Solución:** Reestructuré el layout en `LoginScreen.tsx`:
- Creé un `optionsContainer` con `flexDirection: 'row'` para alinear el checkbox y "Olvidaste tu contraseña"
- El checkbox y su texto están dentro de un `rememberContainer` con `flexDirection: 'row'`
- El texto está alineado horizontalmente con el checkbox

---

## 🆕 Nuevas Funcionalidades

### 4. Campo DNI en el Registro
**Implementado:** Campo DNI que solo acepta 8 dígitos numéricos.

**Características:**
- Solo permite números
- Máximo 8 dígitos
- Validación automática que elimina caracteres no numéricos
- Validación en el envío del formulario

**Archivos modificados:**
- `RegisterScreen.tsx`: Agregado campo DNI con validación
- `authService.ts`: Actualizado para incluir DNI en el registro
- `database/add_dni_field.sql`: Script SQL para agregar columna DNI a la tabla perfiles

---

### 5. Validación de Teléfono por País
**Implementado:** El input de teléfono ahora valida la cantidad de dígitos según el país seleccionado.

**Características:**
- **Perú**: Exactamente 9 dígitos
- **Argentina**: 10 dígitos
- **México**: 10 dígitos
- **Brasil**: 11 dígitos
- Y más países con sus respectivas longitudes

**Funcionamiento:**
- El componente `PhoneInput` limita automáticamente la cantidad de dígitos según el país
- `RegisterScreen` valida que el número tenga la longitud correcta antes de registrar
- Mensaje de error específico si el número no cumple con la longitud

**Archivos modificados:**
- `PhoneInput.tsx`: Agregado campo `phoneLength` a cada país y validación automática
- `RegisterScreen.tsx`: Agregada función `validatePhone()` para validar antes de enviar

---

## 📋 Instrucciones de Instalación

### 1. Ejecutar scripts SQL

Debes ejecutar **DOS scripts** en tu Supabase Dashboard:

#### Script 1: Agregar DNI
```sql
-- Archivo: database/add_dni_field.sql
```
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `database/add_dni_field.sql`
3. Ejecuta el script

#### Script 2: Tablas de Capital (si aún no lo hiciste)
```sql
-- Archivo: database/add_capital_tables.sql
```
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y pega el contenido de `database/add_capital_tables.sql`
3. Ejecuta el script

### 2. Verificar cambios
Después de ejecutar los scripts:
- Tabla `perfiles` debe tener la columna `dni`
- Tablas `capital_usuario` y `transacciones_capital` deben existir

---

## 🎯 Cambios de Validación

### DNI
- ✅ Solo números
- ✅ Exactamente 8 dígitos
- ✅ Requerido en el registro

### Teléfono
- ✅ Validación automática por país
- ✅ Perú: 9 dígitos
- ✅ Otros países: longitudes específicas
- ✅ No se puede exceder la longitud permitida

### Formulario de Registro
Campos actuales (todos requeridos):
1. Nombre
2. Apellido
3. DNI (8 dígitos)
4. Teléfono (validación por país)
5. Email
6. Contraseña (mínimo 6 caracteres)
7. Confirmar contraseña

---

## 🧪 Pruebas Recomendadas

### Probar DNI:
1. Intentar ingresar letras → No debe permitirlo
2. Intentar más de 8 dígitos → Se corta automáticamente
3. Intentar registrarse con menos de 8 → Debe mostrar error

### Probar Teléfono:
1. Seleccionar Perú (+51)
2. Intentar ingresar 10 dígitos → Solo acepta 9
3. Intentar registrarse con 8 dígitos → Debe mostrar error
4. Cambiar a Argentina → Debe aceptar 10 dígitos

### Probar Capital:
1. Añadir capital por primera vez → Debe funcionar
2. Añadir capital nuevamente → No debe dar error de duplicate key
3. Verificar que el monto se actualiza correctamente

---

## 📝 Notas Importantes

- El campo DNI está preparado para Perú (8 dígitos), pero puedes adaptarlo a otros países modificando la validación en `RegisterScreen.tsx`
- Las longitudes de teléfono por país están basadas en estándares actuales, pero pueden variar según regiones
- Los usuarios existentes no tienen DNI, se agregará automáticamente cuando se registren nuevos usuarios

---

## 🐛 ¿Encontraste un problema?

Si encuentras algún error o comportamiento inesperado:
1. Verifica que ejecutaste ambos scripts SQL
2. Limpia la caché de la app
3. Revisa los logs de la consola para más detalles
