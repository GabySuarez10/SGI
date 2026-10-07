# API Flask - SGI (Sistema de Gestión de Inventarios)

API REST en **Flask** + **Flask-SQLAlchemy** conectada a **PostgreSQL (Neon)** que usa el
front de Angular (`SGI_FRONT/frontend`). Maneja productos, proveedores, inventario de bodega,
inventario del local, traslados, ventas, pedidos a proveedores, usuarios e historial.

---

## 🚀 Cómo correr el proyecto

### 1. Backend (esta carpeta)

```bash
cd SGI_FASE1
python -m venv .venv
# Windows:      .\.venv\Scripts\activate
# Linux / Mac:  source .venv/bin/activate
pip install -r requirements.txt
```

Crea el archivo `.env` (copia de `.env.example`) con la cadena de Neon:

```env
DATABASE_URL=postgresql://usuario:contraseña@host.neon.tech/neondb?sslmode=require&channel_binding=require
PORT=5000
```

```bash
python app.py
```

Abre `http://localhost:5000/` → debe responder `"status": "ok"` si la conexión con Neon funciona.

### 2. Frontend

```bash
cd SGI_FRONT/frontend
npm install
ng serve        # o: npm start
```

Abre `http://localhost:4200/`, inicia sesión con un usuario de la tabla `Usuarios`
(por ejemplo los de prueba `admin_demo`, `cajero_demo`...).
La URL de la API está en `src/environments/environment.ts` (`http://localhost:5000/api`).

---

## 🗂️ Estructura

Sigue la misma idea del repositorio de referencia (Classes / QueriesManager / Controllers):

```
SGI_FASE1/
├── app.py            # crea la app, CORS, rutas y manejo de errores
├── config.py         # lee el .env (DATABASE_URL, PORT, CORS_ORIGINS)
├── database.py       # instancia de SQLAlchemy
├── models/           # "Classes": una clase por tabla + to_dict()
├── queries/          # "QueriesManager": consultas y reglas del negocio (stock)
├── routes/           # "Controllers": endpoints HTTP (Blueprints), solo llaman a queries
└── utils/
    ├── listas.py     # texto "a, b, c" <-> lista ["a", "b", "c"]
    ├── fechas.py     # conversión de fechas
    └── errores.py    # ErrorAPI -> respuesta {"error": "..."}
```

## 📋 Columnas que son listas

`Venta`, `Pedido_proveedor` y `Traslado` guardan varios productos en una misma fila,
separados por comas. **No** son referencias a otras tablas: la posición indica a qué producto
pertenece cada valor.

| En la base de datos                       | En la API (JSON)                        |
|-------------------------------------------|-----------------------------------------|
| `Producto = 'Cuaderno cuadriculado, Lapiz HB'` | `"producto": ["Cuaderno cuadriculado", "Lapiz HB"]` |
| `Cantidad = '5, 10'`                      | `"cantidad": [5, 10]`                   |
| `Precio_unitario = '4500, 800'`           | `"precio_unitario": [4500, 800]`        |

Al crear registros se pueden enviar arreglos JSON (recomendado) o texto separado por comas.
Por eso **el nombre de un producto no puede contener comas** (la API lo valida).

Columnas lista: ventas (`producto`, `cantidad`, `precio_unitario`), traslados (`producto`,
`cantidad`) y pedidos (`productos`, `cantidad`, `precio_esperado`, `llegan`, `sobran`,
`faltan`, `danados`).

## 🖼️ Imágenes

`imagen` guarda la **URL** de la imagen alojada en la nube (Cloudinary, Imgur, etc.). El front
la usa directamente en `<img [src]="producto.imagen">` y muestra una imagen genérica si la URL
está vacía o no carga (los datos de prueba traen nombres como `cuaderno.jpg`, que no son URLs).

---

## 📌 Endpoints

Todas las respuestas son JSON. Los errores responden `{"error": "mensaje"}` con código
400/401/404/409 y **no guardan cambios parciales**.

### 👤 Usuarios `/api/usuarios`
- `GET /api/usuarios` · `GET /api/usuarios/<id>` (nunca devuelven la contraseña)
- `POST /api/usuarios` — registro `{ nombre, contrasena }` (mínimo 6 caracteres)
- `POST /api/usuarios/login` — `{ nombre, contrasena }` → `{ id, nombre }`
- `PUT /api/usuarios/<id>` — `{ nombre?, contrasena? }`
- `DELETE /api/usuarios/<id>`

### 🏢 Proveedores `/api/proveedores`
- `GET`, `GET /<nombre>`, `POST { nombre, telefono, direccion, ciudad, descripcion }`
- `PUT /<nombre>` — si cambia `nombre`, se actualiza también en productos, inventarios y pedidos
- `DELETE /<nombre>` — no permite borrar un proveedor con productos

### 📦 Productos `/api/productos`
- `GET` — catálogo con `existencias_bodega`, `existencias_local`, `existencias`, `precio_venta`, `precio_mayorista`
- `GET /<codigo>`
- `POST` — uno o varios productos de un proveedor:
  ```json
  { "proveedor": "Arte y Color",
    "productos": [ { "nombre": "Vinilo azul", "tamano": "250 ml", "imagen": "https://...",
                     "descripcion": "", "referencia": "", "costo": 3000,
                     "precio_venta": 4500, "precio_mayorista": 4000 } ] }
  ```
  Si `referencia` va vacía se genera con las iniciales del proveedor (`AC0001`). Cada producto
  nuevo se crea también en `Inventario_bodega` e `Inventario_local` con 0 existencias.
- `PUT /<codigo>` — actualiza el catálogo y sincroniza nombre/imagen/proveedor/tamaño en los inventarios
- `DELETE /<codigo>` — borra el producto y sus filas de inventario

### 🏬 Inventario bodega `/api/inventario-bodega` · 🏪 Inventario local `/api/inventario-local`
- `GET`, `GET /<codigo>`
- `PUT /<codigo>` — ajuste manual (`existencias`, `costo` / `precio_venta`, `precio_mayorista`)

### 🔄 Traslados `/api/traslados` (bodega → local)
- `GET`, `GET /<codigo>`
- `POST { "producto": ["Lapiz HB", "Borrador blanco"], "cantidad": [10, 5] }`
  → valida stock, descuenta de bodega, suma al local y guarda el traslado
- `DELETE /<codigo>` — anula: devuelve las unidades a bodega

### 💰 Ventas `/api/ventas` (salen del local)
- `GET`, `GET /<codigo>`
- `POST { producto: [...], cantidad: [...], precio_unitario: [...], cliente, observacion, usuario, fecha? }`
  → valida y descuenta stock del local; `total` se calcula en el servidor.
  Si no se envía `precio_unitario` se usa el `precio_venta` del local.
- `DELETE /<codigo>` — anula: devuelve las unidades al local

### 🚚 Pedidos a proveedor `/api/pedidos-proveedor`
- `GET` (`?estado=pendientes|recibidos`), `GET /<codigo>`
- `POST { proveedor, productos: [...], cantidad: [...], precio_esperado: [...], fecha_pedido, zona_entrega }`
  → queda pendiente; todos los productos deben ser del mismo proveedor
- `PUT /<codigo>` — editar un pedido pendiente
- `PUT /<codigo>/recepcion { "llegan": [...], "danados": [...] }`
  → calcula `sobran` y `faltan`, marca `estado = true`, guarda `fecha_llegada` y suma
  `llegan - danados` al inventario de destino
- `DELETE /<codigo>` — solo pedidos pendientes

`zona_entrega`: `true` = se recibe en **Bodega**, `false` = se recibe en el **Local**.

### 🕓 Historial y resumen
- `GET /api/historial` — ventas, traslados y pedidos desplegados en un movimiento por producto
- `GET /api/dashboard` — totales, pedidos recientes, alertas (faltantes, dañados, stock bajo) y actividad reciente
