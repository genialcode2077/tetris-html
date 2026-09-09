import { expect, test, type Page } from '@playwright/test';

/** Rompe el dibujado del renderer activo. */
async function romperRender(page: Page, veces: number): Promise<void> {
  await page.evaluate((n) => {
    const app = window.__blockfall?.app as unknown as {
      rendererHandle?: { renderer: { render: (...a: unknown[]) => void } };
    };
    const r = app.rendererHandle?.renderer;
    if (!r) return;
    const orig = r.render.bind(r);
    let hechas = 0;
    r.render = (...a: unknown[]) => {
      if (hechas++ < n) throw new Error('fallo simulado al dibujar');
      return orig(...a);
    };
  }, veces);
}

async function jugarUnPoco(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Jugar', exact: true }).click();
  await page.getByRole('button', { name: 'Empezar' }).click();
  await page.evaluate(() => window.__blockfall?.tick(3600));
  for (const k of ['ArrowLeft', 'Space', 'ArrowRight', 'Space']) {
    await page.keyboard.press(k);
    await page.evaluate(() => window.__blockfall?.tick(150));
  }
}

test.describe('el juego no se congela en silencio', () => {
  test('un fallo suelto al dibujar no interrumpe la partida @resilience', async ({ page }) => {
    await jugarUnPoco(page);
    const antes = await page.evaluate(() => window.__blockfall?.app.currentSession?.elapsedMs ?? 0);
    await romperRender(page, 1);
    await page.waitForTimeout(600);
    const despues = await page.evaluate(
      () => window.__blockfall?.app.currentSession?.elapsedMs ?? 0,
    );
    // El reloj del juego sigue corriendo: el bucle sobrevivió al tropiezo.
    expect(despues).toBeGreaterThan(antes);
  });

  test('un fallo persistente salva la partida en vez de congelar @resilience', async ({ page }) => {
    await jugarUnPoco(page);
    const puntos = await page.evaluate(
      () => window.__blockfall?.app.currentSession?.game.state.score ?? -1,
    );
    await romperRender(page, 999);
    await page.waitForTimeout(1200);

    const estado = await page.evaluate(() => ({
      pantalla: document.getElementById('app')?.dataset.screen,
      guardada: window.__blockfall?.store.savedGame() !== null,
      aviso: document.getElementById('announcer')?.textContent ?? '',
    }));
    // Vuelve al menú, con la partida a salvo y diciéndolo.
    expect(estado.pantalla).toBe('title');
    expect(estado.guardada).toBe(true);
    expect(estado.aviso).not.toBe('');

    // Y tras recargar se puede continuar donde estaba.
    await page.reload();
    await page.getByRole('button', { name: 'Continuar partida' }).click();
    const recuperada = await page.evaluate(
      () => window.__blockfall?.app.currentSession?.game.state.score ?? -1,
    );
    expect(recuperada).toBe(puntos);
  });
});
