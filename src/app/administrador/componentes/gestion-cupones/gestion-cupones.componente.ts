import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, switchMap } from 'rxjs';

import { Cupon } from '../../../compartido/interfaces/cupon.interfaz';
import { CuponServicio } from '../../../compartido/servicios/cupon.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';
import { FormularioCuponAdminComponente } from '../formulario-cupon-admin/formulario-cupon-admin.componente';

const ETIQUETA_TIPO: Record<Cupon['tipo'], string> = {
  generico: 'Sin condición',
  'mayores-50': 'Mayores de 50',
  'primera-compra': 'Primera compra',
};

/** CRUD de cupones (§9). */
@Component({
  selector: 'app-gestion-cupones',
  imports: [AsyncPipe, FormularioCuponAdminComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="seccion-cabecera">
      <div>
        <p class="etiqueta-seccion">Promociones</p>
        <h1>Cupones</h1>
      </div>
    </header>

    <section class="bloque">
      <h2>Crear cupón</h2>
      <app-formulario-cupon-admin (cuponGuardado)="crear($event)" />
    </section>

    @if (cupones$ | async; as cupones) {
      <div class="tabla-scroll">
        <table>
          <caption class="solo-lectores">Cupones configurados</caption>
          <thead>
            <tr>
              <th scope="col">Código</th>
              <th scope="col">Condición</th>
              <th scope="col" class="numerico">Descuento</th>
              <th scope="col" class="numerico">Usos/usuario</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (cupon of cupones; track cupon.id) {
              <tr>
                <td><code>{{ cupon.codigo }}</code></td>
                <td>{{ etiqueta(cupon.tipo) }}</td>
                <td class="numerico">{{ cupon.porcentaje }}%</td>
                <td class="numerico">
                  {{ cupon.usosPorUsuario === 0 ? 'Sin límite' : cupon.usosPorUsuario }}
                </td>
                <td>
                  <button
                    type="button"
                    class="boton boton--chico"
                    [class.boton--fantasma]="cupon.activo"
                    (click)="alternar(cupon)"
                  >
                    {{ cupon.activo ? 'Activo' : 'Desactivado' }}
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class GestionCuponesComponente {
  private readonly cupones = inject(CuponServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);

  private readonly recargar = new BehaviorSubject<void>(undefined);
  protected readonly cupones$ = this.recargar.pipe(switchMap(() => this.cupones.listar()));

  protected etiqueta(tipo: Cupon['tipo']): string {
    return ETIQUETA_TIPO[tipo];
  }

  protected crear(datos: Omit<Cupon, 'id'>): void {
    this.cupones.crear(datos).subscribe((cupon) => {
      this.registro
        .registrar('crear', `creó el cupón "${cupon.codigo}" del ${cupon.porcentaje}%`)
        .subscribe();
      this.avisos.mostrar(`Cupón ${cupon.codigo} creado.`, 'exito');
      this.recargar.next();
    });
  }

  protected alternar(cupon: Cupon): void {
    this.cupones.actualizar(cupon.id, { activo: !cupon.activo }).subscribe(() => {
      this.registro
        .registrar('modificar', `${cupon.activo ? 'desactivó' : 'activó'} el cupón "${cupon.codigo}"`)
        .subscribe();
      this.recargar.next();
    });
  }
}
