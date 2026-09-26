import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Funcion, ResultadoProgramacion, SolicitudFuncion } from '../interfaces/funcion.interfaz';
import { combinarFechaHora, sumarMinutos } from '../../nucleo/dominio/fechas';
import { asignarSala } from '../../nucleo/dominio/programacion-salas';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';
import { RegistroActividadServicio } from '../../nucleo/servicios/registro-actividad.servicio';

/**
 * Programación de funciones con asignación automática de sala (§4).
 *
 * El administrador define película, días, horario, modalidad, idioma y precio.
 * La sala la elige el sistema: dos funciones nunca pueden ocupar la misma sala a
 * la vez, se contempla la duración de la película y quedan 30 minutos de
 * separación entre funciones.
 *
 * El algoritmo vive en `nucleo/dominio/programacion-salas.ts` como función pura,
 * que es lo que permite testearlo sin levantar Angular.
 *
 * TODO Supabase: la asignación debe correr del lado del servidor, en una RPC
 * `programar_funcion(...)` con un lock sobre la sala. Si dos administradores
 * programan a la vez, este chequeo en el cliente no alcanza (§26).
 */
@Service()
export class ProgramacionServicio {
  private readonly supabase = inject(SupabaseServicio);
  private readonly registro = inject(RegistroActividadServicio);

  /**
   * Programa una función por cada fecha pedida.
   *
   * Devuelve un resultado por fecha: algunas pueden asignarse y otras no, y el
   * administrador necesita ver exactamente cuáles fallaron.
   */
  programar(solicitud: SolicitudFuncion): Observable<ResultadoProgramacion[]> {
    return this.supabase.transaccion((base) => {
      const pelicula = base.peliculas.find((p) => p.id === solicitud.idPelicula);
      if (!pelicula) {
        return solicitud.fechas.map(() => ({
          asignada: false as const,
          motivo: 'La película indicada no existe.',
        }));
      }

      const resultados: ResultadoProgramacion[] = [];

      for (const fecha of solicitud.fechas) {
        const inicio = combinarFechaHora(new Date(`${fecha}T00:00:00`), solicitud.horario);

        const asignacion = asignarSala(
          { inicio, duracionMinutos: pelicula.duracionMinutos },
          base.salas,
          base.funciones,
          (funcion) => this.duracionDe(funcion, base),
        );

        if (!asignacion.asignada) {
          resultados.push({ asignada: false, motivo: `${fecha}: ${asignacion.motivo}` });
          continue;
        }

        const funcion: Funcion = {
          id: this.supabase.nuevoId('f'),
          idPelicula: solicitud.idPelicula,
          idSala: asignacion.sala.id,
          inicio: inicio.toISOString(),
          fin: sumarMinutos(inicio, pelicula.duracionMinutos).toISOString(),
          modalidad: solicitud.modalidad,
          idioma: solicitud.idioma,
          precio: solicitud.precio,
        };

        // Se agrega antes de seguir para que la próxima fecha vea esta ocupación.
        base.funciones.push(funcion);
        resultados.push({ asignada: true, funcion, nombreSala: asignacion.sala.nombre });
      }

      const creadas = resultados.filter((r) => r.asignada).length;
      if (creadas > 0) {
        this.registro
          .registrar(
            'crear-funcion',
            `creó ${creadas} función(es) de "${pelicula.nombre}" a las ${solicitud.horario}`,
          )
          .subscribe();
      }

      return resultados;
    });
  }

  /** Comprueba si un horario tendría sala, sin llegar a crear la función. */
  simular(idPelicula: string, fecha: string, horario: string): Observable<ResultadoProgramacion> {
    return this.supabase.consultar((base) => {
      const pelicula = base.peliculas.find((p) => p.id === idPelicula);
      if (!pelicula) {
        return { asignada: false as const, motivo: 'La película indicada no existe.' };
      }

      const inicio = combinarFechaHora(new Date(`${fecha}T00:00:00`), horario);
      const asignacion = asignarSala(
        { inicio, duracionMinutos: pelicula.duracionMinutos },
        base.salas,
        base.funciones,
        (funcion) => this.duracionDe(funcion, base),
      );

      if (!asignacion.asignada) {
        return { asignada: false as const, motivo: asignacion.motivo };
      }

      return {
        asignada: true as const,
        nombreSala: asignacion.sala.nombre,
        funcion: {
          id: 'simulada',
          idPelicula,
          idSala: asignacion.sala.id,
          inicio: inicio.toISOString(),
          fin: sumarMinutos(inicio, pelicula.duracionMinutos).toISOString(),
          modalidad: '2D',
          idioma: 'castellano',
          precio: pelicula.precioNormal,
        },
      };
    });
  }

  private duracionDe(funcion: Funcion, base: BaseDatos): number {
    return base.peliculas.find((p) => p.id === funcion.idPelicula)?.duracionMinutos ?? 0;
  }
}
