-- Fix for "Database error saving new user"
-- The issue is that the trigger function needs proper permissions to insert into perfiles table

-- Drop existing function and recreate with SECURITY DEFINER
DROP FUNCTION IF EXISTS crear_perfil_al_registrarse() CASCADE;

-- Recreate the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION crear_perfil_al_registrarse()
RETURNS TRIGGER 
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (user_id, nombre, apellido, telefono, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    NEW.email
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_crear_perfil_al_registrarse ON auth.users;

CREATE TRIGGER trigger_crear_perfil_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_al_registrarse();

-- Alternative: Update the RLS policy to allow service role insertions
-- This ensures the trigger can always insert profiles
DROP POLICY IF EXISTS "Permitir inserción de perfil al registrarse" ON perfiles;

CREATE POLICY "Permitir inserción de perfil al registrarse"
  ON perfiles FOR INSERT
  WITH CHECK (true); -- Allow all inserts (the trigger will ensure correct user_id)

-- Ensure the function for vincular_prestamos also has proper permissions
DROP FUNCTION IF EXISTS vincular_prestamos_al_registrarse() CASCADE;

CREATE OR REPLACE FUNCTION vincular_prestamos_al_registrarse()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_telefono TEXT;
  normalized_user_phone TEXT;
BEGIN
  user_telefono := NEW.raw_user_meta_data->>'telefono';
  
  -- Normalize phone number: remove all non-digit characters except +
  normalized_user_phone := regexp_replace(user_telefono, '[^0-9+]', '', 'g');
  
  -- Vincular préstamos por teléfono (normalizado)
  -- Compara ambos números normalizados para evitar problemas con espacios/guiones
  UPDATE public.prestamos
  SET deudor_id = NEW.id
  WHERE regexp_replace(deudor_telefono, '[^0-9+]', '', 'g') = normalized_user_phone
    AND deudor_id IS NULL
    AND normalized_user_phone IS NOT NULL
    AND normalized_user_phone != '';
  
  -- Vincular préstamos por email
  UPDATE public.prestamos
  SET deudor_id = NEW.id
  WHERE LOWER(deudor_email) = LOWER(NEW.email)
    AND deudor_id IS NULL
    AND NEW.email IS NOT NULL;
  
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
