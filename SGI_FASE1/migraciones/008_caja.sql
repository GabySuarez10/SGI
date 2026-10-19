-- ============================================================
-- Migración 008: cuadre de caja.
-- Solo AGREGA columnas y tablas; no cambia ni borra datos.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

-- Medio de pago de cada venta (listas, como producto/cantidad: permite pago mixto)
ALTER TABLE venta ADD COLUMN IF NOT EXISTS medios_pago TEXT;   -- ej. "Efectivo,Nequi / Daviplata"
ALTER TABLE venta ADD COLUMN IF NOT EXISTS valores_pago TEXT;  -- ej. "20000,14900"
ALTER TABLE venta ADD COLUMN IF NOT EXISTS recibido INTEGER;   -- efectivo que entregó el cliente
ALTER TABLE venta ADD COLUMN IF NOT EXISTS caja INTEGER;       -- caja del día en que se cobró

-- Una caja por día
CREATE TABLE IF NOT EXISTS caja (
    codigo             SERIAL PRIMARY KEY,
    fecha              DATE NOT NULL UNIQUE,
    base               INTEGER NOT NULL DEFAULT 0,
    abierta_por        VARCHAR(100),
    hora_apertura      TIMESTAMP NOT NULL DEFAULT now(),
    estado             VARCHAR(20) NOT NULL DEFAULT 'abierta',   -- abierta | cerrada
    efectivo_esperado  INTEGER,
    efectivo_contado   INTEGER,
    diferencia         INTEGER,
    conteo             TEXT,        -- billetes y monedas contados (JSON) o vacío si se escribió el total
    resumen            TEXT,        -- totales por medio de pago al cerrar (JSON)
    cerrada_por        VARCHAR(100),
    hora_cierre        TIMESTAMP,
    observaciones      TEXT
);

-- Entradas y salidas de efectivo que no son ventas
CREATE TABLE IF NOT EXISTS movimiento_caja (
    codigo     SERIAL PRIMARY KEY,
    caja       INTEGER NOT NULL,
    fecha      TIMESTAMP NOT NULL DEFAULT now(),
    tipo       VARCHAR(10) NOT NULL,            -- entrada | salida
    valor      INTEGER NOT NULL,
    motivo     TEXT NOT NULL,
    categoria  VARCHAR(40),
    usuario    VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_movimiento_caja_caja ON movimiento_caja (caja);
