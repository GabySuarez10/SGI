-- ============================================================
-- Migración 002: valores para las modalidades "Pintar en el local" y "Pintada".
-- Idempotente: se puede ejecutar varias veces.
-- ============================================================

INSERT INTO configuracion (clave, valor, descripcion) VALUES
    ('valor_pintar_local', 3000, 'Valor que se suma al precio crudo cuando la figura se pinta en el local (pinturas y técnica)'),
    ('valor_pintada', 4300, 'Valor adicional sugerido por figura vendida ya pintada (se puede cambiar en cada venta)')
ON CONFLICT (clave) DO NOTHING;

UPDATE configuracion
SET descripcion = 'Valor que se suma al precio crudo al vender un kit para llevar (5 pinturas + 1 pincel)'
WHERE clave = 'valor_kit_local';

-- La modalidad "Kit (local)" ahora se llama "Kit para llevar"
UPDATE venta SET modalidad = 'Kit para llevar' WHERE modalidad = 'Kit (local)';
