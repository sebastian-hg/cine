import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { BehaviorSubject, forkJoin, switchMap, take } from 'rxjs';

import { Recompensa } from '../../../compartido/interfaces/puntos.interfaz';
import { FidelizacionServicio } from '../../../compartido/servicios/fidelizacion.servicio';
import { NotificacionServicio } from '../../../nucleo/servicios/notificacion.servicio';
import { RegistroActividadServicio } from '../../../nucleo/servicios/registro-actividad.servicio';

/** Configuración de recompensas (§15). */
@Component({
  selector: 'app-configuracion-puntos',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './configuracion-puntos.componente.html',
})
export class ConfiguracionPuntosComponente {
  private readonly fidelizacion = inject(FidelizacionServicio);
  private readonly registro = inject(RegistroActividadServicio);
  private readonly avisos = inject(NotificacionServicio);
  private readonly fb = inject(FormBuilder);

  private readonly recargar = new BehaviorSubject<void>(undefined);
  private readonly borradoresPuntos = signal<Record<string, string>>({});
  private readonly borradoresActiva = signal<Record<string, boolean>>({});
  protected readonly guardandoCambios = signal(false);
  protected readonly creandoRecompensa = signal(false);

  protected readonly recompensas = toSignal<Recompensa[], Recompensa[]>(
    this.recargar.pipe(switchMap(() => this.fidelizacion.todasLasRecompensas())),
    { initialValue: [] },
  );
  protected readonly formularioNuevaRecompensa = signal(
    this.fb.nonNullable.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tipo: ['entrada' as Recompensa['tipo'], [Validators.required]],
      puntosRequeridos: [1000, [Validators.required, Validators.min(1)]],
    }),
  );

  protected actualizarBorrador(recompensa: Recompensa, evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.borradoresPuntos.update((actual) => ({
      ...actual,
      [recompensa.id]: valor,
    }));
  }

  protected puntosEditados(recompensa: Recompensa): string {
    return this.borradoresPuntos()[recompensa.id] ?? String(recompensa.puntosRequeridos);
  }

  protected estadoEditado(recompensa: Recompensa): boolean {
    return this.borradoresActiva()[recompensa.id] ?? recompensa.activa;
  }

  protected alternarActiva(recompensa: Recompensa): void {
    this.borradoresActiva.update((actual) => ({
      ...actual,
      [recompensa.id]: !this.estadoEditado(recompensa),
    }));
  }

  protected hayCambiosPendientes(): boolean {
    return this.recompensas().some((recompensa) => this.tieneCambiosPendientes(recompensa));
  }

  protected guardarCambios(): void {
    const recompensas = this.recompensas();
    const cambiosPendientes = recompensas
      .map((recompensa) => {
        const cambios: Partial<Omit<Recompensa, 'id'>> = {};
        const puntos = Number(this.puntosEditados(recompensa));
        const activa = this.estadoEditado(recompensa);

        if (Number.isFinite(puntos) && puntos >= 1 && puntos !== recompensa.puntosRequeridos) {
          cambios.puntosRequeridos = puntos;
        }
        if (activa !== recompensa.activa) {
          cambios.activa = activa;
        }

        return Object.keys(cambios).length > 0 ? { recompensa, cambios } : null;
      })
      .filter((item): item is { recompensa: Recompensa; cambios: Partial<Omit<Recompensa, 'id'>> } => !!item);

    if (cambiosPendientes.length === 0) return;

    this.guardandoCambios.set(true);
    forkJoin(
      cambiosPendientes.map(({ recompensa, cambios }) =>
        this.fidelizacion.actualizarRecompensa(recompensa.id, cambios),
      ),
    )
      .pipe(take(1))
      .subscribe(() => {
        this.guardandoCambios.set(false);
        this.borradoresPuntos.set({});
        this.borradoresActiva.set({});
        this.registro
          .registrar('cambio-configuracion', `actualizó ${cambiosPendientes.length} recompensa(s)`)
          .subscribe();
        this.avisos.mostrar('Guardamos los cambios de recompensas.', 'exito');
        this.recargar.next();
      });
  }

  protected crearRecompensa(): void {
    if (this.formularioNuevaRecompensa().invalid) {
      this.formularioNuevaRecompensa().markAllAsTouched();
      return;
    }

    const valores = this.formularioNuevaRecompensa().getRawValue();
    this.creandoRecompensa.set(true);
    this.fidelizacion
      .crearRecompensa({
        nombre: valores.nombre.trim(),
        tipo: valores.tipo,
        puntosRequeridos: valores.puntosRequeridos,
        activa: true,
      })
      .pipe(take(1))
      .subscribe((recompensa) => {
        this.creandoRecompensa.set(false);
        this.formularioNuevaRecompensa().reset({
          nombre: '',
          tipo: 'entrada',
          puntosRequeridos: 1000,
        });
        this.registro
          .registrar('crear', `creó la recompensa «${recompensa.nombre}»`)
          .subscribe();
        this.avisos.mostrar(`Recompensa «${recompensa.nombre}» creada.`, 'exito');
        this.recargar.next();
      });
  }

  private tieneCambiosPendientes(recompensa: Recompensa): boolean {
    const borrador = this.borradoresPuntos()[recompensa.id];
    const cambioEstado = this.estadoEditado(recompensa) !== recompensa.activa;
    if (borrador === undefined) return cambioEstado;

    const valor = Number(borrador);
    return (Number.isFinite(valor) && valor >= 1 && valor !== recompensa.puntosRequeridos) || cambioEstado;
  }
}
