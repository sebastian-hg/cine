import { Butaca } from './butaca.interfaz';

export interface Sala {
  id: string;
  numero: number;
  nombre: string;
  /** Generadas por `SalaServicio.generarButacas()`, no cargadas a mano. */
  butacas: Butaca[];
}

/** Parámetros de la grilla de una sala (§5). Configurables desde el panel admin. */
export interface ConfiguracionSala {
  /** Multiplicador aplicado al precio base en las filas VIP. */
  multiplicadorVip: number;
}
