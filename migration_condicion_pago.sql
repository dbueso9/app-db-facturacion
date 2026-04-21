-- Agregar columna condicion_pago a facturas (30, 60 o 90 dias)
ALTER TABLE dbc_facturas
ADD COLUMN IF NOT EXISTS condicion_pago INTEGER;
