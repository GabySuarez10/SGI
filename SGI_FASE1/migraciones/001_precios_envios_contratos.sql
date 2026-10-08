-- ============================================================
-- Migración 001: precios automáticos, envíos, límite de proveedor,
-- factura en pedidos y modalidad de venta.
--
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin dañar datos.
-- La API la aplica sola al arrancar (python app.py); también puedes
-- pegarla en el SQL Editor de Neon.
-- ============================================================

-- 1. Producto: envío y precios de catálogo ---------------------
--    costo           = precio de fábrica
--    envio           = valor del envío elegido (tabla tarifa_envio o personalizado)
--    precio_venta    = precio crudo total  (costo × 4 + envío)
--    precio_mayorista= precio por mayor    (costo × 4 ÷ 2 + envío)
ALTER TABLE producto ADD COLUMN IF NOT EXISTS envio_categoria VARCHAR(40);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS envio INTEGER DEFAULT 0;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_venta INTEGER DEFAULT 0;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_mayorista INTEGER DEFAULT 0;

-- Copia los precios que ya existían en el local al catálogo
UPDATE producto p
SET precio_venta = il.precio_venta,
    precio_mayorista = il.precio_mayorista
FROM inventario_local il
WHERE il.codigo = p.codigo
  AND COALESCE(p.precio_venta, 0) = 0
  AND COALESCE(p.precio_mayorista, 0) = 0;

-- Tamaño en cm (alto x ancho) puede ser más largo que 20 caracteres
ALTER TABLE producto ALTER COLUMN tamano TYPE VARCHAR(60);
ALTER TABLE inventario_bodega ALTER COLUMN tamano TYPE VARCHAR(60);
ALTER TABLE inventario_local ALTER COLUMN tamano TYPE VARCHAR(60);

-- 2. Proveedor: precio máximo pactado por figura (opcional) -----
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS limite_precio INTEGER;

-- 3. Pedido: datos de la factura del proveedor (listas) --------
--    facturado      = unidades que dice la factura
--    precio_factura = precio unitario que cobra la factura
ALTER TABLE pedido_proveedor ADD COLUMN IF NOT EXISTS facturado TEXT;
ALTER TABLE pedido_proveedor ADD COLUMN IF NOT EXISTS precio_factura TEXT;
ALTER TABLE pedido_proveedor ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- 4. Venta: modalidad (Detal, Por mayor, Kit local, Empresa...) -
ALTER TABLE venta ADD COLUMN IF NOT EXISTS modalidad VARCHAR(40);

-- 5. Tarifas de envío por tamaño (editables) -------------------
CREATE TABLE IF NOT EXISTS tarifa_envio (
    id     SERIAL PRIMARY KEY,
    nombre VARCHAR(40) NOT NULL UNIQUE,
    precio INTEGER NOT NULL DEFAULT 0,
    orden  INTEGER NOT NULL DEFAULT 0
);

INSERT INTO tarifa_envio (nombre, precio, orden) VALUES
    ('Mini', 400, 1),
    ('Pequeño', 600, 2),
    ('Mediano', 1200, 3),
    ('Grande', 1600, 4),
    ('Extra grande', 2500, 5)
ON CONFLICT (nombre) DO NOTHING;

-- 6. Valores generales editables -------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    clave       VARCHAR(60) PRIMARY KEY,
    valor       INTEGER NOT NULL DEFAULT 0,
    descripcion TEXT
);

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('multiplicador_crudo', 4, 'Precio crudo = precio de fábrica × este valor'),
    ('divisor_mayor', 2, 'Precio por mayor = precio crudo ÷ este valor'),
    ('valor_kit_local', 2300, 'Valor que se suma al precio crudo al vender un kit en el local'),
    ('precio_kit_contrato', 13000, 'Precio por kit para empresas con contrato'),
    ('pinturas_por_kit', 5, 'Pinturas que lleva cada kit'),
    ('pinceles_por_kit', 1, 'Pinceles que lleva cada kit')
ON CONFLICT (clave) DO NOTHING;
