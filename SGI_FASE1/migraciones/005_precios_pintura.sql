-- ============================================================
-- Migración 005: precios de "pintar en el local" y "figura terminada".
-- Solo agrega dos columnas vacías (NULL); no cambia ni borra datos.
-- NULL = el sistema usa el sugerido: pintar en el local = crudo × 2,
--        terminada = pintar en el local × 2.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_pintar_local INTEGER;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_terminada INTEGER;
