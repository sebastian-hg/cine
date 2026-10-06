import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, map, switchMap } from 'rxjs';

import { SalaServicio } from '../../../compartido/servicios/sala.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

 
@Component({
  selector: 'app-gestion-salas',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Programación</p>
        <h1>Salas</h1>
      </div>
    </header>

    <p class="nota">
      Las butacas no se cargan a mano: al crear una sala se genera el mapa completo —20 filas de la
      A a la T, con J y K accesibles y R, S y T VIP— dando <strong>532 butacas</strong> por sala.
    </p>

    <form class="bloque alta" [formGroup]="FormularioSala()" (ngSubmit)="crear()">
      <div class="campo">
        <label for="sala-nombre">Nueva sala</label>
        <input id="sala-nombre" type="text" formControlName="nombre" placeholder="Ej. Sala 5" />
      </div>
      <button type="submit" class="boton boton--primario" [disabled]="FormularioSala().invalid">
        Crear sala
      </button>
    </form>

    @if (salasResumen(); as salas) {
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Salas del complejo</caption>
          <thead>
            <tr>
              <th scope="col">Sala</th>
              <th scope="col" class="numerico">Total</th>
              <th scope="col" class="numerico">Normales</th>
              <th scope="col" class="numerico">Accesibles</th>
              <th scope="col" class="numerico">VIP</th>
            </tr>
          </thead>
          <tbody>
            @for (sala of salas; track sala.id) {
              <tr>
                <td>{{ sala.nombre }}</td>
                <td class="numerico">{{ sala.total }}</td>
                <td class="numerico">{{ sala.normal }}</td>
                <td class="numerico">{{ sala.accesible }}</td>
                <td class="numerico">{{ sala.vip }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: `
    .alta {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      flex-wrap: wrap;

      .campo {
        flex: 1;
        min-width: 200px;
        margin-bottom: 0;
      }
    }
  `,
})
export class GestionSalasComponente {
  private readonly salas = inject(SalaServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly fb = inject(FormBuilder);

  private readonly recargar = new BehaviorSubject<void>(undefined);

  protected readonly salasResumen = toSignal(
    this.recargar.pipe(
      switchMap(() => this.salas.listar()),
      map((salas) =>
        salas.map((sala) => ({
          id: sala.id,
          nombre: sala.nombre,
          total: sala.butacas.length,
          normal: sala.butacas.filter((b) => b.tipo === 'normal').length,
          accesible: sala.butacas.filter((b) => b.tipo === 'accesible').length,
          vip: sala.butacas.filter((b) => b.tipo === 'vip').length,
        })),
      ),
    ),
    { initialValue: [] },
  );

  protected readonly FormularioSala = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
    }),
  );

  protected crear(): void {
    if (this.FormularioSala().invalid) return;
    const nombre = this.FormularioSala().controls.nombre.value.trim();

    this.salas.crear(nombre).subscribe((sala) => {
      this.registro
        .registrar('crear', `creó la sala "${nombre}" con ${sala.butacas.length} butacas`)
        .subscribe();
      this.avisos.mostrar(`Sala "${nombre}" creada con ${sala.butacas.length} butacas.`, 'exito');
      this.FormularioSala().reset();
      this.recargar.next();
    });
  }
}
