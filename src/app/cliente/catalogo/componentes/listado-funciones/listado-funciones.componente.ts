import { Component, ChangeDetectionStrategy, computed, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { FuncionDetallada } from '../../../../compartido/servicios/funcion.servicio';
import { PipeMonedaArs } from '../../../../compartido/pipes/moneda-ars.pipe';
import { SelectorFechaComponente } from '../../../../compartido/componentes/selector-fecha/selector-fecha.componente';








@Component({
  selector: 'app-listado-funciones',
  imports: [DatePipe, PipeMonedaArs, SelectorFechaComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './listado-funciones.componente.html',
  styleUrl: './listado-funciones.componente.scss',
})
export class ListadoFuncionesComponente {
  readonly funciones = input<FuncionDetallada[]>([]);

  readonly funcionElegida = output<FuncionDetallada>();

  private readonly diaElegido = signal<string | null>(null);

   
  protected readonly dias = computed(() => {
    const unicos = new Set(
      this.funciones()
        .map((funcion) => this.claveDia(funcion.inicio))
        .filter((dia): dia is string => dia !== null),
    );
    return [...unicos].sort();
  });

  protected readonly diaActivo = computed(() => this.diaElegido() ?? this.dias()[0] ?? null);

  protected readonly funcionesDelDia = computed(() => {
    const dia = this.diaActivo();
    if (!dia) return [];
    return this.funciones().filter((funcion) => this.claveDia(funcion.inicio) === dia);
  });

  protected elegirDia(dia: string): void {
    this.diaElegido.set(dia);
  }

  private claveDia(inicio: string): string | null {
    const marca = Date.parse(inicio);
    if (Number.isNaN(marca)) return null;
    return new Date(marca).toISOString().slice(0, 10);
  }
}
