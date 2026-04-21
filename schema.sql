-- Tablas para DB Consulting Facturación
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS dbc_clientes (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE,
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
  metodo_pago TEXT DEFAULT NULL,
  tasa_cambio DECIMAL(8,4) DEFAULT NULL,
  nombre_proyecto TEXT DEFAULT NULL,
  notas TEXT DEFAULT '',
  creada_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dbc_contratos (
  id TEXT PRIMARY KEY,
  cliente_id TEXT NOT NULL REFERENCES dbc_clientes(id) ON DELETE CASCADE,
  nombre_proyecto TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'otro',
  valor_base DECIMAL(12,2) NOT NULL DEFAULT 0,
  fecha_inicio DATE NOT NULL,
  dia_facturacion INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT true,
  notas TEXT DEFAULT '',
  creado_en TIMESTAMPTZ DEFAULT NOW()
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

-- Servicios iniciales
INSERT INTO dbc_servicios (id, nombre, descripcion, precio_base, categoria) VALUES
  ('s1', 'Consultoría IT', 'Asesoría y consultoría en tecnología', 1500, 'consultoria'),
  ('s2', 'Hosting Web', 'Alojamiento web anual', 800, 'hosting'),
  ('s3', 'Desarrollo Web', 'Desarrollo de sitio web corporativo', 15000, 'desarrollo_web'),
  ('s4', 'Desarrollo de App', 'Desarrollo de aplicación móvil', 25000, 'desarrollo_app'),
  ('s5', 'Soporte Técnico', 'Soporte técnico mensual', 500, 'soporte'),
  ('s6', 'Mantenimiento Web', 'Mantenimiento mensual de sitio web', 700, 'desarrollo_web')
ON CONFLICT (id) DO NOTHING;
