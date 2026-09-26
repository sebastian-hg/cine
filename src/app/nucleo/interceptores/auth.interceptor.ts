import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AutenticacionServicio } from '../servicios/autenticacion.servicio';

/**
 * Adjunta el token de sesión a cada petición saliente.
 *
 * TODO Supabase: el cliente oficial ya manda el JWT solo. Este interceptor
 * seguiría valiendo para las llamadas a APIs propias.
 */
export const InterceptorAuth: HttpInterceptorFn = (peticion, siguiente) => {
  const token = inject(AutenticacionServicio).token;
  if (!token) return siguiente(peticion);

  return siguiente(
    peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
  );
};
