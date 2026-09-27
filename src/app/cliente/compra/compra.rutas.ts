import { Routes } from '@angular/router';

import { GuardCompraActiva } from './guards/compra-activa.guard';
import { GuardEdad } from './guards/edad.guard';

/** Flujo de compra. Solo carrito/checkout requieren una compra activa. */
export const RutasCompra: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'carrito' },
  {
    path: 'carrito',
    canActivate: [GuardCompraActiva],
    loadComponent: () =>
      import('./componentes/carrito/carrito.componente').then((m) => m.CarritoComponente),
    title: 'Tu carrito · Cine',
  },
  {
    path: 'checkout',
    canActivate: [GuardCompraActiva, GuardEdad],
    loadComponent: () =>
      import('./componentes/checkout/checkout.componente').then((m) => m.CheckoutComponente),
    title: 'Confirmar compra · Cine',
  },
  {
    path: 'entrada/:id',
    loadComponent: () =>
      import('./componentes/entrada-generada/entrada-generada.componente').then(
        (m) => m.EntradaGeneradaComponente,
      ),
    title: 'Tu entrada · Cine',
  },
];
