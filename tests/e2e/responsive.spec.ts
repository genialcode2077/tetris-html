import { expect, test } from '@playwright/test';

/**
 * En pantallas pequeñas el tablero debe quedarse con el espacio que sobra y nada
 * puede salirse a lo ancho. Antes se reservaba una altura fija para el resto de la
 * interfaz y el tablero quedaba diminuto (docs/research/08).
 */
const SIZES = [
  { name: '320×568', width: 320, height: 568, minCell: 15 },
  { name: '360×640', width: 360, height: 640, minCell: 18 },
  { name: '390×844', width: 390, height: 844, minCell: 24 },
];

for (const size of SIZES) {
  test(`el tablero aprovecha la pantalla en ${size.name} @responsive`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await page.evaluate(() => {
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(4000));

    const metrics = await page.evaluate(() => {
      const canvas = document.querySelector('.board-canvas')?.getBoundingClientRect();
      const doc = document.documentElement;
      return {
        canvasWidth: canvas ? Math.round(canvas.width) : 0,
        canvasHeight: canvas ? Math.round(canvas.height) : 0,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        fontSizes: [...document.querySelectorAll<HTMLElement>('.stat .value')].map((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      };
    });

    // Diez columnas: el ancho del lienzo dividido entre diez es el lado de la celda.
    const cell = metrics.canvasWidth / 10;
    expect(cell, `celda en ${size.name}`).toBeGreaterThanOrEqual(size.minCell);
    // Nada debe salirse a lo ancho.
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
    // El marcador no baja del mínimo legible en móvil.
    for (const fontSize of metrics.fontSizes) expect(fontSize).toBeGreaterThanOrEqual(14);
  });
}

test('los controles táctiles caben sin desbordarse @responsive', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const fits = await page.evaluate(() => {
    const bar = document.getElementById('touch-controls');
    if (!bar) return null;
    // Se fuerza su visibilidad aunque el navegador de pruebas no sea táctil.
    bar.hidden = false;
    const buttons = [...bar.querySelectorAll('button')];
    const total = buttons.reduce((sum, b) => sum + b.getBoundingClientRect().width, 0);
    const barWidth = bar.getBoundingClientRect().width;
    const heights = buttons.map((b) => Math.round(b.getBoundingClientRect().height));
    return {
      total: Math.round(total),
      barWidth: Math.round(barWidth),
      heights,
      count: buttons.length,
    };
  });
  expect(fits).not.toBeNull();
  expect(fits!.count).toBe(7);
  expect(fits!.total).toBeLessThanOrEqual(fits!.barWidth);
  // Se mantiene el objetivo táctil mínimo recomendado en alto.
  for (const h of fits!.heights) expect(h).toBeGreaterThanOrEqual(44);
});
