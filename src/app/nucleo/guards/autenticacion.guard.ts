import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AutenticacionServicio } from '../servicios/autenticacion.servicio';

/**
 * Exige sesión iniciada. Protege todo `cuenta/`.
 *
 * Al rechazar guarda la URL pedida en `returnUrl` para volver ahí después
 * del login, en vez de dejar al usuario en la página principal.
 */
export const GuardAutenticacion: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);

  if (auth.usuarioActual) {
    return true;
  }

  return router.createUrlTree(['/ingresar'], {
    queryParams: { returnUrl: estado.url },
  });
};
