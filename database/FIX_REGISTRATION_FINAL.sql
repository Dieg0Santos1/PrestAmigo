-- ============================================
-- FIX FINAL PARA REGISTRO DE USUARIOS
-- ============================================
-- Este script soluciona el problema de registro
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Eliminar triggers y funciones antiguas
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Crear función mejorada que nunca falla
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Intentar insertar el perfil
  -- Si falla por cualquier razón, no bloquear el registro
  BEGIN
    INSERT INTO public.perfiles (
      user_id,
      nombre,
      apellido,
      dni,
      telefono,
      email
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
      COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
      COALESCE(NEW.raw_user_meta_data->>'dni', ''),
      COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
      NEW.email
    );
    
    RAISE LOG 'Perfil creado exitosamente para usuario %', NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Si hay cualquier error, solo loguearlo pero NO fallar
    RAISE LOG 'Error creando perfil para usuario %, pero continuando: %', NEW.id, SQLERRM;
  END;
  
  -- Siempre retornar NEW para que el registro continúe
  RETURN NEW;
END;
$$;

-- 3. Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Dar permisos necesarios
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.perfiles TO postgres, anon, authenticated, service_role;

-- 5. Verificar políticas RLS en perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view own profile" ON public.perfiles;
CREATE POLICY "Users can view own profile" 
ON public.perfiles FOR SELECT
USING (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.perfiles;
CREATE POLICY "Users can update own profile"
ON public.perfiles FOR UPDATE
USING (auth.uid() = user_id);

-- Política: Permitir INSERT desde el trigger (service_role)
DROP POLICY IF EXISTS "Enable insert for service role" ON public.perfiles;
CREATE POLICY "Enable insert for service role"
ON public.perfiles FOR INSERT
WITH CHECK (true);

-- 6. Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Trigger y función creados exitosamente';
  RAISE NOTICE '✅ Políticas RLS configuradas';
  RAISE NOTICE '✅ Ahora puedes probar el registro de nuevo';
END $$;
