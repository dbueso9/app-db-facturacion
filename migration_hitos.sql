-- Hitos de Proyecto
-- Ejecutar en Supabase SQL Editor del proyecto omiodzulmcytponkhras

CREATE TABLE IF NOT EXISTS dbc_hitos (
  id TEXT PRIMARY KEY,
  contrato_id TEXT NOT NULL REFERENCES dbc_contratos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  porcentaje DECIMAL(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  monto DECIMAL(15,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  factura_id TEXT REFERENCES dbc_facturas(id),
  orden INTEGER NOT NULL DEFAULT 0,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dbc_hitos_contrato_id ON dbc_hitos(contrato_id);

ALTER TABLE dbc_hitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_dbc_hitos" ON dbc_hitos
  FOR ALL USING (auth.role() = 'authenticated');
