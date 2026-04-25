-- Descuento en facturas y cotizaciones
ALTER TABLE dbc_facturas ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0;
ALTER TABLE dbc_cotizaciones ADD COLUMN IF NOT EXISTS descuento NUMERIC DEFAULT 0;
