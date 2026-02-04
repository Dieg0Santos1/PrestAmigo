# 📱 Cómo Ver la App en tu Celular

## 🚀 Opción 1: En tu Celular (Recomendado)

### Paso 1: Instalar Expo Go
1. **Android:** [Descargar de Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. **iOS:** [Descargar de App Store](https://apps.apple.com/app/expo-go/id982107779)

### Paso 2: Iniciar el Servidor de Desarrollo
```bash
npm start
```

### Paso 3: Escanear el Código QR
- **Android:** Abre Expo Go y escanea el código QR que aparece en la terminal
- **iOS:** Abre la cámara del iPhone y escanea el QR (te llevará a Expo Go)

### ✅ ¡Listo!
- La app se carga en tu celular EN VIVO
- Cada cambio que hagas en el código se actualiza automáticamente (Hot Reload)
- Puedes agitar el celular para abrir el menú de desarrollo

---

## 💻 Opción 2: Emulador Android (en tu PC)

### Requisitos
- Android Studio instalado
- Emulador Android configurado

### Pasos
```bash
npm run android
```

---

## 🌐 Opción 3: En el Navegador Web

### Pasos
```bash
npm run web
```

Abre: http://localhost:8081

**Nota:** La versión web es útil para desarrollo rápido, pero no muestra la experiencia móvil real.

---

## 🔥 Hot Reload (Actualización Automática)

### Fast Refresh (Recomendado)
- Los cambios se aplican automáticamente SIN reiniciar la app
- Mantiene el estado de la app
- Es instantáneo (1-2 segundos)

### Para forzar una recarga completa:
- **Agita** tu celular → "Reload"
- O presiona **`r`** en la terminal

---

## 📊 Comandos Útiles

### Iniciar servidor de desarrollo
```bash
npm start
```

### Abrir en específico
```bash
npm run android  # Abrir en emulador Android
npm run ios      # Abrir en simulador iOS (solo Mac)
npm run web      # Abrir en navegador
```

### Limpiar caché (si hay problemas)
```bash
npm start -- --clear
```

### Logs en tiempo real
Los logs aparecen automáticamente en la terminal cuando:
- Haces `console.log()` en el código
- Hay errores
- La app hace requests HTTP

---

## 🎨 Visualización Profesional

### Con Expo Go en tu celular verás:
- ✅ Diseño exacto como se verá en producción
- ✅ Animaciones fluidas
- ✅ Gestos táctiles reales
- ✅ Notificaciones push (cuando las implementemos)
- ✅ Cámara y permisos reales

### NO recomendamos usar solo el navegador porque:
- ❌ No muestra la experiencia móvil real
- ❌ Los gestos táctiles no funcionan igual
- ❌ Algunos componentes se ven diferentes

---

## 🐛 Solución de Problemas

### Error: "Something went wrong"
```bash
npm start -- --clear
```

### No aparece el código QR
1. Presiona `r` para recargar
2. O cierra y vuelve a ejecutar `npm start`

### La app no se actualiza
1. Agita el celular → "Reload"
2. O reinicia con `npm start -- --clear`

### "Network response timed out"
- Asegúrate de que tu PC y celular estén en la **misma red WiFi**
- Desactiva firewall temporalmente

---

## 💡 Tips Pro

### Ver en múltiples dispositivos simultáneamente
- Puedes escanear el QR con varios celulares
- Todos se actualizan en tiempo real

### Modo Tunnel (si tienes problemas de red)
```bash
npm start -- --tunnel
```
Esto usa un servidor de Expo para conectar, útil si tu red bloquea conexiones locales.

### Inspector de Elementos
- Agita el celular → "Toggle Element Inspector"
- Toca cualquier elemento para ver sus estilos

---

## 🎯 Recomendación Final

**Usa Expo Go en tu celular** para el mejor UX:
1. Instala Expo Go
2. Ejecuta `npm start`
3. Escanea el QR
4. Desarrolla y ve los cambios en tiempo real

¡Es la forma más rápida y fácil de desarrollar apps móviles! 🚀
