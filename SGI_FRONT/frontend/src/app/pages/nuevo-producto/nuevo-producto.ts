import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IProductoNuevo, UbicacionProducto } from '../../interfaces/producto.interface';
import { IProveedor } from '../../interfaces/proveedor.interface';
import {
  ITarifaEnvio,
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import { ProductoService } from '../../services/producto.service';
import { ProveedorService } from '../../services/proveedor.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import { ColeccionService } from '../../services/coleccion.service';
import { IColeccion } from '../../interfaces/coleccion.interface';
import { ICategoria } from '../../interfaces/categoria.interface';
import { CategoriaService } from '../../services/categoria.service';
import {
  TIPOS_PRODUCTO,
  TipoProducto,
  esMaterial,
  nombrePintura,
  nombreTipo,
  proveedorVende
} from '../../utils/tipos';
import { TablaEnvios } from '../../components/tabla-envios/tabla-envios';
import { PrecioProducto } from '../../components/precio-producto/precio-producto';
import { mensajeDeError } from '../../utils/http-error';
import { Ampliar } from '../../components/visor-imagen/ampliar.directive';
import { esUrlImagen, imagenNoCarga } from '../../utils/imagen';

@Component({
  selector: 'app-nuevo-producto',
  imports: [FormsModule, NgIf, NgFor, DecimalPipe, TablaEnvios, PrecioProducto, Ampliar],
  templateUrl: './nuevo-producto.html',
  styleUrl: './nuevo-producto.css',
})
export class NuevoProducto implements OnInit {

  proveedor = '';

  // Bodega, local o ambos. Se puede llegar con ?ubicacion=local desde la página del local
  ubicacion: UbicacionProducto = 'bodega';

  // Figura, pintura, pincel u otro material (todos los del formulario son del mismo tipo)
  readonly tiposProducto = TIPOS_PRODUCTO;
  tipo: TipoProducto = 'figura';

  // Solo pinturas: colección a la que se agregan los tonos
  colecciones: IColeccion[] = [];
  coleccion = '';
  creandoColeccion = false;
  nuevaColeccion = '';
  guardandoColeccion = false;

  // Categorías de figuras (Navidad, Materas, Juveniles...)
  categorias: ICategoria[] = [];

  // Página a la que se vuelve al guardar o cancelar
  private volverA = '/productos';

  proveedores: IProveedor[] = [];
  tarifas: ITarifaEnvio[] = [];
  valores: IValoresConfiguracion = VALORES_POR_DEFECTO;

  // Lista de productos que se van a registrar
  productos: IProductoNuevo[] = [this.productoVacio()];

  guardando = false;
  error = '';

  imagenNoCarga = imagenNoCarga;

  constructor(
    private productoService: ProductoService,
    private proveedorService: ProveedorService,
    private configuracionService: ConfiguracionService,
    private coleccionService: ColeccionService,
    private categoriaService: CategoriaService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Parámetros opcionales: ?ubicacion=local&tipo=pintura&coleccion=Gamusa&desde=materiales
    const parametros = this.route.snapshot.queryParamMap;
    const ubicacion = parametros.get('ubicacion');
    if (ubicacion === 'bodega' || ubicacion === 'local' || ubicacion === 'ambos') {
      this.ubicacion = ubicacion;
      this.volverA = ubicacion === 'ambos' ? '/productos' : `/${ubicacion}`;
    }
    const tipo = parametros.get('tipo');
    if (TIPOS_PRODUCTO.some(item => item.valor === tipo)) {
      this.tipo = tipo as TipoProducto;
    }
    this.coleccion = parametros.get('coleccion') ?? '';
    if (parametros.get('desde') === 'materiales') {
      this.volverA = '/materiales';
    }

    forkJoin({
      proveedores: this.proveedorService.getProveedores(),
      configuracion: this.configuracionService.getConfiguracion(),
      colecciones: this.coleccionService.getColecciones(),
      categorias: this.categoriaService.getCategorias()
    }).subscribe({
      next: ({ proveedores, configuracion, colecciones, categorias }) => {
        this.categorias = categorias;
        this.proveedores = proveedores;
        this.tarifas = configuracion.tarifas_envio;
        this.valores = configuracion.valores;
        this.colecciones = colecciones;
      },
      error: err => {
        this.error = mensajeDeError(err);
      }
    });
  }

  get esMaterial(): boolean {
    return esMaterial(this.tipo);
  }

  get esPintura(): boolean {
    return this.tipo === 'pintura';
  }

  get tituloPagina(): string {
    if (this.esPintura) {
      return 'Nuevas pinturas';
    }
    return this.tipo === 'figura' ? 'Nuevo producto' : `Nuevo ${nombreTipo(this.tipo).toLowerCase()}`;
  }

  get placeholderNombre(): string {
    switch (this.tipo) {
      case 'pintura':
        return 'Ej. Rojo carmín';
      case 'pincel':
        return 'Ej. Pincel plano N° 8';
      case 'otro':
        return 'Ej. Barniz brillante';
      default:
        return 'Ej. Oso navidad';
    }
  }

  // Solo los proveedores que venden este tipo de producto
  get proveedoresDelTipo(): IProveedor[] {
    return this.proveedores.filter(item => proveedorVende(item.tipo, this.tipo));
  }

  // Iniciales que tendrá la referencia (Casa del Arte -> CA)
  get prefijoReferencia(): string {
    const ignoradas = ['la', 'el', 'los', 'las', 'de', 'del', 'y', 'e', 'en', 'sas', 'ltda', 'sa'];
    const palabras = this.proveedor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^A-Za-z0-9]+/)
      .filter(palabra => palabra.length > 0);
    const utiles = palabras.filter(palabra => !ignoradas.includes(palabra.toLowerCase()));
    const lista = utiles.length > 0 ? utiles : palabras;
    if (lista.length >= 2) {
      return (lista[0][0] + lista[1][0]).toUpperCase();
    }
    return (lista[0] ?? 'PR').slice(0, 2).toUpperCase().padEnd(2, 'X');
  }

  // Nombre con el que se guarda: las pinturas quedan "Colección - Tono"
  nombreFinal(nombre: string): string {
    return this.esPintura && this.coleccion ? nombrePintura(this.coleccion, nombre) : nombre.trim();
  }

  cambiarTipo(tipo: TipoProducto): void {
    this.tipo = tipo;
    if (this.proveedor && !this.proveedoresDelTipo.some(item => item.nombre === this.proveedor)) {
      this.proveedor = '';
    }
  }

  crearColeccion(): void {
    const nombre = this.nuevaColeccion.trim();
    if (!nombre) {
      return;
    }
    this.guardandoColeccion = true;
    this.coleccionService.crearColeccion(nombre).subscribe({
      next: creada => {
        this.guardandoColeccion = false;
        this.colecciones = [...this.colecciones, { ...creada, tonos: 0 }];
        this.coleccion = creada.nombre;
        this.nuevaColeccion = '';
        this.creandoColeccion = false;
      },
      error: err => {
        this.guardandoColeccion = false;
        this.mostrarError(mensajeDeError(err));
      }
    });
  }

  get etiquetaUbicacion(): string {
    if (this.ubicacion === 'local') {
      return 'Local';
    }
    return this.ubicacion === 'ambos' ? 'Bodega y local' : 'Bodega';
  }

  // Precio máximo por figura del proveedor elegido (null = sin límite)
  get limiteProveedor(): number | null {
    return this.proveedores.find(item => item.nombre === this.proveedor)?.limite_precio ?? null;
  }

  private productoVacio(): IProductoNuevo {
    return {
      referencia: '',
      nombre: '',
      tamano: '',
      descripcion: '',
      imagen: '',
      costo: 0,
      envio_categoria: '',
      envio: 0,
      precio_venta: 0,
      precio_mayorista: 0,
      existencias: 0,
      tipo: 'figura',
      coleccion: '',
      categoria: ''
    };
  }


  // El producto nuevo hereda la categoría del anterior (suelen llegar por temporada)
  agregarProducto(): void {
    const nuevo = this.productoVacio();
    nuevo.categoria = this.productos[this.productos.length - 1]?.categoria ?? '';
    this.productos.push(nuevo);
  }


  eliminarProducto(index: number): void {
    if (this.productos.length === 1) {
      return;
    }
    this.productos.splice(index, 1);
  }


  guardarProductos(): void {

    if (!this.proveedor) {
      this.mostrarError('Selecciona un proveedor.');
      return;
    }

    if (this.esPintura && !this.coleccion) {
      this.mostrarError('Elige la colección de las pinturas.');
      return;
    }

    const productoIncompleto = this.productos.some(producto =>
      !producto.nombre.trim() ||
      (!this.esMaterial && !producto.tamano.trim())
    );

    if (productoIncompleto) {
      this.mostrarError(
        this.esMaterial
          ? `Completa el ${this.esPintura ? 'tono' : 'nombre'} de todos los productos.`
          : 'Completa el nombre y el tamaño (cm) de todas las figuras.'
      );
      return;
    }

    if (this.esMaterial && this.productos.some(producto => !(Number(producto.precio_venta) > 0))) {
      this.mostrarError('Escribe el precio de venta al público de todos los materiales.');
      return;
    }

    // Los nombres se usan en listas separadas por comas (ventas, pedidos, traslados)
    if (this.productos.some(producto => producto.nombre.includes(','))) {
      this.mostrarError('El nombre de un producto no puede contener comas (,).');
      return;
    }

    const imagenInvalida = this.productos.some(producto =>
      producto.imagen.trim() !== '' && !esUrlImagen(producto.imagen)
    );

    if (imagenInvalida) {
      this.mostrarError('La imagen debe ser una URL que empiece por http:// o https://');
      return;
    }

    const limite = this.limiteProveedor;
    const sobreLimite = limite && !this.esMaterial
      ? this.productos.filter(producto => (Number(producto.costo) || 0) > limite)
      : [];

    if (
      sobreLimite.length > 0 &&
      !confirm(
        `${sobreLimite.length} producto(s) tienen un precio de fábrica mayor al límite ` +
        `de $${limite?.toLocaleString('es-CO')} pactado con ${this.proveedor}. ¿Guardar de todas formas?`
      )
    ) {
      return;
    }

    this.guardando = true;
    this.error = '';

    this.productoService.crearProductos({
      proveedor: this.proveedor,
      ubicacion: this.ubicacion,
      productos: this.productos.map(producto => ({
        ...producto,
        tipo: this.tipo,
        coleccion: this.esPintura ? this.coleccion : '',
        categoria: this.esMaterial ? '' : producto.categoria,
        nombre: this.nombreFinal(producto.nombre),
        tamano: producto.tamano.trim(),
        imagen: producto.imagen.trim(),
        costo: Number(producto.costo) || 0,
        envio: Number(producto.envio) || 0,
        precio_venta: Number(producto.precio_venta) || 0,
        precio_mayorista: Number(producto.precio_mayorista) || 0,
        existencias: Number(producto.existencias) || 0
      }))
    }).subscribe({
      next: creados => {
        this.guardando = false;
        alert(`${creados.length} producto(s) registrado(s) correctamente en ${this.etiquetaUbicacion}.`);
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

  // El error se ve arriba y, como el formulario es largo, también en un aviso
  private mostrarError(mensaje: string): void {
    this.error = mensaje;
    alert(mensaje);
  }

}
