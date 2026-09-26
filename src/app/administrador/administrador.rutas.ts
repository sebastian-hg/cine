import { Routes } from '@angular/router';

/**
 * Panel de administración (§1). `GuardRol` se aplica en la ruta padre.
 *
 * Todas las pantallas cuelgan del layout `panel-administrador`, que aporta la
 * navegación lateral.
 */
export const RutasAdministrador: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./componentes/panel-administrador/panel-administrador.componente').then(
        (m) => m.PanelAdministradorComponente,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'reportes' },
      {
        path: 'peliculas',
        loadComponent: () =>
          import('./componentes/gestion-peliculas/gestion-peliculas.componente').then(
            (m) => m.GestionPeliculasComponente,
          ),
        title: 'Películas · Administración',
      },
      {
        path: 'generos',
        loadComponent: () =>
          import('./componentes/gestion-generos/gestion-generos.componente').then(
            (m) => m.GestionGenerosComponente,
          ),
        title: 'Géneros · Administración',
      },
      {
        path: 'salas',
        loadComponent: () =>
          import('./componentes/gestion-salas/gestion-salas.componente').then(
            (m) => m.GestionSalasComponente,
          ),
        title: 'Salas · Administración',
      },
      {
        path: 'butacas',
        loadComponent: () =>
          import('./componentes/gestion-butacas/gestion-butacas.componente').then(
            (m) => m.GestionButacasComponente,
          ),
        title: 'Butacas · Administración',
      },
      {
        path: 'funciones',
        loadComponent: () =>
          import('./componentes/gestion-funciones/gestion-funciones.componente').then(
            (m) => m.GestionFuncionesComponente,
          ),
        title: 'Funciones · Administración',
      },
      {
        path: 'categorias',
        loadComponent: () =>
          import('./componentes/gestion-categorias/gestion-categorias.componente').then(
            (m) => m.GestionCategoriasComponente,
          ),
        title: 'Categorías · Administración',
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('./componentes/gestion-productos/gestion-productos.componente').then(
            (m) => m.GestionProductosComponente,
          ),
        title: 'Productos · Administración',
      },
      {
        path: 'combos',
        loadComponent: () =>
          import('./componentes/gestion-combos/gestion-combos.componente').then(
            (m) => m.GestionCombosComponente,
          ),
        title: 'Combos · Administración',
      },
      {
        path: 'cupones',
        loadComponent: () =>
          import('./componentes/gestion-cupones/gestion-cupones.componente').then(
            (m) => m.GestionCuponesComponente,
          ),
        title: 'Cupones · Administración',
      },
      {
        path: 'descuentos',
        loadComponent: () =>
          import('./componentes/configuracion-descuentos/configuracion-descuentos.componente').then(
            (m) => m.ConfiguracionDescuentosComponente,
          ),
        title: 'Descuentos · Administración',
      },
      {
        path: 'puntos',
        loadComponent: () =>
          import('./componentes/configuracion-puntos/configuracion-puntos.componente').then(
            (m) => m.ConfiguracionPuntosComponente,
          ),
        title: 'Puntos · Administración',
      },
      {
        path: 'preventa',
        loadComponent: () =>
          import('./componentes/configuracion-preventa/configuracion-preventa.componente').then(
            (m) => m.ConfiguracionPreventaComponente,
          ),
        title: 'Preventa · Administración',
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('./componentes/reportes/reportes.componente').then((m) => m.ReportesComponente),
        title: 'Reportes · Administración',
      },
      {
        path: 'graficos',
        loadComponent: () =>
          import('./componentes/graficos/graficos.componente').then((m) => m.GraficosComponente),
        title: 'Gráficos · Administración',
      },
      {
        path: 'log',
        loadComponent: () =>
          import('./componentes/log-actividad/log-actividad.componente').then(
            (m) => m.LogActividadComponente,
          ),
        title: 'Log de actividad · Administración',
      },
    ],
  },
];
