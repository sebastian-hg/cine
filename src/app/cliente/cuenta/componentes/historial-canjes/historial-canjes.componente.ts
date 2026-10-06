import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { DatePipe } from '@angular/common';

import { Canje } from '../../../../compartido/interfaces/puntos.interfaz';

 
@Component({
  selector: 'app-historial-canjes',
  imports: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (canjes().length) {
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Canjes de puntos realizados</caption>
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Recompensa</th>
              <th scope="col">QR</th>
              <th scope="col" class="numerico">Puntos</th>
            </tr>
          </thead>
          <tbody>
            @for (canje of canjes(); track canje.id) {
              <tr>
                <td>{{ canje.fecha | date: 'd MMM y, HH:mm' }}</td>
                <td>
                  {{ canje.nombreRecompensa }}
                  <div class="tipo">{{ canje.tipoRecompensa === 'entrada' ? 'Entrada' : 'Candy Bar' }}</div>
                </td>
                <td><code>{{ canje.idQr }}</code></td>
                <td class="numerico">−{{ canje.puntosGastados }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <p class="vacio">Todavía no canjeaste puntos.</p>
    }
  `,
})
export class HistorialCanjesComponente {
  readonly canjes = input<Canje[]>([]);
}
