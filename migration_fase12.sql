-- Fase 12: múltiples correos por cliente
ALTER TABLE dbc_clientes ADD COLUMN IF NOT EXISTS correo2 TEXT;
ALTER TABLE dbc_clientes ADD COLUMN IF NOT EXISTS correo3 TEXT;
