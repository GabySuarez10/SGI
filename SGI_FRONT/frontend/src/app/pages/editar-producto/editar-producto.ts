import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IProducto } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { mensajeDeError } from '../../utils/http-error';
import { IMAGEN_POR_DEFECTO, esUrlImagen, imagenNoCarga } from '../../utils/imagen';

@Component({
  selector: 'app-editar-producto',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editar-producto.html',
  styleUrl: './editar-producto.css'
})
export class EditarProducto implements OnInit {

  producto: IProducto = {
    codigo: 0,
    referencia: '',
    nombre: '',
    imagen: '',
    proveedor: '',
    tamano: '',
    descripcion: '',
    costo: 0,
    existencias: 0,
    existencias_bodega: 0,
    existencias_local: 0,
    precio_venta: 0,
    precio_mayorista: 0
  };

  proveedores: string[] = [];

  cargando = false;
  guardando = false;
  error = '';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService,
    private proveedorService: ProveedorService
  ) {}

  ngOnInit(): void {
    const codigo = Number(this.route.snapshot.paramMap.get('codigo'));

    if (!codigo) {
      this.router.navigate(['/productos']);
      return;
    }

    this.cargando = true;

    this.productoService.getProducto(codigo).subscribe({
      next: producto => {
        this.producto = {
          ...producto,
          imagen: producto.imagen ?? '',
          descripcion: producto.descripcion ?? '',
          tamano: producto.tamano ?? ''
        };
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });

    this.proveedorService.getProveedores().subscribe({
      next: proveedores => {
        this.proveedores = proveedores.map(proveedor => proveedor.nombre);
      }
    });
  }

  guardarCambios(): void {

    if (
      !this.producto.nombre.trim() ||
      !this.producto.proveedor.trim() ||
      !this.producto.tamano.trim()
    ) {
      this.error = 'Por favor, completa los campos obligatorios.';
      return;
    }

    if (this.producto.nombre.includes(',')) {
      this.error = 'El nombre del producto no puede contener comas (,).';
      return;
    }

    if (this.producto.imagen.trim() && !esUrlImagen(this.producto.imagen)) {
      this.error = 'La imagen debe ser una URL que empiece por http:// o https://';
      return;
    }

    this.guardando = true;
    this.error = '';

    this.productoService.actualizarProducto(this.producto.codigo, {
      nombre: this.producto.nombre.trim(),
      proveedor: this.producto.proveedor,
      tamano: this.producto.tamano.trim(),
      descripcion: this.producto.descripcion,
      imagen: this.producto.imagen.trim(),
      costo: Number(this.producto.costo) || 0,
      precio_venta: Number(this.producto.precio_venta) || 0,
      precio_mayorista: Number(this.producto.precio_mayorista) || 0
    }).subscribe({
      next: producto => {
        this.guardando = false;
        alert(
          `El producto ${producto.nombre} (${producto.referencia}) ` +
          `ha sido actualizado correctamente.`
        );
        this.router.navigate(['/productos']);
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
      }
    });
  }

  cancelar(): void {
    this.router.navigate(['/productos']);
  }
}
