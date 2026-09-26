import { Routes } from '@angular/router';

/** Área del empleado (§1). `GuardRol` se aplica en la ruta padre. */
export const RutasEmpleado: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'validar' },
  {
    path: 'validar',
    loadComponent: () =>
      import('./componentes/panel-empleado/panel-empleado.componente').then(
        (m) => m.PanelEmpleadoComponente,
      ),
    title: 'Validar QR · Cine',
  },
  {
    path: 'historial',
    loadComponent: () =>
      import('./componentes/historial-validaciones/historial-validaciones.componente').then(
        (m) => m.HistorialValidacionesComponente,
      ),
    title: 'Historial de validaciones · Cine',
  },
];
