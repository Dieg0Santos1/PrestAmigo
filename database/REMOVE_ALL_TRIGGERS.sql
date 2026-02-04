-- ============================================
-- ELIMINAR TODOS LOS TRIGGERS PROBLEMÁTICOS
-- ============================================
-- Este script elimina todos los triggers en auth.users
-- para que el registro funcione sin problemas

-- 1. Ver todos los triggers actuales
SELECT 
    'TRIGGERS ACTUALES EN AUTH.USERS' as info,
    tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname;

-- 2. Eliminar TODOS los triggers personalizados en auth.users
-- (excepto los triggers del sistema de Supabase)
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' 
          AND c.relname = 'users'
          AND tgname IN (
            'trigger_crear_perfil_al_registrarse',
            'trigger_vincular_prestamos_al_registrarse',
            'auto_confirm_users'
          )
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.tgname || ' ON auth.users CASCADE';
        RAISE NOTICE 'Eliminado trigger: %', trigger_record.tgname;
    END LOOP;
END $$;

-- 3. Eliminar las funciones asociadas
DROP FUNCTION IF EXISTS crear_perfil_al_registrarse() CASCADE;
DROP FUNCTION IF EXISTS vincular_prestamos_al_registrarse() CASCADE;
DROP FUNCTION IF EXISTS auto_confirm_user() CASCADE;

-- 4. Verificar que no quedan triggers personalizados
SELECT 
    'TRIGGERS RESTANTES' as info,
    tgname as trigger_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users'
ORDER BY tgname;

-- ============================================
-- RESUMEN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ TODOS LOS TRIGGERS ELIMINADOS';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE:';
  RAISE NOTICE '  - Los triggers que creaban perfiles fueron eliminados';
  RAISE NOTICE '  - Ahora el registro funcionará SIN trigger';
  RAISE NOTICE '  - El código de la app creará el perfil manualmente';
  RAISE NOTICE '';
  RAISE NOTICE '📱 PRUEBA AHORA:';
  RAISE NOTICE '  1. Reinicia la app';
  RAISE NOTICE '  2. Intenta registrar un usuario';
  RAISE NOTICE '  3. NO debe dar error "Database error"';
  RAISE NOTICE '  4. El código creará el perfil después';
  RAISE NOTICE '============================================';
END $$;
