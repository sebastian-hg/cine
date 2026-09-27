/**
 * §14: la calificación se vincula a una compra para que nadie califique
 * una película que no vio.
 */
export interface Resena {
  id: string;
  idPelicula: string;
  idUsuario: number;
  nombreUsuario: string;
  /** 1 a 5. */
  estrellas: number;
  comentario: string;
  fecha: string;
  /** Compra de una función ya pasada que habilita esta reseña. */
  idCompraVerificada: string;
}

export interface ResumenResenas {
  promedio: number;
  cantidad: number;
}
