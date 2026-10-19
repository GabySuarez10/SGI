-- ============================================================
-- Migración 006: kits por tamaño y facturación.
-- Solo AGREGA tablas y columnas; no cambia ni borra datos.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

-- ------------------------------------------------------------
-- 1. KITS PARA LLEVAR SEGÚN EL TAMAÑO DE LA FIGURA
--    (5 pinturas + 1 pincel). El valor se suma al precio crudo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarifa_kit (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE,
    precio  INTEGER NOT NULL DEFAULT 0,
    orden   INTEGER NOT NULL DEFAULT 0
);

INSERT INTO tarifa_kit (nombre, precio, orden) VALUES
    ('Pequeño', 6000, 1),
    ('Mediano', 8000, 2),
    ('Grande', 12000, 3),
    ('Extra grande', 15000, 4)
ON CONFLICT (nombre) DO NOTHING;

-- Tamaño de kit elegido y su valor (editable) en cada figura.
-- NULL = se toma de la tabla tarifa_kit o del valor general del kit.
ALTER TABLE producto ADD COLUMN IF NOT EXISTS kit_categoria VARCHAR(40);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_kit INTEGER;

-- ------------------------------------------------------------
-- 2. FACTURACIÓN
-- ------------------------------------------------------------

-- Datos del emisor, numeración autorizada por la DIAN e IVA (clave -> texto)
CREATE TABLE IF NOT EXISTS datos_facturacion (
    clave  VARCHAR(60) PRIMARY KEY,
    valor  TEXT
);

-- Facturas y tirillas emitidas.
--   tipo   = 'pos' (tirilla) | 'electronica'
--   estado = 'pendiente_envio' (aún no validada por la DIAN) | 'aceptada' | 'rechazada' | 'anulada'
--   detalle y emisor guardan una copia (JSON) de lo facturado y de los datos
--   del negocio en ese momento, para poder reimprimirla igual.
CREATE TABLE IF NOT EXISTS factura (
    codigo                  SERIAL PRIMARY KEY,
    venta                   INTEGER,
    tipo                    VARCHAR(20) NOT NULL DEFAULT 'pos',
    prefijo                 VARCHAR(10) NOT NULL DEFAULT '',
    numero                  INTEGER NOT NULL,
    fecha                   TIMESTAMP NOT NULL DEFAULT now(),
    fecha_vencimiento       DATE,
    cliente_tipo_documento  VARCHAR(10),
    cliente_documento       VARCHAR(30),
    cliente_nombre          TEXT,
    cliente_correo          TEXT,
    cliente_direccion       TEXT,
    cliente_telefono        VARCHAR(40),
    forma_pago              VARCHAR(20) DEFAULT 'Contado',
    medio_pago              VARCHAR(30) DEFAULT 'Efectivo',
    recibido                INTEGER,
    subtotal                INTEGER NOT NULL DEFAULT 0,
    descuento               INTEGER NOT NULL DEFAULT 0,
    iva                     INTEGER NOT NULL DEFAULT 0,
    total                   INTEGER NOT NULL DEFAULT 0,
    detalle                 TEXT,
    emisor                  TEXT,
    cufe                    VARCHAR(120),
    estado                  VARCHAR(30) NOT NULL DEFAULT 'pendiente_envio',
    observaciones           TEXT,
    usuario                 VARCHAR(100),
    CONSTRAINT factura_numero_unico UNIQUE (tipo, prefijo, numero)
);

CREATE INDEX IF NOT EXISTS idx_factura_venta ON factura (venta);

-- Columna agregada después (por si la tabla ya existía sin ella)
ALTER TABLE factura ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;
