-- Agregar campo DNI a la tabla perfiles
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS dni VARCHAR(20);

-- Crear índice para DNI (opcional, útil si quieres buscar por DNI)
CREATE INDEX IF NOT EXISTS idx_perfiles_dni ON perfiles(dni);

-- Actualizar el trigger de creación de perfil para incluir DNI
CREATE OR REPLACE FUNCTION crear_perfil_al_registrarse()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (user_id, nombre, apellido, dni, telefono, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'dni', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ language 'plpgsql';
