-- ============================================
-- SCRIPT DE VERIFICACIÓN DEL ESTADO ACTUAL
-- ============================================
-- Ejecuta este script en Supabase SQL Editor para ver qué está mal

-- 1. Verificar si el trigger existe y tiene SECURITY DEFINER
SELECT 
    'TRIGGER FUNCTION' as tipo,
    proname as nombre,
    CASE 
        WHEN prosecdef THEN '✅ TIENE SECURITY DEFINER'
        ELSE '❌ NO TIENE SECURITY DEFINER - ESTE ES EL PROBLEMA'
    END as estado,
    pg_get_functiondef(oid) as definicion
FROM pg_proc 
WHERE proname = 'crear_perfil_al_registrarse';

-- 2. Verificar si el trigger está activo
SELECT 
    'TRIGGER' as tipo,
    tgname as nombre,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ ACTIVO'
        ELSE '❌ DESACTIVADO'
    END as estado
FROM pg_trigger 
WHERE tgname = 'trigger_crear_perfil_al_registrarse';

-- 3. Verificar las policies de RLS en perfiles
SELECT 
    'RLS POLICY' as tipo,
    policyname as nombre,
    cmd as comando,
    qual as condicion
FROM pg_policies 
WHERE tablename = 'perfiles';

-- 4. Verificar si hay usuarios sin perfil (usuarios zombies)
SELECT 
    'USUARIOS SIN PERFIL' as problema,
    COUNT(*) as cantidad,
    CASE 
        WHEN COUNT(*) > 0 THEN '❌ HAY USUARIOS SIN PERFIL'
        ELSE '✅ TODOS LOS USUARIOS TIENEN PERFIL'
    END as estado
FROM auth.users u 
LEFT JOIN perfiles p ON p.user_id = u.id 
WHERE p.user_id IS NULL;

-- 5. Ver los últimos usuarios creados y si tienen perfil
SELECT 
    u.id,
    u.email,
    u.created_at,
    CASE 
        WHEN p.user_id IS NOT NULL THEN '✅ TIENE PERFIL'
        ELSE '❌ NO TIENE PERFIL'
    END as tiene_perfil,
    p.nombre,
    p.apellido,
    p.telefono
FROM auth.users u
LEFT JOIN perfiles p ON p.user_id = u.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 6. Verificar RLS está habilitado
SELECT 
    'RLS STATUS' as tipo,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS HABILITADO'
        ELSE '❌ RLS DESHABILITADO'
    END as estado
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'perfiles';

-- ============================================
-- ANÁLISIS: Qué buscar en los resultados
-- ============================================
-- 
-- SI EL TRIGGER NO TIENE "SECURITY DEFINER":
--   → Ese es el problema. El trigger no puede insertar en perfiles por RLS
--   → Solución: Ejecutar fix_registration_trigger.sql
--
-- SI HAY USUARIOS SIN PERFIL:
--   → El trigger falló al crear sus perfiles
--   → Solución: Crear perfiles manualmente o eliminar usuarios zombies
--
-- SI LAS POLICIES SON MUY RESTRICTIVAS:
--   → La policy "Permitir inserción de perfil al registrarse" debe permitir INSERT
--   → Debe tener WITH CHECK (true) o permitir al trigger insertar
