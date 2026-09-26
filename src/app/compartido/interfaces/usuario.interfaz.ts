export type RolUsuario = 'anonimo' | 'cliente' | 'empleado' | 'administrador';

/** Datos solicitados en el registro (§8 de la consigna). */
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  /** ISO `YYYY-MM-DD`. Base del cálculo de edad para la restricción de §7. */
  fechaNacimiento: string;
  tipoSangre: string;
  colorOjos: string;
  diasVacaciones: number;
  rol: RolUsuario;
  /** Se pone en `true` al confirmar la primera compra; inhabilita el cupón de bienvenida. */
  primeraCompraUsada: boolean;
}

/** Credenciales del formulario de acceso. */
export interface Credenciales {
  email: string;
  password: string;
}
