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
