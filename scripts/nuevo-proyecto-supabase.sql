-- ============================================================
-- NUEVO PROYECTO SUPABASE — DB Consulting Facturación
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Tablas de datos
CREATE TABLE IF NOT EXISTS dbc_clientes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rtn TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  correo TEXT DEFAULT '',
  telefono TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dbc_servicios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT DEFAULT '',
  precio_base DECIMAL(12,2) NOT NULL DEFAULT 0,
  categoria TEXT NOT NULL DEFAULT 'otro'
);

CREATE TABLE IF NOT EXISTS dbc_facturas (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  secuencia INTEGER NOT NULL,
  fecha DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  cliente_id TEXT NOT NULL,
  cliente_data JSONB NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  isv DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  notas TEXT DEFAULT '',
  creada_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dbc_lineas_factura (
  id TEXT PRIMARY KEY,
  factura_id TEXT NOT NULL REFERENCES dbc_facturas(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);

-- 2. Servicios iniciales
INSERT INTO dbc_servicios (id, nombre, descripcion, precio_base, categoria) VALUES
  ('s1', 'Consultoría IT', 'Asesoría y consultoría en tecnología', 1500, 'consultoria'),
  ('s2', 'Hosting Web', 'Alojamiento web anual', 800, 'hosting'),
  ('s3', 'Desarrollo Web', 'Desarrollo de sitio web corporativo', 15000, 'desarrollo_web'),
  ('s4', 'Desarrollo de App', 'Desarrollo de aplicación móvil', 25000, 'desarrollo_app'),
  ('s5', 'Soporte Técnico', 'Soporte técnico mensual', 500, 'soporte'),
  ('s6', 'Mantenimiento Web', 'Mantenimiento mensual de sitio web', 700, 'desarrollo_web')
ON CONFLICT (id) DO NOTHING;

-- 3. Habilitar Row Level Security (recomendado)
ALTER TABLE dbc_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dbc_servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE dbc_facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dbc_lineas_factura ENABLE ROW LEVEL SECURITY;

-- Políticas: sólo usuarios autenticados tienen acceso
CREATE POLICY "Autenticados leen clientes" ON dbc_clientes FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados leen servicios" ON dbc_servicios FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados leen facturas" ON dbc_facturas FOR ALL TO authenticated USING (true);
CREATE POLICY "Autenticados leen lineas" ON dbc_lineas_factura FOR ALL TO authenticated USING (true);

-- ============================================================
-- NOTA: Los usuarios de auth (admin / asistente) se crean
-- automáticamente cuando Vercel ejecuta el build (postbuild).
-- No necesitas crearlos manualmente.
-- ============================================================
