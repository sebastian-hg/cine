import { Component, ChangeDetectionStrategy, computed, input, output } from '@angular/core';

import { ButacaFuncion } from '../../../../compartido/interfaces/butaca.interfaz';
import { ButacaComponente } from '../butaca/butaca.componente';
import { ReferenciaButacasComponente } from '../referencia-butacas/referencia-butacas.componente';

interface FilaMapa {
  letra: string;
  izquierda: ButacaFuncion[];
  centro: ButacaFuncion[];
  derecha: ButacaFuncion[];
}









@Component({
  selector: 'app-mapa-butacas',
  imports: [ButacaComponente, ReferenciaButacasComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mapa-butacas.componente.html',
  styleUrl: './mapa-butacas.componente.scss',
})
export class MapaButacasComponente {
  readonly butacas = input<ButacaFuncion[]>([]);
  readonly seleccionadas = input<string[]>([]);

  readonly butacaAlternada = output<ButacaFuncion>();

   
  protected readonly filas = computed<FilaMapa[]>(() => {
    const porFila = new Map<string, FilaMapa>();

    for (const butaca of this.butacas()) {
      let fila = porFila.get(butaca.fila);
      if (!fila) {
        fila = { letra: butaca.fila, izquierda: [], centro: [], derecha: [] };
        porFila.set(butaca.fila, fila);
      }
      fila[butaca.sector].push(butaca);
    }

    for (const fila of porFila.values()) {
      const porNumero = (a: ButacaFuncion, b: ButacaFuncion) => a.numero - b.numero;
      fila.izquierda.sort(porNumero);
      fila.centro.sort(porNumero);
      fila.derecha.sort(porNumero);
    }

    return [...porFila.values()].sort((a, b) => a.letra.localeCompare(b.letra));
  });

  protected estaElegida(id: string): boolean {
    return this.seleccionadas().includes(id);
  }
}
