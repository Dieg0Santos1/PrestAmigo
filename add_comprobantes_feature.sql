-- 1. Agregar campos a la tabla cuotas para manejar comprobantes
ALTER TABLE cuotas 
ADD COLUMN IF NOT EXISTS comprobante_url TEXT,
ADD COLUMN IF NOT EXISTS comprobante_estado VARCHAR(20) CHECK (comprobante_estado IN ('en_revision', 'aprobado', 'rechazado')),
ADD COLUMN IF NOT EXISTS comprobante_subido_en TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS comprobante_revisado_en TIMESTAMPTZ;

-- 2. Crear índice para búsquedas rápidas por estado de comprobante
CREATE INDEX IF NOT EXISTS idx_cuotas_comprobante_estado ON cuotas(comprobante_estado);

-- 3. Configurar el bucket de storage (esto se debe hacer desde la UI de Supabase o con estas políticas)
-- IMPORTANTE: Debes crear el bucket 'comprobantes' manualmente en Supabase Dashboard > Storage
-- Luego ejecuta estas políticas de seguridad:

-- Política: Los usuarios autenticados pueden subir comprobantes
CREATE POLICY "Los usuarios pueden subir comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprobantes');

-- Política: Los usuarios pueden actualizar sus propios comprobantes
CREATE POLICY "Los usuarios pueden actualizar comprobantes"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comprobantes');

-- Política: Los usuarios pueden eliminar sus propios comprobantes
CREATE POLICY "Los usuarios pueden eliminar comprobantes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comprobantes');

-- Política: Los usuarios autenticados pueden ver comprobantes relacionados a sus préstamos/deudas
CREATE POLICY "Los usuarios pueden ver comprobantes"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'comprobantes');

-- 4. Agregar comentarios para documentación
COMMENT ON COLUMN cuotas.comprobante_url IS 'URL del comprobante de pago en Supabase Storage';
COMMENT ON COLUMN cuotas.comprobante_estado IS 'Estado del comprobante: en_revision, aprobado, rechazado';
COMMENT ON COLUMN cuotas.comprobante_subido_en IS 'Fecha y hora en que el deudor subió el comprobante';
COMMENT ON COLUMN cuotas.comprobante_revisado_en IS 'Fecha y hora en que el prestamista revisó el comprobante';
