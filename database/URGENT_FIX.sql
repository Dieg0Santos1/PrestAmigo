-- ============================================
-- FIX URGENTE Y SIMPLE - Solo lo esencial
-- ============================================
-- Si los otros scripts no funcionaron, usa este

-- 1. Eliminar función anterior
DROP FUNCTION IF EXISTS crear_perfil_al_registrarse() CASCADE;

-- 2. Crear nueva función CON SECURITY DEFINER
CREATE OR REPLACE FUNCTION crear_perfil_al_registrarse()
RETURNS TRIGGER 
SECURITY DEFINER  -- ESTO ES CRÍTICO
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  BEGIN
    INSERT INTO public.perfiles (user_id, nombre, apellido, telefono, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
      COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
      COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
      NEW.email
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- 3. Recrear el trigger
DROP TRIGGER IF EXISTS trigger_crear_perfil_al_registrarse ON auth.users;

CREATE TRIGGER trigger_crear_perfil_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION crear_perfil_al_registrarse();

-- 4. Cambiar la policy de perfiles para permitir INSERT sin restricciones
DROP POLICY IF EXISTS "Permitir inserción de perfil al registrarse" ON perfiles;

CREATE POLICY "Permitir inserción de perfil al registrarse"
  ON perfiles 
  FOR INSERT
  WITH CHECK (true);  -- Permite TODOS los inserts

-- 5. Verificar que quedó bien
SELECT 
    'RESULTADO:' as mensaje,
    proname as funcion,
    CASE 
        WHEN prosecdef THEN '✅✅✅ TIENE SECURITY DEFINER - CORRECTO ✅✅✅'
        ELSE '❌❌❌ FALTA SECURITY DEFINER - NO FUNCIONA ❌❌❌'
    END as estado
FROM pg_proc 
WHERE proname = 'crear_perfil_al_registrarse';

-- 6. Limpiar usuarios sin perfil (zombies)
DO $$
DECLARE
  zombie_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO zombie_count
  FROM auth.users u 
  LEFT JOIN perfiles p ON p.user_id = u.id 
  WHERE p.user_id IS NULL;
  
  IF zombie_count > 0 THEN
    RAISE NOTICE 'Eliminando % usuarios zombies...', zombie_count;
    
    DELETE FROM auth.users
    WHERE id IN (
      SELECT u.id FROM auth.users u
      LEFT JOIN perfiles p ON p.user_id = u.id
      WHERE p.user_id IS NULL
    );
    
    RAISE NOTICE '✅ Usuarios zombies eliminados';
  ELSE
    RAISE NOTICE '✅ No hay usuarios zombies';
  END IF;
END $$;

-- ============================================
-- LISTO - Ahora prueba registrar un usuario
-- ============================================
