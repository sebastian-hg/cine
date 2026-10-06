import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AutenticacionServicio } from '../servicios/autenticacion.servicio';

/** Mantiene fuera de login y registro a quienes ya tienen una sesión activa. */
export const GuardNoAutenticado: CanActivateFn = () => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);
  const usuario = auth.usuarioActual;

  if (!usuario) return true;

  if (usuario.rol === 'administrador') return router.createUrlTree(['/administrador']);
  if (usuario.rol === 'empleado') return router.createUrlTree(['/empleado']);
  if (usuario.rol === 'cliente') return router.createUrlTree(['/cuenta/perfil']);

  return router.createUrlTree(['/']);
};