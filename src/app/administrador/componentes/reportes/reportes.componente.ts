import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { combineLatest, take } from 'rxjs';

import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';
import { ReporteServicio } from '../../servicios/reporte.servicio';

/** Reportes de facturación con exportación a PDF y Excel (§20). */
@Component({
  selector: 'app-reportes',
  imports: [AsyncPipe, DatePipe, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes.componente.html',
  styleUrl: './reportes.componente.scss',
})
export class ReportesComponente {
  private readonly reportes = inject(ReporteServicio);
  private readonly avisos = inject(NotificacionServicio);

  protected readonly diarios$ = this.reportes.diarios();
  protected readonly totales$ = this.reportes.totales();

  protected exportarPdf(): void {
    this.diarios$.pipe(take(1)).subscribe((reportes) => {
      this.reportes.exportarPdf(reportes);
      this.avisos.mostrar('Descargamos el reporte en PDF.', 'exito');
    });
  }

  protected exportarExcel(): void {
    combineLatest([this.diarios$, this.reportes.candyMasVendido()])
      .pipe(take(1))
      .subscribe(([reportes, candy]) => {
        this.reportes.exportarExcel(reportes, candy);
        this.avisos.mostrar('Descargamos el reporte para Excel.', 'exito');
      });
  }

  /** `2026-09-20` → `Date`, para el pipe de fecha. */
  protected aFecha(dia: string): Date {
    return new Date(`${dia}T00:00:00`);
  }
}
