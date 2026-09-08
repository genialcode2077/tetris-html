import { expect, test, type CDPSession } from '@playwright/test';

/**
 * Con la máquina justa, el juego debe recortar las partículas antes que perder
 * cuadros. Se usa el freno de procesador del navegador, que no simula un móvil
 * real pero sí permite ver cómo escala el coste (docs/research/12).
 */
test.describe('presupuesto de partículas', () => {
  test('se recorta cuando dibujar sale caro @particles', async ({ page, context }) => {
    test.skip(test.info().project.name !== 'chromium', 'basta con medirlo en un motor');
    test.setTimeout(90_000);
    const client: CDPSession = await context.newCDPSession(page);

    await page.goto('/');
    await page.evaluate(() => {
      window.__blockfall?.store.updateSettings((s) => {
        s.video.particles = true;
      });
      window.__blockfall?.app.refreshSettings();
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(3600));

    const budget = (): Promise<number | undefined> =>
      page.evaluate(
        () =>
          (window.__blockfall?.app.rendererDiagnostics as { particleBudget?: number })
            .particleBudget,
      );
    expect(await budget()).toBe(600);

    // Se llena el tablero y se frena el procesador para forzar cuadros lentos.
    await page.evaluate(() => {
      const s = window.__blockfall?.app.currentSession;
      if (!s) return;
      const b = s.game.state.board;
      for (let y = 0; y < 18; y++) {
        for (let x = 0; x < 10; x++) if ((x + y) % 4 !== 0) b[y * 10 + x] = ((x * 3 + y) % 7) + 1;
      }
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 20 });
    await page.evaluate(async () => {
      const bf = window.__blockfall;
      if (!bf) return;
      const handle = (
        bf.app as unknown as {
          rendererHandle?: { renderer: { effect: (e: unknown, s: unknown) => void } };
        }
      ).rendererHandle;
      const state = bf.app.currentSession?.game.state;
      for (let i = 0; i < 90; i++) {
        if (i % 10 === 0 && state) {
          handle?.renderer.effect(
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
            state,
          );
        }
        bf.tick(1000 / 120);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    const recortado = await budget();
    expect(recortado).toBeDefined();
    expect(recortado!).toBeLessThan(600);
    expect(recortado!).toBeGreaterThanOrEqual(40);
    console.log(`[particulas] presupuesto tras frenar el procesador: ${recortado ?? 0}`);

    // Una partida nueva vuelve a empezar con el presupuesto entero.
    await page.evaluate(() => {
      window.__blockfall?.app.newGame(1);
    });
    expect(await budget()).toBe(600);
  });
});
