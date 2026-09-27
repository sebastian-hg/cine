export type RolUsuario = 'anonimo' | 'cliente' | 'empleado' | 'administrador';

/** Modelo alineado a la tabla `usuarios_cine` de Supabase. */
export interface Usuario {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  /** ISO `YYYY-MM-DD`. Base del cálculo de edad para la restricción de §7. */
  fechaNacimiento: string;
  edad: number;
  rol: RolUsuario;
  activo: boolean;
  /** `true` cuando todavía conserva el beneficio de primera compra. */
  flagPrimeraCompra: boolean;
  puntos: number;
  credito: number;
  tipoSangre: string;
  colorOjos: string;
  diasVacaciones: number;
  createdAt: string;
  updatedAt: string;
  primeraCompraUsada: boolean;
}

/** Credenciales del formulario de acceso. */
export interface Credenciales {
  email: string;
  password: string;
}
