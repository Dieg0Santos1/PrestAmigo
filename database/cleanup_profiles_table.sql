-- ============================================
-- Verificar y Limpiar: profiles vs perfiles
-- ============================================
-- Este script verifica qué tabla existe y limpia
-- cualquier conflicto entre 'profiles' y 'perfiles'
-- ============================================

-- ============================================
-- 1. VERIFICAR QUÉ TABLAS EXISTEN
-- ============================================

DO $$
DECLARE
  perfiles_exists BOOLEAN;
  profiles_exists BOOLEAN;
  perfiles_count INTEGER;
  profiles_count INTEGER;
BEGIN
  -- Verificar si existe 'perfiles'
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'perfiles'
  ) INTO perfiles_exists;
  
  -- Verificar si existe 'profiles'
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'VERIFICACIÓN DE TABLAS';
  RAISE NOTICE '============================================';
  
  IF perfiles_exists THEN
    SELECT COUNT(*) INTO perfiles_count FROM perfiles;
    RAISE NOTICE '✅ Tabla "perfiles" EXISTE - % registros', perfiles_count;
  ELSE
    RAISE NOTICE '❌ Tabla "perfiles" NO EXISTE';
  END IF;
  
  IF profiles_exists THEN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    RAISE NOTICE '⚠️  Tabla "profiles" EXISTE - % registros', profiles_count;
  ELSE
    RAISE NOTICE '✅ Tabla "profiles" NO EXISTE (correcto)';
  END IF;
  
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 2. VERIFICAR ESTRUCTURA DE 'perfiles'
-- ============================================

SELECT 
  'Estructura de perfiles:' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'perfiles'
ORDER BY ordinal_position;

-- ============================================
-- 3. VERIFICAR SI HAY DATOS EN 'profiles'
-- ============================================

DO $$
DECLARE
  profiles_exists BOOLEAN;
  profiles_count INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  IF profiles_exists THEN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    
    IF profiles_count > 0 THEN
      RAISE NOTICE '';
      RAISE NOTICE '⚠️  WARNING: La tabla "profiles" tiene % registros', profiles_count;
      RAISE NOTICE '⚠️  Estos datos NO se están usando en la app';
      RAISE NOTICE '⚠️  La app usa la tabla "perfiles" (español)';
    END IF;
  END IF;
END $$;

-- ============================================
-- 4. MOSTRAR DATOS DE 'profiles' (si existe)
-- ============================================

DO $$
DECLARE
  profiles_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  IF profiles_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Datos en tabla "profiles":';
    
    -- Crear query dinámico para mostrar datos
    PERFORM * FROM profiles LIMIT 5;
  END IF;
END $$;

-- Ver datos de profiles si existe
SELECT 'Datos en profiles (primeros 5):' as info, * 
FROM profiles 
LIMIT 5;

-- ============================================
-- 5. COMPARAR USUARIOS: auth.users vs perfiles
-- ============================================

RAISE NOTICE '';
RAISE NOTICE '============================================';
RAISE NOTICE 'COMPARACIÓN DE USUARIOS';
RAISE NOTICE '============================================';

-- Usuarios en auth.users
SELECT 
  'Usuarios en auth.users:' as tipo,
  COUNT(*) as total
FROM auth.users

UNION ALL

-- Usuarios con perfil en perfiles
SELECT 
  'Usuarios con perfil en perfiles:',
  COUNT(*)
FROM auth.users u
JOIN perfiles p ON p.user_id = u.id

UNION ALL

-- Usuarios SIN perfil (zombies)
SELECT 
  'Usuarios SIN perfil (zombies):',
  COUNT(*)
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- ============================================
-- 6. MOSTRAR USUARIOS ZOMBIES (sin perfil)
-- ============================================

SELECT 
  'USUARIOS ZOMBIES (auth.users sin perfiles):' as warning,
  u.id,
  u.email,
  u.created_at
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ORDER BY u.created_at DESC;

-- ============================================
-- 7. ACCIÓN: ELIMINAR TABLA 'profiles'
-- ============================================

DO $$
DECLARE
  profiles_exists BOOLEAN;
  profiles_count INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  IF profiles_exists THEN
    SELECT COUNT(*) INTO profiles_count FROM profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'ELIMINAR TABLA "profiles"';
    RAISE NOTICE '============================================';
    
    IF profiles_count = 0 THEN
      -- La tabla está vacía, eliminarla es seguro
      DROP TABLE IF EXISTS profiles CASCADE;
      RAISE NOTICE '✅ Tabla "profiles" eliminada (estaba vacía)';
    ELSE
      RAISE NOTICE '⚠️  WARNING: "profiles" tiene % registros', profiles_count;
      RAISE NOTICE '⚠️  NO se eliminó automáticamente por seguridad';
      RAISE NOTICE '';
      RAISE NOTICE 'Para eliminarla manualmente, ejecuta:';
      RAISE NOTICE '  DROP TABLE profiles CASCADE;';
      RAISE NOTICE '';
      RAISE NOTICE 'O si quieres migrar los datos de profiles → perfiles:';
      RAISE NOTICE '  Ver sección 8 de este script';
    END IF;
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ Tabla "profiles" no existe (correcto)';
  END IF;
END $$;

-- ============================================
-- 8. MIGRAR DATOS: profiles → perfiles
-- ============================================
-- (Descomenta si necesitas migrar datos)

/*
DO $$
DECLARE
  profiles_exists BOOLEAN;
  migrated_count INTEGER := 0;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  IF profiles_exists THEN
    -- Insertar datos de profiles en perfiles (evitando duplicados)
    INSERT INTO perfiles (user_id, nombre, apellido, telefono, email, created_at, updated_at)
    SELECT 
      pr.user_id,
      pr.nombre,
      pr.apellido,
      pr.telefono,
      pr.email,
      pr.created_at,
      pr.updated_at
    FROM profiles pr
    WHERE NOT EXISTS (
      SELECT 1 FROM perfiles pe WHERE pe.user_id = pr.user_id
    );
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    
    RAISE NOTICE '✅ Migrados % registros de profiles → perfiles', migrated_count;
    
    -- Ahora sí eliminar profiles
    DROP TABLE profiles CASCADE;
    RAISE NOTICE '✅ Tabla "profiles" eliminada después de migración';
  END IF;
END $$;
*/

-- ============================================
-- 9. LIMPIAR USUARIOS ZOMBIES
-- ============================================

DO $$
DECLARE
  zombie_count INTEGER;
BEGIN
  -- Contar zombies
  SELECT COUNT(*) INTO zombie_count
  FROM auth.users u
  LEFT JOIN perfiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL;
  
  IF zombie_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'LIMPIAR USUARIOS ZOMBIES';
    RAISE NOTICE '============================================';
    RAISE NOTICE '⚠️  Encontrados % usuarios sin perfil', zombie_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Para eliminarlos, ejecuta:';
    RAISE NOTICE '';
    RAISE NOTICE 'DELETE FROM auth.users';
    RAISE NOTICE 'WHERE id IN (';
    RAISE NOTICE '  SELECT u.id FROM auth.users u';
    RAISE NOTICE '  LEFT JOIN perfiles p ON p.user_id = u.id';
    RAISE NOTICE '  WHERE p.user_id IS NULL';
    RAISE NOTICE ');';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ No hay usuarios zombies';
  END IF;
END $$;

-- ============================================
-- 10. RESUMEN FINAL
-- ============================================

DO $$
DECLARE
  perfiles_exists BOOLEAN;
  profiles_exists BOOLEAN;
  perfiles_count INTEGER := 0;
  users_count INTEGER;
  zombies_count INTEGER;
BEGIN
  -- Verificar existencia
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'perfiles'
  ) INTO perfiles_exists;
  
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) INTO profiles_exists;
  
  -- Contar registros
  IF perfiles_exists THEN
    SELECT COUNT(*) INTO perfiles_count FROM perfiles;
  END IF;
  
  SELECT COUNT(*) INTO users_count FROM auth.users;
  
  SELECT COUNT(*) INTO zombies_count
  FROM auth.users u
  LEFT JOIN perfiles p ON p.user_id = u.id
  WHERE p.user_id IS NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'RESUMEN FINAL';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tabla "perfiles": % (% registros)', 
    CASE WHEN perfiles_exists THEN '✅ EXISTE' ELSE '❌ NO EXISTE' END, 
    perfiles_count;
  RAISE NOTICE 'Tabla "profiles": %', 
    CASE WHEN profiles_exists THEN '⚠️  EXISTE (debería eliminarse)' ELSE '✅ NO EXISTE' END;
  RAISE NOTICE 'Usuarios en auth.users: %', users_count;
  RAISE NOTICE 'Usuarios zombies: %', zombies_count;
  RAISE NOTICE '============================================';
  
  IF NOT profiles_exists AND zombies_count = 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '🎉 ¡TODO ESTÁ CORRECTO!';
    RAISE NOTICE '   - Solo existe la tabla "perfiles"';
    RAISE NOTICE '   - No hay usuarios zombies';
    RAISE NOTICE '   - La base de datos está limpia';
  END IF;
END $$;
