# Sistema de Préstamos - Base de Datos

## 📋 Cómo Funciona la Conexión entre Usuarios

### Escenario 1: Deudor NO está registrado en la app
1. **Prestamista** crea un préstamo ingresando:
   - Nombre, apellido, teléfono del deudor
   - Monto, tasa, cuotas, etc.

2. El préstamo se guarda con:
   - `deudor_id = NULL`
   - `deudor_telefono = "999888777"`
   - `deudor_email = "juan@example.com"` (opcional)

3. **El prestamista ve el préstamo** en su lista normalmente
4. **El deudor NO ve nada** porque no está en la app

### Escenario 2: Deudor se registra DESPUÉS
1. El deudor se registra con su teléfono o email
2. **AUTOMÁTICAMENTE** el trigger `vincular_prestamos_al_registrarse` se ejecuta
3. Busca préstamos donde:
   - `deudor_telefono` coincida con su teléfono
   - O `deudor_email` coincida con su email
4. Actualiza `deudor_id` con el ID del nuevo usuario
5. **Ahora el deudor VE el préstamo** en su sección de "Mis Deudas"

### Escenario 3: Deudor YA está registrado
1. Cuando el prestamista crea el préstamo, el sistema:
   - Busca en la tabla `perfiles` si existe un usuario con ese teléfono/email
   - Si existe, guarda directamente el `deudor_id`
2. **Ambos usuarios ven el préstamo inmediatamente**
   - Prestamista: en "Préstamos Otorgados"
   - Deudor: en "Mis Deudas"

## 🔐 Seguridad (Row Level Security)

### Préstamos
- **Ver**: Solo prestamista y deudor pueden ver un préstamo
- **Crear**: Solo el prestamista puede crear
- **Actualizar**: Solo el prestamista puede actualizar
- **Eliminar**: Solo el prestamista puede eliminar

### Cuotas
- **Ver**: Prestamista y deudor pueden ver las cuotas
- **Crear**: Solo el prestamista puede crear cuotas
- **Actualizar**: Ambos pueden actualizar
  - Prestamista: para marcar como pagada
  - Deudor: para subir comprobante

## 📊 Estructura de Datos

### Tabla `prestamos`
```sql
id                  UUID (PK)
prestamista_id      UUID (FK -> auth.users) - Quien presta
deudor_id           UUID (FK -> auth.users) - Quien debe (NULL si no está registrado)
deudor_nombre       VARCHAR - Nombre del deudor
deudor_apellido     VARCHAR - Apellido del deudor
deudor_telefono     VARCHAR - Teléfono (para vincular después)
deudor_email        VARCHAR - Email opcional (para vincular)
monto_prestado      DECIMAL - Monto inicial
tasa_interes        DECIMAL - Porcentaje de interés
numero_cuotas       INTEGER - Cantidad de cuotas
frecuencia_pago     VARCHAR - diario/semanal/mensual/fin_semana
monto_cuota         DECIMAL - Monto de cada cuota
monto_total         DECIMAL - Total con interés
estado              VARCHAR - activo/completado/cancelado
fecha_inicio        DATE
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Tabla `cuotas`
```sql
id                  UUID (PK)
prestamo_id         UUID (FK -> prestamos)
numero_cuota        INTEGER - Número de la cuota (1, 2, 3...)
monto               DECIMAL - Monto de esta cuota
fecha_vencimiento   DATE - Cuándo vence
estado              VARCHAR - pendiente/pagada/vencida
fecha_pago          DATE - Cuándo se pagó (NULL si no pagada)
comprobante_url     TEXT - URL del comprobante subido
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Tabla `invitaciones_prestamo`
```sql
id                  UUID (PK)
prestamo_id         UUID (FK -> prestamos)
telefono            VARCHAR - Teléfono del invitado
email               VARCHAR - Email del invitado
estado              VARCHAR - pendiente/aceptada/rechazada
created_at          TIMESTAMP
```

## 🚀 Flujo de Uso

### Crear un Préstamo
```typescript
const resultado = await prestamosService.crearPrestamo({
  deudor: {
    nombre: 'Juan',
    apellido: 'Pérez',
    telefono: '+51999888777',
    email: 'juan@example.com' // opcional
  },
  monto: 5000,
  tasaInteres: 5,
  numeroCuotas: 12,
  frecuenciaPago: 'mensual',
  montoCuota: 437.50,
  montoTotal: 5250
});
```

### Ver Mis Préstamos (como Prestamista)
```typescript
const { prestamos } = await prestamosService.obtenerMisPrestamos();
// Retorna solo los préstamos donde YO soy el prestamista
```

### Ver Mis Deudas (como Deudor)
```typescript
const { deudas } = await prestamosService.obtenerMisDeudas();
// Retorna solo los préstamos donde YO soy el deudor
```

### Marcar Cuota como Pagada
```typescript
await prestamosService.marcarCuotaComoPagada(cuotaId, comprobanteUrl);
```

## 📝 Pasos de Implementación

1. **Ejecutar el SQL** en Supabase:
   - Ve al SQL Editor en tu dashboard de Supabase
   - Copia y pega el contenido de `schema.sql`
   - Ejecuta el script

2. **Verificar que funciona**:
   - Las tablas `prestamos`, `cuotas`, `invitaciones_prestamo` deben existir
   - Los triggers deben estar creados
   - Las policies de RLS deben estar activas

3. **Conectar la app**:
   - Ya está todo listo en `prestamosService.ts`
   - Solo necesitas actualizar las pantallas para usar el servicio

## 🎯 Ventajas de esta Arquitectura

1. **Vinculación Automática**: Cuando alguien se registra, automáticamente ve sus deudas
2. **Sin Duplicados**: Un préstamo es una sola fila, vista por ambos usuarios
3. **Seguro**: RLS asegura que solo los involucrados vean el préstamo
4. **Flexible**: Funciona con deudores registrados y no registrados
5. **Escalable**: Fácil agregar notificaciones, recordatorios, etc.
