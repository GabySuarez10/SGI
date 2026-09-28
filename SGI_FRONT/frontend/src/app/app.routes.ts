import { Routes } from '@angular/router';
import { Layout } from './layout/layout/layout';
import { Dashboard } from './pages/dashboard/dashboard';
import { PedidosProveedor } from './pages/pedidos-proveedor/pedidos-proveedor';
import { NuevoPedido } from './pages/nuevo-pedido/nuevo-pedido';

export const routes: Routes = [
  {
    path: '',
    component: Layout,
    children: [
      {
        path: '',
        component: Dashboard
      },
      {
        path: 'pedidos-proveedor',
        component: PedidosProveedor
      },
      {
        path: 'nuevo-pedido',
        component: NuevoPedido
      }
    ]
  }
];