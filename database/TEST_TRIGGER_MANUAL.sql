-- ============================================
-- PRUEBA MANUAL DEL TRIGGER
-- ============================================
-- Este script simula lo que pasa cuando un usuario se registra

-- 1. Ver estado actual
SELECT 'ANTES DE LA PRUEBA' as fase;

SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_perfiles FROM perfiles;

-- 2. Insertar un usuario de prueba DIRECTAMENTE en auth.users
-- NOTA: Esto normalmente NO se puede hacer, pero lo intentaremos
-- Si falla, confirma que el problema NO es el trigger

DO $$
DECLARE
  test_user_id UUID;
  test_email TEXT := 'test_trigger_' || floor(random() * 10000) || '@test.com';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'INICIANDO PRUEBA DEL TRIGGER';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Email de prueba: %', test_email;
  
  -- Generar ID
  test_user_id := gen_random_uuid();
  
  RAISE NOTICE 'User ID generado: %', test_user_id;
  
  -- Intentar insertar en auth.users
  BEGIN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role
    ) VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      test_email,
      crypt('test123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object(
        'nombre', 'Test',
        'apellido', 'Trigger',
        'telefono', '+51999888777'
      ),
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE '✅ Usuario insertado en auth.users';
    
    -- Esperar un momento para que el trigger se ejecute
    PERFORM pg_sleep(1);
    
    -- Verificar si se creó el perfil
    IF EXISTS (SELECT 1 FROM perfiles WHERE user_id = test_user_id) THEN
      RAISE NOTICE '✅✅✅ EL TRIGGER FUNCIONÓ - Perfil creado automáticamente';
    ELSE
      RAISE NOTICE '❌❌❌ EL TRIGGER NO FUNCIONÓ - No se creó el perfil';
    END IF;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '❌ Error al insertar usuario: % - %', SQLERRM, SQLSTATE;
      RAISE NOTICE 'Esto es NORMAL - auth.users está protegida';
  END;
  
  RAISE NOTICE '============================================';
END $$;

-- 3. Ver el log de registros
SELECT 'LOG DE REGISTROS' as fase;
SELECT 
    user_id,
    email,
    phone,
    success,
    error_message,
    created_at
FROM auth_registration_log
ORDER BY created_at DESC
LIMIT 5;

-- 4. Ver usuarios sin perfil (zombies)
SELECT 'USUARIOS SIN PERFIL' as fase;
SELECT 
    u.id,
    u.email,
    u.created_at,
    'NO TIENE PERFIL ❌' as estado
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ORDER BY u.created_at DESC
LIMIT 5;

-- ============================================
-- INTERPRETACIÓN DE RESULTADOS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'INTERPRETACIÓN:';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Si el trigger funcionó (✅):';
  RAISE NOTICE '  → El problema NO es el trigger';
  RAISE NOTICE '  → El problema es que Supabase Auth rechaza crear el usuario';
  RAISE NOTICE '  → Revisa la configuración de Supabase Auth';
  RAISE NOTICE '';
  RAISE NOTICE 'Si el trigger NO funcionó (❌):';
  RAISE NOTICE '  → Hay un problema con el trigger mismo';
  RAISE NOTICE '  → Revisa el error en el log';
  RAISE NOTICE '';
  RAISE NOTICE 'Si no se pudo insertar en auth.users:';
  RAISE NOTICE '  → Esto es NORMAL (auth.users está protegida)';
  RAISE NOTICE '  → Necesitas usar supabase.auth.signUp() desde la app';
  RAISE NOTICE '============================================';
END $$;
