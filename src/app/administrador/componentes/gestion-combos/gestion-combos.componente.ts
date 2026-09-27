import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, switchMap } from 'rxjs';

import { Combo } from '../../../compartido/interfaces/combo.interfaz';
import { Producto } from '../../../compartido/interfaces/producto.interfaz';
import { CandyServicio } from '../../../compartido/servicios/candy.servicio';
import { ComboServicio } from '../../../compartido/servicios/combo.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';
import { PipeMonedaArs } from '../../../compartido/pipes/moneda-ars.pipe';
import { FormularioComboComponente } from '../formulario-combo/formulario-combo.componente';

/** CRUD de combos (§11). */
@Component({
  selector: 'app-gestion-combos',
  imports: [FormularioComboComponente, PipeMonedaArs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Candy Bar</p>
        <h1>Combos</h1>
      </div>
    </header>

    <div class="cuerpo">
      <section class="bloque">
        <h2>Nuevo combo</h2>
        <app-formulario-combo
          [productos]="productos() ?? []"
          (comboGuardado)="crear($event)"
        />
      </section>

      <section class="bloque">
        <h2>Combos configurados</h2>
        @if (combosListado(); as combos) {
          <div class="tabla-scroll">
            <table>
              <caption class="solo-lectores">Combos del Candy Bar</caption>
              <thead>
                <tr>
                  <th scope="col">Combo</th>
                  <th scope="col" class="numerico">Productos</th>
                  <th scope="col">Entrada</th>
                  <th scope="col" class="numerico">Precio</th>
                  <th scope="col">Destacado</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (combo of combos; track combo.id) {
                  <tr>
                    <td>{{ combo.nombre }}</td>
                    <td class="numerico">{{ combo.productos.length }}</td>
                    <td>{{ combo.incluyeEntrada ? 'Sí' : 'No' }}</td>
                    <td class="numerico">{{ combo.precioFijo | pipeMonedaArs }}</td>
                    <td>
                      <button
                        type="button"
                        class="boton boton--chico boton--fantasma"
                        (click)="alternarDestacado(combo)"
                      >
                        {{ combo.destacado ? '★ Sí' : '☆ No' }}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        class="boton boton--chico"
                        [class.boton--fantasma]="combo.activo"
                        (click)="alternarActivo(combo)"
                      >
                        {{ combo.activo ? 'Activo' : 'Desactivado' }}
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: `
    .cuerpo {
      display: grid;
      grid-template-columns: 380px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    @media (max-width: 1100px) {
      .cuerpo {
        grid-template-columns: 1fr;
      }
    }
  `,
})
export class GestionCombosComponente {
  private readonly combos = inject(ComboServicio);
  private readonly candy = inject(CandyServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly combosListado = toSignal<Combo[], Combo[]>(
    this.recargar.pipe(switchMap(() => this.combos.todos())),
    { initialValue: [] },
  );
  protected readonly productos = toSignal<Producto[], Producto[]>(this.candy.productos(), {
    initialValue: [],
  });

  protected crear(datos: Omit<Combo, 'id'>): void {
    this.combos.crear(datos).subscribe((combo) => {
      this.registro.registrar('crear', `creó el combo "${combo.nombre}"`).subscribe();
      this.avisos.mostrar(`Combo "${combo.nombre}" creado.`, 'exito');
      this.recargar.next();
    });
  }

  protected alternarActivo(combo: Combo): void {
    this.combos.actualizar(combo.id, { activo: !combo.activo }).subscribe(() => {
      this.registro
        .registrar('modificar', `${combo.activo ? 'desactivó' : 'activó'} el combo "${combo.nombre}"`)
        .subscribe();
      this.recargar.next();
    });
  }

  protected alternarDestacado(combo: Combo): void {
    this.combos.actualizar(combo.id, { destacado: !combo.destacado }).subscribe(() => {
      this.recargar.next();
    });
  }
}
