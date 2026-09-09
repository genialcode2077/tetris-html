import { describe, expect, it, vi } from 'vitest';
import { UpdateGate, decideUpdate, type UpdateContext } from './updates';

const ctx = (session: UpdateContext['session'], screen: string | null = null): UpdateContext => ({
  session,
  screen,
});

describe('cuándo aplicar una versión nueva', () => {
  it('se aplica si no hay partida abierta', () => {
    expect(decideUpdate(ctx(null))).toBe('apply');
    expect(decideUpdate(ctx(null, 'title'))).toBe('apply');
  });

  it('se aplica cuando la partida ya ha terminado', () => {
    expect(decideUpdate(ctx('finished'))).toBe('apply');
    expect(decideUpdate(ctx('gameover'))).toBe('apply');
  });

  it('nunca se aplica con una partida viva, ni siquiera en pausa', () => {
    // Una pausa es tan recuperable como el juego: recargar la perdería igual.
    for (const s of ['playing', 'paused', 'countdown'] as const) {
      expect(decideUpdate(ctx(s)), s).toBe('wait');
    }
  });
});

describe('espera de la versión nueva', () => {
  it('no hace nada mientras no haya versión esperando', () => {
    const apply = vi.fn();
    const gate = new UpdateGate(apply, () => ctx(null));
    gate.maybeApply();
    expect(apply).not.toHaveBeenCalled();
    expect(gate.waiting).toBe(false);
  });

  it('la aplica en el acto si llega estando en el menú', () => {
    const apply = vi.fn();
    const gate = new UpdateGate(apply, () => ctx(null));
    gate.notifyReady();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(gate.waiting).toBe(false);
  });

  it('la retiene mientras se juega y la suelta al acabar', () => {
    const apply = vi.fn();
    let estado: UpdateContext['session'] = 'playing';
    const gate = new UpdateGate(apply, () => ctx(estado));

    gate.notifyReady();
    expect(apply).not.toHaveBeenCalled();
    expect(gate.waiting).toBe(true);

    // Pausar no basta.
    estado = 'paused';
    gate.maybeApply();
    expect(apply).not.toHaveBeenCalled();

    estado = 'gameover';
    gate.maybeApply();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(gate.waiting).toBe(false);
  });

  it('no se aplica dos veces aunque se avise o se consulte de más', () => {
    const apply = vi.fn();
    const gate = new UpdateGate(apply, () => ctx(null));
    gate.notifyReady();
    gate.notifyReady();
    gate.maybeApply();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('avisar dos veces mientras se juega sigue aplicando una sola vez', () => {
    const apply = vi.fn();
    let estado: UpdateContext['session'] = 'playing';
    const gate = new UpdateGate(apply, () => ctx(estado));
    gate.notifyReady();
    gate.notifyReady();
    estado = null;
    gate.maybeApply();
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
