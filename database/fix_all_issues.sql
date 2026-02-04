-- ============================================
-- Fix All Current Issues
-- ============================================
-- 1. Add unique constraint for phone numbers
-- 2. Add user deletion function
-- 3. Improve loan linking trigger
-- 4. Clean up orphaned data
-- ============================================

-- ============================================
-- 1. UNIQUE PHONE NUMBER CONSTRAINT
-- ============================================

-- First, identify and handle duplicate phone numbers
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT telefono, COUNT(*) as count
    FROM perfiles
    WHERE telefono IS NOT NULL AND telefono != ''
    GROUP BY telefono
    HAVING COUNT(*) > 1
  ) duplicates;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % duplicate phone numbers. Keeping only the newest entry for each.', duplicate_count;
    
    -- Delete older duplicates, keep the newest one
    DELETE FROM perfiles p1
    WHERE EXISTS (
      SELECT 1 FROM perfiles p2
      WHERE p2.telefono = p1.telefono
        AND p2.telefono IS NOT NULL
        AND p2.telefono != ''
        AND p2.created_at > p1.created_at
    );
  END IF;
END $$;

-- Add unique constraint on normalized phone numbers
-- This prevents duplicate phone numbers going forward
CREATE UNIQUE INDEX IF NOT EXISTS idx_perfiles_telefono_unique 
  ON perfiles (regexp_replace(telefono, '[^0-9+]', '', 'g'))
  WHERE telefono IS NOT NULL AND telefono != '';

-- Add comment explaining the constraint
COMMENT ON INDEX idx_perfiles_telefono_unique IS 
  'Ensures phone numbers are unique (normalized form). Each phone can only be registered once.';

-- ============================================
-- 2. IMPROVE PHONE NUMBER VALIDATION
-- ============================================

-- Function to validate phone number format
CREATE OR REPLACE FUNCTION validate_phone_number(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN TRUE; -- Allow null/empty
  END IF;
  
  -- Must start with + and have 8-15 digits
  RETURN phone ~ '^\+\d{8,15}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add check constraint for phone format (optional - comment out if too strict)
-- ALTER TABLE perfiles ADD CONSTRAINT check_phone_format 
--   CHECK (validate_phone_number(telefono));

-- ============================================
-- 3. USER DELETION FUNCTION
-- ============================================

-- Function to completely delete a user and all related data
CREATE OR REPLACE FUNCTION delete_user_completely(user_email TEXT)
RETURNS JSON AS $$
DECLARE
  user_record RECORD;
  result JSON;
BEGIN
  -- Find user
  SELECT id, email INTO user_record
  FROM auth.users
  WHERE email = user_email;
  
  IF user_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Delete in order (respecting foreign keys)
  -- 1. Delete invitations
  DELETE FROM invitaciones_prestamo
  WHERE prestamo_id IN (
    SELECT id FROM prestamos WHERE prestamista_id = user_record.id
  );
  
  -- 2. Delete cuotas
  DELETE FROM cuotas
  WHERE prestamo_id IN (
    SELECT id FROM prestamos 
    WHERE prestamista_id = user_record.id OR deudor_id = user_record.id
  );
  
  -- 3. Delete prestamos
  DELETE FROM prestamos
  WHERE prestamista_id = user_record.id OR deudor_id = user_record.id;
  
  -- 4. Delete profile
  DELETE FROM perfiles WHERE user_id = user_record.id;
  
  -- 5. Delete auth user
  DELETE FROM auth.users WHERE id = user_record.id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User deleted completely',
    'email', user_record.email
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. CLEAN UP ORPHANED DATA
-- ============================================

-- Remove profiles without auth users
DELETE FROM perfiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove prestamos with invalid prestamista_id
DELETE FROM prestamos
WHERE prestamista_id NOT IN (SELECT id FROM auth.users);

-- Unlink deudor_id if user was deleted
UPDATE prestamos
SET deudor_id = NULL
WHERE deudor_id IS NOT NULL 
  AND deudor_id NOT IN (SELECT id FROM auth.users);

-- ============================================
-- 5. IMPROVE LOAN LINKING WITH LOGGING
-- ============================================

-- Add a table to log linking attempts (for debugging)
CREATE TABLE IF NOT EXISTS loan_linking_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  user_phone TEXT,
  loans_linked INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enhanced loan linking function with logging
CREATE OR REPLACE FUNCTION vincular_prestamos_al_registrarse()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_telefono TEXT;
  normalized_user_phone TEXT;
  loans_linked INTEGER := 0;
BEGIN
  user_telefono := NEW.raw_user_meta_data->>'telefono';
  
  -- Normalize phone number: remove all non-digit characters except +
  normalized_user_phone := regexp_replace(user_telefono, '[^0-9+]', '', 'g');
  
  -- Vincular préstamos por teléfono (normalizado)
  WITH updated AS (
    UPDATE public.prestamos
    SET deudor_id = NEW.id
    WHERE regexp_replace(deudor_telefono, '[^0-9+]', '', 'g') = normalized_user_phone
      AND deudor_id IS NULL
      AND normalized_user_phone IS NOT NULL
      AND normalized_user_phone != ''
    RETURNING id
  )
  SELECT COUNT(*) INTO loans_linked FROM updated;
  
  -- Vincular préstamos por email si no se vinculó ninguno por teléfono
  IF loans_linked = 0 AND NEW.email IS NOT NULL THEN
    WITH updated AS (
      UPDATE public.prestamos
      SET deudor_id = NEW.id
      WHERE LOWER(deudor_email) = LOWER(NEW.email)
        AND deudor_id IS NULL
      RETURNING id
    )
    SELECT COUNT(*) INTO loans_linked FROM updated;
  END IF;
  
  -- Log the linking attempt
  INSERT INTO loan_linking_log (user_id, user_email, user_phone, loans_linked)
  VALUES (NEW.id, NEW.email, normalized_user_phone, loans_linked);
  
  IF loans_linked > 0 THEN
    RAISE NOTICE 'Linked % loans for user % (phone: %)', loans_linked, NEW.email, normalized_user_phone;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error linking loans for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_vincular_prestamos_al_registrarse ON auth.users;

CREATE TRIGGER trigger_vincular_prestamos_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION vincular_prestamos_al_registrarse();

-- ============================================
-- 6. HELPER FUNCTIONS FOR DEBUGGING
-- ============================================

-- Function to check phone number conflicts
CREATE OR REPLACE FUNCTION check_phone_conflicts()
RETURNS TABLE (
  telefono TEXT,
  user_count INTEGER,
  user_emails TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.telefono,
    COUNT(*)::INTEGER as user_count,
    array_agg(u.email) as user_emails
  FROM perfiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE p.telefono IS NOT NULL AND p.telefono != ''
  GROUP BY p.telefono
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Function to check if phone is already registered
CREATE OR REPLACE FUNCTION is_phone_registered(phone_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  normalized_phone TEXT;
  phone_exists BOOLEAN;
BEGIN
  normalized_phone := regexp_replace(phone_number, '[^0-9+]', '', 'g');
  
  SELECT EXISTS (
    SELECT 1 FROM perfiles
    WHERE regexp_replace(telefono, '[^0-9+]', '', 'g') = normalized_phone
  ) INTO phone_exists;
  
  RETURN phone_exists;
END;
$$ LANGUAGE plpgsql;

-- Function to find user by phone
CREATE OR REPLACE FUNCTION find_user_by_phone(phone_number TEXT)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  nombre TEXT,
  apellido TEXT,
  telefono TEXT
) AS $$
DECLARE
  normalized_phone TEXT;
BEGIN
  normalized_phone := regexp_replace(phone_number, '[^0-9+]', '', 'g');
  
  RETURN QUERY
  SELECT 
    p.user_id,
    u.email,
    p.nombre,
    p.apellido,
    p.telefono
  FROM perfiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE regexp_replace(p.telefono, '[^0-9+]', '', 'g') = normalized_phone;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. VERIFICATION QUERIES
-- ============================================

-- Show duplicate phones (should be empty after fix)
SELECT 'Duplicate Phones:' as check_type, COUNT(*) as count
FROM (
  SELECT telefono, COUNT(*) as count
  FROM perfiles
  WHERE telefono IS NOT NULL AND telefono != ''
  GROUP BY telefono
  HAVING COUNT(*) > 1
) dup;

-- Show orphaned profiles (should be empty)
SELECT 'Orphaned Profiles:' as check_type, COUNT(*) as count
FROM perfiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Show loans without valid prestamista
SELECT 'Invalid Loans:' as check_type, COUNT(*) as count
FROM prestamos
WHERE prestamista_id NOT IN (SELECT id FROM auth.users);

-- Show recent linking attempts
SELECT 
  'Recent Linkings:' as check_type,
  user_email,
  user_phone,
  loans_linked,
  created_at
FROM loan_linking_log
ORDER BY created_at DESC
LIMIT 5;

-- ============================================
-- SUMMARY
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Unique phone constraint added';
  RAISE NOTICE '✅ User deletion function created';
  RAISE NOTICE '✅ Loan linking improved with logging';
  RAISE NOTICE '✅ Orphaned data cleaned up';
  RAISE NOTICE '✅ Helper functions added for debugging';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '- Register users without phone conflicts';
  RAISE NOTICE '- Delete users with: SELECT delete_user_completely(''email@example.com'')';
  RAISE NOTICE '- Check phone conflicts with: SELECT * FROM check_phone_conflicts()';
  RAISE NOTICE '- View linking logs in: loan_linking_log table';
  RAISE NOTICE '============================================';
END $$;
