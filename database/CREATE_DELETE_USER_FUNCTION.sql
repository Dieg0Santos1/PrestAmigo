-- ============================================
-- FUNCIÓN PARA QUE USUARIOS ELIMINEN SU CUENTA
-- ============================================
-- Esta función permite que un usuario autenticado
-- elimine su propia cuenta de auth.users
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecutar con permisos elevados
SET search_path = public
AS $$
DECLARE
  user_uid uuid;
BEGIN
  -- Obtener el ID del usuario actual
  user_uid := auth.uid();
  
  -- Verificar que hay un usuario autenticado
  IF user_uid IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;
  
  -- Eliminar el usuario de auth.users
  -- Esto automáticamente eliminará registros relacionados por cascade
  DELETE FROM auth.users WHERE id = user_uid;
  
  RAISE LOG 'Usuario % eliminado correctamente', user_uid;
END;
$$;

-- Dar permisos a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Función delete_user() creada exitosamente';
  RAISE NOTICE '✅ Los usuarios pueden eliminar su propia cuenta';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Ahora puedes probar eliminar tu cuenta desde la app';
END $$;
