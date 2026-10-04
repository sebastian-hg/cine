import { Service, inject } from '@angular/core';
import { Observable, from, mergeMap, throwError } from 'rxjs';

import { Funcion, ResultadoProgramacion, SolicitudFuncion } from '../interfaces/funcion.interfaz';
import { combinarFechaHora, sumarMinutos } from '../../nucleo/dominio/fechas';
import { asignarSala, permiteHorarioFuncion } from '../../nucleo/dominio/programacion-salas';
import { BaseDatos, SupabaseServicio } from '../../nucleo/servicios/supabase.servicio';
import { RegistroActividadServicio } from '../../nucleo/servicios/registro-actividad.servicio';

/**
 * Programación de funciones en la sala elegida por administración (§4).
 *
 * El administrador define película, días, horario, modalidad, idioma y precio.
 * Se valida que la sala elegida esté libre, contemplando la duración de la
 * película y dejando 30 minutos de separación entre funciones.
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
    return this.supabase.transaccionAsync((base) => {
      const pelicula = base.peliculas.find((p) => p.id === solicitud.idPelicula);
      if (!pelicula) {
        return this.supabase.inmediato(
          solicitud.fechas.map(() => ({
            asignada: false as const,
            motivo: 'La película indicada no existe.',
          })),
        );
      }

      if (!permiteHorarioFuncion(pelicula.clasificacion, solicitud.horario)) {
        const motivo =
          pelicula.clasificacion === 'ATP'
            ? 'Las películas ATP solo pueden comenzar entre las 13:00 y las 17:00.'
            : 'Las funciones solo pueden comenzar entre las 13:00 y la 01:00.';
        return this.supabase.inmediato(
          solicitud.fechas.map(() => ({
            asignada: false as const,
            motivo,
          })),
        );
      }

      const sala = base.salas.find((item) => item.id === solicitud.idSala);
      if (!sala) {
        return this.supabase.inmediato(
          solicitud.fechas.map(() => ({
            asignada: false as const,
            motivo: 'La sala indicada no existe.',
          })),
        );
      }

      const resultados: ResultadoProgramacion[] = [];
      const funcionesTrabajo = [...base.funciones];
      const funcionesNuevas: Funcion[] = [];

      for (const fecha of solicitud.fechas) {
        const inicio = combinarFechaHora(new Date(`${fecha}T00:00:00`), solicitud.horario);

        const asignacion = asignarSala(
          { inicio, duracionMinutos: pelicula.duracionMinutos },
          [sala],
          funcionesTrabajo,
          (funcion) => this.duracionDe(funcion, base),
        );

        if (!asignacion.asignada) {
          resultados.push({ asignada: false, motivo: `${fecha}: ${asignacion.motivo}` });
          continue;
        }

        const funcion: Funcion = {
          id: this.siguienteIdFuncion(base),
          idPelicula: solicitud.idPelicula,
          idSala: asignacion.sala.id,
          inicio: this.aIsoLocal(inicio),
          fin: this.aIsoLocal(sumarMinutos(inicio, pelicula.duracionMinutos)),
          modalidad: solicitud.modalidad,
          idioma: solicitud.idioma,
          precio: solicitud.precio,
        };

        // Se agrega al estado de trabajo para que la próxima fecha vea esta ocupación.
        funcionesTrabajo.push(funcion);
        funcionesNuevas.push(funcion);
        resultados.push({ asignada: true, funcion, nombreSala: asignacion.sala.nombre });
      }

      if (funcionesNuevas.length === 0) {
        return this.supabase.inmediato(resultados);
      }

      const cliente = this.supabase.cliente;
      if (!cliente) {
        base.funciones.push(...funcionesNuevas);
        this.registrarProgramacion(pelicula.nombre, solicitud.horario, resultados);
        return this.supabase.inmediato(resultados);
      }

      const filas = funcionesNuevas.map((funcion) => ({
        id_pelicula: this.aNumero(funcion.idPelicula),
        id_sala: this.aNumero(funcion.idSala),
        horario: this.aHorarioBd(funcion.inicio),
        modalidad: funcion.modalidad,
        idioma: funcion.idioma,
        precio: funcion.precio,
        desde_dia: this.calcularDesdeDia(funcion.inicio),
        inicio: funcion.inicio,
        fin: funcion.fin,
      }));

      return from(cliente.from('funciones').insert(filas).select('*')).pipe(
        mergeMap(({ data, error }) => {
          if (error) return throwError(() => new Error(error.message));

          const filasInsertadas = (data ?? []) as Array<Record<string, unknown>>;

          for (const fila of filasInsertadas) {
            const inicio = String(fila['inicio'] ?? '');
            const sala = String(fila['id_sala'] ?? '');
            const peliculaId = String(fila['id_pelicula'] ?? '');

            const funcion = funcionesNuevas.find(
              (f) => f.inicio === inicio && String(f.idSala) === sala && String(f.idPelicula) === peliculaId,
            );
            if (!funcion) continue;
            funcion.id = String(fila['id'] ?? funcion.id);
          }

          base.funciones.push(...funcionesNuevas);
          this.registrarProgramacion(pelicula.nombre, solicitud.horario, resultados);
          return this.supabase.inmediato(resultados);
        }),
      );
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
          inicio: this.aIsoLocal(inicio),
          fin: this.aIsoLocal(sumarMinutos(inicio, pelicula.duracionMinutos)),
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

  private siguienteIdFuncion(base: BaseDatos): string {
    const maximo = base.funciones.reduce((max, funcion) => {
      const n = Number(funcion.id);
      return Number.isInteger(n) && n > max ? n : max;
    }, 0);

    return String(maximo + 1);
  }

  private aNumero(valor: string): number {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
  }

  private aHorarioBd(inicioIso: string): string {
    const fecha = new Date(inicioIso);
    if (Number.isNaN(fecha.getTime())) return '00:00:00';
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');
    const ss = String(fecha.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }

  private aIsoLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const mm = String(fecha.getMinutes()).padStart(2, '0');
    const ss = String(fecha.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
  }

  private calcularDesdeDia(inicioIso: string): number {
    const inicio = new Date(inicioIso);
    if (Number.isNaN(inicio.getTime())) return 0;

    const hoy = new Date();
    const baseHoy = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
    const baseInicio = Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), inicio.getUTCDate());
    const dias = Math.floor((baseInicio - baseHoy) / 86_400_000);
    return dias >= 0 ? dias : 0;
  }

  private registrarProgramacion(nombrePelicula: string, horario: string, resultados: ResultadoProgramacion[]): void {
    const creadas = resultados.filter((r) => r.asignada).length;
    if (creadas <= 0) return;

    this.registro
      .registrar('crear-funcion', `creó ${creadas} función(es) de "${nombrePelicula}" a las ${horario}`)
      .subscribe();
  }
}
