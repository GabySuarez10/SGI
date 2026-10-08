import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgFor } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Icono } from '../../components/icono/icono';

interface EnlaceMenu {
  texto: string;
  ruta: string;
  icono: string;
  parametros?: Record<string, string>;
  exacto?: boolean;
}

interface SeccionMenu {
  titulo: string;
  enlaces: EnlaceMenu[];
}

@Component({
  selector: 'app-sidebar',
  imports: [NgFor, RouterLink, RouterLinkActive, Icono],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  // En celular el menú se abre encima del contenido
  @Input() open = false;
  @Output() cerrar = new EventEmitter<void>();

  readonly secciones: SeccionMenu[] = [
    {
      titulo: 'Principal',
      enlaces: [{ texto: 'Inicio', ruta: '/', icono: 'inicio', exacto: true }]
    },
    {
      titulo: 'Gestión',
      enlaces: [
        { texto: 'Productos', ruta: '/productos', icono: 'productos' },
        { texto: 'Proveedores', ruta: '/proveedores', icono: 'proveedores' }
      ]
    },
    {
      titulo: 'Compras',
      enlaces: [
        { texto: 'Pedidos de proveedor', ruta: '/pedidos-proveedor', icono: 'pedidos' },
        {
          texto: 'Pedir pinturas y materiales',
          ruta: '/nuevo-pedido',
          icono: 'carrito',
          parametros: { tipo: 'materiales' }
        }
      ]
    },
    {
      titulo: 'Inventario',
      enlaces: [
        { texto: 'Bodega', ruta: '/bodega', icono: 'bodega' },
        { texto: 'Local', ruta: '/local', icono: 'local' },
        { texto: 'Pinturas, pinceles y otros', ruta: '/materiales', icono: 'materiales' },
        { texto: 'Traslados', ruta: '/traslados', icono: 'traslados' }
      ]
    },
    {
      titulo: 'Ventas',
      enlaces: [{ texto: 'Ventas y salidas', ruta: '/ventas', icono: 'ventas' }]
    },
    {
      titulo: 'Consultas',
      enlaces: [{ texto: 'Historial', ruta: '/historial', icono: 'historial' }]
    }
  ];
}
