import { Butaca } from '../../compartido/interfaces/butaca.interfaz';
import { ItemCarrito } from '../../compartido/interfaces/carrito.interfaz';
import { Desglose } from '../../compartido/interfaces/compra.interfaz';
import { Configuracion, Cupon } from '../../compartido/interfaces/cupon.interfaz';
import { Usuario } from '../../compartido/interfaces/usuario.interfaz';
import { calcularEdad } from './fechas';

/**
 * Cálculo de dinero (§5, §9, §15, §16, §19 de la consigna).
 *
 * Este módulo es la única fuente de verdad sobre precios: ningún componente
 * suma importes en su plantilla y ningún otro servicio aplica descuentos.
 *
 *   precioEntrada = base según preventa × multiplicador de butaca
 *   subtotal      = entradas + candy + combos
 *   descuento     = el MAYOR aplicable, no la suma (supuesto 1 del plan)
 *   crédito       = min(disponible, subtotal − descuento)
 *   aPagar        = subtotal − descuento − crédito
 *   puntos        = floor(aPagar)
 */

/** Edad a partir de la cual aplica el cupón de mayores (§9). */
export const EDAD_CUPON_MAYORES = 50;

/** Recargo aplicado al precio base según el tipo de butaca (§5). */
export function multiplicadorButaca(
  tipo: Butaca['tipo'],
  configuracion: Pick<Configuracion, 'multiplicadorVip'>,
): number {
  // Las accesibles se cobran al precio normal — supuesto 9 del plan.
  return tipo === 'vip' ? configuracion.multiplicadorVip : 1;
}

/** Precio final de una butaca concreta, ya con preventa y recargo resueltos. */
export function precioButaca(
  precioBase: number,
  tipo: Butaca['tipo'],
  configuracion: Pick<Configuracion, 'multiplicadorVip'>,
): number {
  return Math.round(precioBase * multiplicadorButaca(tipo, configuracion));
}

export interface DescuentoCandidato {
  porcentaje: number;
  motivo: string;
}

/**
 * Descuentos que el usuario podría usar en esta compra.
 *
 * Devuelve todos los candidatos; quien decide es `elegirDescuento`, que se queda
 * con el mayor porque no se acumulan.
 */
export function descuentosAplicables(
  usuario: Usuario | null,
  cupon: Cupon | null,
  configuracion: Configuracion,
  ahora = new Date(),
): DescuentoCandidato[] {
  const candidatos: DescuentoCandidato[] = [];

  if (usuario && usuario.flagPrimeraCompra) {
    candidatos.push({
      porcentaje: configuracion.porcentajePrimeraCompra,
      motivo: `Primera compra (${configuracion.porcentajePrimeraCompra}%)`,
    });
  }

  if (usuario && calcularEdad(usuario.fechaNacimiento, ahora) >= EDAD_CUPON_MAYORES) {
    candidatos.push({
      porcentaje: configuracion.porcentajeMayores50,
      motivo: `Mayores de ${EDAD_CUPON_MAYORES} (${configuracion.porcentajeMayores50}%)`,
    });
  }

  if (cupon?.activo) {
    candidatos.push({
      porcentaje: cupon.porcentaje,
      motivo: `Cupón ${cupon.codigo} (${cupon.porcentaje}%)`,
    });
  }

  return candidatos;
}

/** El mayor de los descuentos aplicables. No se acumulan (supuesto 1). */
export function elegirDescuento(candidatos: DescuentoCandidato[]): DescuentoCandidato | null {
  if (candidatos.length === 0) return null;
  return candidatos.reduce((mejor, actual) =>
    actual.porcentaje > mejor.porcentaje ? actual : mejor,
  );
}

export interface ContextoPrecio {
  items: readonly ItemCarrito[];
  configuracion: Configuracion;
  usuario: Usuario | null;
  cupon: Cupon | null;
  /** Crédito que el usuario eligió aplicar; se recorta al saldo y al total. */
  creditoSolicitado: number;
  creditoDisponible: number;
  ahora?: Date;
}

export function calcularDesglose(contexto: ContextoPrecio): Desglose {
  const { items, configuracion, usuario, cupon, creditoDisponible } = contexto;
  const ahora = contexto.ahora ?? new Date();

  const subtotalEntradas = items
    .filter((item) => item.tipo === 'entrada')
    .reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);

  const subtotalCandy = items
    .filter((item) => item.tipo !== 'entrada')
    .reduce((total, item) => total + item.precioUnitario * item.cantidad, 0);

  const subtotal = subtotalEntradas + subtotalCandy;

  const mejor = elegirDescuento(descuentosAplicables(usuario, cupon, configuracion, ahora));
  const descuento = mejor ? Math.round((subtotal * mejor.porcentaje) / 100) : 0;

  const totalConDescuento = subtotal - descuento;

  // El crédito nunca puede superar ni el saldo del usuario ni lo que queda por pagar.
  const creditoAplicado = Math.max(
    0,
    Math.min(contexto.creditoSolicitado, creditoDisponible, totalConDescuento),
  );

  const aPagar = totalConDescuento - creditoAplicado;

  return {
    subtotalEntradas,
    subtotalCandy,
    subtotal,
    descuento,
    motivoDescuento: mejor?.motivo ?? null,
    creditoAplicado,
    aPagar,
    // §15: solo los usuarios registrados acumulan puntos.
    puntosGanados: usuario ? Math.floor(aPagar) : 0,
  };
}
