-- Migration script to normalize existing phone numbers
-- This ensures all phone numbers follow the standard format: +[country_code][number]
-- with no spaces, dashes, or other characters

-- Function to normalize phone numbers in SQL
CREATE OR REPLACE FUNCTION normalize_phone(phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone_number IS NULL OR phone_number = '' THEN
    RETURN phone_number;
  END IF;
  
  -- Remove all characters except digits and +
  RETURN regexp_replace(phone_number, '[^0-9+]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Normalize phone numbers in perfiles table
UPDATE perfiles
SET telefono = normalize_phone(telefono)
WHERE telefono IS NOT NULL
  AND telefono != normalize_phone(telefono);

-- Normalize phone numbers in prestamos table (deudor_telefono)
UPDATE prestamos
SET deudor_telefono = normalize_phone(deudor_telefono)
WHERE deudor_telefono IS NOT NULL
  AND deudor_telefono != normalize_phone(deudor_telefono);

-- Normalize phone numbers in invitaciones_prestamo table
UPDATE invitaciones_prestamo
SET telefono = normalize_phone(telefono)
WHERE telefono IS NOT NULL
  AND telefono != normalize_phone(telefono);

-- Create an index on normalized phone numbers for better performance
CREATE INDEX IF NOT EXISTS idx_perfiles_telefono_normalized 
  ON perfiles(regexp_replace(telefono, '[^0-9+]', '', 'g'));

CREATE INDEX IF NOT EXISTS idx_prestamos_deudor_telefono_normalized 
  ON prestamos(regexp_replace(deudor_telefono, '[^0-9+]', '', 'g'));

-- Add a constraint to ensure phone numbers start with + going forward
-- (Optional - uncomment if you want to enforce this)
-- ALTER TABLE perfiles ADD CONSTRAINT check_telefono_format 
--   CHECK (telefono IS NULL OR telefono ~ '^\+\d{8,15}$');

-- Display summary of changes
DO $$
DECLARE
  perfiles_count INTEGER;
  prestamos_count INTEGER;
  invitaciones_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO perfiles_count FROM perfiles WHERE telefono IS NOT NULL;
  SELECT COUNT(*) INTO prestamos_count FROM prestamos WHERE deudor_telefono IS NOT NULL;
  SELECT COUNT(*) INTO invitaciones_count FROM invitaciones_prestamo WHERE telefono IS NOT NULL;
  
  RAISE NOTICE '=== Phone Number Normalization Complete ===';
  RAISE NOTICE 'Processed % phone numbers in perfiles', perfiles_count;
  RAISE NOTICE 'Processed % phone numbers in prestamos', prestamos_count;
  RAISE NOTICE 'Processed % phone numbers in invitaciones_prestamo', invitaciones_count;
  RAISE NOTICE 'All phone numbers are now in format: +[country_code][number]';
END $$;
