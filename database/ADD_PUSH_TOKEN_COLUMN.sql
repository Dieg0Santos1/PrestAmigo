-- Agregar columna push_token a la tabla perfiles
-- Esta columna almacenará el token de Expo Push Notifications de cada usuario

ALTER TABLE public.perfiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Crear índice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_perfiles_push_token 
ON public.perfiles(push_token);

-- Comentario para documentar la columna
COMMENT ON COLUMN public.perfiles.push_token IS 'Token de Expo Push Notifications para enviar notificaciones al dispositivo del usuario';
