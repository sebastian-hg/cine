import { Routes } from '@angular/router';

/** Área privada del cliente. `GuardAutenticacion` se aplica en la ruta padre. */
export const RutasCuenta: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'perfil' },
  {
    path: 'perfil',
    loadComponent: () =>
      import('./componentes/perfil/perfil.componente').then((m) => m.PerfilComponente),
    title: 'Mi perfil · Cine',
  },
  {
    path: 'compras',
    loadComponent: () =>
      import('./componentes/historial-compras/historial-compras.componente').then(
        (m) => m.HistorialComprasComponente,
      ),
    title: 'Mis compras · Cine',
  },
  {
    path: 'peliculas',
    loadComponent: () =>
      import('./componentes/mis-peliculas/mis-peliculas.componente').then(
        (m) => m.MisPeliculasComponente,
      ),
    title: 'Mis películas · Cine',
  },
  {
    path: 'puntos',
    loadComponent: () =>
      import('./componentes/mis-puntos/mis-puntos.componente').then((m) => m.MisPuntosComponente),
    title: 'Mis puntos · Cine',
  },
  {
    path: 'credito',
    loadComponent: () =>
      import('./componentes/mi-credito/mi-credito.componente').then((m) => m.MiCreditoComponente),
    title: 'Mi crédito · Cine',
  },
  {
    path: 'alertas',
    loadComponent: () =>
      import('./componentes/mis-alertas/mis-alertas.componente').then((m) => m.MisAlertasComponente),
    title: 'Mis alertas · Cine',
  },
];
