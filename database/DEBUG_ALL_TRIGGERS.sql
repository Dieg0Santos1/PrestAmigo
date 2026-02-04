-- ============================================
-- VER TODOS LOS TRIGGERS EN AUTH.USERS
-- ============================================

-- 1. TODOS los triggers (incluyendo sistema)
SELECT 
    'TODOS LOS TRIGGERS' as tipo,
    tgname as nombre,
    tgenabled as habilitado,
    tgtype as tipo_trigger,
    pg_get_triggerdef(t.oid) as definicion_completa
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname;

-- 2. Funciones de esos triggers
SELECT 
    'FUNCIONES DE TRIGGER' as tipo,
    p.proname as nombre_funcion,
    pg_get_functiondef(p.oid) as definicion
FROM pg_proc p
WHERE p.proname IN (
    SELECT p2.proname
    FROM pg_trigger t
    JOIN pg_proc p2 ON t.tgfoid = p2.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'auth' AND c.relname = 'users'
);

-- 3. Ver si hay extensiones o hooks
SELECT 
    'EXTENSIONES' as tipo,
    extname as nombre,
    extversion as version
FROM pg_extension;

-- 4. Ver usuarios recientes y su estado
SELECT 
    'ULTIMOS USUARIOS' as tipo,
    id,
    email,
    created_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users
ORDER BY created_at DESC
LIMIT 3;

-- 5. Ver perfiles
SELECT 
    'PERFILES' as tipo,
    user_id,
    nombre,
    apellido,
    telefono,
    email
FROM perfiles
ORDER BY created_at DESC
LIMIT 3;

-- ============================================
-- RESUMEN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'DEBUG COMPLETO DE AUTH.USERS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Revisa los resultados arriba para encontrar:';
  RAISE NOTICE '  1. Triggers que están bloqueando el registro';
  RAISE NOTICE '  2. Funciones que lanzan excepciones';
  RAISE NOTICE '  3. Estado de usuarios y perfiles';
  RAISE NOTICE '============================================';
END $$;
