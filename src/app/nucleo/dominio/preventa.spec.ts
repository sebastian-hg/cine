import { Pelicula } from '../../compartido/interfaces/pelicula.interfaz';
import { estadoPreventa, precioBasePelicula } from './preventa';

/** Verificación de la Fase 2 del plan. §16 de la consigna. */

const AHORA = new Date('2026-09-20T12:00:00');
const DIAS_ANTICIPACION = 7;

function pelicula(fechaEstreno: string, preventaActivada = true): Pelicula {
  return {
    id: 'p6',
    nombre: 'Órbita Cero',
    poster: '',
    sinopsis: '',
    duracionMinutos: 151,
    generos: [],
    clasificacion: '+13',
    fechaEstreno,
    disponible: true,
    preventaActivada,
    precioPreventa: 8200,
    precioNormal: 11000,
    ventasPrevias: 0,
  };
}

describe('estadoPreventa', () => {
  it('activa la preventa 5 días antes del estreno', () => {
    const e = estadoPreventa(pelicula('2026-09-25'), DIAS_ANTICIPACION, AHORA);
    expect(e.activa).toBe(true);
    expect(e.proximamente).toBe(true);
    expect(e.diasParaEstreno).toBe(5);
  });

  it('activa la preventa justo en el día 7', () => {
    expect(estadoPreventa(pelicula('2026-09-27'), DIAS_ANTICIPACION, AHORA).activa).toBe(true);
  });

  it('no activa la preventa a 8 días, todavía fuera de la ventana', () => {
    const e = estadoPreventa(pelicula('2026-09-28'), DIAS_ANTICIPACION, AHORA);
    expect(e.activa).toBe(false);
    expect(e.proximamente).toBe(true);
  });

  it('no activa la preventa si está desactivada para esa película', () => {
    expect(estadoPreventa(pelicula('2026-09-25', false), DIAS_ANTICIPACION, AHORA).activa).toBe(
      false,
    );
  });

  it('desactiva la preventa el día del estreno', () => {
    const e = estadoPreventa(pelicula('2026-09-20'), DIAS_ANTICIPACION, AHORA);
    expect(e.activa).toBe(false);
    expect(e.proximamente).toBe(false);
  });

  it('marca como estrenada una película del pasado', () => {
    const e = estadoPreventa(pelicula('2026-08-14'), DIAS_ANTICIPACION, AHORA);
    expect(e.proximamente).toBe(false);
    expect(e.diasParaEstreno).toBeLessThan(0);
  });
});

describe('precioBasePelicula', () => {
  it('cobra el precio de preventa dentro de la ventana', () => {
    expect(precioBasePelicula(pelicula('2026-09-25'), 16000, DIAS_ANTICIPACION, AHORA)).toBe(8200);
  });

  it('cobra el precio de la función una vez estrenada', () => {
    expect(precioBasePelicula(pelicula('2026-08-14'), 16000, DIAS_ANTICIPACION, AHORA)).toBe(16000);
  });

  it('vuelve solo al precio normal al pasar la fecha, sin proceso que lo cambie', () => {
    const peli = pelicula('2026-09-21');
    const vispera = new Date('2026-09-20T23:00:00');
    const estreno = new Date('2026-09-21T10:00:00');
    expect(precioBasePelicula(peli, 16000, DIAS_ANTICIPACION, vispera)).toBe(8200);
    expect(precioBasePelicula(peli, 16000, DIAS_ANTICIPACION, estreno)).toBe(16000);
  });
});
