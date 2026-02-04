-- ============================================
-- NORMALIZAR TODOS LOS TELÉFONOS EXISTENTES
-- ============================================
-- Este script normaliza los teléfonos en la BD
-- para que todos sigan el formato +51XXXXXXXXX
-- ============================================

-- Función para normalizar teléfonos en SQL
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits TEXT;
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Extraer solo dígitos
  digits := regexp_replace(phone, '\D', '', 'g');
  
  IF digits = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remover ceros iniciales
  digits := regexp_replace(digits, '^0+', '');
  
  -- Caso 1: Ya tiene código 51 y 11 dígitos
  IF digits ~ '^51\d{9}$' THEN
    RETURN '+' || digits;
  END IF;
  
  -- Caso 2: Código duplicado (5151...)
  IF digits ~ '^5151\d{9}$' THEN
    RETURN '+' || substring(digits from 3);
  END IF;
  
  -- Caso 3: Solo 9 dígitos empezando con 9
  IF digits ~ '^9\d{8}$' THEN
    RETURN '+51' || digits;
  END IF;
  
  -- Caso 4: Otros códigos de país (10-15 dígitos)
  IF length(digits) BETWEEN 10 AND 15 THEN
    RETURN '+' || digits;
  END IF;
  
  -- No es válido
  RETURN NULL;
END;
$$;

-- Actualizar tabla perfiles
UPDATE public.perfiles
SET telefono = normalize_phone(telefono)
WHERE telefono IS NOT NULL
  AND telefono != normalize_phone(telefono);

-- Actualizar tabla prestamos (campo deudor_telefono)
UPDATE public.prestamos
SET deudor_telefono = normalize_phone(deudor_telefono)
WHERE deudor_telefono IS NOT NULL
  AND deudor_telefono != normalize_phone(deudor_telefono);

-- Reporte de normalización
DO $$
DECLARE
  perfiles_count INT;
  prestamos_count INT;
BEGIN
  SELECT COUNT(*) INTO perfiles_count FROM public.perfiles WHERE telefono IS NOT NULL;
  SELECT COUNT(*) INTO prestamos_count FROM public.prestamos WHERE deudor_telefono IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'NORMALIZACIÓN COMPLETADA';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Perfiles con teléfono: %', perfiles_count;
  RAISE NOTICE 'Préstamos con teléfono: %', prestamos_count;
  RAISE NOTICE '✅ Todos los teléfonos normalizados a formato +51XXXXXXXXX';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Ahora puedes probar crear préstamos en el APK';
  RAISE NOTICE '============================================';
END $$;

-- Mostrar algunos ejemplos
SELECT 'EJEMPLOS DE TELÉFONOS NORMALIZADOS' as info;
SELECT user_id, telefono FROM public.perfiles WHERE telefono IS NOT NULL LIMIT 5;
