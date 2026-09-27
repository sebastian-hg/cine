import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, switchMap } from 'rxjs';

import { Genero } from '../../../compartido/interfaces/genero.interfaz';
import { GeneroServicio } from '../../../compartido/servicios/genero.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

/** CRUD de géneros (§1). */
@Component({
  selector: 'app-gestion-generos',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Programación</p>
        <h1>Géneros</h1>
      </div>
    </header>

    <form class="bloque alta" [formGroup]="FormularioGenero()" (ngSubmit)="crear()">
      <div class="campo">
        <label for="genero-nombre">Nuevo género</label>
        <input id="genero-nombre" type="text" formControlName="nombre" placeholder="Ej. Musical" />
      </div>
      <button type="submit" class="boton boton--primario" [disabled]="FormularioGenero().invalid">
        Crear
      </button>
    </form>

    @if (generosListado(); as generos) {
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Géneros del catálogo</caption>
          <thead>
            <tr>
              <th scope="col">Nombre</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (genero of generos; track genero.id) {
              <tr>
                <td>{{ genero.nombre }}</td>
                <td>
                  <button
                    type="button"
                    class="boton boton--chico"
                    [class.boton--fantasma]="genero.activo"
                    (click)="alternar(genero)"
                  >
                    {{ genero.activo ? 'Activo' : 'Desactivado' }}
                  </button>
                </td>
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
export class GestionGenerosComponente {
  private readonly generos = inject(GeneroServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly fb = inject(FormBuilder);

  private readonly recargar = new BehaviorSubject<void>(undefined);
  protected readonly generosListado = toSignal<Genero[], Genero[]>(
    this.recargar.pipe(switchMap(() => this.generos.listar())),
    { initialValue: [] },
  );

  protected readonly FormularioGenero = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
    }),
  );

  protected crear(): void {
    if (this.FormularioGenero().invalid) return;
    const nombre = this.FormularioGenero().controls.nombre.value.trim();

    this.generos.crear(nombre).subscribe(() => {
      this.registro.registrar('crear', `creó el género "${nombre}"`).subscribe();
      this.avisos.mostrar(`Género "${nombre}" creado.`, 'exito');
      this.FormularioGenero().reset();
      this.recargar.next();
    });
  }

  protected alternar(genero: Genero): void {
    this.generos.actualizar(genero.id, { activo: !genero.activo }).subscribe(() => {
      this.registro
        .registrar('modificar', `${genero.activo ? 'desactivó' : 'activó'} el género "${genero.nombre}"`)
        .subscribe();
      this.recargar.next();
    });
  }
}
