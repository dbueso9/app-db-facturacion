-- ============================================================
-- LIMPIAR MUGDPOS — Eliminar tablas de DB Consulting Facturación
-- Ejecutar SÓLO después de crear y verificar el nuevo proyecto Supabase
-- Proyecto: bekolkmrxxbygbqauotb (mugdpos)
-- ============================================================

-- ⚠️  PRECAUCIÓN: ejecutar esto SÓLO cuando el nuevo proyecto esté
--     funcionando correctamente y los datos migrados.

DROP TABLE IF EXISTS dbc_lineas_factura;
DROP TABLE IF EXISTS dbc_facturas;
DROP TABLE IF EXISTS dbc_clientes;
DROP TABLE IF EXISTS dbc_servicios;

-- Verificar que se eliminaron correctamente
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'dbc_%';
-- Debe devolver 0 rows
