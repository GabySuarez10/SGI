import {
  Component, ElementRef, EventEmitter, HostListener, Input, NgZone, OnDestroy, Output, ViewChild
} from '@angular/core';
import { NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Icono } from '../icono/icono';

/*
  Barra para escanear productos. Funciona de tres formas:

  1. Lector físico (USB o Bluetooth): el lector "escribe" el código y pulsa
     Enter. Se capta aunque el cursor no esté en la barra, siempre que no se
     esté escribiendo en otro campo.
  2. Cámara del teléfono o del computador (botón "Cámara"):
       - Android / Chrome: lector nativo del navegador -> QR y código de barras.
       - iPhone / Safari: librería jsQR -> QR.
  3. Escribir el código a mano y pulsar Enter.

  Uso:
    <app-escaner
      (escaneado)="agregarPorCodigo($event)"
      [mensaje]="mensajeEscaneo"
      [estado]="estadoEscaneo">
    </app-escaner>

  La página decide qué hacer con el código y devuelve un mensaje
  ("Agregado: Oso navidad" / "No existe ...") con estado 'ok' o 'error'.
*/

// Lector nativo del navegador (Chrome en Android, Edge...). Safari no lo tiene.
interface CodigoDetectado {
  rawValue: string;
}
interface LectorNativo {
  detect(fuente: CanvasImageSource): Promise<CodigoDetectado[]>;
}
interface ConstructorLectorNativo {
  new (opciones?: { formats: string[] }): LectorNativo;
  getSupportedFormats(): Promise<string[]>;
}

// Tiempo máximo entre teclas para considerar que escribe un lector físico
const MS_ENTRE_TECLAS_LECTOR = 60;
// Un mismo código no se repite antes de este tiempo con la cámara abierta
const MS_REPETIR_CODIGO = 1800;
const FORMATOS_DESEADOS = ['qr_code', 'code_128'];

@Component({
  selector: 'app-escaner',
  imports: [NgIf, FormsModule, Icono],
  templateUrl: './escaner.html',
  styleUrl: './escaner.css'
})
export class Escaner implements OnDestroy {

  @Input() placeholder = 'Escanea o escribe la referencia y pulsa Enter';
  // Texto de la página después de cada escaneo
  @Input() mensaje = '';
  @Input() estado: 'ok' | 'error' | '' = '';

  @Output() escaneado = new EventEmitter<string>();

  @ViewChild('video') videoRef?: ElementRef<HTMLVideoElement>;

  texto = '';

  camaraAbierta = false;
  iniciandoCamara = false;
  errorCamara = '';
  ultimoLeido = '';

  private flujo: MediaStream | null = null;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private lectorNativo: LectorNativo | null = null;
  private jsQR: ((datos: Uint8ClampedArray, ancho: number, alto: number) => { data: string } | null) | null = null;
  private lienzo: HTMLCanvasElement | null = null;
  private ultimoCodigo = '';
  private ultimoMomento = 0;

  // Lector físico: acumula lo que "escribe" rápido el lector
  private bufferLector = '';
  private ultimaTecla = 0;

  constructor(private zona: NgZone) {}

  ngOnDestroy(): void {
    this.cerrarCamara();
  }


  // ================================
  // ESCRIBIR / LECTOR FÍSICO
  // ================================

  enviarTexto(): void {
    const codigo = this.texto.trim();
    if (codigo) {
      this.emitir(codigo);
    }
    this.texto = '';
  }

  // Captura el lector físico cuando el cursor no está en ningún campo
  @HostListener('document:keydown', ['$event'])
  teclaGlobal(evento: KeyboardEvent): void {
    const destino = evento.target as HTMLElement | null;
    const enCampo = !!destino && (
      ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName) || destino.isContentEditable
    );
    if (enCampo || this.camaraAbierta || evento.ctrlKey || evento.metaKey || evento.altKey) {
      return;
    }

    const ahora = Date.now();
    if (ahora - this.ultimaTecla > MS_ENTRE_TECLAS_LECTOR * 3) {
      this.bufferLector = '';
    }
    this.ultimaTecla = ahora;

    if (evento.key === 'Enter') {
      if (this.bufferLector.length >= 2) {
        evento.preventDefault();
        this.emitir(this.bufferLector);
      }
      this.bufferLector = '';
      return;
    }
    if (evento.key.length === 1) {
      this.bufferLector += evento.key;
    }
  }


  // ================================
  // CÁMARA
  // ================================

  async abrirCamara(): Promise<void> {
    this.errorCamara = '';
    this.ultimoLeido = '';

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.camaraAbierta = true;
      this.errorCamara =
        'La cámara solo funciona cuando el sistema se abre con https:// (o en localhost). ' +
        'Pide que la página publicada use https.';
      return;
    }

    this.camaraAbierta = true;
    this.iniciandoCamara = true;

    try {
      await this.prepararLector();
      this.flujo = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });

      // Espera a que Angular pinte el <video>
      await new Promise(resolver => setTimeout(resolver));
      const video = this.videoRef?.nativeElement;
      if (!video) {
        throw new Error('No se pudo mostrar la cámara');
      }
      video.srcObject = this.flujo;
      video.setAttribute('playsinline', 'true');   // iPhone: no abrir en pantalla completa
      await video.play();

      this.iniciandoCamara = false;
      this.zona.runOutsideAngular(() => this.programarLectura(300));
    } catch (error) {
      this.iniciandoCamara = false;
      this.errorCamara = this.mensajeErrorCamara(error);
      this.detenerFlujo();
    }
  }

  cerrarCamara(): void {
    this.camaraAbierta = false;
    this.iniciandoCamara = false;
    this.detenerFlujo();
  }

  // Cierra con Escape
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.camaraAbierta) {
      this.cerrarCamara();
    }
  }

  private detenerFlujo(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.flujo?.getTracks().forEach(pista => pista.stop());
    this.flujo = null;
  }

  // Usa el lector nativo si lee QR o Code 128; si no, carga jsQR
  private async prepararLector(): Promise<void> {
    if (this.lectorNativo || this.jsQR) {
      return;
    }
    const Nativo = (window as unknown as { BarcodeDetector?: ConstructorLectorNativo }).BarcodeDetector;
    if (Nativo) {
      try {
        const soportados = await Nativo.getSupportedFormats();
        const formatos = FORMATOS_DESEADOS.filter(formato => soportados.includes(formato));
        if (formatos.length) {
          this.lectorNativo = new Nativo({ formats: formatos });
          return;
        }
      } catch {
        // Si falla, se usa jsQR
      }
    }
    const modulo = await import('jsqr');
    this.jsQR = modulo.default;
  }

  private programarLectura(ms: number): void {
    this.temporizador = setTimeout(() => this.leerFotograma(), ms);
  }

  private async leerFotograma(): Promise<void> {
    const video = this.videoRef?.nativeElement;
    if (!this.flujo || !video) {
      return;
    }

    try {
      if (video.readyState >= 2 && video.videoWidth) {
        let codigo: string | null = null;

        if (this.lectorNativo) {
          const encontrados = await this.lectorNativo.detect(video);
          codigo = encontrados[0]?.rawValue ?? null;
        } else if (this.jsQR) {
          // Se reduce la imagen para que el teléfono lea rápido
          const escala = Math.min(1, 640 / video.videoWidth);
          const ancho = Math.round(video.videoWidth * escala);
          const alto = Math.round(video.videoHeight * escala);
          this.lienzo ??= document.createElement('canvas');
          this.lienzo.width = ancho;
          this.lienzo.height = alto;
          const contexto = this.lienzo.getContext('2d', { willReadFrequently: true });
          if (contexto) {
            contexto.drawImage(video, 0, 0, ancho, alto);
            const imagen = contexto.getImageData(0, 0, ancho, alto);
            codigo = this.jsQR(imagen.data, ancho, alto)?.data ?? null;
          }
        }

        if (codigo && codigo.trim()) {
          this.alLeerConCamara(codigo.trim());
        }
      }
    } catch {
      // Un fotograma que no se pudo leer no es un error: se intenta con el siguiente
    }

    if (this.flujo) {
      this.programarLectura(this.lectorNativo ? 200 : 250);
    }
  }

  private alLeerConCamara(codigo: string): void {
    const ahora = Date.now();
    if (codigo === this.ultimoCodigo && ahora - this.ultimoMomento < MS_REPETIR_CODIGO) {
      return;
    }
    this.ultimoCodigo = codigo;
    this.ultimoMomento = ahora;

    this.zona.run(() => {
      this.ultimoLeido = codigo;
      this.emitir(codigo);
    });
  }

  private mensajeErrorCamara(error: unknown): string {
    const nombre = (error as { name?: string })?.name ?? '';
    if (nombre === 'NotAllowedError' || nombre === 'SecurityError') {
      return 'No hay permiso para usar la cámara. Actívalo en la configuración del navegador y vuelve a intentar.';
    }
    if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') {
      return 'No se encontró una cámara en este dispositivo.';
    }
    if (nombre === 'NotReadableError') {
      return 'La cámara está siendo usada por otra aplicación.';
    }
    return 'No se pudo abrir la cámara. ' + ((error as { message?: string })?.message ?? '');
  }


  // ================================
  // AVISO A LA PÁGINA
  // ================================

  private emitir(codigo: string): void {
    // Vibración corta en el teléfono como confirmación
    try {
      navigator.vibrate?.(60);
    } catch {
      // No todos los navegadores lo permiten
    }
    this.escaneado.emit(codigo);
  }
}
