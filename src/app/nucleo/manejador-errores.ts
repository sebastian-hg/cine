import { ErrorHandler, Injectable, inject } from '@angular/core';

import { ErroresServicio } from './servicios/errores.servicio';

/**
 * `ErrorHandler` global (§23: manejo centralizado de errores).
 *
 * Cubre lo que no pasa por HTTP: errores de dominio lanzados desde los
 * servicios, fallos en plantillas, promesas rechazadas.
 */
@Injectable()
export class ManejadorErroresGlobal implements ErrorHandler {
  private readonly errores = inject(ErroresServicio);

  handleError(error: unknown): void {
    this.errores.reportar(this.errores.traducir(error));
    // Se conserva en consola: sin esto, depurar en desarrollo se vuelve ciego.
    console.error(error);
  }
}
