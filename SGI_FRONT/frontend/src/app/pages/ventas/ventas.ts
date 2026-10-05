import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type TipoVenta = 'Distribución / Institucional' | 'Venta normal' | 'Mayorista';

type ModalidadVenta =
  | 'Figura cruda'
  | 'Figura en kit'
  | 'Figura pintada';

interface ProductoVenta {
  codigo: string;
  nombre: string;
  imagen: string;
  existencias: number;

  // Precios propios del producto.
  // Los valores definitivos y sus fórmulas los ajustaremos después.
  precioCrudo: number;
  precioMayoristaCrudo: number;

  precioKit: number;
  precioMayoristaKit: number;

  precioPintada: number;
  precioMayoristaPintada: number;

  cantidad: number;
}

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class Ventas {

  cliente = '';

  fecha = new Date().toISOString().split('T')[0];

  observacion = '';

  // Tipo general de la venta.
  tipoVenta: TipoVenta = 'Venta normal';

  // Modalidad general de la venta.
  modalidad: ModalidadVenta = 'Figura cruda';

  // Precio especial para distribución/institucional.
  // Después podremos configurarlo desde el sistema.
  precioKitDistribucion = 13000;

  // Inventario disponible de materiales.
  pinturasDisponibles = 1000;
  pincelesDisponibles = 200;

  busqueda = '';


  productos: ProductoVenta[] = [

    {
      codigo: 'FB0001',
      nombre: 'Muñeco de nieve',
      imagen: 'https://images.unsplash.com/photo-1548013146-72479768bada?w=500',
      existencias: 18,

      precioCrudo: 8200,
      precioMayoristaCrudo: 4200,

      precioKit: 10500,
      precioMayoristaKit: 6500,

      precioPintada: 12500,
      precioMayoristaPintada: 8000,

      cantidad: 0
    },

    {
      codigo: 'FB0002',
      nombre: 'Princesa Sofía',
      imagen: 'https://images.unsplash.com/photo-1594736797933-d0b22f8e8d35?w=500',
      existencias: 7,

      precioCrudo: 14200,
      precioMayoristaCrudo: 7200,

      precioKit: 16500,
      precioMayoristaKit: 9500,

      precioPintada: 19500,
      precioMayoristaPintada: 12000,

      cantidad: 0
    },

    {
      codigo: 'FB0003',
      nombre: 'Calabaza',
      imagen: 'https://images.unsplash.com/photo-1508361001413-7a9c3e0e4b8d?w=500',
      existencias: 24,

      precioCrudo: 8200,
      precioMayoristaCrudo: 4200,

      precioKit: 10500,
      precioMayoristaKit: 6500,

      precioPintada: 12500,
      precioMayoristaPintada: 8000,

      cantidad: 0
    },

    {
      codigo: 'DC0001',
      nombre: 'Ángel navideño',
      imagen: 'https://images.unsplash.com/photo-1512909006721-3d6018887383?w=500',
      existencias: 4,

      precioCrudo: 12200,
      precioMayoristaCrudo: 6200,

      precioKit: 14500,
      precioMayoristaKit: 8500,

      precioPintada: 17500,
      precioMayoristaPintada: 11000,

      cantidad: 0
    },

    {
      codigo: 'DC0002',
      nombre: 'Casita navideña',
      imagen: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=500',
      existencias: 12,

      precioCrudo: 18200,
      precioMayoristaCrudo: 10200,

      precioKit: 20500,
      precioMayoristaKit: 12500,

      precioPintada: 23500,
      precioMayoristaPintada: 15000,

      cantidad: 0
    },

    {
      codigo: 'DC0003',
      nombre: 'Reno',
      imagen: 'https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=500',
      existencias: 2,

      precioCrudo: 11400,
      precioMayoristaCrudo: 5800,

      precioKit: 13700,
      precioMayoristaKit: 8100,

      precioPintada: 16700,
      precioMayoristaPintada: 10600,

      cantidad: 0
    }

  ];


  // ================================
  // PRODUCTOS
  // ================================

  get productosFiltrados(): ProductoVenta[] {

    const texto = this.busqueda.trim().toLowerCase();

    if (!texto) {
      return this.productos;
    }

    return this.productos.filter(producto =>
      producto.nombre.toLowerCase().includes(texto) ||
      producto.codigo.toLowerCase().includes(texto)
    );
  }


  get productosSeleccionados(): ProductoVenta[] {

    return this.productos.filter(
      producto => producto.cantidad > 0
    );
  }


  // ================================
  // CANTIDADES
  // ================================

  get totalUnidades(): number {

    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + producto.cantidad,
      0
    );
  }


  get totalKits(): number {

    if (this.modalidad !== 'Figura en kit') {
      return 0;
    }

    return this.totalUnidades;
  }


  // Cada kit necesita 5 pinturas.
  get pinturasNecesarias(): number {

    return this.totalKits * 5;
  }


  // Cada kit necesita 1 pincel.
  get pincelesNecesarios(): number {

    return this.totalKits;
  }


  // ================================
  // PRECIOS
  // ================================

  getPrecio(producto: ProductoVenta): number {

    // Distribución / Institucional
    //
    // Para este tipo de venta,
    // el kit tiene un precio especial
    // igual para todas las figuras.
    if (
      this.tipoVenta === 'Distribución / Institucional' &&
      this.modalidad === 'Figura en kit'
    ) {
      return this.precioKitDistribucion;
    }


    // Venta normal
    if (this.tipoVenta === 'Venta normal') {

      if (this.modalidad === 'Figura en kit') {
        return producto.precioKit;
      }

      if (this.modalidad === 'Figura pintada') {
        return producto.precioPintada;
      }

      return producto.precioCrudo;
    }


    // Mayorista
    if (this.tipoVenta === 'Mayorista') {

      if (this.modalidad === 'Figura en kit') {
        return producto.precioMayoristaKit;
      }

      if (this.modalidad === 'Figura pintada') {
        return producto.precioMayoristaPintada;
      }

      return producto.precioMayoristaCrudo;
    }


    return producto.precioCrudo;
  }


  getSubtotal(producto: ProductoVenta): number {

    return this.getPrecio(producto) * producto.cantidad;
  }


  get totalVenta(): number {

    return this.productosSeleccionados.reduce(
      (total, producto) =>
        total + this.getSubtotal(producto),
      0
    );
  }


  // ================================
  // CAMBIO DE MODALIDAD
  // ================================

  cambiarModalidad(): void {

    /*
      La modalidad se aplica a toda la venta.

      Ejemplo:
      Si seleccionamos "Figura en kit",
      todos los productos agregados a esta salida
      serán considerados kits.
    */

  }


  // ================================
  // CANTIDAD
  // ================================

  aumentarCantidad(producto: ProductoVenta): void {

    if (producto.cantidad < producto.existencias) {
      producto.cantidad++;
    }
  }


  disminuirCantidad(producto: ProductoVenta): void {

    if (producto.cantidad > 0) {
      producto.cantidad--;
    }
  }


  // ================================
  // REGISTRAR SALIDA
  // ================================

  registrarSalida(): void {

    if (!this.cliente.trim()) {

      alert(
        'Por favor, ingresa el cliente o destino.'
      );

      return;
    }


    if (this.productosSeleccionados.length === 0) {

      alert(
        'Debes seleccionar al menos un producto.'
      );

      return;
    }


    // Validar pinturas únicamente si es KIT.
    if (
      this.modalidad === 'Figura en kit' &&
      this.pinturasNecesarias > this.pinturasDisponibles
    ) {

      alert(
        `No hay suficientes pinturas.\n\n` +
        `Necesarias: ${this.pinturasNecesarias}\n` +
        `Disponibles: ${this.pinturasDisponibles}`
      );

      return;
    }


    // Validar pinceles únicamente si es KIT.
    if (
      this.modalidad === 'Figura en kit' &&
      this.pincelesNecesarios > this.pincelesDisponibles
    ) {

      alert(
        `No hay suficientes pinceles.\n\n` +
        `Necesarios: ${this.pincelesNecesarios}\n` +
        `Disponibles: ${this.pincelesDisponibles}`
      );

      return;
    }


    const detalle = this.productosSeleccionados
      .map(producto =>
        `${producto.cantidad} × ${producto.nombre}`
      )
      .join('\n');


    const mensaje =
      `Salida registrada correctamente.\n\n` +

      `Cliente / destino:\n${this.cliente}\n\n` +

      `Tipo de venta:\n${this.tipoVenta}\n\n` +

      `Modalidad:\n${this.modalidad}\n\n` +

      `${detalle}\n\n` +

      `Total de unidades: ${this.totalUnidades}\n` +

      `Kits: ${this.totalKits}\n` +

      `Pinturas utilizadas: ${this.pinturasNecesarias}\n` +

      `Pinceles utilizados: ${this.pincelesNecesarios}\n\n` +

      `Total: $${this.totalVenta.toLocaleString('es-CO')}`;


    alert(mensaje);

    // Más adelante aquí conectaremos con el backend.
  }

}