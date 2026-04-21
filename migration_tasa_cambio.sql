-- Migración: agregar columna tasa_cambio a dbc_facturas
-- Ejecutar en Supabase SQL Editor

ALTER TABLE dbc_facturas
  ADD COLUMN IF NOT EXISTS tasa_cambio DECIMAL(8,4) DEFAULT NULL;
