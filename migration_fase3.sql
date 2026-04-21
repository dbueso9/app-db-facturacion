-- Migración Fase 3: código de cliente, nombre proyecto, contratos
-- Ejecutar en Supabase SQL Editor

-- 1. Código único por cliente
ALTER TABLE dbc_clientes
  ADD COLUMN IF NOT EXISTS codigo TEXT;

-- Generar códigos para clientes existentes sin código
DO $$
DECLARE
  rec RECORD;
  n INTEGER := 1;
BEGIN
  FOR rec IN SELECT id FROM dbc_clientes WHERE codigo IS NULL ORDER BY creado_en LOOP
    UPDATE dbc_clientes SET codigo = 'DBC-' || LPAD(n::TEXT, 3, '0') WHERE id = rec.id;
    n := n + 1;
  END LOOP;
END $$;

-- 2. Nombre de proyecto en factura
ALTER TABLE dbc_facturas
  ADD COLUMN IF NOT EXISTS nombre_proyecto TEXT DEFAULT NULL;

-- 3. Tabla de contratos de servicio por cliente
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
