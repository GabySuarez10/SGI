-- ============================================================
-- Migración 007: pinturas y pinceles para kits.
-- NO crea tablas ni columnas: solo AGREGA 2 productos fijos (con 0 unidades)
-- en el catálogo, en el local y en la bodega, y la colección "Kits".
--   KIT-PINTURAS -> "Pinturas para kits"
--   KIT-PINCELES -> "Pinceles para kits"
-- Kit para llevar descuenta del LOCAL; Empresa con contrato, de la BODEGA.
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

INSERT INTO coleccion_material (nombre, descripcion, orden)
VALUES ('Kits', 'Pinturas reservadas para armar kits (5 por figura)', 6)
ON CONFLICT (nombre) DO NOTHING;

-- Por si la secuencia de códigos quedó atrás de los datos cargados a mano
SELECT setval(pg_get_serial_sequence('producto', 'codigo'),
              GREATEST((SELECT COALESCE(MAX(codigo), 0) FROM producto), 1));

INSERT INTO producto (referencia, nombre, imagen, proveedor, tamano, descripcion,
                      costo, envio, precio_venta, precio_mayorista, tipo, coleccion)
SELECT 'KIT-PINTURAS', 'Pinturas para kits', '',
       (SELECT nombre FROM proveedor WHERE tipo IN ('materiales', 'ambos') ORDER BY nombre LIMIT 1),
       'Unidad', 'Pinturas que se descuentan al vender kits (5 por figura)',
       0, 0, 0, 0, 'pintura', 'Kits'
WHERE NOT EXISTS (SELECT 1 FROM producto WHERE upper(referencia) = 'KIT-PINTURAS');

INSERT INTO producto (referencia, nombre, imagen, proveedor, tamano, descripcion,
                      costo, envio, precio_venta, precio_mayorista, tipo, coleccion)
SELECT 'KIT-PINCELES', 'Pinceles para kits', '',
       (SELECT nombre FROM proveedor WHERE tipo IN ('materiales', 'ambos') ORDER BY nombre LIMIT 1),
       'Unidad', 'Pinceles que se descuentan al vender kits (1 por figura)',
       0, 0, 0, 0, 'pincel', NULL
WHERE NOT EXISTS (SELECT 1 FROM producto WHERE upper(referencia) = 'KIT-PINCELES');

-- Fila en el local y en la bodega con 0 unidades
INSERT INTO inventario_local (codigo, nombre, imagen, proveedor, tamano, existencias, precio_venta, precio_mayorista)
SELECT p.codigo, p.nombre, p.imagen, p.proveedor, p.tamano, 0, 0, 0
FROM producto p
WHERE upper(p.referencia) IN ('KIT-PINTURAS', 'KIT-PINCELES')
  AND NOT EXISTS (SELECT 1 FROM inventario_local l WHERE l.codigo = p.codigo);

INSERT INTO inventario_bodega (codigo, nombre, imagen, proveedor, tamano, descripcion, costo, existencias)
SELECT p.codigo, p.nombre, p.imagen, p.proveedor, p.tamano, p.descripcion, 0, 0
FROM producto p
WHERE upper(p.referencia) IN ('KIT-PINTURAS', 'KIT-PINCELES')
  AND NOT EXISTS (SELECT 1 FROM inventario_bodega b WHERE b.codigo = p.codigo);
