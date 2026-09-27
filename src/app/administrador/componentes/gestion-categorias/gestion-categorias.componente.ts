import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, switchMap } from 'rxjs';

import { CandyServicio } from '../../../compartido/servicios/candy.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

/** CRUD de categorías del Candy Bar (§10). */
@Component({
  selector: 'app-gestion-categorias',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Candy Bar</p>
        <h1>Categorías</h1>
      </div>
    </header>

    <form class="bloque alta" [formGroup]="FormularioCategoria()" (ngSubmit)="crear()">
      <div class="campo">
        <label for="categoria-nombre">Nueva categoría</label>
        <input id="categoria-nombre" type="text" formControlName="nombre" placeholder="Ej. Helados" />
      </div>
      <button type="submit" class="boton boton--primario" [disabled]="FormularioCategoria().invalid">
        Crear
      </button>
    </form>

    @if (categorias(); as categorias) {
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Categorías del Candy Bar</caption>
          <thead>
            <tr><th scope="col">Nombre</th><th scope="col">Estado</th></tr>
          </thead>
          <tbody>
            @for (categoria of categorias; track categoria.id) {
              <tr>
                <td>{{ categoria.nombre }}</td>
                <td><span class="insignia insignia--ok">Activa</span></td>
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
export class GestionCategoriasComponente {
  private readonly candy = inject(CandyServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly fb = inject(FormBuilder);

  private readonly recargar = new BehaviorSubject<void>(undefined);
  protected readonly categorias = toSignal(
    this.recargar.pipe(switchMap(() => this.candy.categorias())),
    { initialValue: [] },
  );

  protected readonly FormularioCategoria = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
    }),
  );

  protected crear(): void {
    if (this.FormularioCategoria().invalid) return;
    const nombre = this.FormularioCategoria().controls.nombre.value.trim();

    this.candy.crearCategoria(nombre).subscribe(() => {
      this.registro.registrar('crear', `creó la categoría "${nombre}"`).subscribe();
      this.avisos.mostrar(`Categoría "${nombre}" creada.`, 'exito');
      this.FormularioCategoria().reset();
      this.recargar.next();
    });
  }
}
