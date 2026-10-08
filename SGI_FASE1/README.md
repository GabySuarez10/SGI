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

## 🗄️ Script completo de la base de datos

`base_datos/sgi_completo.sql` tiene toda la estructura (tablas, columnas, trigger de fecha de
llegada) y los datos de prueba. Se puede ejecutar en una base vacía o en la base actual: solo
agrega lo que falta y no duplica datos.

## 🧱 Migraciones

Al arrancar (`python app.py`) la API ejecuta los archivos de `migraciones/*.sql`. Son
idempotentes (`IF NOT EXISTS` / `ON CONFLICT`), así que no duplican ni borran datos. Crean:

- columnas `envio_categoria`, `envio`, `precio_venta`, `precio_mayorista` en `producto`
- `limite_precio` en `proveedor`
- `facturado`, `precio_factura`, `observaciones` en `pedido_proveedor`
- `modalidad` en `venta`
- tablas `tarifa_envio` (Mini 400, Pequeño 600, Mediano 1200, Grande 1600, Extra grande 2500)
  y `configuracion` (multiplicador 4, divisor 2, valor del kit en local, precio del kit por contrato…)

Si prefieres, puedes pegar el archivo `.sql` en el SQL Editor de Neon.

## 🎨 Figuras, pinturas, pinceles y otros materiales

Todo está en la tabla `producto` con la columna `tipo`: `figura`, `pintura`, `pincel` u `otro`.
Así los materiales usan los mismos inventarios (bodega/local), traslados, pedidos y ventas.

- **Colecciones de pinturas** (`coleccion_material`): Acrílicas, Pátinas, Metalizados, Bases,
  Otras… y las que se creen (ej. Gamusa). Cada tono es un producto `tipo = pintura` con
  `coleccion = 'Gamusa'` y nombre `"Gamusa - Rojo"` (así no se repite entre colecciones).
- **Proveedores** tienen `tipo`: `figuras`, `materiales` o `ambos`.
- **Referencias automáticas**: iniciales del proveedor + 5 dígitos, ignorando palabras como
  "la", "del", "y": Casa del Arte → `CA00001`, Fredy Bogotá → `FB00001`.
- Los materiales no usan la fórmula ×4 ni el envío: precio de compra, de venta y por mayor
  se escriben a mano. En ventas se cobran a precio de detal (o por mayor en las modalidades
  de por mayor) sin recargos de kit ni pintada.

## 💲 Reglas de precio

```
precio crudo (detal)  = precio de fábrica × 4       + envío
precio por mayor      = (precio de fábrica × 4) ÷ 2 + envío
```

Ejemplo: Oso navidad, fábrica 2.000 → crudo 8.000, por mayor 4.000 (sin envío).
El envío se elige de la tabla de tarifas (o se escribe otro valor). El 4 y el 2 se cambian en
Configuración. Los dos precios se calculan solos pero son editables.

Modalidades de venta:

| Modalidad              | Precio por figura                                           |
|------------------------|-------------------------------------------------------------|
| Detal                  | precio crudo (figura en yeso blanco)                        |
| Pintar en el local     | precio crudo + valor por pintar en el local (pinturas y técnica) |
| Kit para llevar        | precio crudo + valor del kit (5 pinturas + 1 pincel)        |
| Pintada                | precio crudo + valor adicional (se escribe en cada venta)   |
| Por mayor (local)      | precio por mayor                                            |
| Empresa por mayor      | precio por mayor                                            |
| Empresa con contrato   | precio general del kit por contrato                         |

Los valores de "pintar en el local", "kit para llevar", el adicional sugerido de "pintada" y el
precio del kit por contrato se editan en Configuración.

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
- `GET`, `GET /<nombre>`, `POST { nombre, telefono, direccion, ciudad, descripcion, limite_precio }`
  (`limite_precio` opcional: precio máximo pactado por figura)
- `PUT /<nombre>` — si cambia `nombre`, se actualiza también en productos, inventarios y pedidos
- `DELETE /<nombre>` — no permite borrar un proveedor con productos

### 📦 Productos `/api/productos`
- `GET` — catálogo con `existencias_bodega`, `existencias_local`, `existencias`, `precio_venta`, `precio_mayorista`
- `GET /<codigo>`
- `POST` — uno o varios productos de un proveedor:
  ```json
  { "proveedor": "Arte y Color",
    "ubicacion": "bodega",
    "productos": [ { "nombre": "Oso navidad", "tamano": "15 x 10 cm", "imagen": "https://...",
                     "descripcion": "", "referencia": "", "costo": 2000,
                     "envio_categoria": "Mediano", "envio": 1200,
                     "precio_venta": null, "precio_mayorista": null, "existencias": 10 } ] }
  ```
  `ubicacion`: `bodega`, `local` o `ambos`. Si los precios van vacíos se calculan con la fórmula.
  Si `referencia` va vacía se genera con las iniciales del proveedor (`AC0001`).
- `PUT /<codigo>` — actualiza catálogo, precios y envío, sincroniza los inventarios y acepta
  `existencias_bodega` / `existencias_local` (si no estaba en esa ubicación, lo agrega)
- `DELETE /<codigo>` — borra el producto y sus filas de inventario

### 🏬 Inventario bodega `/api/inventario-bodega` · 🏪 Inventario local `/api/inventario-local`
- `GET`, `GET /<codigo>`
- `PUT /<codigo>` — ajuste manual (`existencias`, `costo` / `precio_venta`, `precio_mayorista`)

### 🔄 Traslados `/api/traslados` (bodega ↔ local)
- `GET`, `GET /<codigo>`
- `POST { "producto": ["Lapiz HB"], "cantidad": [10], "sentido": "bodega_local" | "local_bodega" }`
  → valida stock en el origen, descuenta, suma al destino y guarda el traslado
- `DELETE /<codigo>` — anula: devuelve las unidades al origen

### 🎨 Colecciones de pinturas `/api/colecciones`
- `GET` — colecciones con la cantidad de tonos
- `POST { nombre, descripcion? }` · `PUT /<id>` (renombrar) · `DELETE /<id>` (solo si no tiene tonos)

### 💰 Ventas `/api/ventas` (salen del local)
- `GET`, `GET /<codigo>`
- `POST { producto: [...], cantidad: [...], precio_unitario: [...], modalidad, cliente, observacion, usuario, fecha? }`
  → valida y descuenta stock del local; `total` se calcula en el servidor.
  Si no se envía `precio_unitario` se calcula según la `modalidad`.
- `DELETE /<codigo>` — anula: devuelve las unidades al local

### 🚚 Pedidos a proveedor `/api/pedidos-proveedor`
- `GET` (`?estado=pendientes|recibidos`), `GET /<codigo>`
- `POST { proveedor, productos: [...], cantidad: [...], precio_esperado: [...], fecha_pedido, zona_entrega }`
  → queda pendiente; todos los productos deben ser del mismo proveedor
- `PUT /<codigo>` — editar un pedido pendiente
- `PUT /<codigo>/recepcion { llegan, danados, facturado, precio_factura, observaciones }`
  → guarda la comparativa con la factura, calcula `sobran` y `faltan`, marca `estado = true`,
  guarda `fecha_llegada` y suma `llegan - danados` al inventario de destino
- `PUT /<codigo>/destino { "zona_entrega": true | false }` — cambia Bodega ↔ Local;
  si el pedido ya se recibió, mueve las unidades de un inventario al otro
- `GET /<codigo>` incluye `limite_precio` del proveedor para marcar precios por encima del pactado
- `DELETE /<codigo>` — solo pedidos pendientes

`zona_entrega`: `true` = se recibe en **Bodega**, `false` = se recibe en el **Local**.

### ⚙️ Configuración `/api/configuracion`
- `GET /api/configuracion` — valores generales, tarifas de envío y modalidades de venta
- `PUT /api/configuracion` — `{ "precio_kit_contrato": 14000, "valor_kit_local": 2500, ... }`
- `GET /api/configuracion/tarifas-envio`
- `PUT /api/configuracion/tarifas-envio` — `[ {id?, nombre, precio}, ... ]` reemplaza la tabla

### 🏷️ Categorías de figuras `/api/categorias`
- `GET` — categorías (Navidad, Materas, Juveniles, Religioso, Hogar, Terminados…) con su cantidad de figuras
- `POST { nombre }` · `PUT /<id> { nombre }` (renombra también en las figuras) · `DELETE /<id>` (las figuras quedan sin categoría)
- Los productos, inventarios e historial devuelven el campo `categoria` para filtrar.

### 🕓 Historial y resumen
- `GET /api/historial` — ventas, traslados y pedidos desplegados en un movimiento por producto
- `GET /api/dashboard` — totales, pedidos recientes, alertas (faltantes, dañados, stock bajo) y actividad reciente
