# API Flask - SGI (Sistema de Gestión de Inventarios)

API RESTful desarrollada con **Flask**, **Flask-SQLAlchemy**, **Flask-CORS** y **PostgreSQL** para la gestión de usuarios, pedidos a proveedores, ventas, proveedores, traslados, inventario local, productos e inventario de bodega.

---

## 🚀 Requisitos e Instalación

1. **Crear y activar un entorno virtual** (opcional pero recomendado):
   ```bash
   python -m venv .venv
   # En Windows:
   .\.venv\Scripts\activate
   # En Linux/Mac:
   source .venv/bin/activate
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar la base de datos**:
   Crea un archivo `.env` en la raíz de `SGI_FASE1` basándote en `.env.example`:
   ```env
   DATABASE_URL=postgresql://usuario:contraseña@localhost:5432/nombre_db
   PORT=5000
   ```

4. **Ejecutar la API**:
   ```bash
   python app.py
   ```
   La aplicación se ejecutará en `http://localhost:5000`.

---

## 📌 Rutas de la API (Endpoints CRUD)

Cada tabla cuenta con un conjunto completo de rutas CRUD:

### 1. 👤 Usuarios (`/api/usuarios`)
- `GET /api/usuarios` - Obtener todos los usuarios.
- `GET /api/usuarios/<id>` - Obtener usuario por ID.
- `POST /api/usuarios` - Crear un nuevo usuario (`nombre`, `contrasena`).
- `PUT /api/usuarios/<id>` - Actualizar usuario.
- `DELETE /api/usuarios/<id>` - Eliminar usuario.

### 2. 🚚 Pedidos a Proveedor (`/api/pedidos-proveedor`)
- `GET /api/pedidos-proveedor` - Listar todos los pedidos.
- `GET /api/pedidos-proveedor/<codigo>` - Obtener pedido por código.
- `POST /api/pedidos-proveedor` - Crear pedido.
- `PUT /api/pedidos-proveedor/<codigo>` - Actualizar pedido (actualiza `fecha_llegada` automáticamente vía trigger si cambia `estado` o `zona_entrega`).
- `DELETE /api/pedidos-proveedor/<codigo>` - Eliminar pedido.

### 3. 💰 Ventas (`/api/ventas`)
- `GET /api/ventas` - Listar todas las ventas.
- `GET /api/ventas/<codigo>` - Obtener venta por código.
- `POST /api/ventas` - Registrar venta.
- `PUT /api/ventas/<codigo>` - Editar registro de venta.
- `DELETE /api/ventas/<codigo>` - Eliminar venta.

### 4. 🏢 Proveedores (`/api/proveedores`)
- `GET /api/proveedores` - Listar proveedores.
- `GET /api/proveedores/<nombre>` - Obtener proveedor por nombre.
- `POST /api/proveedores` - Registrar proveedor (`nombre`, `telefono`, `direccion`, `ciudad`, `descripcion`).
- `PUT /api/proveedores/<nombre>` - Actualizar datos del proveedor.
- `DELETE /api/proveedores/<nombre>` - Eliminar proveedor.

### 5. 🔄 Traslados (`/api/traslados`)
- `GET /api/traslados` - Listar traslados.
- `GET /api/traslados/<codigo>` - Obtener traslado por código.
- `POST /api/traslados` - Registrar traslado (`producto`, `cantidad`).
- `PUT /api/traslados/<codigo>` - Actualizar traslado.
- `DELETE /api/traslados/<codigo>` - Eliminar traslado.

### 6. 🏪 Inventario Local (`/api/inventario-local`)
- `GET /api/inventario-local` - Listar productos en inventario local.
- `GET /api/inventario-local/<codigo>` - Obtener ítem por código.
- `POST /api/inventario-local` - Crear ítem.
- `PUT /api/inventario-local/<codigo>` - Actualizar existencias o precios.
- `DELETE /api/inventario-local/<codigo>` - Eliminar ítem.

### 7. 📦 Productos (`/api/productos`)
- `GET /api/productos` - Listar productos del catálogo.
- `GET /api/productos/<codigo>` - Obtener producto por código.
- `POST /api/productos` - Crear producto (`referencia`, `nombre`, `imagen`, `proveedor`, `tamano`, `descripcion`, `costo`).
- `PUT /api/productos/<codigo>` - Actualizar datos del producto.
- `DELETE /api/productos/<codigo>` - Eliminar producto.

### 8. 🏬 Inventario Bodega (`/api/inventario-bodega`)
- `GET /api/inventario-bodega` - Listar inventario en bodega.
- `GET /api/inventario-bodega/<codigo>` - Obtener ítem por código.
- `POST /api/inventario-bodega` - Crear ítem en bodega.
- `PUT /api/inventario-bodega/<codigo>` - Actualizar ítem en bodega.
- `DELETE /api/inventario-bodega/<codigo>` - Eliminar ítem en bodega.
