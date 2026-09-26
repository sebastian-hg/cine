import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { CarritoServicio } from '../servicios/carrito.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';

/**
 * Impide entrar al checkout sin nada en el carrito.
 *
 * Sin esto, recargar la página de confirmación después de comprar dejaría al
 * usuario en un formulario de pago por cero pesos.
 */
export const GuardCompraActiva: CanActivateFn = () => {
  const carrito = inject(CarritoServicio);
  const router = inject(Router);
  const avisos = inject(NotificacionServicio);

  if (carrito.actual.items.length > 0) {
    return true;
  }

  avisos.mostrar('Tu carrito está vacío. Elegí una función para empezar.', 'info');
  return router.createUrlTree(['/']);
};
