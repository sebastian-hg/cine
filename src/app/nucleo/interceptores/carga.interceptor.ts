import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { CargaServicio } from '../servicios/carga.servicio';

/** Mantiene el contador de peticiones en vuelo que alimenta el indicador de carga. */
export const InterceptorCarga: HttpInterceptorFn = (peticion, siguiente) => {
  const carga = inject(CargaServicio);
  carga.comenzar();
  return siguiente(peticion).pipe(finalize(() => carga.terminar()));
};
