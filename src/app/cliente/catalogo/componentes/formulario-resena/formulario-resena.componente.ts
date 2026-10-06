import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { inject } from '@angular/core';

import { CalificacionEstrellasComponente } from '../../../../compartido/componentes/calificacion-estrellas/calificacion-estrellas.componente';

export interface ResenaEnviada {
  estrellas: number;
  comentario: string;
}







@Component({
  selector: 'app-formulario-resena',
  imports: [ReactiveFormsModule, CalificacionEstrellasComponente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './formulario-resena.componente.html',
  styleUrl: './formulario-resena.componente.scss',
})
export class FormularioResenaComponente {
  readonly puedeCalificar = input<boolean>(false);
  readonly motivoBloqueo = input<string>('Solo podés calificar películas que ya viste en el cine.');
  readonly valorInicial = input<ResenaEnviada | null>(null);

  readonly resenaEnviada = output<ResenaEnviada>();

  private readonly fb = inject(FormBuilder);

  protected readonly estrellas = signal(0);

  protected readonly FormularioResena = signal(
    this.fb.nonNullable.group({
      comentario: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(280)]],
    }),
  );

  protected get comentarioInvalido(): boolean {
    const control = this.FormularioResena().controls.comentario;
    return control.invalid && control.touched;
  }

  protected elegirEstrellas(valor: number): void {
    this.estrellas.set(valor);
  }

  protected enviar(): void {
    if (this.FormularioResena().invalid || this.estrellas() === 0) {
      this.FormularioResena().markAllAsTouched();
      return;
    }

    this.resenaEnviada.emit({
      estrellas: this.estrellas(),
      comentario: this.FormularioResena().controls.comentario.value.trim(),
    });

    this.FormularioResena().reset();
    this.estrellas.set(0);
  }
}
