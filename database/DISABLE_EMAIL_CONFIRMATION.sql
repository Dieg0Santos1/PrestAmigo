-- ============================================
-- DESACTIVAR EMAIL CONFIRMATION
-- ============================================
-- Esto permite que los usuarios se registren sin confirmar email

-- 1. Ver configuración actual de Auth
SELECT 
    'AUTH CONFIG' as info,
    key,
    value
FROM auth.config
WHERE key IN (
    'MAILER_AUTOCONFIRM',
    'DISABLE_SIGNUP',
    'ENABLE_SIGNUP'
);

-- 2. Confirmar automáticamente a todos los usuarios nuevos
-- Esto se hace modificando el trigger para que marque email_confirmed_at

DROP TRIGGER IF EXISTS auto_confirm_users ON auth.users;

CREATE OR REPLACE FUNCTION auto_confirm_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Confirmar email automáticamente
  NEW.email_confirmed_at := now();
  NEW.confirmed_at := now();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_confirm_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION auto_confirm_user();

-- 3. Confirmar usuarios existentes que no están confirmados
UPDATE auth.users
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, created_at),
  confirmed_at = COALESCE(confirmed_at, created_at)
WHERE email_confirmed_at IS NULL;

-- ============================================
-- RESUMEN
-- ============================================

DO $$
DECLARE
  unconfirmed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unconfirmed_count
  FROM auth.users
  WHERE email_confirmed_at IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ EMAIL CONFIRMATION DESACTIVADA';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📧 Cambios aplicados:';
  RAISE NOTICE '  - Trigger creado para auto-confirmar usuarios';
  RAISE NOTICE '  - Usuarios existentes confirmados';
  RAISE NOTICE '  - Usuarios sin confirmar: %', unconfirmed_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Ahora puedes registrar usuarios sin confirmar email';
  RAISE NOTICE '============================================';
END $$;

-- Ver estado final
SELECT 
    'USUARIOS SIN CONFIRMAR' as info,
    COUNT(*) as cantidad
FROM auth.users
WHERE email_confirmed_at IS NULL;
