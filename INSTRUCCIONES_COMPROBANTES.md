# 📸 Sistema de Comprobantes de Pago - Instrucciones

## 🎯 Funcionalidades Implementadas

### Para el Deudor:
- ✅ Subir comprobante de pago con foto desde galería
- ✅ Preview de la imagen antes de enviar
- ✅ El comprobante anterior se elimina automáticamente al subir uno nuevo
- ✅ Estados del botón:
  - "Subir Comprobante" - Sin comprobante
  - "En Revisión" - Comprobante subido, esperando aprobación (botón deshabilitado)
  - "Volver a Subir" - Comprobante rechazado, puede intentar de nuevo

### Para el Prestamista:
- ✅ Ver notificación de comprobantes pendientes de revisión
- ✅ Pantalla completa para revisar el comprobante con:
  - Imagen del comprobante (tamaño grande)
  - Información de la cuota (monto, fecha, número)
  - Checklist de verificación
  - Botones para aprobar o rechazar
- ✅ Al aprobar: la cuota se marca automáticamente como pagada
- ✅ Al rechazar: el deudor puede volver a subir el comprobante

---

## 🔧 Configuración Requerida

### 1. Ejecutar Script SQL en Supabase

Abre el dashboard de Supabase → SQL Editor y ejecuta el archivo:
```
mobile/add_comprobantes_feature.sql
```

Este script:
- Agrega campos de comprobante a la tabla `cuotas`
- Crea políticas de seguridad para Storage

### 2. Crear Bucket de Storage

1. Ve a **Supabase Dashboard** → **Storage**
2. Haz clic en **"New bucket"**
3. Configuración:
   - **Name**: `comprobantes`
   - **Public bucket**: ✅ **SÍ** (marca esta opción)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg`, `image/png`, `image/jpg`
4. Haz clic en **"Create bucket"**

### 3. Verificar Políticas de Storage

En **Storage** → **Policies** del bucket `comprobantes`, debes ver:
- ✅ Los usuarios pueden subir comprobantes
- ✅ Los usuarios pueden actualizar comprobantes  
- ✅ Los usuarios pueden eliminar comprobantes
- ✅ Los usuarios pueden ver comprobantes

Si no están creadas, ejecuta la parte de políticas del script SQL.

---

## 🧪 Cómo Probar

### Flujo Completo (2 dispositivos/cuentas):

1. **Cuenta Prestamista**: Crea un préstamo a un deudor
2. **Cuenta Deudor**: 
   - Ve a "Mis Deudas"
   - Abre el detalle de la deuda
   - En una cuota pendiente, toca "Subir Comprobante"
   - Selecciona una imagen (puede ser cualquier imagen de prueba)
   - Confirma y envía
   - El botón cambiará a "En Revisión" (amarillo, deshabilitado)

3. **Cuenta Prestamista**:
   - Ve a "Préstamos"
   - Abre el préstamo correspondiente
   - Verás un badge "⏰ Comprobante en revisión"
   - Toca el botón "Revisar Comprobante"
   - Verás la imagen del comprobante
   - Opciones:
     - **Aprobar**: La cuota se marca como pagada automáticamente
     - **Rechazar**: El deudor podrá volver a subir

4. **Cuenta Deudor** (si rechazaron):
   - El botón cambiará a "Volver a Subir" (rojo)
   - Puede subir un nuevo comprobante

---

## 📦 Dependencias Instaladas

Ya están instaladas estas dependencias:
```bash
npm install expo-image-picker expo-file-system base64-arraybuffer
```

---

## 🗂️ Archivos Creados/Modificados

### Nuevos archivos:
- `src/services/comprobantesService.ts` - Servicio para manejo de comprobantes
- `src/screens/ReviewProofScreen.tsx` - Pantalla de revisión para prestamista
- `add_comprobantes_feature.sql` - Script de base de datos

### Archivos modificados:
- `src/screens/DebtDetailScreen.tsx` - Modal y lógica de subida para deudor
- `src/screens/LoanDetailScreen.tsx` - Botones y navegación para prestamista
- `src/screens/DebtsScreen.tsx` - Fix del chip de estado
- `src/services/prestamosService.ts` - Consultas actualizadas con campos de comprobante
- `src/navigation/BottomTabNavigator.tsx` - Ruta de ReviewProof agregada

---

## ⚠️ Importante

### Almacenamiento:
- Las imágenes se comprimen al 80% de calidad para ahorrar espacio
- Cuando se sube un nuevo comprobante, el anterior se elimina automáticamente
- Los comprobantes se guardan en: `comprobantes/cuotas/comprobante_{cuotaId}_{timestamp}.{ext}`

### Seguridad:
- Solo usuarios autenticados pueden subir/ver comprobantes
- Las URLs de comprobantes son públicas pero no listables
- Los datos sensibles se validan en el servicio

### Limitaciones actuales:
- No hay validación OCR automática (manual por diseño)
- No hay notificaciones push (se puede agregar después)
- No hay zoom en la imagen (se puede agregar visor de imagen completo)

---

## 🚀 Próximos Pasos Opcionales

1. **Notificaciones Push**: Notificar al prestamista cuando hay un comprobante nuevo
2. **Zoom de Imagen**: Agregar visor con zoom/pinch para ver detalles
3. **Historial**: Guardar historial de comprobantes rechazados
4. **Recordatorios**: Notificar al deudor si el comprobante fue rechazado
5. **Analytics**: Rastrear tasa de aprobación/rechazo

---

## ✅ Checklist de Configuración

- [ ] Ejecutar `add_comprobantes_feature.sql` en Supabase
- [ ] Crear bucket `comprobantes` marcado como público
- [ ] Verificar políticas de Storage
- [ ] Probar flujo completo con 2 cuentas diferentes
- [ ] Verificar que las imágenes se suban correctamente
- [ ] Verificar que el comprobante anterior se elimine
- [ ] Probar aprobación y rechazo

---

## 🐛 Solución de Problemas

### Error: "No se pudo subir el comprobante"
- Verifica que el bucket `comprobantes` exista
- Verifica que esté marcado como **público**
- Verifica que las políticas de Storage estén configuradas

### Error: "Permisos requeridos"
- La app necesita permisos de galería
- En iOS: Configurar `Info.plist`
- En Android: Los permisos ya están en `app.json`

### La imagen no se muestra
- Verifica que el bucket sea público
- Verifica la URL en la consola de desarrollador
- Verifica que la imagen se haya subido correctamente en Supabase Storage

### El botón no cambia de estado
- Verifica que los campos de comprobante estén en la base de datos
- Revisa la consola para ver errores
- Recarga la pantalla (vuelve atrás y entra de nuevo)

---

¿Necesitas ayuda? Revisa los logs en:
- `console.log` en el servicio `comprobantesService.ts`
- Supabase Dashboard → Logs
- React Native Debugger
