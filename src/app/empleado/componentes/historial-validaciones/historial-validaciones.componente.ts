import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { AutenticacionServicio } from '../../../nucleo/servicios/autenticacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

/** §21: cada validación queda registrada en el log. */
@Component({
  selector: 'app-historial-validaciones',
  imports: [DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor seccion">
      <header class="seccion-cabecera">
        <div>
          <p class="etiqueta-seccion">Tu turno</p>
          <h1>Validaciones realizadas</h1>
        </div>
        <a routerLink="/empleado/validar" class="boton boton--fantasma boton--chico">
          ← Volver a validar
        </a>
      </header>

      @if (validaciones(); as validaciones) {
        @if (validaciones.length) {
          <div class="tabla-scroll">
            <table>
              <caption class="solo-lectores">Validaciones que realizaste en esta sesión</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Hora</th>
                  <th scope="col">Acción</th>
                  <th scope="col">Detalle</th>
                </tr>
              </thead>
              <tbody>
                @for (registro of validaciones; track registro.id) {
                  <tr>
                    <td>{{ registro.fechaHora | date: 'dd/MM/y' }}</td>
                    <td>{{ registro.fechaHora | date: 'HH:mm:ss' }}</td>
                    <td>
                      <span class="insignia">
                        {{ registro.accion === 'validar-qr' ? 'Entrada' : 'Candy Bar' }}
                      </span>
                    </td>
                    <td>{{ registro.detalle }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="vacio">Todavía no validaste ningún código en esta sesión.</p>
        }
      }
    </div>
  `,
})
export class HistorialValidacionesComponente {
  private readonly auth = inject(AutenticacionServicio);
  private readonly registro = inject(RegistroActividadServicio);

  protected readonly validaciones = toSignal(
    this.auth.usuarioActual$.pipe(
      switchMap((usuario) => (usuario ? this.registro.validacionesDe(usuario.id) : of([]))),
    ),
    { initialValue: [] },
  );
}
