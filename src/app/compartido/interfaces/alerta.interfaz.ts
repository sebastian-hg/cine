/** §17: botón «Avisarme» de la sección Próximamente. */
export interface AlertaEstreno {
  id: string;
  idUsuario: string;
  idPelicula: string;
  fechaSuscripcion: string;
  /** Pasa a `true` cuando se habilita la venta y se dispara la notificación. */
  notificada: boolean;
}
