import { Routes } from '@angular/router';

/** Rutas públicas: lo único que entra en el bundle inicial. */
export const RutasCatalogo: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./componentes/inicio/inicio.componente').then((m) => m.InicioComponente),
    title: 'Cartelera · Cine',
  },
  {
    path: 'pelicula/:id',
    loadComponent: () =>
      import('./componentes/detalle-pelicula/detalle-pelicula.componente').then(
        (m) => m.DetallePeliculaComponente,
      ),
    title: 'Película · Cine',
  },
  {
    path: 'proximamente',
    loadComponent: () =>
      import('./componentes/proximamente/proximamente.componente').then(
        (m) => m.ProximamenteComponente,
      ),
    title: 'Próximamente · Cine',
  },
];
