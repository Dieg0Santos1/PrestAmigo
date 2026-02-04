-- ============================================
-- RESETEAR TODO - ÚSALO CON CUIDADO
-- ============================================
-- ⚠️ ESTO ELIMINARÁ TODOS LOS DATOS

-- 1. Eliminar TODOS los triggers personalizados en auth.users
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT tgname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'auth' AND c.relname = 'users'
          AND tgname NOT LIKE 'pg_%' -- No eliminar triggers del sistema
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_rec.tgname || ' ON auth.users CASCADE';
        RAISE NOTICE 'Eliminado: %', trigger_rec.tgname;
    END LOOP;
END $$;

-- 2. Eliminar todas las funciones de trigger personalizadas
DROP FUNCTION IF EXISTS crear_perfil_al_registrarse() CASCADE;
DROP FUNCTION IF EXISTS vincular_prestamos_al_registrarse() CASCADE;
DROP FUNCTION IF EXISTS auto_confirm_user() CASCADE;
DROP FUNCTION IF EXISTS register_user_manually(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;

-- 3. Eliminar todos los usuarios
DELETE FROM auth.users;

-- 4. Truncar tablas de la aplicación
TRUNCATE perfiles CASCADE;
TRUNCATE prestamos CASCADE;
TRUNCATE cuotas CASCADE;
TRUNCATE invitaciones_prestamo CASCADE;

-- 5. Truncar tablas de log si existen
DROP TABLE IF EXISTS auth_registration_log CASCADE;
DROP TABLE IF EXISTS loan_linking_log CASCADE;

-- 6. Verificar que todo está limpio
SELECT 'Usuarios restantes' as tabla, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Perfiles restantes', COUNT(*) FROM perfiles
UNION ALL
SELECT 'Préstamos restantes', COUNT(*) FROM prestamos;

-- 7. Verificar triggers restantes
SELECT 
    'Triggers en auth.users' as info,
    tgname as nombre
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ BASE DE DATOS RESETEADA';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Todo ha sido eliminado:';
  RAISE NOTICE '  - Todos los triggers personalizados';
  RAISE NOTICE '  - Todos los usuarios';
  RAISE NOTICE '  - Todos los datos de la aplicación';
  RAISE NOTICE '';
  RAISE NOTICE '📱 AHORA PRUEBA REGISTRAR UN USUARIO';
  RAISE NOTICE '  Debería funcionar sin triggers';
  RAISE NOTICE '============================================';
END $$;
