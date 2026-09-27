import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { CompraServicio } from '../../../compartido/servicios/compra.servicio';

/**
 * Lector de QR (§12) — MOCKEADO.
 *
 * TODO: contra una cámara real esto sería `BarcodeDetector` o una librería de
 * lectura sobre `getUserMedia`. Acá se simula listando las compras existentes
 * para poder probar el flujo completo sin imprimir un QR.
 */
@Component({
  selector: 'app-escaner-qr',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="escaner">
      <div class="visor" [class.visor--activo]="activo()">
        <div class="visor__marco" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        @if (activo()) {
          <p class="visor__texto">Apuntá al código del cliente…</p>
        } @else {
          <p class="visor__texto">Lector apagado</p>
        }
      </div>

      <button type="button" class="boton boton--bloque" (click)="alternar()">
        @if (activo()) {
          Apagar lector
        } @else {
          Encender lector
        }
      </button>

      @if (activo()) {
        <div class="simulador">
          <p class="simulador__titulo">Simulador de lectura</p>
          <p class="simulador__nota">
            No hay cámara conectada. Elegí una compra de la sesión para simular el escaneo.
          </p>

          @if (comprasLista(); as compras) {
            @if (compras.length) {
              <ul>
                @for (compra of compras; track compra.id) {
                  <li>
                    <button type="button" (click)="codigoLeido.emit(compra.idQr)">
                      <span class="simulador__qr">{{ compra.idQr }}</span>
                      <span class="simulador__estado">{{ compra.estado }}</span>
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="simulador__vacio">
                Todavía no se hizo ninguna compra en esta sesión. Comprá una entrada desde la
                cartelera y volvé acá.
              </p>
            }
          }
        </div>
      }
    </div>
  `,
  styleUrl: './escaner-qr.componente.scss',
})
export class EscanerQrComponente {
  readonly activoInicial = input<boolean>(false);
  readonly codigoLeido = output<string>();

  protected readonly compras = inject(CompraServicio);
  protected readonly activo = signal(false);
  protected readonly comprasLista = toSignal(this.compras.todas(), {
    initialValue: [],
  });

  protected alternar(): void {
    this.activo.update((valor) => !valor);
  }
}
