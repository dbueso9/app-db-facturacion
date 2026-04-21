-- Migración Fase 6: cotizaciones
-- Ejecutar en Supabase SQL Editor (proyecto omiodzulmcytponkhras)

CREATE TABLE IF NOT EXISTS dbc_cotizaciones (
  id TEXT PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  secuencia INTEGER NOT NULL,
  fecha DATE NOT NULL,
  fecha_validez DATE NOT NULL,
  cliente_id TEXT NOT NULL,
  cliente_data JSONB NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  isv DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'borrador',
  nombre_proyecto TEXT DEFAULT NULL,
  notas TEXT DEFAULT '',
  convertida_a_factura_id TEXT DEFAULT NULL,
  creada_en TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dbc_lineas_cotizacion (
  id TEXT PRIMARY KEY,
  cotizacion_id TEXT NOT NULL REFERENCES dbc_cotizaciones(id) ON DELETE CASCADE,
  descripcion TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0
);
