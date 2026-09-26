import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { ErroresServicio } from '../servicios/errores.servicio';

/** Mensajes por código, para no mostrarle «Error 404» a nadie (§22). */
const POR_ESTADO: Record<number, string> = {
  0: 'No pudimos conectarnos. Revisá tu conexión e intentá de nuevo.',
  401: 'Tu sesión expiró. Volvé a iniciar sesión.',
  403: 'No tenés permisos para hacer eso.',
  404: 'No encontramos lo que buscabas.',
  409: 'Alguien se adelantó. Actualizá la página y probá otra vez.',
  500: 'Tuvimos un problema de nuestro lado. Estamos en eso.',
};

/**
 * Manejo centralizado de errores HTTP (§23).
 *
 * Traduce y reporta, pero vuelve a lanzar: quien llamó puede necesitar
 * reaccionar (por ejemplo, el mapa de butacas ante una butaca perdida).
 */
export const InterceptorErrores: HttpInterceptorFn = (peticion, siguiente) => {
  const errores = inject(ErroresServicio);

  return siguiente(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      const mensaje =
        POR_ESTADO[error.status] ?? 'Algo salió mal. Volvé a intentarlo en unos segundos.';
      errores.reportar(mensaje, `${error.status} ${peticion.method} ${peticion.url}`);
      return throwError(() => error);
    }),
  );
};
