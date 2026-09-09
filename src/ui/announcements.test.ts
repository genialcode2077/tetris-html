import { describe, expect, it } from 'vitest';
import { Announcer, QUIET_MS } from './announcements';

describe('política de anuncios', () => {
  it('el primer aviso sale en el acto', () => {
    const a = new Announcer();
    expect(a.push({ text: 'doble, 300 puntos', priority: 'normal' }, 1000)).toBe(
      'doble, 300 puntos',
    );
  });

  it('el fin de la partida se anuncia aunque acabe de sonar otra cosa', () => {
    const a = new Announcer();
    a.push({ text: 'tetris, 800 puntos', priority: 'normal' }, 1000);
    // En Sprint el fin llega en el mismo paso que la limpieza que lo provoca:
    // con un límite por tiempo a secas se perdía siempre.
    expect(a.push({ text: 'partida terminada', priority: 'high' }, 1000)).toBe('partida terminada');
  });

  it('dos jugadas seguidas no se pierden: la segunda sale al pasar el silencio', () => {
    const a = new Announcer();
    expect(a.push({ text: 'simple, 100 puntos', priority: 'normal' }, 1000)).toBe(
      'simple, 100 puntos',
    );
    // Llega otra enseguida: se calla, pero se guarda.
    expect(a.push({ text: 'doble, 300 puntos', priority: 'normal' }, 1200)).toBeNull();
    expect(a.flush(1300)).toBeNull();
    expect(a.flush(1000 + QUIET_MS)).toBe('doble, 300 puntos');
    // Y ya no queda nada pendiente.
    expect(a.flush(5000)).toBeNull();
  });

  it('de varias jugadas en el silencio se oye la última, que es la que vale', () => {
    const a = new Announcer();
    a.push({ text: 'primera', priority: 'normal' }, 1000);
    a.push({ text: 'segunda', priority: 'normal' }, 1100);
    a.push({ text: 'tercera', priority: 'normal' }, 1200);
    expect(a.flush(1000 + QUIET_MS)).toBe('tercera');
  });

  it('un aviso importante descarta lo que estuviera esperando', () => {
    const a = new Announcer();
    a.push({ text: 'simple, 100 puntos', priority: 'normal' }, 1000);
    a.push({ text: 'doble, 300 puntos', priority: 'normal' }, 1100);
    expect(a.push({ text: 'fin de la partida', priority: 'high' }, 1200)).toBe('fin de la partida');
    // Lo que esperaba ya no tiene sentido: la partida ha terminado.
    expect(a.flush(9000)).toBeNull();
  });

  it('dos avisos iguales seguidos se distinguen sin cambiar lo que se lee', () => {
    const a = new Announcer();
    const uno = a.push({ text: 'doble, 300 puntos', priority: 'normal' }, 1000);
    const dos = a.push({ text: 'doble, 300 puntos', priority: 'normal' }, 1000 + QUIET_MS);
    expect(uno).toBe('doble, 300 puntos');
    // Distinto texto para la región viva…
    expect(dos).not.toBe(uno);
    // …pero lo mismo al leerlo en voz alta.
    expect(dos?.trim()).toBe('doble, 300 puntos');
  });

  it('reiniciar deja la política como nueva', () => {
    const a = new Announcer();
    a.push({ text: 'algo', priority: 'normal' }, 1000);
    a.push({ text: 'pendiente', priority: 'normal' }, 1100);
    a.reset();
    expect(a.flush(9000)).toBeNull();
    expect(a.push({ text: 'algo', priority: 'normal' }, 1200)).toBe('algo');
  });
});
