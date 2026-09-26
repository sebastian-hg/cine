import { Service } from '@angular/core';
import { BehaviorSubject, Observable, distinctUntilChanged, map } from 'rxjs';

/**
 * Estado global de carga (§22: «estados de carga»).
 *
 * Cuenta peticiones en vuelo en vez de guardar un booleano, para que dos
 * peticiones simultáneas no se pisen: la primera en terminar apagaría el
 * indicador mientras la segunda sigue corriendo.
 */
@Service()
export class CargaServicio {
  private readonly enVuelo = new BehaviorSubject<number>(0);

  readonly cargando$: Observable<boolean> = this.enVuelo.pipe(
    map((cantidad) => cantidad > 0),
    distinctUntilChanged(),
  );

  comenzar(): void {
    this.enVuelo.next(this.enVuelo.value + 1);
  }

  terminar(): void {
    this.enVuelo.next(Math.max(0, this.enVuelo.value - 1));
  }
}
