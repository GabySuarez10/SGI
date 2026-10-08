import { Component, EventEmitter, HostListener, OnDestroy, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { Icono } from '../../components/icono/icono';

// Título y descripción que muestra el encabezado según la página
const TITULOS: { prefijo: string; titulo: string; descripcion: string }[] = [
  { prefijo: '/productos', titulo: 'Productos', descripcion: 'Catálogo de figuras y materiales' },
  { prefijo: '/nuevo-producto', titulo: 'Nuevo producto', descripcion: 'Registra figuras, pinturas o materiales' },
  { prefijo: '/editar-producto', titulo: 'Editar producto', descripcion: 'Datos, precios y ubicación' },
  { prefijo: '/proveedores', titulo: 'Proveedores', descripcion: 'Quién te vende figuras y materiales' },
  { prefijo: '/nuevo-proveedor', titulo: 'Nuevo proveedor', descripcion: 'Registra un proveedor' },
  { prefijo: '/editar-proveedor', titulo: 'Editar proveedor', descripcion: 'Datos y límite de precio' },
  { prefijo: '/pedidos-proveedor', titulo: 'Pedidos', descripcion: 'Pedidos a proveedores' },
  { prefijo: '/nuevo-pedido', titulo: 'Nuevo pedido', descripcion: 'Pide figuras o materiales' },
  { prefijo: '/detalle-pedido', titulo: 'Detalle del pedido', descripcion: 'Recepción y comparativa con la factura' },
  { prefijo: '/bodega', titulo: 'Bodega', descripcion: 'Existencias en bodega' },
  { prefijo: '/local', titulo: 'Local', descripcion: 'Existencias para la venta' },
  { prefijo: '/materiales', titulo: 'Pinturas y materiales', descripcion: 'Colecciones, pinceles y otros' },
  { prefijo: '/traslados', titulo: 'Traslados', descripcion: 'Entre bodega y local' },
  { prefijo: '/ventas', titulo: 'Ventas', descripcion: 'Registra ventas y salidas' },
  { prefijo: '/historial', titulo: 'Historial', descripcion: 'Todos los movimientos' },
  { prefijo: '/configuracion', titulo: 'Configuración', descripcion: 'Cuenta, precios y categorías' }
];

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, Icono],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {

  // Abre/cierra el menú lateral en celular
  @Output() menuToggle = new EventEmitter<void>();

  menuUsuarioAbierto = false;
  readonly hoy = new Date();
  titulo = 'Inicio';
  descripcion = 'Resumen del inventario de Pintarte';

  private suscripcion?: Subscription;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.actualizarTitulo(this.router.url);
    this.suscripcion = this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd))
      .subscribe(evento => {
        this.menuUsuarioAbierto = false;
        this.actualizarTitulo((evento as NavigationEnd).urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
  }

  private actualizarTitulo(url: string): void {
    const ruta = url.split('?')[0];
    const encontrado = TITULOS.find(item => ruta.startsWith(item.prefijo));
    this.titulo = encontrado?.titulo ?? 'Inicio';
    this.descripcion = encontrado?.descripcion ?? 'Resumen del inventario de Pintarte';
  }

  // Nombre del usuario que inició sesión
  get nombreUsuario(): string {
    return this.authService.usuarioActual?.nombre ?? 'Invitado';
  }

  get iniciales(): string {
    return this.nombreUsuario
      .split(/[\s_.-]+/)
      .filter(parte => parte.length > 0)
      .slice(0, 2)
      .map(parte => parte.charAt(0).toUpperCase())
      .join('');
  }

  alternarMenuUsuario(): void {
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  // Cierra el menú de usuario al tocar fuera de él o con Escape
  @HostListener('document:click', ['$event'])
  cerrarAlTocarFuera(evento: MouseEvent): void {
    const objetivo = evento.target as HTMLElement | null;
    if (this.menuUsuarioAbierto && !objetivo?.closest('.user-menu')) {
      this.menuUsuarioAbierto = false;
    }
  }

  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    this.menuUsuarioAbierto = false;
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto = false;
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }

  irAConfiguracion(): void {
    this.menuUsuarioAbierto = false;
    this.router.navigate(['/configuracion']);
  }
}
