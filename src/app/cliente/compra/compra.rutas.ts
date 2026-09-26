import { Routes } from '@angular/router';

import { GuardEdad } from './guards/edad.guard';

/** Flujo de compra. `GuardCompraActiva` ya se aplicó en la ruta padre. */
export const RutasCompra: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'carrito' },
  {
    path: 'carrito',
    loadComponent: () =>
      import('./componentes/carrito/carrito.componente').then((m) => m.CarritoComponente),
    title: 'Tu carrito · Cine',
  },
  {
    path: 'checkout',
    canActivate: [GuardEdad],
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
