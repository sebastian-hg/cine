import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { PuntoGrafico } from '../../../compartido/interfaces/reporte.interfaz';
import { ReporteServicio } from '../../servicios/reporte.servicio';

/**
 * Gráficos del panel (§20).
 *
 * Barras dibujadas como SVG en línea. Tres gráficos de barras no justifican
 * sumar Chart.js al bundle, y así heredan los tokens de color del tema sin
 * configuración extra.
 */
@Component({
  selector: 'app-graficos',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './graficos.componente.html',
  styleUrl: './graficos.componente.scss',
})
export class GraficosComponente {
  private readonly reportes = inject(ReporteServicio);

  protected readonly semana = toSignal<PuntoGrafico[], PuntoGrafico[]>(this.reportes.masVistasPorSemana(), {
    initialValue: [],
  });
  protected readonly mes = toSignal<PuntoGrafico[], PuntoGrafico[]>(this.reportes.masVistasPorMes(), {
    initialValue: [],
  });
  protected readonly candy = toSignal<PuntoGrafico[], PuntoGrafico[]>(this.reportes.candyMasVendido(), {
    initialValue: [],
  });

  /** Ancho de la barra en porcentaje, relativo al máximo de la serie. */
  protected proporcion(punto: PuntoGrafico, serie: PuntoGrafico[]): number {
    const maximo = Math.max(...serie.map((p) => p.valor), 1);
    return Math.round((punto.valor / maximo) * 100);
  }
}
