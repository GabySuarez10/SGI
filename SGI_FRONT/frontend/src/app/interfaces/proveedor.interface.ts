import { TipoProveedor } from '../utils/tipos';

export interface IProveedor {
  nombre: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  descripcion: string;
  limite_precio: number | null;   // precio máximo por figura pactado (opcional)
  tipo: TipoProveedor;            // figuras | materiales | ambos
}
