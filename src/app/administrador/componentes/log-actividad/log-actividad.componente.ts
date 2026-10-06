import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

import { AccionRegistrada } from '../../../compartido/interfaces/registro-actividad.interfaz';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

const ETIQUETA_ACCION: Record<AccionRegistrada, string> = {
  crear: 'Creación',
  modificar: 'Modificación',
  eliminar: 'Eliminación',
  'cambiar-precio': 'Cambio de precio',
  'crear-funcion': 'Alta de función',
  'modificar-funcion': 'Cambio de función',
  'validar-qr': 'Validación de QR',
  'validar-candy': 'Validación de Candy Bar',
  'cambio-configuracion': 'Cambio de configuración',
};

 
@Component({
  selector: 'app-log-actividad',
  imports: [DatePipe, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-actividad.componente.html',
  styleUrl: './log-actividad.componente.scss',
})
export class LogActividadComponente {
  private readonly registro = inject(RegistroActividadServicio);
  private readonly fb = inject(FormBuilder);

  protected readonly acciones = Object.entries(ETIQUETA_ACCION) as [AccionRegistrada, string][];

  protected readonly FormularioFiltro = signal(
    this.fb.nonNullable.group({
      texto: [''],
      accion: [''],
      desde: [''],
      hasta: [''],
    }),
  );

  protected readonly registros = toSignal(
    this.FormularioFiltro().valueChanges.pipe(
      startWith(this.FormularioFiltro().getRawValue()),
      switchMap((filtros) =>
        this.registro.filtrar({
          texto: filtros.texto || undefined,
          accion: (filtros.accion as AccionRegistrada) || null,
          desde: filtros.desde || null,
          hasta: filtros.hasta || null,
        }),
      ),
    ),
    { initialValue: [] },
  );

  protected etiqueta(accion: AccionRegistrada): string {
    return ETIQUETA_ACCION[accion];
  }

  protected limpiar(): void {
    this.FormularioFiltro().reset({ texto: '', accion: '', desde: '', hasta: '' });
  }
}
