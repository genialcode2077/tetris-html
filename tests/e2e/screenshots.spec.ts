import { test, type Page } from '@playwright/test';

/**
 * Genera capturas de verificación visual en docs/assets/screenshots (no son aserciones).
 * Ejecutar: pnpm test:e2e --grep @screenshots
 */
const OUT = 'docs/assets/screenshots';

async function press(page: Page, code: string, ticks = 60): Promise<void> {
  await page.keyboard.down(code);
  await page.evaluate((ms) => window.__blockfall?.tick(ms), 40);
  await page.keyboard.up(code);
  await page.evaluate((ms) => window.__blockfall?.tick(ms), ticks);
}

test('capturas de referencia @screenshots', async ({ page }, testInfo) => {
  const tag = testInfo.project.name;
  await page.goto('/');
  await page.screenshot({ path: `${OUT}/${tag}-01-title.png` });
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.screenshot({ path: `${OUT}/${tag}-02-modes.png` });
  // Partida determinista con semilla fija.
  await page.evaluate(() => {
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(2400));
  await page.screenshot({ path: `${OUT}/${tag}-03-countdown.png` });
  await page.evaluate(() => window.__blockfall?.tick(1300));
  // Unas cuantas piezas: mover a extremos y soltar para levantar pila
  const script: string[][] = [
    ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'Space'],
    ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight', 'Space'],
    ['KeyC'],
    ['ArrowUp', 'ArrowLeft', 'ArrowLeft', 'Space'],
    ['KeyZ', 'ArrowRight', 'ArrowRight', 'Space'],
    ['ArrowDown', 'ArrowDown'],
  ];
  for (const seq of script) for (const code of seq) await press(page, code);
  await page.screenshot({ path: `${OUT}/${tag}-04-playing.png` });
  // Preparar una línea casi completa y limpiarla con una I vertical
  await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    if (!s) return;
    const b = s.game.state.board;
    for (let y = 0; y < 2; y++) for (let x = 0; x < 9; x++) b[y * 10 + x] = 8;
    for (let y = 2; y < 4; y++) for (let x = 0; x < 9; x++) b[y * 10 + x] = ((x + y) % 7) + 1;
    b[3 * 10 + 4] = 0;
    b[2 * 10 + 7] = 0;
    (s.game.state as { active: unknown }).active = { type: 'I', rotation: 1, x: 7, y: 0 };
  });
  await press(page, 'Space', 90);
  await page.screenshot({ path: `${OUT}/${tag}-05-lineclear.png` });
  await page.evaluate(() => window.__blockfall?.tick(400));
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.__blockfall?.tick(50));
  await page.screenshot({ path: `${OUT}/${tag}-06-pause.png` });
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.screenshot({ path: `${OUT}/${tag}-07-settings.png`, fullPage: false });
});
