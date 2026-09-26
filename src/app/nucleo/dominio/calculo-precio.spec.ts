import { ItemCarrito } from '../../compartido/interfaces/carrito.interfaz';
import { Configuracion, Cupon } from '../../compartido/interfaces/cupon.interfaz';
import { Usuario } from '../../compartido/interfaces/usuario.interfaz';
import { calcularDesglose, elegirDescuento, precioButaca } from './calculo-precio';

/**
 * Verificación de la Fase 6 del plan.
 *
 * Se comprueba el desglose línea por línea, no solo el total: un total correcto
 * puede esconder un descuento mal aplicado compensado por un crédito mal
 * recortado.
 */

const AHORA = new Date('2026-09-20T12:00:00');

const CONFIG: Configuracion = {
  porcentajePrimeraCompra: 20,
  porcentajeMayores50: 15,
  multiplicadorVip: 1.6,
  puntosPorEntrada: 9000,
  puntosPorProductoCandy: 3500,
  diasAnticipacionPreventa: 7,
};

function usuario(parcial: Partial<Usuario> = {}): Usuario {
  return {
    id: 'u1',
    email: 'test@cine.test',
    nombre: 'Lucía',
    apellido: 'Ferrari',
    fechaNacimiento: '1995-03-12',
    tipoSangre: '0+',
    colorOjos: 'Marrón',
    diasVacaciones: 21,
    rol: 'cliente',
    primeraCompraUsada: true,
    ...parcial,
  };
}

function entrada(precio: number, esVip = false): ItemCarrito {
  return {
    tipo: 'entrada',
    idFuncion: 'f1',
    idButaca: `b-${precio}-${esVip}`,
    etiquetaButaca: 'F12',
    esVip,
    precioUnitario: precio,
    cantidad: 1,
  };
}

function producto(precio: number, cantidad: number): ItemCarrito {
  return { tipo: 'producto', idProducto: 'pr1', nombre: 'Pochoclo', precioUnitario: precio, cantidad };
}

function base(parcial: Partial<Parameters<typeof calcularDesglose>[0]> = {}) {
  return calcularDesglose({
    items: [],
    configuracion: CONFIG,
    usuario: null,
    cupon: null,
    creditoSolicitado: 0,
    creditoDisponible: 0,
    ahora: AHORA,
    ...parcial,
  });
}

describe('precioButaca', () => {
  it('cobra la butaca normal al precio base', () => {
    expect(precioButaca(10000, 'normal', CONFIG)).toBe(10000);
  });

  it('cobra la butaca accesible al precio base, sin recargo (supuesto 9)', () => {
    expect(precioButaca(10000, 'accesible', CONFIG)).toBe(10000);
  });

  it('aplica el multiplicador VIP', () => {
    expect(precioButaca(10000, 'vip', CONFIG)).toBe(16000);
  });

  it('redondea el precio VIP a peso entero', () => {
    expect(precioButaca(9500, 'vip', CONFIG)).toBe(15200);
  });
});

describe('elegirDescuento', () => {
  it('devuelve null cuando no hay candidatos', () => {
    expect(elegirDescuento([])).toBeNull();
  });

  it('se queda con el mayor: los descuentos no se acumulan (supuesto 1)', () => {
    const elegido = elegirDescuento([
      { porcentaje: 20, motivo: 'Primera compra' },
      { porcentaje: 30, motivo: 'Cupón' },
      { porcentaje: 15, motivo: 'Mayores' },
    ]);
    expect(elegido?.porcentaje).toBe(30);
  });
});

describe('calcularDesglose', () => {
  it('separa el subtotal de entradas del de candy', () => {
    const d = base({ items: [entrada(10000), producto(3800, 2)] });
    expect(d.subtotalEntradas).toBe(10000);
    expect(d.subtotalCandy).toBe(7600);
    expect(d.subtotal).toBe(17600);
  });

  it('sin usuario no aplica descuento ni otorga puntos', () => {
    const d = base({ items: [entrada(10000)] });
    expect(d.descuento).toBe(0);
    expect(d.motivoDescuento).toBeNull();
    expect(d.aPagar).toBe(10000);
    // §15: solo los usuarios registrados acumulan puntos.
    expect(d.puntosGanados).toBe(0);
  });

  it('aplica el 20% de primera compra a un usuario nuevo', () => {
    const d = base({ items: [entrada(10000)], usuario: usuario({ primeraCompraUsada: false }) });
    expect(d.descuento).toBe(2000);
    expect(d.motivoDescuento).toContain('Primera compra');
    expect(d.aPagar).toBe(8000);
    expect(d.puntosGanados).toBe(8000);
  });

  it('aplica el descuento de mayores de 50 según la fecha de nacimiento', () => {
    const d = base({
      items: [entrada(10000)],
      usuario: usuario({ fechaNacimiento: '1968-02-19' }),
    });
    expect(d.descuento).toBe(1500);
    expect(d.motivoDescuento).toContain('Mayores de 50');
  });

  it('no aplica el de mayores a quien todavía no cumplió 50', () => {
    // Cumple 50 el 2026-09-21, un día después del cálculo.
    const d = base({
      items: [entrada(10000)],
      usuario: usuario({ fechaNacimiento: '1976-09-21' }),
    });
    expect(d.descuento).toBe(0);
  });

  it('elige el cupón cuando supera a los descuentos automáticos', () => {
    const cupon: Cupon = {
      id: 'cu3',
      codigo: 'MARTES2X1',
      tipo: 'generico',
      porcentaje: 30,
      activo: true,
      descripcion: '',
      usosPorUsuario: 1,
    };
    const d = base({
      items: [entrada(10000)],
      usuario: usuario({ primeraCompraUsada: false }),
      cupon,
    });
    // 30% del cupón gana al 20% de primera compra, y no se suman.
    expect(d.descuento).toBe(3000);
    expect(d.motivoDescuento).toContain('MARTES2X1');
  });

  it('ignora un cupón desactivado', () => {
    const cupon: Cupon = {
      id: 'cu4',
      codigo: 'VERANO',
      tipo: 'generico',
      porcentaje: 50,
      activo: false,
      descripcion: '',
      usosPorUsuario: 0,
    };
    const d = base({ items: [entrada(10000)], usuario: usuario(), cupon });
    expect(d.descuento).toBe(0);
  });

  it('recorta el crédito al saldo disponible', () => {
    const d = base({
      items: [entrada(10000)],
      usuario: usuario(),
      creditoSolicitado: 8000,
      creditoDisponible: 3000,
    });
    expect(d.creditoAplicado).toBe(3000);
    expect(d.aPagar).toBe(7000);
  });

  it('recorta el crédito al total, para que nunca quede un importe negativo', () => {
    const d = base({
      items: [entrada(5000)],
      usuario: usuario(),
      creditoSolicitado: 20000,
      creditoDisponible: 20000,
    });
    expect(d.creditoAplicado).toBe(5000);
    expect(d.aPagar).toBe(0);
    expect(d.puntosGanados).toBe(0);
  });

  it('aplica el crédito después del descuento, no antes', () => {
    const d = base({
      items: [entrada(10000)],
      usuario: usuario({ primeraCompraUsada: false }),
      creditoSolicitado: 5000,
      creditoDisponible: 5000,
    });
    expect(d.descuento).toBe(2000);
    expect(d.creditoAplicado).toBe(5000);
    expect(d.aPagar).toBe(3000);
  });

  it('calcula el caso completo del plan: 2 VIP + 1 normal + combo, cupón y crédito', () => {
    const d = base({
      items: [
        entrada(precioButaca(10000, 'vip', CONFIG), true),
        entrada(precioButaca(10000, 'vip', CONFIG), true),
        entrada(precioButaca(10000, 'normal', CONFIG)),
        { tipo: 'combo', idCombo: 'cb1', nombre: 'Combo Clásico', precioUnitario: 9900, cantidad: 1 },
      ],
      usuario: usuario({ primeraCompraUsada: false }),
      creditoSolicitado: 4000,
      creditoDisponible: 4000,
    });

    expect(d.subtotalEntradas).toBe(16000 + 16000 + 10000);
    expect(d.subtotalCandy).toBe(9900);
    expect(d.subtotal).toBe(51900);
    expect(d.descuento).toBe(10380); // 20%
    expect(d.creditoAplicado).toBe(4000);
    expect(d.aPagar).toBe(37520);
    expect(d.puntosGanados).toBe(37520);
  });

  it('da puntos por el monto pagado, no por el subtotal (supuesto 2)', () => {
    const d = base({
      items: [entrada(10000)],
      usuario: usuario({ primeraCompraUsada: false }),
    });
    expect(d.subtotal).toBe(10000);
    expect(d.puntosGanados).toBe(8000);
  });

  it('con el carrito vacío devuelve todo en cero', () => {
    const d = base({ usuario: usuario() });
    expect(d.subtotal).toBe(0);
    expect(d.aPagar).toBe(0);
    expect(d.puntosGanados).toBe(0);
  });
});
