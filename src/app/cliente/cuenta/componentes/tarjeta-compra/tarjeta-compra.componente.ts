import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CompraDetallada } from '../../../../compartido/servicios/compra.servicio';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';

/** Una compra del historial, con su acción de cancelar (§19). */
@Component({
  selector: 'app-tarjeta-compra',
  imports: [DatePipe, RouterLink, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tarjeta-compra.componente.html',
  styleUrl: './tarjeta-compra.componente.scss',
})
export class TarjetaCompraComponente {
  readonly compra = input.required<CompraDetallada>();
  readonly cancelar = output<CompraDetallada>();
}
