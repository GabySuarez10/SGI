-- ============================================================
-- Migración 004: categoría de las figuras (Navidad, Materas, ...).
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

ALTER TABLE producto ADD COLUMN IF NOT EXISTS categoria VARCHAR(40);

CREATE TABLE IF NOT EXISTS categoria_figura (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE,
    orden   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO categoria_figura (nombre, orden) VALUES
    ('Navidad', 1),
    ('Materas', 2),
    ('Juveniles', 3),
    ('Religioso', 4),
    ('Hogar', 5),
    ('Terminados', 6)
ON CONFLICT (nombre) DO NOTHING;
