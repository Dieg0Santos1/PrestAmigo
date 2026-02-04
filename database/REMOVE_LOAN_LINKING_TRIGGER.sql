-- Eliminar el trigger de vinculación de préstamos
DROP TRIGGER IF EXISTS trigger_vincular_prestamos_al_registrarse ON auth.users CASCADE;
DROP FUNCTION IF EXISTS vincular_prestamos_al_registrarse() CASCADE;

-- Verificar que se eliminó
SELECT 'Triggers restantes en auth.users' as info, COUNT(*) as cantidad
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' AND c.relname = 'users';

RAISE NOTICE '✅ Trigger de vinculación eliminado';
