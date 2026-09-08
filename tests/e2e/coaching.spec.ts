import { expect, test } from '@playwright/test';

/**
 * Los consejos aparecen cuando la mecánica importa, una sola vez, y se pueden
 * apagar (docs/research/10).
 */
test.describe('consejos', () => {
  test('el aviso de caída rápida sale tras varias piezas sin usarla @coaching', async ({
    page,
  }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.__blockfall?.store.updateSettings((s) => {
        s.coaching.enabled = true;
        s.locale = 'es';
      });
      window.__blockfall?.store.setSeenTips([]);
      window.__blockfall?.app.refreshSettings();
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(3600));

    // Se colocan piezas repartidas por el tablero, siempre con caída suave y nunca
    // con la tecla de caída rápida. Repartirlas evita que la pila suba y dispare
    // antes el aviso de peligro, que tiene prioridad.
    await page.evaluate(() => {
      const bf = window.__blockfall;
      const s = bf?.app.currentSession;
      if (!bf || !s) return;
      // Cada pieza necesita bajar entera y agotar el retardo de fijado.
      for (let i = 0; i < 16; i++) {
        const goLeft = i % 2 === 0;
        for (let n = 0; n < 4; n++) s.game.dispatch(goLeft ? 'left' : 'right');
        s.game.dispatch('softDropOn');
        bf.tick(1400);
        s.game.dispatch('softDropOff');
        bf.tick(700);
        // Se vacía la pila de vez en cuando para que la partida no acabe antes.
        if (i % 3 === 2) s.game.state.board.fill(0);
      }
    });

    await expect(page.locator('.badge.notice')).toContainText('caída rápida', { timeout: 5000 });
    // Queda anotado para no repetirlo.
    const seen = await page.evaluate(() => window.__blockfall?.store.seenTips);
    expect(seen).toContain('hardDrop');
  });

  test('con los consejos apagados no aparece ninguno @coaching', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.__blockfall?.store.updateSettings((s) => {
        s.coaching.enabled = false;
      });
      window.__blockfall?.store.setSeenTips([]);
      window.__blockfall?.app.refreshSettings();
      window.__blockfall?.app.newGame(4242);
    });
    await page.evaluate(() => window.__blockfall?.tick(3600));
    await page.evaluate(() => {
      const bf = window.__blockfall;
      const s = bf?.app.currentSession;
      if (!bf || !s) return;
      for (let i = 0; i < 16; i++) {
        s.game.dispatch('softDropOn');
        bf.tick(1400);
        s.game.dispatch('softDropOff');
        bf.tick(700);
        if (i % 3 === 2) s.game.state.board.fill(0);
      }
    });
    await page.waitForTimeout(500);
    expect(await page.locator('.badge.notice').count()).toBe(0);
    expect(await page.evaluate(() => window.__blockfall?.store.seenTips)).toEqual([]);
  });
});
