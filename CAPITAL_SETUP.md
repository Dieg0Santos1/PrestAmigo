# Configuración del Sistema de Capital

## ⚠️ IMPORTANTE: Ejecutar Script SQL

Antes de usar las nuevas funciones de capital, debes ejecutar el siguiente script SQL en tu base de datos Supabase.

### Pasos para ejecutar el script:

1. **Ir a Supabase Dashboard**
   - Accede a [supabase.com](https://supabase.com)
   - Selecciona tu proyecto

2. **Abrir SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Clic en "New query"

3. **Ejecutar el script**
   - Copia todo el contenido del archivo `database/add_capital_tables.sql`
   - Pégalo en el editor SQL
   - Haz clic en "Run" o presiona `Ctrl/Cmd + Enter`

4. **Verificar la instalación**
   - Ve a "Table Editor" en el menú lateral
   - Deberías ver las nuevas tablas:
     - `capital_usuario`
     - `transacciones_capital`

## Funcionalidades Implementadas

### 1. Sistema de Capital
- **capital_usuario**: Tabla que almacena el capital disponible de cada usuario
- **transacciones_capital**: Historial de todas las transacciones de capital

### 2. Lógica de Capital

#### Capital Total
```
Capital Total = Capital Disponible + Dinero Prestado - Deudas
```

#### Flujo de Capital

**Al agregar capital:**
- El monto se suma al capital disponible
- Se registra una transacción de tipo "ingreso"

**Al retirar capital:**
- El monto se resta del capital disponible (si hay suficiente)
- Se registra una transacción de tipo "retiro"

**Al crear un préstamo:**
- El monto prestado (capital, no el total con intereses) se resta del capital disponible
- Se registra una transacción de tipo "prestamo"

**Al cobrar una cuota:**
- El monto de la cuota (capital + intereses) se suma al capital disponible
- Se registra una transacción de tipo "cobro"

### 3. Pantallas Nuevas

- **AddCapitalScreen**: Permite agregar dinero al capital
- **WithdrawCapitalScreen**: Permite retirar dinero del capital
- **BalanceScreen (actualizada)**: Muestra el capital actual y disponible

### 4. Speed Dial FAB

El botón flotante "+" en la pantalla principal ahora despliega 3 opciones:
- **Crear Préstamo**: Navega a la pantalla de creación de préstamos
- **Añadir Capital**: Permite agregar dinero al capital
- **Retiro Capital**: Permite retirar dinero del capital

## Ejemplo de Uso

### Escenario 1: Empezar desde cero
1. Usuario nuevo: Capital = S/ 0
2. Añade S/ 3,000 → Capital = S/ 3,000
3. Presta S/ 1,000 al 20% → Capital disponible = S/ 2,000, En préstamos = S/ 1,000
4. Deudor paga cuota de S/ 300 → Capital disponible = S/ 2,300
5. Retira S/ 500 → Capital disponible = S/ 1,800

### Escenario 2: Capital después de cobros
- Capital inicial: S/ 3,000
- Presta S/ 1,000 al 20% (total S/ 1,200)
- Capital disponible: S/ 2,000
- Dinero en préstamos: S/ 1,000 (solo el capital prestado)
- Al cobrar S/ 300: Capital disponible = S/ 2,300 (recupera capital + intereses)

## Validaciones Implementadas

- ✅ No se puede retirar más capital del disponible
- ✅ No se puede crear un préstamo sin capital suficiente
- ✅ Los montos deben ser mayores a 0
- ✅ Solo el dueño puede ver y modificar su capital

## Seguridad (RLS Policies)

Las tablas tienen Row Level Security habilitado:
- Los usuarios solo pueden ver su propio capital
- Los usuarios solo pueden modificar su propio capital
- Las transacciones son de solo lectura para el usuario

## Próximos Pasos (Opcional)

Si quieres mejorar aún más el sistema:
- [ ] Gráficos de evolución del capital en el tiempo
- [ ] Alertas cuando el capital está bajo
- [ ] Exportar historial de transacciones a PDF/Excel
- [ ] Categorías personalizadas para transacciones
