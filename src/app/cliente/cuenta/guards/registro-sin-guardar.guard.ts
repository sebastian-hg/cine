import { CanDeactivateFn } from '@angular/router';

import { RegistroComponente } from '../componentes/registro/registro.componente';

export const GuardRegistroSinGuardar: CanDeactivateFn<RegistroComponente> = (componente) =>
  componente.puedeAbandonar();