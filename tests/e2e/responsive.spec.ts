import { expect, test } from '@playwright/test';

/**
 * En pantallas pequeñas el tablero debe quedarse con el espacio que sobra y nada
 * puede salirse a lo ancho. Antes se reservaba una altura fija para el resto de la
 * interfaz y el tablero quedaba diminuto (docs/research/08).
 */
/**
 * El mínimo se da por separado según si la fila de botones táctiles está a la
 * vista, porque ocupa 64 puntos de alto y eso son unos 3 píxeles menos de celda.
 *
 * Los valores llevan un margen de dos o tres píxeles sobre lo medido, porque el
 * alto del marcador depende de la fuente del sistema y no es igual en macOS que
 * en los servidores de integración con Linux. Aun con ese margen siguen por
 * encima de lo que había antes del cambio (13 píxeles en 320 y 16 en 360), así
 * que una regresión del reparto de espacio haría fallar la prueba.
 */
const SIZES = [
  { name: '320×568', width: 320, height: 568, minCell: 14, minCellTouch: 11 },
  { name: '360×640', width: 360, height: 640, minCell: 17, minCellTouch: 15 },
  { name: '390×844', width: 390, height: 844, minCell: 25, minCellTouch: 23 },
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
      const bar = document.getElementById('touch-controls');
      return {
        canvasWidth: canvas ? Math.round(canvas.width) : 0,
        canvasHeight: canvas ? Math.round(canvas.height) : 0,
        touchVisible: bar ? !bar.hidden : false,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        fontSizes: [...document.querySelectorAll<HTMLElement>('.stat .value')].map((el) =>
          parseFloat(getComputedStyle(el).fontSize),
        ),
      };
    });

    // Diez columnas: el ancho del lienzo dividido entre diez es el lado de la celda.
    const cell = metrics.canvasWidth / 10;
    const minimum = metrics.touchVisible ? size.minCellTouch : size.minCell;
    expect(
      cell,
      `celda en ${size.name} (botones táctiles: ${String(metrics.touchVisible)})`,
    ).toBeGreaterThanOrEqual(minimum);
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

/**
 * En horizontal sobra ancho y falta altura. Apilando los paneles el tablero se
 * quedaba con las migajas: 8,2 píxeles de celda en un móvil de 667×375, que es
 * injugable. Con los paneles a los lados sube a 14 (docs/research/27).
 *
 * Los mínimos llevan margen porque el alto del marcador depende de la fuente
 * del sistema, pero siguen muy por encima de los 8,2 de antes, así que una
 * regresión del reparto haría fallar la prueba.
 */
const HORIZONTALES = [
  { name: '915×412', width: 915, height: 412, minCell: 16 },
  { name: '667×375', width: 667, height: 375, minCell: 15 },
  { name: '640×360', width: 640, height: 360, minCell: 14 },
];

for (const size of HORIZONTALES) {
  test(`el tablero es jugable en horizontal a ${size.name} @responsive`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await page.evaluate(() => {
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(4000));

    const m = await page.evaluate(() => {
      const canvas = document.querySelector('.board-canvas')?.getBoundingClientRect();
      const doc = document.documentElement;
      const barra = document.getElementById('touch-controls');
      const tactilesVisibles = barra ? !barra.hidden : false;
      const botones = [...document.querySelectorAll<HTMLElement>('.touch-controls button')].map(
        (b) => b.getBoundingClientRect(),
      );
      const tablero = canvas;
      const botonPantalla = document.getElementById('btn-fullscreen')?.getBoundingClientRect();
      const cruza = (a: DOMRect, b: DOMRect): boolean =>
        a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
      return {
        tapanTablero: tablero ? botones.some((b) => cruza(b, tablero)) : false,
        chocanConBarra: botonPantalla
          ? [...document.querySelectorAll<HTMLElement>('.touch-controls button')]
              .filter((b) => cruza(b.getBoundingClientRect(), botonPantalla))
              .map((b) => b.dataset.action ?? '?')
          : [],
        ancho: canvas ? Math.round(canvas.width) : 0,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        scrollHeight: doc.scrollHeight,
        clientHeight: doc.clientHeight,
        tactilesVisibles,
        botonMin: botones.length ? Math.min(...botones.map((b) => Math.min(b.width, b.height))) : 0,
      };
    });

    expect(m.ancho / 10, `celda en ${size.name}`).toBeGreaterThanOrEqual(size.minCell);
    // Nada se sale, ni a lo ancho ni a lo alto: con tan poca altura era fácil.
    expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth + 1);
    expect(m.scrollHeight).toBeLessThanOrEqual(m.clientHeight + 1);
    // Donde hay táctil, los botones siguen por encima del mínimo de la norma y
    // no se meten donde no deben (docs/research/29).
    if (m.tactilesVisibles) {
      expect(m.botonMin, 'lado menor de los botones táctiles').toBeGreaterThanOrEqual(24);
      expect(m.tapanTablero, 'botones encima del tablero').toBe(false);
      expect(m.chocanConBarra, 'botones encima de la barra superior').toEqual([]);
    }
  });
}
