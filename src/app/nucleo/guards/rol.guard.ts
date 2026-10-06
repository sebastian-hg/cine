import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { RolUsuario } from '../../compartido/interfaces/usuario.interfaz';
import { AutenticacionServicio } from '../servicios/autenticacion.servicio';
import { NotificacionServicio } from '../servicios/notificacion.servicio';

/**
 * Autorización por rol (§26 de la consigna).
 *
 * Un solo guard parametrizado por `data.roles` en lugar de uno por rol: tres
 * guards idénticos no aportarían nada y agregar un cuarto rol obligaría a
 * escribir otro archivo.
 *
 *     { path: 'administrador', canActivate: [GuardRol], data: { roles: ['administrador'] } }
 *
 * Esto es defensa en profundidad del lado del cliente. La autorización real la
 * hace RLS en Supabase: ocultar una ruta no protege los datos.
 */
export const GuardRol: CanActivateFn & CanActivateChildFn = (ruta, estado) => {
  const auth = inject(AutenticacionServicio);
  const router = inject(Router);
  const avisos = inject(NotificacionServicio);

  const rutaConRoles = [...ruta.pathFromRoot]
    .reverse()
    .find((segmento) => Array.isArray(segmento.data['roles']));
  const permitidos = rutaConRoles?.data['roles'] as RolUsuario[] | undefined;
  const usuario = auth.usuarioActual;

  if (!usuario) {
    return router.createUrlTree(['/ingresar'], { queryParams: { returnUrl: estado.url } });
  }

  if (permitidos?.includes(usuario.rol)) {
    return true;
  }

  avisos.mostrar('No tenés permisos para acceder a esa sección.', 'error');
  return router.createUrlTree(['/']);
};
