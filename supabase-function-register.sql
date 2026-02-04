-- ============================================
-- FUNCIÓN PARA REGISTRAR USUARIOS SIN TRIGGERS
-- ============================================
-- Esta función permite registrar usuarios directamente
-- sin depender de triggers que puedan fallar

CREATE OR REPLACE FUNCTION public.register_user_manually(
  p_email TEXT,
  p_password TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_telefono TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_user_id UUID;
  result JSON;
BEGIN
  -- 1. Verificar si el email ya existe
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este email ya está registrado'
    );
  END IF;
  
  -- 2. Verificar si el teléfono ya existe
  IF EXISTS (
    SELECT 1 FROM perfiles 
    WHERE regexp_replace(telefono, '[^0-9+]', '', 'g') = regexp_replace(p_telefono, '[^0-9+]', '', 'g')
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este número de teléfono ya está registrado'
    );
  END IF;
  
  -- 3. Generar ID para el usuario
  new_user_id := gen_random_uuid();
  
  -- 4. Insertar en auth.users (necesita permisos especiales)
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
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      crypt(p_password, gen_salt('bf')),
      now(), -- Auto-confirmar email
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'nombre', p_nombre,
        'apellido', p_apellido,
        'telefono', p_telefono
      ),
      'authenticated',
      'authenticated'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Error creando usuario: ' || SQLERRM
      );
  END;
  
  -- 5. Crear perfil en perfiles
  BEGIN
    INSERT INTO perfiles (user_id, nombre, apellido, telefono, email)
    VALUES (new_user_id, p_nombre, p_apellido, p_telefono, p_email);
  EXCEPTION
    WHEN OTHERS THEN
      -- Si falla el perfil, eliminar el usuario y abortar
      DELETE FROM auth.users WHERE id = new_user_id;
      RETURN json_build_object(
        'success', false,
        'error', 'Error creando perfil: ' || SQLERRM
      );
  END;
  
  -- 6. Retornar éxito
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', p_email
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Error inesperado: ' || SQLERRM
    );
END;
$$;

-- Dar permisos para que cualquiera pueda ejecutar esta función
GRANT EXECUTE ON FUNCTION public.register_user_manually TO anon;
GRANT EXECUTE ON FUNCTION public.register_user_manually TO authenticated;

-- ============================================
-- PROBAR LA FUNCIÓN
-- ============================================

-- Prueba de registro
SELECT public.register_user_manually(
  'test_manual@test.com',
  'password123',
  'Test',
  'Manual',
  '+51999888777'
);

-- Ver el usuario creado
SELECT 
  u.id,
  u.email,
  u.email_confirmed_at,
  p.nombre,
  p.apellido,
  p.telefono
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
WHERE u.email = 'test_manual@test.com';

-- ============================================
-- RESUMEN
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ FUNCIÓN DE REGISTRO MANUAL CREADA';
  RAISE NOTICE '============================================';
  RAISE NOTICE '';
  RAISE NOTICE '📱 AHORA PUEDES:';
  RAISE NOTICE '  1. Llamar a esta función desde el código';
  RAISE NOTICE '  2. Bypasear todos los triggers problemáticos';
  RAISE NOTICE '  3. Crear usuarios con perfil en una sola llamada';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ NOTA:';
  RAISE NOTICE '  Esta función necesita permisos SECURITY DEFINER';
  RAISE NOTICE '  para insertar en auth.users';
  RAISE NOTICE '============================================';
END $$;
