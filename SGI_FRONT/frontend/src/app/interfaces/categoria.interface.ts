// Categoría de figuras (Navidad, Materas, Juveniles, Religioso, Hogar, Terminados...)
export interface ICategoria {
  id: number;
  nombre: string;
  orden: number;
  figuras: number;   // cantidad de figuras con esta categoría
}
