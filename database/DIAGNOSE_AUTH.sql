-- ============================================
-- DIAGNÓSTICO DE AUTH Y REGISTRO
-- ============================================

-- 1. Ver usuarios en auth.users
SELECT 
    'USUARIOS EN AUTH' as info,
    id,
    email,
    created_at,
    confirmation_sent_at,
    confirmed_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 2. Ver perfiles correspondientes
SELECT 
    'PERFILES' as info,
    p.user_id,
    p.nombre,
    p.apellido,
    p.telefono,
    p.email,
    p.created_at
FROM perfiles p
ORDER BY p.created_at DESC
LIMIT 5;

-- 3. Verificar que el trigger existe y está activo
SELECT 
    'TRIGGER STATUS' as info,
    tgname as trigger_name,
    tgenabled as enabled,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ ACTIVO'
        ELSE '❌ DESACTIVADO'
    END as estado
FROM pg_trigger
WHERE tgname = 'trigger_crear_perfil_al_registrarse';

-- 4. Verificar la función del trigger
SELECT 
    'TRIGGER FUNCTION' as info,
    proname as function_name,
    prosecdef as has_security_definer,
    CASE 
        WHEN prosecdef THEN '✅ Tiene SECURITY DEFINER'
        ELSE '❌ NO tiene SECURITY DEFINER'
    END as estado
FROM pg_proc
WHERE proname = 'crear_perfil_al_registrarse';

-- 5. Ver RLS status
SELECT 
    'RLS STATUS' as info,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '⚠️ RLS ACTIVO'
        ELSE '✅ RLS DESACTIVADO'
    END as estado
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'perfiles';

-- 6. Ver todas las policies en perfiles
SELECT 
    'POLICIES EN PERFILES' as info,
    policyname,
    cmd as command,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ SELECT'
        WHEN 'INSERT' THEN '➕ INSERT'
        WHEN 'UPDATE' THEN '✏️ UPDATE'
        WHEN 'DELETE' THEN '🗑️ DELETE'
    END as tipo
FROM pg_policies
WHERE tablename = 'perfiles';

-- 7. Verificar estructura de perfiles
SELECT 
    'ESTRUCTURA PERFILES' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'perfiles'
ORDER BY ordinal_position;

-- 8. Ver si hay constraints que puedan estar bloqueando
SELECT
    'CONSTRAINTS' as info,
    conname as constraint_name,
    contype as constraint_type,
    CASE contype
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
    END as tipo
FROM pg_constraint
WHERE conrelid = 'perfiles'::regclass;

-- ============================================
-- CREAR TABLA DE LOG PARA DEBUG
-- ============================================

-- Crear tabla para loggear intentos de registro
CREATE TABLE IF NOT EXISTS auth_registration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    phone TEXT,
    error_message TEXT,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Función mejorada del trigger con logging
CREATE OR REPLACE FUNCTION crear_perfil_al_registrarse()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  insert_successful BOOLEAN := FALSE;
  error_msg TEXT := NULL;
BEGIN
  BEGIN
    -- Log de inicio
    RAISE NOTICE '[TRIGGER] Iniciando creación de perfil para user_id: %, email: %', NEW.id, NEW.email;
    
    -- Intentar insertar
    INSERT INTO public.perfiles (user_id, nombre, apellido, telefono, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
      COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
      COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
      COALESCE(NEW.email, '')
    );
    
    insert_successful := TRUE;
    RAISE NOTICE '[TRIGGER] ✅ Perfil creado exitosamente para: %', NEW.email;
    
  EXCEPTION 
    WHEN unique_violation THEN
      error_msg := 'Perfil duplicado para user_id ' || NEW.id;
      RAISE WARNING '[TRIGGER] ❌ %', error_msg;
    WHEN foreign_key_violation THEN
      error_msg := 'Error de clave foránea para user_id ' || NEW.id;
      RAISE WARNING '[TRIGGER] ❌ %', error_msg;
    WHEN OTHERS THEN
      error_msg := 'Error: ' || SQLERRM || ' - Estado: ' || SQLSTATE;
      RAISE WARNING '[TRIGGER] ❌ Error inesperado al crear perfil para %: %', NEW.email, error_msg;
  END;
  
  -- Registrar el intento (siempre, incluso si falla)
  BEGIN
    INSERT INTO auth_registration_log (user_id, email, phone, error_message, success)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'telefono',
      error_msg,
      insert_successful
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '[TRIGGER] No se pudo registrar el log: %', SQLERRM;
  END;
  
  -- Siempre retornar NEW para no bloquear el registro en auth.users
  RETURN NEW;
END;
$$;

-- Recrear el trigger
DROP TRIGGER IF EXISTS trigger_crear_perfil_al_registrarse ON auth.users;
CREATE TRIGGER trigger_crear_perfil_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION crear_perfil_al_registrarse();

-- ============================================
-- RESUMEN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ DIAGNÓSTICO Y LOGGING CONFIGURADO';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Revisa los resultados arriba para ver:';
  RAISE NOTICE '  - Estado del trigger';
  RAISE NOTICE '  - Estado de RLS';
  RAISE NOTICE '  - Usuarios y perfiles existentes';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Se creó tabla: auth_registration_log';
  RAISE NOTICE '  Para ver intentos de registro:';
  RAISE NOTICE '  SELECT * FROM auth_registration_log ORDER BY created_at DESC;';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 El trigger ahora loggea TODOS los intentos';
  RAISE NOTICE '============================================';
END $$;
