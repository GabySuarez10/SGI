import { Component, OnInit } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UsuarioService } from '../../services/usuario.service';
import { ConfiguracionService } from '../../services/configuracion.service';
import {
  ITarifaEnvio,
  IValoresConfiguracion,
  VALORES_POR_DEFECTO
} from '../../interfaces/configuracion.interface';
import { TablaEnvios } from '../../components/tabla-envios/tabla-envios';
import { CategoriaService } from '../../services/categoria.service';
import { ICategoria } from '../../interfaces/categoria.interface';
import { calcularPrecios } from '../../utils/precios';
import { mensajeDeError } from '../../utils/http-error';

interface CampoPrecio {
  clave: keyof IValoresConfiguracion;
  titulo: string;
  ayuda: string;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [FormsModule, NgIf, NgFor, DecimalPipe, TablaEnvios],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion implements OnInit {

  usuario = '';
  nuevaContrasena = '';

  guardando = false;
  error = '';
  mensaje = '';

  // Precios, kits y envíos (tablas configuracion y tarifa_envio)
  valores: IValoresConfiguracion = { ...VALORES_POR_DEFECTO };
  tarifas: ITarifaEnvio[] = [];
  guardandoPrecios = false;
  errorPrecios = '';
  mensajePrecios = '';

  readonly camposPrecios: CampoPrecio[] = [
    { clave: 'multiplicador_crudo', titulo: 'Multiplicador del precio crudo', ayuda: 'Precio de fábrica × este valor (4).' },
    { clave: 'divisor_mayor', titulo: 'Divisor del precio por mayor', ayuda: 'Precio crudo ÷ este valor (2).' },
    { clave: 'valor_pintar_local', titulo: 'Adicional sugerido por pintar en el local (COP)', ayuda: 'Se suma al precio crudo (pinturas y técnica); se puede cambiar en cada venta.' },
    { clave: 'valor_kit_local', titulo: 'Valor del kit para llevar (COP)', ayuda: 'Se suma al precio crudo: 5 pinturas + 1 pincel para pintar en casa.' },
    { clave: 'valor_pintada', titulo: 'Adicional sugerido por figura pintada (COP)', ayuda: 'Se suma al precio crudo; se puede cambiar en cada venta.' },
    { clave: 'precio_kit_contrato', titulo: 'Precio del kit por contrato (COP)', ayuda: 'Precio por kit para empresas con contrato.' },
    { clave: 'pinturas_por_kit', titulo: 'Pinturas por kit', ayuda: 'Pinturas que lleva cada kit.' },
    { clave: 'pinceles_por_kit', titulo: 'Pinceles por kit', ayuda: 'Pinceles que lleva cada kit.' }
  ];

  // Categorías de figuras (Navidad, Materas...)
  categorias: ICategoria[] = [];
  nuevaCategoria = '';
  categoriaEditando: ICategoria | null = null;
  nombreCategoria = '';
  errorCategorias = '';

  constructor(
    private authService: AuthService,
    private usuarioService: UsuarioService,
    private configuracionService: ConfiguracionService,
    private categoriaService: CategoriaService
  ) {
    this.usuario = this.authService.usuarioActual?.nombre ?? '';
  }

  ngOnInit(): void {
    this.cargarCategorias();

    this.configuracionService.getConfiguracion().subscribe({
      next: configuracion => {
        this.valores = { ...configuracion.valores };
        this.tarifas = configuracion.tarifas_envio;
      },
      error: err => {
        this.errorPrecios = mensajeDeError(err);
      }
    });
  }

  // Ejemplo con fábrica $2.000 para ver el efecto de los valores
  get ejemplo(): { crudo: number; mayor: number } {
    return calcularPrecios(2000, 0, this.valores);
  }

  guardarPrecios(): void {
    if (!Number(this.valores.divisor_mayor)) {
      this.errorPrecios = 'El divisor del precio por mayor no puede ser 0.';
      return;
    }

    const valores = { ...this.valores };
    for (const campo of this.camposPrecios) {
      valores[campo.clave] = Number(valores[campo.clave]) || 0;
    }

    this.guardandoPrecios = true;
    this.errorPrecios = '';
    this.mensajePrecios = '';

    this.configuracionService.actualizarValores(valores).subscribe({
      next: guardados => {
        this.guardandoPrecios = false;
        this.valores = { ...guardados };
        this.mensajePrecios = 'Valores de precios y kits guardados.';
      },
      error: err => {
        this.guardandoPrecios = false;
        this.errorPrecios = mensajeDeError(err);
      }
    });
  }

  guardarCuenta(): void {
    const actual = this.authService.usuarioActual;
    if (!actual) {
      this.error = 'No hay una sesión activa.';
      return;
    }
    if (!this.usuario.trim()) {
      this.error = 'El usuario no puede estar vacío.';
      return;
    }

    const datos: { nombre: string; contrasena?: string } = { nombre: this.usuario.trim() };
    if (this.nuevaContrasena) {
      datos.contrasena = this.nuevaContrasena;
    }

    this.guardando = true;
    this.error = '';
    this.mensaje = '';

    this.usuarioService.actualizar(actual.id, datos).subscribe({
      next: usuario => {
        this.guardando = false;
        this.nuevaContrasena = '';
        this.authService.guardarUsuario(usuario);
        this.mensaje = 'Información de la cuenta actualizada correctamente.';
      },
      error: err => {
        this.guardando = false;
        this.error = mensajeDeError(err);
      }
    });
  }

  // ================================
  // CATEGORÍAS DE FIGURAS
  // ================================

  cargarCategorias(): void {
    this.categoriaService.getCategorias().subscribe({
      next: categorias => {
        this.categorias = categorias;
      },
      error: err => {
        this.errorCategorias = mensajeDeError(err);
      }
    });
  }

  crearCategoria(): void {
    const nombre = this.nuevaCategoria.trim();
    if (!nombre) {
      return;
    }
    this.errorCategorias = '';
    this.categoriaService.crearCategoria(nombre).subscribe({
      next: () => {
        this.nuevaCategoria = '';
        this.cargarCategorias();
      },
      error: err => {
        this.errorCategorias = mensajeDeError(err);
      }
    });
  }

  editarCategoria(categoria: ICategoria): void {
    this.categoriaEditando = categoria;
    this.nombreCategoria = categoria.nombre;
  }

  cancelarCategoria(): void {
    this.categoriaEditando = null;
    this.nombreCategoria = '';
  }

  guardarCategoria(): void {
    if (!this.categoriaEditando || !this.nombreCategoria.trim()) {
      return;
    }
    this.errorCategorias = '';
    this.categoriaService
      .actualizarCategoria(this.categoriaEditando.id, this.nombreCategoria.trim())
      .subscribe({
        next: () => {
          this.cancelarCategoria();
          this.cargarCategorias();
        },
        error: err => {
          this.errorCategorias = mensajeDeError(err);
        }
      });
  }

  eliminarCategoria(categoria: ICategoria): void {
    const aviso = categoria.figuras > 0
      ? ` Las ${categoria.figuras} figura(s) quedarán sin categoría.`
      : '';
    if (!confirm(`¿Eliminar la categoría "${categoria.nombre}"?${aviso}`)) {
      return;
    }
    this.categoriaService.eliminarCategoria(categoria.id).subscribe({
      next: () => this.cargarCategorias(),
      error: err => {
        this.errorCategorias = mensajeDeError(err);
      }
    });
  }
}
