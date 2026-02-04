-- Tabla de perfiles (si no existe)
CREATE TABLE IF NOT EXISTS perfiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nombre VARCHAR(100),
  apellido VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS en perfiles
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;

-- Policy para perfiles
CREATE POLICY "Los usuarios pueden ver su propio perfil"
  ON perfiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON perfiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Permitir inserción de perfil al registrarse"
  ON perfiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Índices para perfiles
CREATE INDEX IF NOT EXISTS idx_perfiles_telefono ON perfiles(telefono);
CREATE INDEX IF NOT EXISTS idx_perfiles_email ON perfiles(email);

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_crear_perfil_al_registrarse ON auth.users;
DROP TRIGGER IF EXISTS update_prestamos_updated_at ON prestamos;
DROP TRIGGER IF EXISTS update_cuotas_updated_at ON cuotas;
DROP TRIGGER IF EXISTS trigger_vincular_prestamos_al_registrarse ON auth.users;

-- Trigger para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION crear_perfil_al_registrarse()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (user_id, nombre, apellido, telefono, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', ''),
    COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
    COALESCE(NEW.raw_user_meta_data->>'telefono', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_crear_perfil_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION crear_perfil_al_registrarse();

-- Tabla de préstamos
CREATE TABLE IF NOT EXISTS prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamista_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deudor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Datos del deudor (por si no está registrado)
  deudor_nombre VARCHAR(100) NOT NULL,
  deudor_apellido VARCHAR(100) NOT NULL,
  deudor_telefono VARCHAR(20) NOT NULL,
  deudor_email VARCHAR(255),
  
  -- Detalles del préstamo
  monto_prestado DECIMAL(10, 2) NOT NULL,
  tasa_interes DECIMAL(5, 2) NOT NULL DEFAULT 0,
  numero_cuotas INTEGER NOT NULL,
  frecuencia_pago VARCHAR(20) NOT NULL, -- 'diario', 'semanal', 'fin_semana', 'mensual'
  monto_cuota DECIMAL(10, 2) NOT NULL,
  monto_total DECIMAL(10, 2) NOT NULL,
  
  -- Estado
  estado VARCHAR(20) NOT NULL DEFAULT 'activo', -- 'activo', 'completado', 'cancelado'
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de cuotas
CREATE TABLE IF NOT EXISTS cuotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  
  numero_cuota INTEGER NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  
  -- Estado de pago
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'pagada', 'vencida'
  fecha_pago DATE,
  comprobante_url TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(prestamo_id, numero_cuota)
);

-- Tabla de notificaciones/invitaciones
CREATE TABLE IF NOT EXISTS invitaciones_prestamo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id UUID NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  telefono VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'aceptada', 'rechazada'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(prestamo_id)
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_prestamos_prestamista ON prestamos(prestamista_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_deudor ON prestamos(deudor_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo ON cuotas(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado ON cuotas(estado);
CREATE INDEX IF NOT EXISTS idx_invitaciones_telefono ON invitaciones_prestamo(telefono);
CREATE INDEX IF NOT EXISTS idx_invitaciones_email ON invitaciones_prestamo(email);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_prestamos_updated_at BEFORE UPDATE ON prestamos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cuotas_updated_at BEFORE UPDATE ON cuotas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para vincular automáticamente préstamos cuando un usuario se registra
CREATE OR REPLACE FUNCTION vincular_prestamos_al_registrarse()
RETURNS TRIGGER AS $$
BEGIN
  -- Vincular préstamos por teléfono
  UPDATE prestamos
  SET deudor_id = NEW.id
  WHERE deudor_telefono = (NEW.raw_user_meta_data->>'telefono')
    AND deudor_id IS NULL;
  
  -- Vincular préstamos por email
  UPDATE prestamos
  SET deudor_id = NEW.id
  WHERE deudor_email = NEW.email
    AND deudor_id IS NULL;
  
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para vincular préstamos automáticamente
CREATE TRIGGER trigger_vincular_prestamos_al_registrarse
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION vincular_prestamos_al_registrarse();

-- RLS (Row Level Security) Policies
ALTER TABLE prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cuotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones_prestamo ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes si existen (ahora las tablas ya existen)
DO $$ 
BEGIN
  -- Policies para prestamos
  DROP POLICY IF EXISTS "Los usuarios pueden ver sus préstamos" ON prestamos;
  DROP POLICY IF EXISTS "Los prestamistas pueden crear préstamos" ON prestamos;
  DROP POLICY IF EXISTS "Los prestamistas pueden actualizar sus préstamos" ON prestamos;
  DROP POLICY IF EXISTS "Los prestamistas pueden eliminar sus préstamos" ON prestamos;
  
  -- Policies para cuotas
  DROP POLICY IF EXISTS "Los usuarios pueden ver cuotas de sus préstamos" ON cuotas;
  DROP POLICY IF EXISTS "Los prestamistas pueden crear cuotas" ON cuotas;
  DROP POLICY IF EXISTS "Los usuarios pueden actualizar cuotas" ON cuotas;
  
  -- Policies para invitaciones
  DROP POLICY IF EXISTS "Ver invitaciones relacionadas" ON invitaciones_prestamo;
  DROP POLICY IF EXISTS "Crear invitaciones" ON invitaciones_prestamo;
  
  -- Policies para perfiles
  DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON perfiles;
  DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON perfiles;
  DROP POLICY IF EXISTS "Permitir inserción de perfil al registrarse" ON perfiles;
EXCEPTION
  WHEN undefined_table THEN
    NULL; -- Ignorar si las tablas no existen aún
  WHEN undefined_object THEN
    NULL; -- Ignorar si las policies no existen
END $$;

-- Políticas para prestamos
-- Los usuarios pueden ver préstamos donde son prestamistas o deudores
CREATE POLICY "Los usuarios pueden ver sus préstamos"
  ON prestamos FOR SELECT
  USING (
    auth.uid() = prestamista_id OR 
    auth.uid() = deudor_id
  );

-- Solo el prestamista puede crear préstamos
CREATE POLICY "Los prestamistas pueden crear préstamos"
  ON prestamos FOR INSERT
  WITH CHECK (auth.uid() = prestamista_id);

-- Solo el prestamista puede actualizar sus préstamos
CREATE POLICY "Los prestamistas pueden actualizar sus préstamos"
  ON prestamos FOR UPDATE
  USING (auth.uid() = prestamista_id);

-- Solo el prestamista puede eliminar sus préstamos
CREATE POLICY "Los prestamistas pueden eliminar sus préstamos"
  ON prestamos FOR DELETE
  USING (auth.uid() = prestamista_id);

-- Políticas para cuotas
-- Los usuarios pueden ver cuotas de sus préstamos
CREATE POLICY "Los usuarios pueden ver cuotas de sus préstamos"
  ON cuotas FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prestamos 
      WHERE prestamos.id = cuotas.prestamo_id 
        AND (prestamos.prestamista_id = auth.uid() OR prestamos.deudor_id = auth.uid())
    )
  );

-- Solo el prestamista puede crear cuotas
CREATE POLICY "Los prestamistas pueden crear cuotas"
  ON cuotas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prestamos 
      WHERE prestamos.id = cuotas.prestamo_id 
        AND prestamos.prestamista_id = auth.uid()
    )
  );

-- Ambos pueden actualizar cuotas (prestamista para confirmar, deudor para subir comprobante)
CREATE POLICY "Los usuarios pueden actualizar cuotas"
  ON cuotas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM prestamos 
      WHERE prestamos.id = cuotas.prestamo_id 
        AND (prestamos.prestamista_id = auth.uid() OR prestamos.deudor_id = auth.uid())
    )
  );

-- Políticas para invitaciones
CREATE POLICY "Ver invitaciones relacionadas"
  ON invitaciones_prestamo FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM prestamos 
      WHERE prestamos.id = invitaciones_prestamo.prestamo_id 
        AND prestamos.prestamista_id = auth.uid()
    )
  );

CREATE POLICY "Crear invitaciones"
  ON invitaciones_prestamo FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM prestamos 
      WHERE prestamos.id = invitaciones_prestamo.prestamo_id 
        AND prestamos.prestamista_id = auth.uid()
    )
  );
