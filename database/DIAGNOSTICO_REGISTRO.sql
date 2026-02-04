-- ============================================
-- DIAGNÓSTICO COMPLETO DEL SISTEMA DE REGISTRO
-- ============================================
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Verificar si existe la tabla perfiles
SELECT 'TABLA PERFILES' as check_type, 
       CASE WHEN EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'perfiles'
       ) THEN '✅ Existe' ELSE '❌ No existe' END as status;

-- 2. Verificar estructura de la tabla perfiles
SELECT 'COLUMNAS DE PERFILES' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'perfiles'
ORDER BY ordinal_position;

-- 3. Verificar trigger
SELECT 'TRIGGER on_auth_user_created' as check_type,
       CASE WHEN EXISTS (
         SELECT FROM pg_trigger 
         WHERE tgname = 'on_auth_user_created'
       ) THEN '✅ Existe' ELSE '❌ No existe' END as status;

-- 4. Verificar función handle_new_user
SELECT 'FUNCIÓN handle_new_user' as check_type,
       CASE WHEN EXISTS (
         SELECT FROM pg_proc p
         JOIN pg_namespace n ON p.pronamespace = n.oid
         WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
       ) THEN '✅ Existe' ELSE '❌ No existe' END as status;

-- 5. Ver el código de la función actual
SELECT 'CÓDIGO DE LA FUNCIÓN' as check_type, pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace;

-- 6. Verificar políticas RLS
SELECT 'POLÍTICAS RLS' as check_type, 
       policyname, 
       cmd as command,
       qual as using_expression,
       with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'perfiles';

-- 7. Verificar si RLS está habilitado
SELECT 'RLS HABILITADO' as check_type,
       CASE WHEN relrowsecurity THEN '✅ Sí' ELSE '❌ No' END as status
FROM pg_class
WHERE relname = 'perfiles' AND relnamespace = 'public'::regnamespace;

-- 8. Contar usuarios en auth.users
SELECT 'USUARIOS EN auth.users' as check_type, COUNT(*)::text as count
FROM auth.users;

-- 9. Contar perfiles en public.perfiles
SELECT 'PERFILES EN public.perfiles' as check_type, COUNT(*)::text as count
FROM public.perfiles;

-- 10. Ver últimos usuarios sin perfil
SELECT 'USUARIOS SIN PERFIL' as check_type, 
       u.id, 
       u.email, 
       u.created_at,
       CASE WHEN p.user_id IS NULL THEN '❌ Sin perfil' ELSE '✅ Con perfil' END as has_profile
FROM auth.users u
LEFT JOIN public.perfiles p ON u.id = p.user_id
ORDER BY u.created_at DESC
LIMIT 5;
