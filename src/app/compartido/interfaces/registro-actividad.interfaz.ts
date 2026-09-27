/** Acciones que §21 exige registrar. */
export type AccionRegistrada =
  | 'crear'
  | 'modificar'
  | 'eliminar'
  | 'cambiar-precio'
  | 'crear-funcion'
  | 'modificar-funcion'
  | 'validar-qr'
  | 'validar-candy'
  | 'cambio-configuracion';

export interface RegistroActividad {
  id: string;
  /** Nombre legible: «Admin Juan», «Empleado Carlos». */
  usuario: string;
  idUsuario: number | string;
  accion: AccionRegistrada;
  /** ISO 8601; la vista lo separa en fecha y hora. */
  fechaHora: string;
  /** «creó la función de "Película X"». */
  detalle: string;
}
