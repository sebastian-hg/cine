import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs';

import { ConceptoQr, ResultadoValidacion } from '../../../compartido/interfaces/qr.interfaz';
import { QrServicio } from '../../../compartido/servicios/qr.servicio';
import { EscanerQrComponente } from '../escaner-qr/escaner-qr.componente';
import { IngresoManualComponente } from '../ingreso-manual/ingreso-manual.componente';
import { ResultadoValidacionComponente } from '../resultado-validacion/resultado-validacion.componente';








@Component({
  selector: 'app-panel-empleado',
  imports: [RouterLink, EscanerQrComponente, IngresoManualComponente, ResultadoValidacionComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-empleado.componente.html',
  styleUrl: './panel-empleado.componente.scss',
})
export class PanelEmpleadoComponente {
  private readonly qr = inject(QrServicio);

  protected readonly concepto = signal<ConceptoQr>('entrada');
  protected readonly resultado = signal<ResultadoValidacion | null>(null);
  protected readonly procesando = signal(false);

  protected elegirConcepto(concepto: ConceptoQr): void {
    this.concepto.set(concepto);
    this.resultado.set(null);
  }

  protected validar(codigo: string): void {
    if (this.procesando()) return;
    this.procesando.set(true);

    this.qr
      .validar(codigo, this.concepto())
      .pipe(take(1))
      .subscribe({
        next: (resultado) => {
          this.resultado.set(resultado);
          this.procesando.set(false);
        },
        error: () => {
          this.resultado.set({ valido: false, motivo: 'No pudimos validar el código.' });
          this.procesando.set(false);
        },
      });
  }

  protected limpiar(): void {
    this.resultado.set(null);
  }
}
