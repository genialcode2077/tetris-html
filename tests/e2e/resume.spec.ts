import { expect, test } from '@playwright/test';

/** Continuar una partida a medias tras cerrar y volver a abrir (docs/research/21). */
test('la partida a medias se recupera al volver @resume', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.evaluate(() => window.__blockfall?.tick(3600));

  // Se juega un poco para que haya algo que perder.
  for (const tecla of ['ArrowLeft', 'ArrowUp', 'Space', 'ArrowRight', 'Space', 'Space']) {
    await page.keyboard.press(tecla);
    await page.evaluate(() => window.__blockfall?.tick(120));
  }
  const antes = await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    const st = s?.game.state;
    return { score: st?.score, piezas: st?.stats.pieces, tablero: [...(st?.board ?? [])] };
  });
  expect(antes.piezas).toBeGreaterThan(0);

  // Ocultar la página es el último momento fiable para guardar: en el móvil, al
  // cerrar la pestaña no llega ningún otro evento.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });

  // Se cierra y se vuelve a abrir.
  await page.reload();
  const continuar = page.getByRole('button', { name: 'Continuar partida' });
  await expect(continuar).toBeVisible();
  await continuar.click();

  const despues = await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    const st = s?.game.state;
    return {
      score: st?.score,
      piezas: st?.stats.pieces,
      tablero: [...(st?.board ?? [])],
      status: s?.status,
    };
  });
  expect(despues.score).toBe(antes.score);
  expect(despues.piezas).toBe(antes.piezas);
  expect(despues.tablero).toEqual(antes.tablero);
  // Vuelve en pausa, para que nadie pierda piezas mientras se sitúa.
  expect(despues.status).toBe('paused');

  // Al retomarla se consume: deja de estar guardada.
  const quedaGuardada = await page.evaluate(() => window.__blockfall?.store.savedGame() !== null);
  expect(quedaGuardada).toBe(false);

  // Y al terminar una partida tampoco queda nada que continuar.
  await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    s?.resume();
  });
  await page.evaluate(() => window.__blockfall?.tick(120));
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(await page.evaluate(() => window.__blockfall?.store.savedGame() !== null)).toBe(true);
});
