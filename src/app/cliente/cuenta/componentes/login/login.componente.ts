import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AutenticacionServicio } from '../../../../nucleo/servicios/autenticacion.servicio';
import { NotificacionServicio } from '../../../../nucleo/servicios/notificacion.servicio';

interface CuentaDemo {
  email: string;
  rol: string;
}

type FormularioLogin = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

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
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.componente.html',
  styleUrl: './login.componente.scss',
})
export class LoginComponente {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AutenticacionServicio);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly avisos = inject(NotificacionServicio);

  protected readonly cuentasDemo = signal<readonly CuentaDemo[]>(CUENTAS_DEMO);
  protected readonly error = signal<string | null>(null);
  protected readonly enviando = signal<boolean>(false);

  protected readonly formularioLogin = signal<FormularioLogin>(
    this.fb.nonNullable.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    }),
  );

  protected invalido(campo: 'email' | 'password'): boolean {
    const control = this.formularioLogin().controls[campo];
    return control.invalid && control.touched;
  }

  protected usarCuenta(email: string): void {
    this.formularioLogin().patchValue({ email, password: 'cine1234' });
  }

  protected enviar(): void {
    if (this.formularioLogin().invalid) {
      this.formularioLogin().markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.error.set(null);

    this.auth.ingresar(this.formularioLogin().getRawValue()).subscribe({
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
