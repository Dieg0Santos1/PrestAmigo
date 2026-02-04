-- Migración para soporte de pagos parciales
-- Permite al prestamista dividir cuotas en pagos más pequeños

-- Agregar columnas necesarias para pagos parciales
ALTER TABLE cuotas 
ADD COLUMN IF NOT EXISTS monto_pagado DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS cuota_padre_id UUID REFERENCES cuotas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS es_pago_parcial BOOLEAN DEFAULT FALSE;

-- Crear índice para mejorar consultas de mini-cuotas
CREATE INDEX IF NOT EXISTS idx_cuotas_padre ON cuotas(cuota_padre_id);

-- Comentarios para documentación
COMMENT ON COLUMN cuotas.monto_pagado IS 'Monto que ya ha sido pagado de la cuota';
COMMENT ON COLUMN cuotas.cuota_padre_id IS 'ID de la cuota padre si esta es una mini-cuota (pago parcial)';
COMMENT ON COLUMN cuotas.es_pago_parcial IS 'Indica si esta cuota fue creada como resultado de un pago parcial';
