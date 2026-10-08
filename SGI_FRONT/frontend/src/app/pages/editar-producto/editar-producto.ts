import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IProducto, IProductoEdicion } from '../../interfaces/producto.interface';
import { IProveedor } from '../../interfaces/proveedor.interface';
import {
  ITarifaEnvio,
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import { TablaEnvios } from '../../components/tabla-envios/tabla-envios';
import { PrecioProducto } from '../../components/precio-producto/precio-producto';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { ColeccionService } from '../../services/coleccion.service';
import { IColeccion } from '../../interfaces/coleccion.interface';
import { ICategoria } from '../../interfaces/categoria.interface';
import { CategoriaService } from '../../services/categoria.service';
import { TIPOS_PRODUCTO, esMaterial, proveedorVende } from '../../utils/tipos';
import { IMAGEN_POR_DEFECTO, esUrlImagen, imagenNoCarga } from '../../utils/imagen';

@Component({
  selector: 'app-editar-producto',
  standalone: true,
  imports: [CommonModule, FormsModule, TablaEnvios, PrecioProducto, Ampliar],
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
    envio_categoria: '',
    envio: 0,
    precio_venta: 0,
    precio_mayorista: 0,
    en_bodega: false,
    en_local: false,
    existencias: 0,
    existencias_bodega: 0,
    existencias_local: 0,
    limite_precio_proveedor: null,
    tipo: 'figura',
    coleccion: '',
    categoria: ''
  };

  categorias: ICategoria[] = [];

  readonly tiposProducto = TIPOS_PRODUCTO;
  colecciones: IColeccion[] = [];

  // null = el producto no está en esa ubicación y no se quiere agregar
  existenciasBodega: number | null = null;
  existenciasLocal: number | null = null;

  proveedores: IProveedor[] = [];
  tarifas: ITarifaEnvio[] = [];
  valores: IValoresConfiguracion = VALORES_POR_DEFECTO;

  cargando = false;
  guardando = false;
  eliminando = false;
  error = '';

  // Página desde donde se abrió (productos, bodega o local)
  private volverA = '/productos';

  imagenPorDefecto = IMAGEN_POR_DEFECTO;
  imagenNoCarga = imagenNoCarga;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productoService: ProductoService,
    private proveedorService: ProveedorService,
    private configuracionService: ConfiguracionService,
    private coleccionService: ColeccionService,
    private categoriaService: CategoriaService
  ) {}

  ngOnInit(): void {
    const codigo = Number(this.route.snapshot.paramMap.get('codigo'));
    const desde = this.route.snapshot.queryParamMap.get('desde');
    if (desde === 'bodega' || desde === 'local' || desde === 'materiales') {
      this.volverA = `/${desde}`;
    }

    if (!codigo) {
      this.router.navigate([this.volverA]);
      return;
    }

    this.cargando = true;

    forkJoin({
      producto: this.productoService.getProducto(codigo),
      proveedores: this.proveedorService.getProveedores(),
      configuracion: this.configuracionService.getConfiguracion(),
      colecciones: this.coleccionService.getColecciones(),
      categorias: this.categoriaService.getCategorias()
    }).subscribe({
      next: ({ producto, proveedores, configuracion, colecciones, categorias }) => {
        this.categorias = categorias;
        this.colecciones = colecciones;
        this.producto = {
          ...producto,
          imagen: producto.imagen ?? '',
          descripcion: producto.descripcion ?? '',
          tamano: producto.tamano ?? '',
          envio_categoria: producto.envio_categoria ?? '',
          tipo: producto.tipo ?? 'figura',
          coleccion: producto.coleccion ?? '',
          categoria: producto.categoria ?? ''
        };
        this.existenciasBodega = producto.en_bodega ? producto.existencias_bodega : null;
        this.existenciasLocal = producto.en_local ? producto.existencias_local : null;
        this.proveedores = proveedores;
        this.tarifas = configuracion.tarifas_envio;
        this.valores = configuracion.valores;
        this.cargando = false;
      },
      error: err => {
        this.error = mensajeDeError(err);
        this.cargando = false;
      }
    });
  }

  get esMaterial(): boolean {
    return esMaterial(this.producto.tipo);
  }

  // Proveedores que venden el tipo de producto (y siempre el actual)
  get proveedoresDelTipo(): IProveedor[] {
    return this.proveedores.filter(
      item => proveedorVende(item.tipo, this.producto.tipo) || item.nombre === this.producto.proveedor
    );
  }

  get limiteProveedor(): number | null {
    return this.proveedores.find(item => item.nombre === this.producto.proveedor)?.limite_precio ?? null;
  }

  guardarCambios(): void {

    if (
      !this.producto.nombre.trim() ||
      !this.producto.proveedor.trim() ||
      (!this.esMaterial && !this.producto.tamano.trim())
    ) {
      this.mostrarError('Por favor, completa los campos obligatorios.');
      return;
    }

    if (this.producto.nombre.includes(',')) {
      this.mostrarError('El nombre del producto no puede contener comas (,).');
      return;
    }

    if (this.producto.imagen.trim() && !esUrlImagen(this.producto.imagen)) {
      this.mostrarError('La imagen debe ser una URL que empiece por http:// o https://');
      return;
    }

    const cambios: IProductoEdicion = {
      nombre: this.producto.nombre.trim(),
      proveedor: this.producto.proveedor,
      tamano: this.producto.tamano.trim(),
      descripcion: this.producto.descripcion,
      imagen: this.producto.imagen.trim(),
      costo: Number(this.producto.costo) || 0,
      envio_categoria: this.producto.envio_categoria,
      envio: Number(this.producto.envio) || 0,
      precio_venta: Number(this.producto.precio_venta) || 0,
      precio_mayorista: Number(this.producto.precio_mayorista) || 0,
      tipo: this.producto.tipo,
      coleccion: this.producto.tipo === 'pintura' ? this.producto.coleccion : '',
      categoria: this.producto.tipo === 'figura' ? this.producto.categoria : ''
    };

    if (this.producto.tipo === 'pintura' && !this.producto.coleccion) {
      this.mostrarError('Elige la colección de la pintura.');
      return;
    }

    // Solo se envían las existencias de las ubicaciones con valor
    if (this.existenciasBodega !== null && `${this.existenciasBodega}` !== '') {
      cambios.existencias_bodega = Number(this.existenciasBodega) || 0;
    }
    if (this.existenciasLocal !== null && `${this.existenciasLocal}` !== '') {
      cambios.existencias_local = Number(this.existenciasLocal) || 0;
    }

    this.guardando = true;
    this.error = '';

    this.productoService.actualizarProducto(this.producto.codigo, cambios).subscribe({
      next: producto => {
        this.guardando = false;
        alert(
          `El producto ${producto.nombre} (${producto.referencia}) ` +
          `ha sido actualizado correctamente.`
        );
        this.router.navigate([this.volverA]);
      },
      error: err => {
        this.guardando = false;
        this.mostrarError(mensajeDeError(err));
      }
    });
  }

  cancelar(): void {
    this.router.navigate([this.volverA]);
  }

  eliminarProducto(): void {
    const unidades = this.producto.existencias_bodega + this.producto.existencias_local;
    const aviso = unidades > 0
      ? `\n\nTiene ${this.producto.existencias_bodega} unidad(es) en bodega y ` +
        `${this.producto.existencias_local} en el local, que también se borrarán.`
      : '';

    if (!confirm(`¿Eliminar "${this.producto.nombre}" (${this.producto.referencia})?${aviso}\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.eliminando = true;
    this.productoService.eliminarProducto(this.producto.codigo).subscribe({
      next: () => {
        this.eliminando = false;
        alert(`"${this.producto.nombre}" se eliminó.`);
        this.router.navigate([this.volverA]);
      },
      error: err => {
        this.eliminando = false;
        this.mostrarError(mensajeDeError(err));
      }
    });
  }

  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    alert(mensaje);
  }
}
