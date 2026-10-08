// Colección de pinturas (Acrílicas, Pátinas, Metalizados, Bases, Gamusa...)
export interface IColeccion {
  id: number;
  nombre: string;
  descripcion: string;
  orden: number;
  tonos: number;   // cantidad de pinturas registradas en la colección
}
