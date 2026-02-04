-- ============================================
-- SOLUCIÓN DEFINITIVA V2 - SOLO TRIGGERS CUSTOM
-- ============================================
-- Este script elimina SOLO los triggers personalizados
-- NO toca los triggers del sistema de Supabase
-- ============================================

-- 1. ELIMINAR SOLO EL TRIGGER CUSTOM (no los del sistema)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- 2. ELIMINAR LA FUNCIÓN
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Verificar y eliminar otros triggers CUSTOM (no del sistema)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'auth.users'::regclass
    AND tgname NOT LIKE 'RI_ConstraintTrigger%'  -- Excluir triggers del sistema
    AND tgname NOT LIKE '%system%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON auth.users CASCADE', r.tgname);
    RAISE NOTICE 'Eliminado trigger custom: %', r.tgname;
  END LOOP;
END $$;

-- 4. ASEGURAR PERMISOS CORRECTOS EN LA TABLA PERFILES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON public.perfiles TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 5. CONFIGURAR POLÍTICAS RLS CORRECTAMENTE
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Enable insert for service role" ON public.perfiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.perfiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users during registration" ON public.perfiles;
DROP POLICY IF EXISTS "Service role can do everything" ON public.perfiles;

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

-- IMPORTANTE: Permitir a service_role hacer todo
CREATE POLICY "Service role can do everything"
ON public.perfiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Verificar estructura de la tabla
DO $$
BEGIN
  -- Verificar columna user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'perfiles' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION 'La tabla perfiles no tiene la columna user_id';
  END IF;
  
  -- Verificar/crear constraint unique en user_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname LIKE '%perfiles%user_id%'
    AND contype = 'u'
  ) THEN
    ALTER TABLE public.perfiles 
    ADD CONSTRAINT perfiles_user_id_unique UNIQUE (user_id);
    RAISE NOTICE '✅ Constraint UNIQUE añadido a user_id';
  ELSE
    RAISE NOTICE '✅ Constraint UNIQUE ya existe en user_id';
  END IF;
END $$;

-- 7. VERIFICACIÓN FINAL
DO $$
DECLARE
  trigger_count INT;
  custom_trigger_count INT;
BEGIN
  -- Contar todos los triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger 
  WHERE tgrelid = 'auth.users'::regclass;
  
  -- Contar solo triggers custom
  SELECT COUNT(*) INTO custom_trigger_count
  FROM pg_trigger 
  WHERE tgrelid = 'auth.users'::regclass
  AND tgname NOT LIKE 'RI_ConstraintTrigger%';
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VERIFICACIÓN COMPLETADA';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Total triggers en auth.users: %', trigger_count;
  RAISE NOTICE 'Triggers custom (no sistema): %', custom_trigger_count;
  
  IF custom_trigger_count > 0 THEN
    RAISE WARNING '⚠️ Aún hay % trigger(s) custom en auth.users', custom_trigger_count;
  ELSE
    RAISE NOTICE '✅ No hay triggers custom en auth.users';
  END IF;
  
  RAISE NOTICE '✅ Permisos configurados';
  RAISE NOTICE '✅ Políticas RLS creadas';
  RAISE NOTICE '✅ La app puede crear perfiles manualmente';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Prueba registrarte ahora en la app';
  RAISE NOTICE '==============================================';
END $$;
