-- ==============================================================
-- DML Inicial de Prueba - Proyecto Sabor
-- ==============================================================

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sucursal_plato;
TRUNCATE TABLE sucursal_horario;
TRUNCATE TABLE empleado;
TRUNCATE TABLE sucursal;
TRUNCATE TABLE puesto;
TRUNCATE TABLE plato;
TRUNCATE TABLE horario;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. PUESTOS
INSERT INTO puesto (id, nombre, sueldo_hora, carga_horaria_diaria, activo) VALUES
(1, 'Encargado de Sucursal', 5200.00, 8, 1),
(2, 'Chef Principal', 4800.00, 8, 1),
(3, 'Ayudante de Cocina', 3300.00, 8, 1),
(4, 'Mozo / Camarero', 3000.00, 6, 1),
(5, 'Cajero', 3100.00, 6, 1);

-- 2. SUCURSALES
INSERT INTO sucursal (id, nombre, direccion, num_telefono, activo) VALUES
(1, 'Sabor Centro', 'Av. Corrientes 1234, CABA', '11-4567-8901', 1),
(2, 'Sabor Palermo', 'Honduras 4820, Palermo, CABA', '11-4832-1122', 1),
(3, 'Sabor Belgrano', 'Av. Cabildo 2040, Belgrano, CABA', '11-4780-3344', 1);

-- 3. EMPLEADOS
INSERT INTO empleado (id, nombre, apellido, num_telefono, id_puesto, id_sucursal, activo) VALUES
(1, 'Carlos', 'Gómez', '11-2345-6789', 1, 1, 1),
(2, 'Sofía', 'Martínez', '11-3456-7890', 2, 1, 1),
(3, 'Lucas', 'Fernández', '11-4567-8901', 4, 1, 1),
(4, 'Mariana', 'López', '11-5678-9012', 1, 2, 1),
(5, 'Juan', 'Pérez', '11-6789-0123', 2, 2, 1),
(6, 'Florencia', 'Díaz', '11-7890-1234', 4, 2, 1),
(7, 'Esteban', 'Quito', '11-8901-2345', 1, 3, 1),
(8, 'Camila', 'Torres', '11-9012-3456', 3, 3, 1);

-- 4. HORARIOS (enum: 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO')
INSERT INTO horario (id, dia, hora_apertura, hora_cierre, activo) VALUES
(1, 'LUNES', '08:00:00', '16:00:00', 1),
(2, 'MARTES', '08:00:00', '16:00:00', 1),
(3, 'MIERCOLES', '08:00:00', '16:00:00', 1),
(4, 'JUEVES', '08:00:00', '16:00:00', 1),
(5, 'VIERNES', '08:00:00', '00:00:00', 1),
(6, 'SABADO', '10:00:00', '01:00:00', 1),
(7, 'DOMINGO', '10:00:00', '23:00:00', 1);

-- 5. PLATOS
INSERT INTO plato (id, nombre, precio, descripcion, apto_celiaco, activo) VALUES
(1, 'Bife de Chorizo', 14500.00, 'Corte clásico a la parrilla servido con papas rústicas al romero', 1, 1),
(2, 'Milanesa Napolitana', 11800.00, 'Milanesa de ternera con salsa de tomate, jamón, muzzarella y puré', 0, 1),
(3, 'Ravioles de Ricota y Nuez', 9800.00, 'Pasta artesanal con salsa mixta y queso parmesano rallado', 0, 1),
(4, 'Ensalada Caesar', 8500.00, 'Hojas verdes, pechuga grillé, crutones sin TACC, parmesano y aderezo caesar', 1, 1),
(5, 'Flan Casero con Dulce de Leche', 4200.00, 'Flan tradicional de huevos con dulce de leche y crema chantilly', 1, 1);

-- 6. ASOCIACIÓN SUCURSAL - HORARIOS
INSERT INTO sucursal_horario (id_sucursal, id_horario, activo) VALUES
-- Sabor Centro (Lunes a Viernes de mañana, Sábado)
(1, 1, 1), (1, 2, 1), (1, 3, 1), (1, 4, 1), (1, 5, 1), (1, 6, 1),
-- Sabor Palermo (Miércoles a Domingo)
(2, 3, 1), (2, 4, 1), (2, 5, 1), (2, 6, 1), (2, 7, 1),
-- Sabor Belgrano (Viernes a Domingo)
(3, 5, 1), (3, 6, 1), (3, 7, 1);

-- 7. ASOCIACIÓN SUCURSAL - PLATOS
INSERT INTO sucursal_plato (id_sucursal, id_plato, activo) VALUES
-- Sabor Centro (todos los platos)
(1, 1, 1), (1, 2, 1), (1, 3, 1), (1, 4, 1), (1, 5, 1),
-- Sabor Palermo
(2, 1, 1), (2, 4, 1), (2, 5, 1),
-- Sabor Belgrano
(3, 2, 1), (3, 3, 1), (3, 5, 1);
