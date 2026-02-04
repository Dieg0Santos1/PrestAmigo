-- ============================================
-- ENCONTRAR QUÉ ESTÁ BLOQUEANDO EL REGISTRO
-- ============================================

-- 1. Ver TODOS los triggers en auth.users
SELECT 
    'TRIGGERS EN AUTH.USERS' as info,
    tgname as trigger_name,
    tgenabled as enabled,
    pg_get_triggerdef(oid) as definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname;

-- 2. Ver constraints en auth.users
SELECT
    'CONSTRAINTS EN AUTH.USERS' as info,
    conname as constraint_name,
    contype as type,
    CASE contype
        WHEN 'c' THEN 'CHECK'
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 't' THEN 'TRIGGER'
        WHEN 'x' THEN 'EXCLUSION'
    END as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'auth.users'::regclass;

-- 3. Ver funciones de los triggers
SELECT 
    'FUNCIONES DE TRIGGER' as info,
    p.proname as function_name,
    prosecdef as has_security_definer,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_trigger t ON t.tgfoid = p.oid
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'users' AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth');

-- 4. Verificar configuración de Supabase Auth
-- (esto no está en la BD, pero podemos ver indicios)
SELECT 
    'USUARIOS RECIENTES' as info,
    id,
    email,
    created_at,
    email_confirmed_at,
    confirmation_sent_at,
    raw_app_meta_data,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

-- 5. Ver si hay políticas o extensiones que puedan interferir
SELECT 
    'EXTENSIONES ACTIVAS' as info,
    extname as extension_name,
    extversion as version
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net', 'supabase_vault', 'pgsodium');

-- ============================================
-- RECOMENDACIÓN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'ANÁLISIS COMPLETO';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Revisa los resultados arriba para encontrar:';
  RAISE NOTICE '  1. Triggers adicionales que puedan estar fallando';
  RAISE NOTICE '  2. Constraints que rechacen el insert';
  RAISE NOTICE '  3. Funciones que lancen excepciones';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ SI TODO SE VE BIEN EN LA BD:';
  RAISE NOTICE '  El problema puede estar en:';
  RAISE NOTICE '  - Supabase Auth Hooks (configuración web)';
  RAISE NOTICE '  - Límites de rate limiting';
  RAISE NOTICE '  - Configuración de email confirmation';
  RAISE NOTICE '';
  RAISE NOTICE '💡 SOLUCIÓN ALTERNATIVA:';
  RAISE NOTICE '  Deshabilitar email confirmation en Supabase';
  RAISE NOTICE '============================================';
END $$;
