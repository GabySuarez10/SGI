-- =====================================================================
--  SGI · Sistema de Gestión de Inventario (Pintarte)
--  Script COMPLETO de la base de datos: estructura + datos de prueba
--
--  Sirve para las dos situaciones:
--    1. Base vacía      -> crea todas las tablas y carga los datos de prueba.
--    2. Base existente  -> agrega solo las columnas/tablas que falten y
--                          no duplica datos (todo es IF NOT EXISTS / NOT EXISTS).
--
--  Ejecútalo completo en el SQL Editor de Neon.
--
--  Columnas tipo LISTA: en venta, pedido_proveedor y traslado los productos
--  van en una misma fila separados por comas; la posición indica a qué
--  producto corresponde cada valor (producto[i] -> cantidad[i] -> precio[i]).
-- =====================================================================


-- =====================================================================
-- 1. TABLAS
-- =====================================================================

-- ---------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    contrasena  VARCHAR(100) NOT NULL
);

-- ---------------------------------------------------------------------
-- Proveedores
--   tipo: figuras | materiales (pinturas, pinceles y otros) | ambos
--   limite_precio: precio máximo pactado por figura (NULL = sin límite)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proveedor (
    nombre          VARCHAR(100) PRIMARY KEY,
    telefono        VARCHAR(100),
    dirección       VARCHAR(100),
    ciudad          VARCHAR(100),
    descripción     TEXT,
    limite_precio   INTEGER,
    tipo            VARCHAR(20) DEFAULT 'figuras'
);

ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS limite_precio INTEGER;
ALTER TABLE proveedor ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'figuras';

-- ---------------------------------------------------------------------
-- Catálogo de productos (figuras, pinturas, pinceles y otros)
--   costo            = precio de fábrica / de compra
--   envio            = valor del envío según el tamaño (solo figuras)
--   precio_venta     = precio crudo / detal       (figuras: costo × 4 + envío)
--   precio_mayorista = precio por mayor           (figuras: costo × 4 ÷ 2 + envío)
--   tipo             = figura | pintura | pincel | otro
--   coleccion        = solo pinturas (Acrílicas, Pátinas, Gamusa...)
--   categoria        = solo figuras (Navidad, Materas, Juveniles...)
--   imagen           = URL de la imagen en la nube
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto (
    codigo            SERIAL PRIMARY KEY,
    referencia        VARCHAR(15),
    nombre            TEXT NOT NULL,
    imagen            TEXT,
    proveedor         VARCHAR(100),
    tamano            VARCHAR(60),
    descripcion       TEXT,
    costo             INTEGER DEFAULT 0,
    envio_categoria   VARCHAR(40),
    envio             INTEGER DEFAULT 0,
    precio_venta      INTEGER DEFAULT 0,
    precio_mayorista  INTEGER DEFAULT 0,
    tipo              VARCHAR(20) DEFAULT 'figura',
    coleccion         VARCHAR(60),
    categoria         VARCHAR(40)
);

ALTER TABLE producto ADD COLUMN IF NOT EXISTS envio_categoria VARCHAR(40);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS envio INTEGER DEFAULT 0;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_venta INTEGER DEFAULT 0;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS precio_mayorista INTEGER DEFAULT 0;
ALTER TABLE producto ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'figura';
ALTER TABLE producto ADD COLUMN IF NOT EXISTS coleccion VARCHAR(60);
ALTER TABLE producto ADD COLUMN IF NOT EXISTS categoria VARCHAR(40);
ALTER TABLE producto ALTER COLUMN tamano TYPE VARCHAR(60);

-- ---------------------------------------------------------------------
-- Inventario de bodega (codigo = producto.codigo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario_bodega (
    codigo       INTEGER PRIMARY KEY,
    nombre       TEXT,
    imagen       TEXT,
    proveedor    VARCHAR(100),
    tamano       VARCHAR(60),
    descripcion  TEXT,
    costo        INTEGER DEFAULT 0,
    existencias  INTEGER DEFAULT 0
);

ALTER TABLE inventario_bodega ALTER COLUMN tamano TYPE VARCHAR(60);

-- ---------------------------------------------------------------------
-- Inventario del local (codigo = producto.codigo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario_local (
    codigo            INTEGER PRIMARY KEY,
    nombre            TEXT,
    imagen            TEXT,
    proveedor         VARCHAR(100),
    tamano            VARCHAR(60),
    existencias       INTEGER DEFAULT 0,
    precio_venta      INTEGER DEFAULT 0,
    precio_mayorista  INTEGER DEFAULT 0
);

ALTER TABLE inventario_local ALTER COLUMN tamano TYPE VARCHAR(60);

-- ---------------------------------------------------------------------
-- Ventas (listas: producto, cantidad, precio_unitario)
--   modalidad: Detal | Pintar en el local | Kit para llevar | Pintada |
--              Por mayor (local) | Empresa por mayor | Empresa con contrato
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS venta (
    codigo           SERIAL PRIMARY KEY,
    producto         TEXT,
    cantidad         TEXT,
    precio_unitario  TEXT,
    total            INTEGER DEFAULT 0,
    fecha            TIMESTAMP DEFAULT NOW(),
    cliente          TEXT,
    observacion      TEXT,
    usuario          VARCHAR(100),
    modalidad        VARCHAR(40)
);

ALTER TABLE venta ADD COLUMN IF NOT EXISTS modalidad VARCHAR(40);

-- ---------------------------------------------------------------------
-- Pedidos a proveedores (listas en el mismo orden que productos)
--   llegan         = unidades recibidas (incluye dañadas)
--   sobran/faltan  = diferencia contra lo pedido
--   dañados        = dañadas (subconjunto de las que llegaron)
--   facturado      = unidades que dice la factura del proveedor
--   precio_factura = precio unitario cobrado en la factura
--   estado         = FALSE pendiente | TRUE recibido
--   zona_entrega   = TRUE bodega | FALSE local
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedido_proveedor (
    codigo           SERIAL PRIMARY KEY,
    proveedor        VARCHAR(100),
    productos        TEXT,
    cantidad         TEXT,
    precio_esperado  TEXT,
    llegan           TEXT,
    sobran           TEXT,
    faltan           TEXT,
    dañados          TEXT,
    facturado        TEXT,
    precio_factura   TEXT,
    observaciones    TEXT,
    precio_total     INTEGER DEFAULT 0,
    fecha_pedido     TIMESTAMP DEFAULT NOW(),
    fecha_llegada    TIMESTAMP,
    estado           BOOLEAN DEFAULT FALSE,
    zona_entrega     BOOLEAN DEFAULT TRUE
);

ALTER TABLE pedido_proveedor ADD COLUMN IF NOT EXISTS facturado TEXT;
ALTER TABLE pedido_proveedor ADD COLUMN IF NOT EXISTS precio_factura TEXT;
ALTER TABLE pedido_proveedor ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- ---------------------------------------------------------------------
-- Traslados (listas: producto, cantidad)
--   sentido: bodega_local | local_bodega
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS traslado (
    codigo    SERIAL PRIMARY KEY,
    producto  TEXT,
    cantidad  TEXT,
    fecha     TIMESTAMP DEFAULT NOW(),
    sentido   VARCHAR(20) DEFAULT 'bodega_local'
);

ALTER TABLE traslado ADD COLUMN IF NOT EXISTS sentido VARCHAR(20) DEFAULT 'bodega_local';

-- ---------------------------------------------------------------------
-- Tarifas de envío por tamaño de figura (editables desde la app)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarifa_envio (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE,
    precio  INTEGER NOT NULL DEFAULT 0,
    orden   INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- Valores generales editables (fórmulas de precio, kits...)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    clave        VARCHAR(60) PRIMARY KEY,
    valor        INTEGER NOT NULL DEFAULT 0,
    descripcion  TEXT
);

-- ---------------------------------------------------------------------
-- Colecciones de pinturas (cada tono es un producto tipo 'pintura')
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coleccion_material (
    id           SERIAL PRIMARY KEY,
    nombre       VARCHAR(60) NOT NULL UNIQUE,
    descripcion  TEXT,
    orden        INTEGER NOT NULL DEFAULT 0
);


-- ---------------------------------------------------------------------
-- Categorías de figuras (editables desde Configuración)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria_figura (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE,
    orden   INTEGER NOT NULL DEFAULT 0
);


-- =====================================================================
-- 2. TRIGGER: fecha de llegada del pedido
--    Si el pedido pasa a recibido (estado = TRUE) o cambia su zona de
--    entrega y no tiene fecha de llegada, se pone la fecha actual.
--    (La API también la envía; el trigger solo cubre cambios manuales.)
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_pedido_fecha_llegada()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado IS TRUE
       AND NEW.fecha_llegada IS NULL
       AND (OLD.estado IS DISTINCT FROM NEW.estado
            OR OLD.zona_entrega IS DISTINCT FROM NEW.zona_entrega) THEN
        NEW.fecha_llegada := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedido_fecha_llegada ON pedido_proveedor;
CREATE TRIGGER trg_pedido_fecha_llegada
    BEFORE UPDATE ON pedido_proveedor
    FOR EACH ROW
    EXECUTE FUNCTION fn_pedido_fecha_llegada();


-- =====================================================================
-- 3. VALORES DE CONFIGURACIÓN, TARIFAS Y COLECCIONES
-- =====================================================================

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('multiplicador_crudo', 4, 'Precio crudo = precio de fábrica × este valor'),
    ('divisor_mayor', 2, 'Precio por mayor = precio crudo ÷ este valor'),
    ('valor_pintar_local', 3000, 'Se suma al precio crudo cuando la figura se pinta en el local (pinturas y técnica)'),
    ('valor_kit_local', 2300, 'Se suma al precio crudo al vender un kit para llevar (5 pinturas + 1 pincel)'),
    ('valor_pintada', 4300, 'Valor adicional sugerido por figura vendida pintada (se puede cambiar en cada venta)'),
    ('precio_kit_contrato', 13000, 'Precio por kit para empresas con contrato'),
    ('pinturas_por_kit', 5, 'Pinturas que lleva cada kit'),
    ('pinceles_por_kit', 1, 'Pinceles que lleva cada kit')
ON CONFLICT (clave) DO NOTHING;

INSERT INTO tarifa_envio (nombre, precio, orden) VALUES
    ('Mini', 400, 1),
    ('Pequeño', 600, 2),
    ('Mediano', 1200, 3),
    ('Grande', 1600, 4),
    ('Extra grande', 2500, 5)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO categoria_figura (nombre, orden) VALUES
    ('Navidad', 1),
    ('Materas', 2),
    ('Juveniles', 3),
    ('Religioso', 4),
    ('Hogar', 5),
    ('Terminados', 6)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO coleccion_material (nombre, descripcion, orden) VALUES
    ('Acrílicas', 'Pinturas acrílicas', 1),
    ('Pátinas', 'Pátinas para envejecer y dar acabado', 2),
    ('Metalizados', 'Pinturas con acabado metálico', 3),
    ('Bases', 'Bases y selladores', 4),
    ('Otras', 'Pinturas que no pertenecen a otra colección', 5)
ON CONFLICT (nombre) DO NOTHING;


-- =====================================================================
-- 4. DATOS DE PRUEBA
-- =====================================================================

-- ---------------------------------------------------------------------
-- 4.1 Usuarios
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombre, contrasena)
SELECT v.nombre, v.contrasena
FROM (VALUES
    ('admin_demo', 'DEMO_CAMBIAR_001'),
    ('cajero_demo', 'DEMO_CAMBIAR_002'),
    ('bodega_demo', 'DEMO_CAMBIAR_003'),
    ('vendedor_demo', 'DEMO_CAMBIAR_004'),
    ('supervisor_demo', 'DEMO_CAMBIAR_005')
) AS v(nombre, contrasena)
WHERE NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.nombre = v.nombre);

-- ---------------------------------------------------------------------
-- 4.2 Proveedores
-- ---------------------------------------------------------------------
INSERT INTO proveedor (nombre, telefono, dirección, ciudad, descripción, limite_precio, tipo)
SELECT v.nombre, v.telefono, v.direccion, v.ciudad, v.descripcion, v.limite, v.tipo
FROM (VALUES
    ('Distribuciones Andinas', '6025551001', 'Calle 10 # 12-30', 'Tuluá',
     'Distribuidor de cuadernos, lápices y borradores.', NULL::INTEGER, 'figuras'),
    ('Utiles Escolares SAS', '6025551002', 'Carrera 20 # 25-18', 'Cali',
     'Proveedor de bolígrafos y resaltadores.', NULL, 'figuras'),
    ('Papeles del Valle', '6025551003', 'Calle 15 # 18-42', 'Tuluá',
     'Distribuidor de papel, cartulinas y resmas.', NULL, 'figuras'),
    ('Suministros Escolares', '6025551004', 'Carrera 8 # 9-15', 'Buga',
     'Proveedor de carpetas, reglas, tijeras y útiles.', NULL, 'figuras'),
    ('Arte y Color', '6025551005', 'Calle 7 # 6-21', 'Cali',
     'Proveedor de materiales artísticos y manualidades.', NULL, 'ambos'),
    ('Fredy Bogotá', '3001234567', 'Calle 80 # 20-15', 'Bogotá',
     'Proveedor de figuras de yeso. Contrato: máximo $3.150 por figura.', 3150, 'figuras'),
    ('Casa del Arte', '6025551007', 'Carrera 5 # 12-30', 'Cali',
     'Proveedor de pinturas, pinceles y materiales para pintar.', NULL, 'materiales')
) AS v(nombre, telefono, direccion, ciudad, descripcion, limite, tipo)
WHERE NOT EXISTS (SELECT 1 FROM proveedor p WHERE p.nombre = v.nombre);

UPDATE proveedor SET tipo = 'figuras' WHERE tipo IS NULL;

-- ---------------------------------------------------------------------
-- 4.3 Catálogo: productos originales (papelería de prueba)
-- ---------------------------------------------------------------------
INSERT INTO producto (referencia, nombre, imagen, proveedor, tamano, descripcion, costo, tipo)
SELECT v.referencia, v.nombre, v.imagen, v.proveedor, v.tamano, v.descripcion, v.costo, 'figura'
FROM (VALUES
    ('PAP001', 'Cuaderno cuadriculado', 'cuaderno.jpg', 'Distribuciones Andinas', '100 hojas', 'Cuaderno cuadriculado para uso escolar.', 3000),
    ('PAP002', 'Cuaderno rayado', 'cuaderno_rayado.jpg', 'Distribuciones Andinas', '100 hojas', 'Cuaderno rayado para apuntes.', 3200),
    ('PAP003', 'Lapiz HB', 'lapiz.jpg', 'Distribuciones Andinas', 'Unidad', 'Lápiz de grafito HB.', 400),
    ('PAP004', 'Borrador blanco', 'borrador.jpg', 'Distribuciones Andinas', 'Unidad', 'Borrador blanco escolar.', 350),
    ('PAP005', 'Boligrafo azul', 'boligrafo_azul.jpg', 'Utiles Escolares SAS', 'Unidad', 'Bolígrafo de tinta azul.', 700),
    ('PAP006', 'Boligrafo negro', 'boligrafo_negro.jpg', 'Utiles Escolares SAS', 'Unidad', 'Bolígrafo de tinta negra.', 700),
    ('PAP007', 'Resaltador amarillo', 'resaltador.jpg', 'Utiles Escolares SAS', 'Unidad', 'Resaltador de tinta amarilla.', 1400),
    ('PAP008', 'Resma papel carta', 'resma.jpg', 'Papeles del Valle', '500 hojas', 'Resma de papel tamaño carta.', 14000),
    ('PAP009', 'Cartulina octavo', 'cartulina.jpg', 'Papeles del Valle', 'Octavo', 'Cartulina para trabajos escolares.', 600),
    ('PAP010', 'Carpeta plastica oficio', 'carpeta.jpg', 'Suministros Escolares', 'Oficio', 'Carpeta plástica tamaño oficio.', 1400),
    ('PAP011', 'Regla 30 cm', 'regla.jpg', 'Suministros Escolares', '30 cm', 'Regla plástica graduada.', 1100),
    ('PAP012', 'Transportador', 'transportador.jpg', 'Suministros Escolares', '180 grados', 'Transportador escolar semicircular.', 700),
    ('PAP013', 'Colores x12', 'colores.jpg', 'Arte y Color', '12 unidades', 'Caja de lápices de colores.', 7000),
    ('PAP014', 'Block iris', 'block_iris.jpg', 'Arte y Color', '20 hojas', 'Block de papel iris de colores.', 4800),
    ('PAP015', 'Marcador permanente negro', 'marcador.jpg', 'Arte y Color', 'Unidad', 'Marcador permanente de tinta negra.', 2400),
    ('PAP016', 'Pegante barra', 'pegante.jpg', 'Suministros Escolares', '40 g', 'Pegante en barra para papel.', 1800),
    ('PAP017', 'Tijeras escolares', 'tijeras.jpg', 'Suministros Escolares', '13 cm', 'Tijeras escolares de punta redonda.', 3000),
    ('PAP018', 'Sacapuntas', 'sacapuntas.jpg', 'Distribuciones Andinas', 'Unidad', 'Sacapuntas escolar sencillo.', 900)
) AS v(referencia, nombre, imagen, proveedor, tamano, descripcion, costo)
WHERE NOT EXISTS (SELECT 1 FROM producto p WHERE p.referencia = v.referencia);

-- ---------------------------------------------------------------------
-- 4.4 Catálogo: figuras de yeso (precio = fábrica × 4 + envío)
-- ---------------------------------------------------------------------
INSERT INTO producto (referencia, nombre, imagen, proveedor, tamano, descripcion,
                      costo, envio_categoria, envio, precio_venta, precio_mayorista, tipo)
SELECT v.referencia, v.nombre, v.imagen, 'Fredy Bogotá', v.tamano, v.descripcion,
       v.costo, v.categoria, v.envio,
       v.costo * 4 + v.envio,            -- precio crudo
       v.costo * 4 / 2 + v.envio,        -- precio por mayor
       'figura'
FROM (VALUES
    ('FB00001', 'Oso navidad', 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=500',
     '15 x 10 cm', 'Figura de yeso de oso navideño.', 2000, 'Mediano', 1200),
    ('FB00002', 'Muñeco de nieve', 'https://images.unsplash.com/photo-1548013146-72479768bada?w=500',
     '12 x 8 cm', 'Figura de yeso de muñeco de nieve.', 1800, 'Pequeño', 600),
    ('FB00003', 'Calabaza', 'https://images.unsplash.com/photo-1508361001413-7a9c3e0e4b8d?w=500',
     '8 x 8 cm', 'Figura de yeso de calabaza.', 1200, 'Mini', 400),
    ('FB00004', 'Ángel navideño', 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=500',
     '20 x 12 cm', 'Figura de yeso de ángel.', 3150, 'Grande', 1600)
) AS v(referencia, nombre, imagen, tamano, descripcion, costo, categoria, envio)
WHERE NOT EXISTS (SELECT 1 FROM producto p WHERE p.referencia = v.referencia);

-- ---------------------------------------------------------------------
-- 4.5 Catálogo: pinturas, pinceles y otros (precios escritos a mano)
--     Los tonos se nombran "Colección - Tono".
-- ---------------------------------------------------------------------
INSERT INTO producto (referencia, nombre, imagen, proveedor, tamano, descripcion,
                      costo, precio_venta, precio_mayorista, tipo, coleccion)
SELECT v.referencia, v.nombre, '', 'Casa del Arte', v.tamano, v.descripcion,
       v.costo, v.precio, v.mayor, v.tipo, v.coleccion
FROM (VALUES
    ('CA00001', 'Acrílicas - Rojo carmín', '60 ml', 'Pintura acrílica roja.', 1500, 3500, 2800, 'pintura', 'Acrílicas'),
    ('CA00002', 'Acrílicas - Azul cielo', '60 ml', 'Pintura acrílica azul.', 1500, 3500, 2800, 'pintura', 'Acrílicas'),
    ('CA00003', 'Acrílicas - Blanco', '60 ml', 'Pintura acrílica blanca.', 1500, 3500, 2800, 'pintura', 'Acrílicas'),
    ('CA00004', 'Metalizados - Dorado', '60 ml', 'Pintura metalizada dorada.', 2200, 4800, 3900, 'pintura', 'Metalizados'),
    ('CA00005', 'Pátinas - Café envejecido', '60 ml', 'Pátina para envejecer.', 2000, 4500, 3600, 'pintura', 'Pátinas'),
    ('CA00006', 'Pincel plano N° 8', 'N° 8', 'Pincel plano de cerda sintética.', 900, 2500, 1900, 'pincel', NULL),
    ('CA00007', 'Pincel redondo N° 2', 'N° 2', 'Pincel redondo para detalles.', 700, 2000, 1500, 'pincel', NULL),
    ('CA00008', 'Barniz brillante', '120 ml', 'Barniz para dar brillo y proteger.', 3500, 7500, 6000, 'otro', NULL)
) AS v(referencia, nombre, tamano, descripcion, costo, precio, mayor, tipo, coleccion)
WHERE NOT EXISTS (SELECT 1 FROM producto p WHERE p.referencia = v.referencia);

UPDATE producto SET tipo = 'figura' WHERE tipo IS NULL;

-- Categorías de las figuras de ejemplo
UPDATE producto SET categoria = 'Navidad'
WHERE referencia IN ('FB00001', 'FB00002', 'FB00004') AND categoria IS NULL;
UPDATE producto SET categoria = 'Hogar'
WHERE referencia = 'FB00003' AND categoria IS NULL;

-- ---------------------------------------------------------------------
-- 4.6 Inventario de bodega
-- ---------------------------------------------------------------------
INSERT INTO inventario_bodega (codigo, nombre, imagen, proveedor, tamano, descripcion, costo, existencias)
SELECT p.codigo, p.nombre, p.imagen, p.proveedor, p.tamano, p.descripcion, p.costo,
       CASE p.referencia
           WHEN 'PAP001' THEN 80  WHEN 'PAP002' THEN 65  WHEN 'PAP003' THEN 500
           WHEN 'PAP004' THEN 250 WHEN 'PAP005' THEN 200 WHEN 'PAP006' THEN 180
           WHEN 'PAP007' THEN 70  WHEN 'PAP008' THEN 35  WHEN 'PAP009' THEN 300
           WHEN 'PAP010' THEN 100 WHEN 'PAP011' THEN 90  WHEN 'PAP012' THEN 75
           WHEN 'PAP013' THEN 40  WHEN 'PAP014' THEN 45  WHEN 'PAP015' THEN 60
           WHEN 'PAP016' THEN 80  WHEN 'PAP017' THEN 50  WHEN 'PAP018' THEN 150
           WHEN 'FB00001' THEN 30 WHEN 'FB00002' THEN 25 WHEN 'FB00003' THEN 40
           WHEN 'FB00004' THEN 12
           WHEN 'CA00001' THEN 24 WHEN 'CA00002' THEN 24 WHEN 'CA00003' THEN 36
           WHEN 'CA00006' THEN 30
       END
FROM producto p
WHERE p.referencia IN (
    'PAP001','PAP002','PAP003','PAP004','PAP005','PAP006','PAP007','PAP008','PAP009',
    'PAP010','PAP011','PAP012','PAP013','PAP014','PAP015','PAP016','PAP017','PAP018',
    'FB00001','FB00002','FB00003','FB00004',
    'CA00001','CA00002','CA00003','CA00006'
)
AND NOT EXISTS (SELECT 1 FROM inventario_bodega ib WHERE ib.codigo = p.codigo);

-- ---------------------------------------------------------------------
-- 4.7 Inventario del local
-- ---------------------------------------------------------------------
INSERT INTO inventario_local (codigo, nombre, imagen, proveedor, tamano, existencias, precio_venta, precio_mayorista)
SELECT p.codigo, p.nombre, p.imagen, p.proveedor, p.tamano, v.existencias,
       COALESCE(NULLIF(p.precio_venta, 0), v.precio_venta),
       COALESCE(NULLIF(p.precio_mayorista, 0), v.precio_mayorista)
FROM producto p
JOIN (VALUES
    ('PAP001', 20, 4500, 4000),   ('PAP002', 15, 4800, 4300),   ('PAP003', 100, 800, 650),
    ('PAP004', 50, 700, 550),     ('PAP005', 60, 1200, 950),    ('PAP006', 50, 1200, 950),
    ('PAP007', 20, 2300, 1900),   ('PAP008', 8, 18000, 16500),  ('PAP009', 60, 900, 750),
    ('PAP010', 25, 2200, 1900),   ('PAP011', 20, 1800, 1500),   ('PAP012', 15, 1200, 1000),
    ('PAP013', 12, 9500, 8500),   ('PAP014', 12, 6500, 5800),   ('PAP015', 15, 3500, 3000),
    ('PAP016', 20, 2800, 2400),   ('PAP017', 12, 4500, 3900),   ('PAP018', 40, 1500, 1200),
    ('FB00001', 8, 0, 0),         ('FB00002', 6, 0, 0),         ('FB00003', 10, 0, 0),
    ('FB00004', 4, 0, 0),
    ('CA00001', 12, 0, 0),        ('CA00002', 10, 0, 0),        ('CA00003', 15, 0, 0),
    ('CA00004', 6, 0, 0),         ('CA00005', 5, 0, 0),         ('CA00006', 20, 0, 0),
    ('CA00007', 18, 0, 0),        ('CA00008', 4, 0, 0)
) AS v(referencia, existencias, precio_venta, precio_mayorista) ON v.referencia = p.referencia
WHERE NOT EXISTS (SELECT 1 FROM inventario_local il WHERE il.codigo = p.codigo);

-- Los productos originales tenían el precio solo en el local: se copia al catálogo
UPDATE producto p
SET precio_venta = il.precio_venta,
    precio_mayorista = il.precio_mayorista
FROM inventario_local il
WHERE il.codigo = p.codigo
  AND COALESCE(p.precio_venta, 0) = 0
  AND COALESCE(p.precio_mayorista, 0) = 0;

-- ---------------------------------------------------------------------
-- 4.8 Ventas (producto, cantidad y precio_unitario en el mismo orden)
--     Se insertan solo si la tabla está vacía, para no duplicarlas.
-- ---------------------------------------------------------------------
INSERT INTO venta (producto, cantidad, precio_unitario, total, fecha, cliente, observacion, usuario, modalidad)
SELECT * FROM (VALUES
    ('Cuaderno cuadriculado, Lapiz HB', '5, 10', '4500, 800', 30500, TIMESTAMP '2026-09-01 08:30:00', 'Cliente mostrador', 'Venta de útiles escolares', 'cajero_demo', 'Detal'),
    ('Boligrafo azul, Borrador blanco', '12, 4', '1200, 700', 17200, TIMESTAMP '2026-09-02 10:15:00', 'Laura Gómez', 'Compra escolar', 'vendedor_demo', 'Detal'),
    ('Cartulina octavo, Marcador permanente negro', '10, 2', '900, 3500', 16000, TIMESTAMP '2026-09-03 14:20:00', 'Cliente mostrador', 'Materiales para una cartelera', 'cajero_demo', 'Detal'),
    ('Resma papel carta, Carpeta plastica oficio', '2, 5', '18000, 2200', 47000, TIMESTAMP '2026-09-04 09:10:00', 'Oficina Administrativa', 'Compra para oficina', 'vendedor_demo', 'Detal'),
    ('Colores x12, Sacapuntas', '3, 3', '9500, 1500', 33000, TIMESTAMP '2026-09-05 11:40:00', 'Andrés Ramírez', 'Útiles para estudiantes', 'cajero_demo', 'Detal'),
    ('Pegante barra, Tijeras escolares', '4, 2', '2800, 4500', 20200, TIMESTAMP '2026-09-06 15:05:00', 'Cliente mostrador', 'Materiales para manualidades', 'vendedor_demo', 'Detal'),
    ('Regla 30 cm, Transportador', '6, 2', '1800, 1200', 13200, TIMESTAMP '2026-09-08 08:50:00', 'Santiago López', 'Útiles de geometría', 'cajero_demo', 'Detal'),
    ('Block iris, Cartulina octavo', '3, 5', '6500, 900', 24000, TIMESTAMP '2026-09-10 13:25:00', 'María Torres', 'Material artístico', 'vendedor_demo', 'Detal'),
    ('Resaltador amarillo, Boligrafo negro', '5, 5', '2300, 1200', 17500, TIMESTAMP '2026-09-12 16:00:00', 'Cliente mostrador', 'Compra de papelería', 'cajero_demo', 'Detal'),
    ('Cuaderno cuadriculado, Colores x12', '8, 2', '4500, 9500', 55000, TIMESTAMP '2026-09-15 10:45:00', 'Papelería Institucional', 'Compra de materiales escolares', 'supervisor_demo', 'Detal'),
    ('Cuaderno rayado, Lapiz HB, Borrador blanco', '4, 8, 4', '4800, 800, 700', 28400, TIMESTAMP '2026-09-18 09:35:00', 'Cliente mostrador', 'Compra de varios útiles', 'cajero_demo', 'Detal'),
    ('Carpeta plastica oficio, Regla 30 cm, Pegante barra', '3, 4, 2', '2200, 1800, 2800', 19400, TIMESTAMP '2026-09-20 12:10:00', 'Carlos Méndez', 'Material para oficina', 'vendedor_demo', 'Detal'),
    ('Oso navidad, Acrílicas - Rojo carmín, Pincel plano N° 8', '2, 1, 1', '10300, 3500, 2500', 26600, TIMESTAMP '2026-10-01 11:00:00', 'Cliente mostrador', 'Kit para pintar en casa', 'cajero_demo', 'Kit para llevar')
) AS v(producto, cantidad, precio_unitario, total, fecha, cliente, observacion, usuario, modalidad)
WHERE NOT EXISTS (SELECT 1 FROM venta);

UPDATE venta SET modalidad = 'Detal' WHERE modalidad IS NULL;
UPDATE venta SET modalidad = 'Kit para llevar' WHERE modalidad = 'Kit (local)';

-- ---------------------------------------------------------------------
-- 4.9 Pedidos a proveedores (solo si la tabla está vacía)
-- ---------------------------------------------------------------------
INSERT INTO pedido_proveedor (proveedor, productos, cantidad, precio_esperado, llegan, sobran, faltan,
                              dañados, facturado, precio_factura, observaciones, precio_total,
                              fecha_pedido, fecha_llegada, estado, zona_entrega)
SELECT * FROM (VALUES
    ('Distribuciones Andinas', 'Cuaderno cuadriculado, Lapiz HB, Borrador blanco', '30, 100, 50', '3000, 400, 350',
     '30, 100, 50', '0, 0, 0', '0, 0, 0', '0, 0, 0', '30, 100, 50', '3000, 400, 350', '', 147500,
     TIMESTAMP '2026-08-20 08:00:00', TIMESTAMP '2026-08-22 10:00:00', TRUE, TRUE),
    ('Papeles del Valle', 'Resma papel carta, Cartulina octavo', '20, 100', '14000, 600',
     '20, 100', '0, 0', '0, 0', '0, 0', '20, 100', '14000, 600', '', 340000,
     TIMESTAMP '2026-08-25 09:00:00', TIMESTAMP '2026-08-27 11:00:00', TRUE, TRUE),
    ('Utiles Escolares SAS', 'Boligrafo azul, Boligrafo negro, Resaltador amarillo', '100, 100, 30', '700, 700, 1400',
     '100, 100, 30', '0, 0, 0', '0, 0, 0', '0, 0, 0', '100, 100, 30', '700, 700, 1400', '', 182000,
     TIMESTAMP '2026-09-01 08:30:00', TIMESTAMP '2026-09-03 14:00:00', TRUE, TRUE),
    ('Arte y Color', 'Colores x12, Block iris, Marcador permanente negro', '20, 20, 15', '7000, 4800, 2400',
     '20, 18, 15', '0, 0, 0', '0, 2, 0', '0, 0, 0', '20, 20, 15', '7000, 4800, 2400', 'Faltaron 2 block iris.', 272000,
     TIMESTAMP '2026-09-05 09:00:00', TIMESTAMP '2026-09-08 10:30:00', TRUE, FALSE),
    ('Suministros Escolares', 'Carpeta plastica oficio, Regla 30 cm, Transportador', '50, 50, 30', '1400, 1100, 700',
     '50, 50, 30', '0, 0, 0', '0, 0, 0', '0, 0, 0', '50, 50, 30', '1400, 1100, 700', '', 146000,
     TIMESTAMP '2026-09-10 08:00:00', TIMESTAMP '2026-09-12 09:30:00', TRUE, TRUE),
    ('Distribuciones Andinas', 'Cuaderno rayado, Sacapuntas', '25, 60', '3200, 900',
     '25, 60', '0, 0', '0, 0', '0, 0', '25, 60', '3200, 900', '', 134000,
     TIMESTAMP '2026-09-15 10:00:00', TIMESTAMP '2026-09-17 08:45:00', TRUE, TRUE),
    ('Suministros Escolares', 'Pegante barra, Tijeras escolares', '40, 25', '1800, 3000',
     '40, 24', '0, 0', '0, 1', '0, 1', '40, 25', '1800, 3000', 'Llegó una tijera dañada y faltó otra.', 147000,
     TIMESTAMP '2026-09-22 09:00:00', TIMESTAMP '2026-09-24 11:00:00', TRUE, TRUE),
    ('Papeles del Valle', 'Resma papel carta, Cartulina octavo', '15, 80', '14000, 600',
     '0, 0', '0, 0', '15, 80', '0, 0', '0, 0', '0, 0', '', 258000,
     TIMESTAMP '2026-10-02 08:00:00', NULL::TIMESTAMP, FALSE, FALSE),
    ('Fredy Bogotá', 'Oso navidad, Ángel navideño', '20, 10', '2000, 3150',
     '0, 0', '0, 0', '20, 10', '0, 0', '0, 0', '0, 0', '', 71500,
     TIMESTAMP '2026-10-05 09:00:00', NULL::TIMESTAMP, FALSE, TRUE)
) AS v(proveedor, productos, cantidad, precio_esperado, llegan, sobran, faltan, danados, facturado,
       precio_factura, observaciones, precio_total, fecha_pedido, fecha_llegada, estado, zona_entrega)
WHERE NOT EXISTS (SELECT 1 FROM pedido_proveedor);

-- Pedidos antiguos sin datos de factura: se asume que la factura coincidía con lo que llegó
UPDATE pedido_proveedor
SET facturado = COALESCE(facturado, llegan),
    precio_factura = COALESCE(precio_factura, precio_esperado),
    observaciones = COALESCE(observaciones, '')
WHERE facturado IS NULL OR precio_factura IS NULL OR observaciones IS NULL;

-- ---------------------------------------------------------------------
-- 4.10 Traslados (solo si la tabla está vacía)
-- ---------------------------------------------------------------------
INSERT INTO traslado (producto, cantidad, fecha, sentido)
SELECT * FROM (VALUES
    ('Cuaderno cuadriculado, Lapiz HB', '15, 100', TIMESTAMP '2026-09-02 08:00:00', 'bodega_local'),
    ('Boligrafo azul, Boligrafo negro', '40, 35', TIMESTAMP '2026-09-03 08:30:00', 'bodega_local'),
    ('Resma papel carta, Carpeta plastica oficio', '5, 15', TIMESTAMP '2026-09-04 09:00:00', 'bodega_local'),
    ('Colores x12, Block iris', '8, 8', TIMESTAMP '2026-09-06 08:15:00', 'bodega_local'),
    ('Cartulina octavo, Marcador permanente negro', '50, 10', TIMESTAMP '2026-09-08 08:45:00', 'bodega_local'),
    ('Regla 30 cm, Transportador', '15, 10', TIMESTAMP '2026-09-10 09:10:00', 'bodega_local'),
    ('Pegante barra, Tijeras escolares', '15, 10', TIMESTAMP '2026-09-12 08:20:00', 'bodega_local'),
    ('Cuaderno rayado, Sacapuntas', '10, 30', TIMESTAMP '2026-09-16 08:00:00', 'bodega_local'),
    ('Resaltador amarillo, Boligrafo azul', '10, 25', TIMESTAMP '2026-09-19 09:30:00', 'bodega_local'),
    ('Cuaderno cuadriculado, Borrador blanco', '12, 40', TIMESTAMP '2026-09-23 08:40:00', 'bodega_local'),
    ('Resma papel carta, Cartulina octavo', '4, 40', TIMESTAMP '2026-09-26 08:50:00', 'bodega_local'),
    ('Colores x12, Marcador permanente negro', '5, 8', TIMESTAMP '2026-09-29 09:00:00', 'bodega_local'),
    ('Oso navidad, Calabaza', '8, 10', TIMESTAMP '2026-10-03 08:30:00', 'bodega_local'),
    ('Resma papel carta', '2', TIMESTAMP '2026-10-06 17:00:00', 'local_bodega')
) AS v(producto, cantidad, fecha, sentido)
WHERE NOT EXISTS (SELECT 1 FROM traslado);

UPDATE traslado SET sentido = 'bodega_local' WHERE sentido IS NULL;


-- =====================================================================
-- 5. AJUSTE DE SECUENCIAS
--    Si alguna vez se insertaron códigos a mano, evita el error
--    "duplicate key" en los siguientes registros.
-- =====================================================================
SELECT setval(pg_get_serial_sequence('usuarios', 'id'), COALESCE(MAX(id), 1)) FROM usuarios;
SELECT setval(pg_get_serial_sequence('producto', 'codigo'), COALESCE(MAX(codigo), 1)) FROM producto;
SELECT setval(pg_get_serial_sequence('venta', 'codigo'), COALESCE(MAX(codigo), 1)) FROM venta;
SELECT setval(pg_get_serial_sequence('pedido_proveedor', 'codigo'), COALESCE(MAX(codigo), 1)) FROM pedido_proveedor;
SELECT setval(pg_get_serial_sequence('traslado', 'codigo'), COALESCE(MAX(codigo), 1)) FROM traslado;
