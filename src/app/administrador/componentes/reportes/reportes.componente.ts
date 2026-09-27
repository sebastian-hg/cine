import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, take } from 'rxjs';

import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';
import { ReporteServicio } from '../../servicios/reporte.servicio';

/** Reportes de facturación con exportación a PDF y Excel (§20). */
@Component({
  selector: 'app-reportes',
  imports: [DatePipe, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reportes.componente.html',
  styleUrl: './reportes.componente.scss',
})
export class ReportesComponente {
  private readonly reportes = inject(ReporteServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly diarios$ = this.reportes.diarios();
  private readonly candy$ = this.reportes.candyMasVendido();

  protected readonly diarios = toSignal(this.diarios$, {
    initialValue: [],
  });
  protected readonly ventasPorUsuario = toSignal(this.reportes.ventasPorUsuario(), {
    initialValue: [],
  });
  protected readonly resumenHistorico = toSignal(this.reportes.resumenHistorico(), {
    initialValue: { facturacion: 0 },
  });
  protected readonly resumenUltimaSemana = toSignal(this.reportes.resumenUltimaSemana(), {
    initialValue: { facturacion: 0 },
  });
  protected readonly resumenTickets = toSignal(this.reportes.totales(), {
    initialValue: { facturacion: 0, entradas: 0, productos: 0 },
  });

  protected exportarPdf(): void {
    this.reportes.diarios(7).pipe(take(1)).subscribe((reportes) => {
      this.reportes.exportarPdf(reportes, 'Última semana');
      this.avisos.mostrar('Descargamos el reporte en PDF.', 'exito');
    });
  }

  protected exportarExcel(): void {
    combineLatest([this.diarios$, this.candy$])
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
