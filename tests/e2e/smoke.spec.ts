import { expect, test } from '@playwright/test';

test.describe('flujo básico', () => {
  test('título → modos → partida → pausa', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'BLOCKFALL', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: 'Jugar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige modo' })).toBeVisible();
    await page.getByRole('button', { name: 'Empezar' }).click();
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'game');

    // La cuenta atrás se avanza con el gancho e2e (no depende de rAF).
    await page.evaluate(() => window.__blockfall?.tick(3600));
    const status = await page.evaluate(() => window.__blockfall?.app.currentSession?.status);
    expect(status).toBe('playing');

    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Space');
    await page.evaluate(() => window.__blockfall?.tick(200));
    const stats = await page.evaluate(() => {
      const s = window.__blockfall?.app.currentSession?.game.state;
      return s ? { pieces: s.stats.pieces, score: s.score, phase: s.phase } : null;
    });
    expect(stats?.pieces).toBe(1);
    expect(stats?.score ?? 0).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Pausa' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByRole('heading', { name: 'Pausa' })).toBeHidden();
  });

  test('ajustes y récords se abren y cierran', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ajustes' }).click();
    await expect(page.getByRole('heading', { name: 'Ajustes' })).toBeVisible();
    await expect(page.locator('#settings-form fieldset')).toHaveCount(5);
    await page.getByRole('button', { name: 'Listo' }).click();
    await page.getByRole('button', { name: 'Récords' }).click();
    await expect(page.getByRole('heading', { name: 'Récords' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver' }).click();
    await expect(page.getByRole('heading', { name: 'BLOCKFALL', level: 2 })).toBeVisible();
  });
});

test('se puede ver la repetición de la partida recién jugada @replay', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.__blockfall?.app.newGame(4242);
  });
  await page.evaluate(() => window.__blockfall?.tick(3600));

  // Unas cuantas jugadas para que la repetición tenga contenido.
  for (const key of ['ArrowLeft', 'ArrowUp', 'Space', 'ArrowRight', 'Space', 'KeyC', 'Space']) {
    await page.keyboard.press(key);
    await page.evaluate(() => window.__blockfall?.tick(150));
  }
  const played = await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    return { pieces: s?.game.state.stats.pieces ?? 0, score: s?.game.state.score ?? 0 };
  });
  expect(played.pieces).toBeGreaterThan(2);

  // Se llena el tablero dejando una columna libre, para que no se limpie ninguna
  // línea y la siguiente pieza no quepa: así termina la partida.
  await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    if (!s) return;
    const b = s.game.state.board;
    for (let y = 0; y < 22; y++) {
      for (let x = 0; x < 10; x++) if (x !== 9) b[y * 10 + x] = 8;
    }
  });
  await page.keyboard.press('Space');
  await page.evaluate(() => window.__blockfall?.tick(1500));
  await page.waitForFunction(
    () => window.__blockfall?.app.currentSession?.status === 'gameover',
    undefined,
    { timeout: 10_000 },
  );
  await expect(page.getByRole('button', { name: 'Ver repetición' })).toBeVisible({
    timeout: 10_000,
  });

  await page.getByRole('button', { name: 'Ver repetición' }).click();
  expect(await page.evaluate(() => window.__blockfall?.app.currentSession?.isReplay)).toBe(true);
  await page.evaluate(() => window.__blockfall?.tick(2000));

  // La repetición reproduce las mismas jugadas.
  await page.evaluate(() => window.__blockfall?.tick(3000));
  const replayed = await page.evaluate(() => {
    const s = window.__blockfall?.app.currentSession;
    return { pieces: s?.game.state.stats.pieces ?? 0, score: s?.game.state.score ?? 0 };
  });
  expect(replayed.pieces).toBeGreaterThanOrEqual(played.pieces);
});
