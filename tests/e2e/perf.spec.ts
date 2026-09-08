import { expect, test } from '@playwright/test';

/**
 * Mide el coste real de render en el navegador. No es una prueba de fps absoluta
 * (depende de la máquina), sino un techo de coste por frame que detecta regresiones.
 */
// En integración continua no hay tarjeta gráfica: se registra el dato igual, pero
// el umbral estricto solo se exige en una máquina con aceleración real.
const BUDGET_MS = process.env.CI ? 12 : 8;

test('presupuesto de render por frame @perf', async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));

  // Llena el tablero para el peor caso (muchas celdas dibujadas) y lanza efectos.
  await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    if (!s) return;
    const b = s.game.state.board;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 10; x++) if ((x + y) % 5 !== 0) b[y * 10 + x] = ((x * 3 + y) % 7) + 1;
    }
  });

  const result = await page.evaluate(async () => {
    const bf = window.__blockfall;
    if (!bf) return null;
    const samples: number[] = [];
    for (let i = 0; i < 240; i++) {
      const t0 = performance.now();
      bf.tick(1000 / 120);
      samples.push(performance.now() - t0);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    samples.sort((a, b) => a - b);
    return {
      p50: samples[Math.floor(samples.length * 0.5)] ?? 0,
      p95: samples[Math.floor(samples.length * 0.95)] ?? 0,
      max: samples[samples.length - 1] ?? 0,
    };
  });

  expect(result).not.toBeNull();
  const { p50, p95, max } = result!;
  await testInfo.attach('frame-cost', {
    body: `p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms max=${max.toFixed(2)}ms`,
    contentType: 'text/plain',
  });
  console.log(
    `[${testInfo.project.name}] render p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms max=${max.toFixed(2)}ms`,
  );
  // Presupuesto: un frame a 60 fps son 16.7 ms; exigimos holgura amplia.
  expect(p95).toBeLessThan(BUDGET_MS);
});
