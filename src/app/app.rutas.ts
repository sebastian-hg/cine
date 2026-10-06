import { Routes } from '@angular/router';

import { GuardAutenticacion } from './nucleo/guards/autenticacion.guard';
import { GuardNoAutenticado } from './nucleo/guards/no-autenticado.guard';
import { GuardRol } from './nucleo/guards/rol.guard';
import { GuardRegistroSinGuardar } from './cliente/cuenta/guards/registro-sin-guardar.guard';


export const RutasApp: Routes = [
  {
    path: '',
    loadChildren: () => import('./cliente/catalogo/catalogo.rutas').then((m) => m.RutasCatalogo),
  },
  {
    path: 'compra',
    loadChildren: () => import('./cliente/compra/compra.rutas').then((m) => m.RutasCompra),
  },
  {
    path: 'butacas/:idFuncion',
    loadComponent: () =>
      import('./cliente/compra/componentes/seleccion-butacas/seleccion-butacas.componente').then(
        (m) => m.SeleccionButacasComponente,
      ),
  },
  {
    path: 'candy',
    loadComponent: () =>
      import('./cliente/compra/componentes/candy-bar/candy-bar.componente').then(
        (m) => m.CandyBarComponente,
      ),
  },
  {
    path: 'cuenta',
    canActivate: [GuardAutenticacion],
    loadChildren: () => import('./cliente/cuenta/cuenta.rutas').then((m) => m.RutasCuenta),
  },
  {
    path: 'ingresar',
    canActivate: [GuardNoAutenticado],
    loadComponent: () =>
      import('./cliente/cuenta/componentes/login/login.componente').then((m) => m.LoginComponente),
    title: 'Iniciar sesión · Cine',
  },
  {
    path: 'registrarse',
    canActivate: [GuardNoAutenticado],
    canDeactivate: [GuardRegistroSinGuardar],
    loadComponent: () =>
      import('./cliente/cuenta/componentes/registro/registro.componente').then(
        (m) => m.RegistroComponente,
      ),
    title: 'Crear cuenta · Cine',
  },
  {
    path: 'empleado',
    canActivate: [GuardRol],
    canActivateChild: [GuardRol],
    data: { roles: ['empleado'] },
    loadChildren: () => import('./empleado/empleado.rutas').then((m) => m.RutasEmpleado),
  },
  {
    path: 'administrador',
    canActivate: [GuardRol],
    canActivateChild: [GuardRol],
    data: { roles: ['administrador'] },
    loadChildren: () =>
      import('./administrador/administrador.rutas').then((m) => m.RutasAdministrador),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./compartido/componentes/no-encontrado/no-encontrado.componente').then(
        (m) => m.NoEncontradoComponente,
      ),
  },
];
