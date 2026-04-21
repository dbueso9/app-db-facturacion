-- Migración: agregar columna metodo_pago a dbc_facturas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE dbc_facturas
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT NULL;
