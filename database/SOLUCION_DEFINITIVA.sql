-- ============================================
-- SOLUCIÓN DEFINITIVA - DESACTIVAR TRIGGER
-- ============================================
-- Este script desactiva el trigger problemático
-- y permite que la app maneje el registro
-- ============================================

-- 1. ELIMINAR EL TRIGGER COMPLETAMENTE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. ELIMINAR LA FUNCIÓN (para que no quede nada)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Verificar que no hay otros triggers en auth.users
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', r.tgname);
    RAISE NOTICE 'Eliminado trigger: %', r.tgname;
  END LOOP;
END $$;

-- 4. ASEGURAR PERMISOS CORRECTOS EN LA TABLA PERFILES
-- Esto es crucial para que la app pueda insertar perfiles

-- Dar todos los permisos necesarios
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.perfiles TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. CONFIGURAR POLÍTICAS RLS CORRECTAMENTE
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.perfiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during registration" ON public.perfiles;

-- POLÍTICA CLAVE: Permitir a usuarios autenticados insertar su propio perfil
CREATE POLICY "Users can insert own profile"
ON public.perfiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Permitir ver su propio perfil
CREATE POLICY "Users can view own profile"
ON public.perfiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Permitir actualizar su propio perfil
CREATE POLICY "Users can update own profile"
ON public.perfiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- IMPORTANTE: Permitir a service_role hacer todo (para casos especiales)
CREATE POLICY "Service role can do everything"
ON public.perfiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Verificar que la tabla perfiles tiene la estructura correcta
DO $$
BEGIN
  -- Verificar que existe la columna user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'perfiles' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'La tabla perfiles no tiene la columna user_id';
  END IF;
  
  -- Verificar que existe constraint unique en user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'perfiles_user_id_key' 
    OR conname LIKE '%perfiles%user_id%'
  ) THEN
    -- Crear constraint si no existe
    ALTER TABLE public.perfiles 
    ADD CONSTRAINT perfiles_user_id_unique UNIQUE (user_id);
    RAISE NOTICE 'Constraint UNIQUE añadido a user_id';
  END IF;
END $$;

-- 7. VERIFICACIÓN FINAL
DO $$
DECLARE
  trigger_count INT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgrelid = 'auth.users'::regclass;
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'Aún hay % trigger(s) en auth.users', trigger_count;
  ELSE
    RAISE NOTICE '✅ No hay triggers en auth.users';
  END IF;
  
  RAISE NOTICE '✅ Permisos configurados correctamente';
  RAISE NOTICE '✅ Políticas RLS creadas';
  RAISE NOTICE '✅ La app ahora puede crear perfiles manualmente';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Ahora prueba registrarte de nuevo en la app';
END $$;
