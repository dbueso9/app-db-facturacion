-- Fase 10: Cotización → Contrato con Plan de Pagos por Hitos
-- Ejecutar en Supabase SQL Editor (proyecto omiodzulmcytponkhras)

ALTER TABLE dbc_cotizaciones
  ADD COLUMN IF NOT EXISTS convertida_a_contrato_id TEXT;
