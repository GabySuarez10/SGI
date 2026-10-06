import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { PedidosProveedor } from './pages/pedidos-proveedor/pedidos-proveedor';
import { NuevoPedido } from './pages/nuevo-pedido/nuevo-pedido';
import { DetallePedido } from './pages/detalle-pedido/detalle-pedido';
import { Productos } from './pages/productos/productos';
import { NuevoProducto } from './pages/nuevo-producto/nuevo-producto';
import { Proveedores } from './pages/proveedores/proveedores';
import { NuevoProveedor } from './pages/nuevo-proveedor/nuevo-proveedor';
import { Bodega } from './pages/bodega/bodega';
import { Local } from './pages/local/local';
import { Traslados } from './pages/traslados/traslados';
import { Ventas } from './pages/ventas/ventas';
import { EditarProducto } from './pages/editar-producto/editar-producto';
import { Historial } from './pages/historial/historial';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { Configuracion } from './pages/configuracion/configuracion';
import { EditarProveedor } from './pages/editar-proveedor/editar-proveedor';
export const routes: Routes = [

  { path: 'login', component: Login },
  { path: 'registro', component: Registro },


  {
    path: '',
    component: Layout,
    children: [
      { path: '', component: Dashboard },
      { path: 'productos', component: Productos },
      { path: 'nuevo-producto', component: NuevoProducto },
      { path: 'editar-producto/:codigo', component: EditarProducto },
      { path: 'proveedores', component: Proveedores },
      { path: 'local', component: Local },
      { path: 'traslados', component: Traslados },
      { path: 'ventas', component: Ventas },
      { path: 'pedidos-proveedor', component: PedidosProveedor },
      { path: 'nuevo-pedido', component: NuevoPedido },
      { path: 'detalle-pedido', component: DetallePedido },
      { path: 'historial', component: Historial },
      { path: 'configuracion', component: Configuracion },
      { path: 'nuevo-proveedor', component: NuevoProveedor },
      { path: 'editar-proveedor/:nombre', component: EditarProveedor },
      { path: 'bodega', component: Bodega },


    ]
  }

];