import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { SalaServicio } from '../../../compartido/servicios/sala.servicio';
import {
  FILAS,
  FILAS_ACCESIBLES,
  FILAS_VIP,
  grillaDeFila,
  tipoDeFila,
} from '../../../nucleo/dominio/generador-butacas';








@Component({
  selector: 'app-gestion-butacas',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Programación</p>
        <h1>Butacas</h1>
      </div>
    </header>

    <p class="nota">
      La distribución es igual en todas las salas y la genera el sistema. Las filas
      <strong>{{ filasAccesibles }}</strong> son accesibles (2 + 10 + 2) y las filas
      <strong>{{ filasVip }}</strong> son VIP. El resto usa la grilla 4 + 20 + 4.
    </p>

    @if (salasResumen(); as salas) {
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Distribución de butacas por sala</caption>
          <thead>
            <tr>
              <th scope="col">Sala</th>
              <th scope="col" class="numerico">Normales</th>
              <th scope="col" class="numerico">Accesibles</th>
              <th scope="col" class="numerico">VIP</th>
              <th scope="col" class="numerico">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (sala of salas; track sala.id) {
              <tr>
                <td>{{ sala.nombre }}</td>
                <td class="numerico">{{ sala.normal }}</td>
                <td class="numerico">{{ sala.accesible }}</td>
                <td class="numerico">{{ sala.vip }}</td>
                <td class="numerico"><strong>{{ sala.total }}</strong></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    <section class="bloque">
      <h2>Distribución por fila</h2>
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Butacas por fila y sector</caption>
          <thead>
            <tr>
              <th scope="col">Fila</th>
              <th scope="col">Tipo</th>
              <th scope="col" class="numerico">Izquierda</th>
              <th scope="col" class="numerico">Centro</th>
              <th scope="col" class="numerico">Derecha</th>
              <th scope="col" class="numerico">Total</th>
            </tr>
          </thead>
          <tbody>
            @for (fila of filas(); track fila.letra) {
              <tr>
                <td><strong>{{ fila.letra }}</strong></td>
                <td>
                  <span
                    class="insignia"
                    [class.insignia--info]="fila.tipo === 'accesible'"
                    [class.insignia--rojo]="fila.tipo === 'vip'"
                  >
                    {{ fila.tipo }}
                  </span>
                </td>
                <td class="numerico">{{ fila.izquierda }}</td>
                <td class="numerico">{{ fila.centro }}</td>
                <td class="numerico">{{ fila.derecha }}</td>
                <td class="numerico">{{ fila.total }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
})
export class GestionButacasComponente {
  private readonly salas = inject(SalaServicio);

  protected readonly filasAccesibles = FILAS_ACCESIBLES.join(' y ');
  protected readonly filasVip = FILAS_VIP.join(', ');

  protected readonly salasResumen = toSignal(
    this.salas.listar().pipe(
      map((salas) =>
        salas.map((sala) => ({
          id: sala.id,
          nombre: sala.nombre,
          total: sala.butacas.length,
          normal: sala.butacas.filter((b) => b.tipo === 'normal').length,
          accesible: sala.butacas.filter((b) => b.tipo === 'accesible').length,
          vip: sala.butacas.filter((b) => b.tipo === 'vip').length,
        })),
      ),
    ),
    { initialValue: [] },
  );

  protected readonly filas = signal(
    FILAS.map((letra) => {
      const grilla = grillaDeFila(letra);
      return {
        letra,
        tipo: tipoDeFila(letra),
        ...grilla,
        total: grilla.izquierda + grilla.centro + grilla.derecha,
      };
    }),
  );
}
