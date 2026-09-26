import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';

import { CreditoServicio } from '../../../../compartido/servicios/credito.servicio';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';

/** Crédito por cancelaciones (§19). */
@Component({
  selector: 'app-mi-credito',
  imports: [AsyncPipe, DatePipe, RouterLink, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="contenedor seccion">
      <header class="seccion-cabecera">
        <div>
          <p class="etiqueta-seccion">Tu cuenta</p>
          <h1>Mi crédito</h1>
        </div>
        <a routerLink="/cuenta/perfil" class="boton boton--fantasma boton--chico">
          ← Volver al perfil
        </a>
      </header>

      <div class="saldo">
        <span class="saldo__valor">{{ (saldo$ | async) ?? 0 | pipeMonedaArs }}</span>
        <p class="saldo__nota">
          El crédito se genera cuando cancelás una compra. Podés usarlo en cualquier compra futura y
          combinarlo con otros medios de pago.
        </p>
      </div>

      @if (movimientos$ | async; as movimientos) {
        @if (movimientos.length) {
          <div class="tabla-scroll">
            <table>
              <caption class="solo-lectores">Movimientos de crédito</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Concepto</th>
                  <th scope="col" class="numerico">Monto</th>
                  <th scope="col" class="numerico">Saldo</th>
                </tr>
              </thead>
              <tbody>
                @for (movimiento of movimientos; track movimiento.id) {
                  <tr>
                    <td>{{ movimiento.fecha | date: 'd MMM y, HH:mm' }}</td>
                    <td>
                      {{
                        movimiento.tipo === 'alta-por-cancelacion'
                          ? 'Cancelación de compra'
                          : 'Usado en una compra'
                      }}
                    </td>
                    <td class="numerico" [class.positivo]="movimiento.monto > 0">
                      {{ movimiento.monto | pipeMonedaArs }}
                    </td>
                    <td class="numerico">{{ movimiento.saldoResultante | pipeMonedaArs }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <p class="vacio">No tenés movimientos de crédito.</p>
        }
      }
    </div>
  `,
  styles: `
    .saldo {
      padding: 22px;
      margin-bottom: 22px;
      border-radius: var(--radio);
      background: var(--superficie);
      border: 1px solid var(--borde);

      &__valor {
        font-family: var(--serif);
        font-size: 42px;
        font-weight: 700;
        line-height: 1;
      }

      &__nota {
        margin: 10px 0 0;
        font-size: 13px;
        color: var(--texto-tenue);
        max-width: 60ch;
      }
    }

    .positivo {
      color: var(--ok);
    }
  `,
})
export class MiCreditoComponente {
  private readonly credito = inject(CreditoServicio);
  private readonly auth = inject(AutenticacionServicio);

  protected readonly saldo$ = this.auth.usuarioActual$.pipe(
    switchMap((usuario) => (usuario ? this.credito.saldo(usuario.id) : of(0))),
  );

  protected readonly movimientos$ = this.auth.usuarioActual$.pipe(
    switchMap((usuario) => (usuario ? this.credito.movimientos(usuario.id) : of([]))),
  );
}
