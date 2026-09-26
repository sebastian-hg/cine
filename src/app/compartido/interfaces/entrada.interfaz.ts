import { ClasificacionEdad } from './pelicula.interfaz';
import { Idioma, Modalidad } from './funcion.interfaz';

/** Datos que §13 exige imprimir en la entrada PDF. */
export interface Entrada {
  idCompra: string;
  nombrePelicula: string;
  poster: string;
  /** ISO 8601 del inicio de la función. */
  inicio: string;
  nombreSala: string;
  etiquetaButaca: string;
  tipoButaca: string;
  modalidad: Modalidad;
  idioma: Idioma;
  precio: number;
  nombreComprador: string;
  clasificacion: ClasificacionEdad;
  /** §7: se imprime el aviso cuando el menor debe ir acompañado. */
  requiereAdulto: boolean;
  idQr: string;
}
