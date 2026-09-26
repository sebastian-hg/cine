import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, of, switchMap } from 'rxjs';

import { CarritoServicio } from '../servicios/carrito.servicio';
import { EdadServicio } from '../servicios/edad.servicio';
import { FuncionServicio } from '../../../compartido/servicios/funcion.servicio';
import { PeliculaServicio } from '../../../compartido/servicios/pelicula.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';

/**
 * Restricción por edad en el checkout (§7 de la consigna).
 *
 * Se evalúa acá y no solo en el mapa de butacas porque el usuario puede haber
 * iniciado sesión en el medio, o cambiado de función con el carrito cargado.
 *
 * Si todavía no sabemos la edad (visitante anónimo que no declaró), el guard
 * deja pasar: el componente de checkout muestra el modal de verificación. El
 * guard bloquea solo cuando la edad es conocida e insuficiente.
 */
export const GuardEdad: CanActivateFn = () => {
  const carrito = inject(CarritoServicio);
  const funciones = inject(FuncionServicio);
  const peliculas = inject(PeliculaServicio);
  const edad = inject(EdadServicio);
  const router = inject(Router);
  const avisos = inject(NotificacionServicio);

  const idFuncion = carrito.idFuncion;
  if (!idFuncion) return of(true);

  return funciones.obtener(idFuncion).pipe(
    switchMap((funcion) => (funcion ? peliculas.obtener(funcion.idPelicula) : of(null))),
    map((pelicula) => {
      if (!pelicula) return true;

      const resultado = edad.evaluar(pelicula.clasificacion);
      if (!resultado || resultado.permitido) return true;

      avisos.mostrar(resultado.motivo, 'error');
      return router.createUrlTree(['/pelicula', pelicula.id]);
    }),
  );
};
