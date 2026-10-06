import { Component, ChangeDetectionStrategy, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { CodigoQr } from '../../../compartido/interfaces/qr.interfaz';
import { QrServicio } from '../../../compartido/servicios/qr.servicio';








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
            No hay cámara conectada. Elegí un QR de la sesión para simular el escaneo.
          </p>

          @if (codigosLista(); as codigos) {
            @if (codigos.length) {
              <ul>
                @for (codigo of codigos; track codigo.id) {
                  <li>
                    <button type="button" (click)="codigoLeido.emit(codigo.id)">
                      <span class="simulador__qr">{{ codigo.id }}</span>
                      <span class="simulador__estado">{{ describir(codigo) }}</span>
                    </button>
                  </li>
                }
              </ul>
            } @else {
              <p class="simulador__vacio">
                Todavía no hay QR disponibles en esta sesión. Hacé una compra o un canje y volvé acá.
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

  protected readonly qr = inject(QrServicio);
  protected readonly activo = signal(false);
  protected readonly codigosLista = toSignal(this.qr.listar(), {
    initialValue: [],
  });

  protected alternar(): void {
    this.activo.update((valor) => !valor);
  }

  protected describir(codigo: CodigoQr): string {
    const conceptos = Object.keys(codigo.permisos);
    const etiqueta = conceptos.includes('entrada')
      ? conceptos.includes('candy')
        ? 'Entrada + Candy'
        : 'Entrada'
      : 'Candy Bar';
    const usado = Object.values(codigo.permisos).every((permiso) => permiso?.usado);
    return usado ? `${etiqueta} · usado` : etiqueta;
  }
}
