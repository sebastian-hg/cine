import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { BehaviorSubject, switchMap, take } from 'rxjs';

import { ResultadoProgramacion, SolicitudFuncion } from '../../../compartido/interfaces/funcion.interfaz';
import { FuncionServicio } from '../../../compartido/servicios/funcion.servicio';
import { PeliculaServicio } from '../../../compartido/servicios/pelicula.servicio';
import { ProgramacionServicio } from '../../../compartido/servicios/programacion.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { PipeModalidad } from '../../../compartido/pipes/modalidad.pipe';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';
import { FormularioFuncionComponente } from '../formulario-funcion/formulario-funcion.componente';

/** Gestión de funciones con asignación automática de sala (§4). */
@Component({
  selector: 'app-gestion-funciones',
  imports: [AsyncPipe, DatePipe, FormularioFuncionComponente, PipeModalidad, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './gestion-funciones.componente.html',
  styleUrl: './gestion-funciones.componente.scss',
})
export class GestionFuncionesComponente {
  private readonly funciones = inject(FuncionServicio);
  private readonly peliculas = inject(PeliculaServicio);
  private readonly programacion = inject(ProgramacionServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly funciones$ = this.recargar.pipe(switchMap(() => this.funciones.listar()));
  protected readonly peliculas$ = this.peliculas.listar();

  protected readonly resultados = signal<ResultadoProgramacion[]>([]);
  protected readonly procesando = signal(false);

  protected programar(solicitud: SolicitudFuncion): void {
    this.procesando.set(true);

    this.programacion
      .programar(solicitud)
      .pipe(take(1))
      .subscribe({
        next: (resultados) => {
          this.procesando.set(false);
          this.resultados.set(resultados);

          const creadas = resultados.filter((r) => r.asignada).length;
          const fallidas = resultados.length - creadas;

          if (creadas > 0) {
            this.avisos.mostrar(
              `Se programaron ${creadas} función(es).` +
                (fallidas > 0 ? ` ${fallidas} no encontraron sala.` : ''),
              fallidas > 0 ? 'info' : 'exito',
            );
          } else {
            this.avisos.mostrar('No se pudo programar ninguna función.', 'error');
          }

          this.recargar.next();
        },
        error: (error: Error) => {
          this.procesando.set(false);
          this.avisos.mostrar(error.message, 'error');
        },
      });
  }
}
