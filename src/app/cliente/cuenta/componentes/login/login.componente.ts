import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { Credenciales } from '../../../../compartido/interfaces/usuario.interfaz';
import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';
import { FormularioLoginComponente, CuentaDemo } from './formulario-login.componente';

/** Cuentas de prueba, para no tener que adivinarlas al revisar la demo. */
const CUENTAS_DEMO: readonly CuentaDemo[] = [
  { email: 'cliente@cine.test', rol: 'Cliente sin compras (20% de bienvenida)' },
  { email: 'mayor@cine.test', rol: 'Cliente mayor de 50' },
  { email: 'adolescente@cine.test', rol: 'Cliente de 15 años' },
  { email: 'empleado@cine.test', rol: 'Empleado (valida QR)' },
  { email: 'admin@cine.test', rol: 'Administrador' },
];

/** Inicio de sesión (§8). Vuelve a `returnUrl` si el guard lo dejó ahí. */
@Component({
  selector: 'app-login',
  imports: [FormularioLoginComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.componente.html',
})
export class LoginComponente {
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly avisos = inject(NotificacionServicio);

  protected readonly cuentasDemo = CUENTAS_DEMO;
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal<boolean>(false);

  protected enviar(credenciales: Credenciales): void {
    this.enviando.set(true);
    this.error.set(null);

    this.auth.ingresar(credenciales).subscribe({
      next: (usuario) => {
        this.enviando.set(false);
        this.avisos.mostrar(`Hola, ${usuario.nombre}.`, 'exito');
        const destino = this.ruta.snapshot.queryParamMap.get('returnUrl') ?? this.inicioSegun(usuario.rol);
        void this.router.navigateByUrl(destino);
      },
      error: (error: Error) => {
        this.enviando.set(false);
        this.error.set(error.message);
      },
    });
  }

  /** Cada rol aterriza donde le sirve (§22: interfaces diferenciadas). */
  private inicioSegun(rol: string): string {
    if (rol === 'administrador') return '/administrador';
    if (rol === 'empleado') return '/empleado';
    return '/';
  }
}
