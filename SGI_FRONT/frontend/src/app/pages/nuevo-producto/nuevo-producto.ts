import { Component, OnInit } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IProductoNuevo } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';
import { esUrlImagen, imagenNoCarga } from '../../utils/imagen';

@Component({
  selector: 'app-nuevo-producto',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './nuevo-producto.html',
  styleUrl: './nuevo-producto.css',
})
export class NuevoProducto implements OnInit {

  proveedor = '';

  // Nombres de los proveedores registrados (vienen del backend)
  proveedores: string[] = [];

  // Lista de productos que se van a registrar
  productos: IProductoNuevo[] = [this.productoVacio()];

  guardando = false;
  error = '';

  imagenNoCarga = imagenNoCarga;

  constructor(
    private productoService: ProductoService,
    private proveedorService: ProveedorService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.proveedorService.getProveedores().subscribe({
      next: proveedores => {
        this.proveedores = proveedores.map(proveedor => proveedor.nombre);
      },
      error: err => {
        this.error = mensajeDeError(err);
      }
    });
  }

  private productoVacio(): IProductoNuevo {
    return {
      referencia: '',
      nombre: '',
      tamano: '',
      descripcion: '',
      imagen: '',
      costo: 0,
      precio_venta: 0,
      precio_mayorista: 0
    };
  }


  // Agregar otro producto a la lista
  agregarProducto(): void {
    this.productos.push(this.productoVacio());
  }


  // Eliminar un producto de la lista
  eliminarProducto(index: number): void {

    if (this.productos.length === 1) {
      return;
    }

    this.productos.splice(index, 1);

  }


  // Guardar todos los productos
  guardarProductos(): void {

    if (!this.proveedor) {
      this.error = 'Selecciona un proveedor.';
      return;
    }


    // Revisar que todos los productos tengan los campos obligatorios.
    const productoIncompleto = this.productos.some(producto =>
      !producto.nombre.trim() ||
      !producto.tamano.trim()
    );

    if (productoIncompleto) {
      this.error = 'Completa el nombre y tamaño de todos los productos.';
      return;
    }

    // Los nombres se usan en listas separadas por comas (ventas, pedidos, traslados)
    if (this.productos.some(producto => producto.nombre.includes(','))) {
      this.error = 'El nombre de un producto no puede contener comas (,).';
      return;
    }

    const imagenInvalida = this.productos.some(producto =>
      producto.imagen.trim() !== '' && !esUrlImagen(producto.imagen)
    );

    if (imagenInvalida) {
      this.error = 'La imagen debe ser una URL que empiece por http:// o https://';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.productoService.crearProductos({
      proveedor: this.proveedor,
      productos: this.productos.map(producto => ({
        ...producto,
        nombre: producto.nombre.trim(),
        tamano: producto.tamano.trim(),
        imagen: producto.imagen.trim(),
        costo: Number(producto.costo) || 0,
        precio_venta: Number(producto.precio_venta) || 0,
        precio_mayorista: Number(producto.precio_mayorista) || 0
      }))
    }).subscribe({
      next: creados => {
        this.guardando = false;
        alert(`${creados.length} producto(s) registrado(s) correctamente.`);
        this.router.navigate(['/productos']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
        alert(this.error);
      }
    });

  }


  cancelar(): void {
    this.router.navigate(['/productos']);
  }

}
