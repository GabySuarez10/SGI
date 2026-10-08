-- ============================================================
-- Migración 003: pinturas, pinceles y otros materiales; colecciones
-- de pinturas; tipo de proveedor; traslados en ambos sentidos.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

-- Tipo de producto: figura | pintura | pincel | otro
ALTER TABLE producto ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'figura';
UPDATE producto SET tipo = 'figura' WHERE tipo IS NULL;

-- Colección a la que pertenece una pintura (Acrílicas, Pátinas, Gamusa...)
ALTER TABLE producto ADD COLUMN IF NOT EXISTS coleccion VARCHAR(60);

-- Tipo de proveedor: figuras | materiales | ambos
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'figuras';
UPDATE proveedor SET tipo = 'figuras' WHERE tipo IS NULL;

-- Sentido del traslado: bodega_local | local_bodega
ALTER TABLE traslado ADD COLUMN IF NOT EXISTS sentido VARCHAR(20) DEFAULT 'bodega_local';
UPDATE traslado SET sentido = 'bodega_local' WHERE sentido IS NULL;

-- Colecciones de pinturas (se pueden crear más desde la app)
CREATE TABLE IF NOT EXISTS coleccion_material (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(60) NOT NULL UNIQUE,
    descripcion TEXT,
    orden       INTEGER NOT NULL DEFAULT 0
);

INSERT INTO coleccion_material (nombre, descripcion, orden) VALUES
    ('Acrílicas', 'Pinturas acrílicas', 1),
    ('Pátinas', 'Pátinas para envejecer y dar acabado', 2),
    ('Metalizados', 'Pinturas con acabado metálico', 3),
    ('Bases', 'Bases y selladores', 4),
    ('Otras', 'Pinturas que no pertenecen a otra colección', 5)
ON CONFLICT (nombre) DO NOTHING;
