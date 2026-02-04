-- Migración para cambiar numero_cuota de INTEGER a NUMERIC
-- Necesario para soportar mini-cuotas con números decimales (ej: 3.1, 3.2)

-- Primero, eliminar la restricción única existente
ALTER TABLE cuotas DROP CONSTRAINT IF EXISTS cuotas_prestamo_id_numero_cuota_key;

-- Cambiar el tipo de dato de numero_cuota de INTEGER a NUMERIC(10,2)
-- NUMERIC(10,2) permite hasta 10 dígitos en total con 2 decimales
ALTER TABLE cuotas ALTER COLUMN numero_cuota TYPE NUMERIC(10,2);

-- Recrear la restricción única con el nuevo tipo de dato
ALTER TABLE cuotas ADD CONSTRAINT cuotas_prestamo_id_numero_cuota_key 
  UNIQUE(prestamo_id, numero_cuota);

-- Comentario para documentación
COMMENT ON COLUMN cuotas.numero_cuota IS 'Número de cuota. Puede ser decimal para mini-cuotas (ej: 3.1, 3.2)';
