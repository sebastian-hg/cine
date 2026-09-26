import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pie',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pie.componente.html',
  styleUrl: './pie.componente.scss',
})
export class PieComponente {
  protected readonly anio = new Date().getFullYear();
}
