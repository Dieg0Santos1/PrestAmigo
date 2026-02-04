-- Tabla para rastrear el capital de cada usuario
CREATE TABLE IF NOT EXISTS capital_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  monto DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla para registrar transacciones de capital
CREATE TABLE IF NOT EXISTS transacciones_capital (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL, -- 'ingreso', 'retiro', 'prestamo', 'cobro'
  monto DECIMAL(10, 2) NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_capital_usuario_user_id ON capital_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_capital_user_id ON transacciones_capital(user_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_capital_tipo ON transacciones_capital(tipo);

-- RLS (Row Level Security)
ALTER TABLE capital_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_capital ENABLE ROW LEVEL SECURITY;

-- Policies para capital_usuario
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio capital" ON capital_usuario;
CREATE POLICY "Los usuarios pueden ver su propio capital"
  ON capital_usuario FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio capital" ON capital_usuario;
CREATE POLICY "Los usuarios pueden actualizar su propio capital"
  ON capital_usuario FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio capital" ON capital_usuario;
CREATE POLICY "Los usuarios pueden insertar su propio capital"
  ON capital_usuario FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies para transacciones_capital
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias transacciones" ON transacciones_capital;
CREATE POLICY "Los usuarios pueden ver sus propias transacciones"
  ON transacciones_capital FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Los usuarios pueden crear sus propias transacciones" ON transacciones_capital;
CREATE POLICY "Los usuarios pueden crear sus propias transacciones"
  ON transacciones_capital FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Trigger para actualizar updated_at en capital_usuario
CREATE TRIGGER update_capital_usuario_updated_at BEFORE UPDATE ON capital_usuario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para inicializar capital al crear perfil
CREATE OR REPLACE FUNCTION inicializar_capital_al_registrarse()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO capital_usuario (user_id, monto)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para inicializar capital automáticamente
DROP TRIGGER IF EXISTS trigger_inicializar_capital_al_registrarse ON auth.users;
CREATE TRIGGER trigger_inicializar_capital_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION inicializar_capital_al_registrarse();
