import { expect, test, type Page } from '@playwright/test';

/**
 * Movimiento reducido (docs/research/28). El criterio 2.3.3 de WCAG pide que la
 * animación de movimiento provocada por una interacción se pueda desactivar, y
 * la guía recuerda que el impacto vestibular puede llegar a la náusea o la
 * migraña. El juego ya lo respetaba, pero nada lo comprobaba.
 */

interface Medida {
  reducedMotion: boolean;
  particulas: number;
  rastros: number;
  temblor: number;
}

/** Arranca una partida con el ajuste dado y provoca los efectos de movimiento. */
async function medir(page: Page, ajuste: 'auto' | 'on' | 'off'): Promise<Medida> {
  await page.evaluate((v) => {
    const bf = window.__blockfall;
    bf?.store.updateSettings((s) => {
      s.video.reducedMotion = v;
      // Los efectos tienen que estar encendidos: si no, la prueba pasaría por
      // el motivo equivocado.
      s.video.particles = true;
      s.video.shake = true;
    });
    (bf?.app as unknown as { applySettings: () => void }).applySettings();
    bf?.app.newGame(4242);
  }, ajuste);
  await page.evaluate(() => window.__blockfall?.tick(3600));

  return page.evaluate(() => {
    const app = window.__blockfall?.app as unknown as {
      rendererHandle: {
        renderer: {
          options: { reducedMotion: boolean };
          particles: { particles: unknown[] };
          trails: unknown[];
          shake: { offsetX: number; offsetY: number };
          effect: (e: unknown, s: unknown) => void;
        };
      };
    };
    const r = app.rendererHandle.renderer;
    const estado = window.__blockfall?.app.currentSession?.game.state;
    r.effect({ type: 'hardDrop', distance: 10 }, estado);
    r.effect(
      {
        type: 'lineClear',
        rows: [0, 1, 2, 3],
        count: 4,
        tspin: 'none',
        b2b: false,
        combo: 0,
        perfectClear: false,
        points: 800,
      },
      estado,
    );
    return {
      reducedMotion: r.options.reducedMotion,
      particulas: r.particles.particles.length,
      rastros: r.trails.length,
      temblor: Math.abs(r.shake.offsetX) + Math.abs(r.shake.offsetY),
    };
  });
}

test.describe('movimiento reducido', () => {
  test('apagado, los efectos de movimiento ocurren @motion', async ({ page }) => {
    await page.goto('/');
    const m = await medir(page, 'off');
    // Control positivo: sin esto, las comprobaciones de abajo pasarían aunque
    // los efectos estuvieran rotos por cualquier otro motivo.
    expect(m.reducedMotion).toBe(false);
    expect(m.particulas).toBeGreaterThan(0);
    expect(m.rastros).toBeGreaterThan(0);
  });

  test('encendido, no se emite ningún movimiento @motion', async ({ page }) => {
    await page.goto('/');
    const m = await medir(page, 'on');
    expect(m.reducedMotion).toBe(true);
    expect(m.particulas, 'partículas al limpiar líneas').toBe(0);
    expect(m.rastros, 'rastro de la caída rápida').toBe(0);
    expect(m.temblor, 'temblor de la pantalla').toBe(0);
  });

  test('en automático sigue la preferencia del sistema @motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const conPreferencia = await medir(page, 'auto');
    expect(conPreferencia.reducedMotion).toBe(true);
    expect(conPreferencia.particulas).toBe(0);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const sinPreferencia = await medir(page, 'auto');
    expect(sinPreferencia.reducedMotion).toBe(false);
    expect(sinPreferencia.particulas).toBeGreaterThan(0);
  });
});
