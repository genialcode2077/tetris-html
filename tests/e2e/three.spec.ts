import { expect, test, type Page } from '@playwright/test';

/**
 * El modo 3D es opcional y se descarga aparte (ADR-0008). Estas pruebas comprueban
 * que arranca, que dibuja, que respeta el presupuesto de render y que vuelve al
 * modo clásico cuando el dispositivo no puede con él.
 */

// En los servidores de integración no hay tarjeta gráfica y WebGL se emula por
// software, así que el umbral se relaja: el dato se registra igual para poder
// comparar entre ejecuciones, pero el presupuesto real solo se exige en local.
const BUDGET_MS = process.env.CI ? 16 : 8;
const SAMPLES = process.env.CI ? 60 : 180;

async function enable3d(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.store.updateSettings((s) => {
      s.video.renderer = 'three';
    });
  });
  await page.reload();
  await page.waitForFunction(
    () =>
      (window.__blockfall?.app.rendererDiagnostics as { ready?: boolean } | undefined)?.ready ===
      true,
    undefined,
    { timeout: 25_000 },
  );
}

test.describe('modo 3D', () => {
  test('arranca, dibuja y no deja errores en consola @3d', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      const text = m.text();
      // El aviso de que no hay WebGPU es esperado: se usa WebGL2.
      if (m.type() === 'error' && !text.includes('WebGPU is not available')) errors.push(text);
    });

    await enable3d(page);
    const diag = (await page.evaluate(() => window.__blockfall?.app.rendererDiagnostics)) as {
      ready: boolean;
      bloom: boolean;
      postError: string | null;
    };
    expect(diag.ready).toBe(true);
    expect(diag.postError).toBeNull();
    expect(await page.locator('canvas.board-canvas-3d').count()).toBe(1);

    await page.evaluate(() => {
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(3600));
    await page.keyboard.press('Space');
    await page.evaluate(() => window.__blockfall?.tick(300));
    const pieces = await page.evaluate(
      () => window.__blockfall?.app.currentSession?.game.state.stats.pieces,
    );
    expect(pieces).toBe(1);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('respeta el presupuesto de render con el tablero lleno @3d @perf', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'basta con medirlo en un motor');
    test.setTimeout(120_000);
    await enable3d(page);
    await page.evaluate(() => {
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(3600));
    await page.evaluate(() => {
      const s = window.__blockfall?.app.currentSession;
      if (!s) return;
      const b = s.game.state.board;
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 10; x++) if ((x + y) % 5 !== 0) b[y * 10 + x] = ((x * 3 + y) % 7) + 1;
      }
    });

    const result = await page.evaluate(async (samplesWanted: number) => {
      const bf = window.__blockfall;
      if (!bf) return null;
      const samples: number[] = [];
      for (let i = 0; i < samplesWanted; i++) {
        const t0 = performance.now();
        bf.tick(1000 / 120);
        samples.push(performance.now() - t0);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      samples.sort((a, b) => a - b);
      return {
        p50: samples[Math.floor(samples.length * 0.5)] ?? 0,
        p95: samples[Math.floor(samples.length * 0.95)] ?? 0,
      };
    }, SAMPLES);

    expect(result).not.toBeNull();
    const { p50, p95 } = result!;
    console.log(
      `[3d] render p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms (límite ${BUDGET_MS}ms)`,
    );
    await testInfo.attach('frame-cost-3d', {
      body: `p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms limite=${BUDGET_MS}ms`,
      contentType: 'text/plain',
    });
    expect(p95).toBeLessThan(BUDGET_MS);
  });

  test('vuelve al modo clásico si el 3D no está disponible @3d', async ({ page }) => {
    await page.goto('/');
    // Se simula un dispositivo sin WebGPU ni WebGL2 antes de activar el modo 3D.
    await page.addInitScript(() => {
      type GetContext = (this: HTMLCanvasElement, id: string, ...rest: unknown[]) => unknown;
      const proto = HTMLCanvasElement.prototype as unknown as { getContext: GetContext };
      const original: GetContext = proto.getContext;
      proto.getContext = function (this: HTMLCanvasElement, id: string, ...rest: unknown[]) {
        if (id === 'webgl2' || id === 'webgpu') return null;
        return original.call(this, id, ...rest);
      };
      Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });
    });
    await page.evaluate(() => {
      window.__blockfall?.store.updateSettings((s) => {
        s.video.renderer = 'three';
      });
    });
    await page.reload();
    await page.waitForFunction(
      () => window.__blockfall?.app.rendererKind === 'canvas2d',
      undefined,
      {
        timeout: 25_000,
      },
    );

    // El juego sigue siendo jugable tras la vuelta atrás.
    await page.evaluate(() => {
      window.__blockfall?.app.newGame(1);
    });
    await page.evaluate(() => window.__blockfall?.tick(3600));
    await page.keyboard.press('Space');
    await page.evaluate(() => window.__blockfall?.tick(200));
    expect(
      await page.evaluate(() => window.__blockfall?.app.currentSession?.game.state.stats.pieces),
    ).toBe(1);
  });
});
