import { expect, test } from '@playwright/test';

/** Verifica que la PWA es instalable y que el juego arranca sin red. */
test.describe('PWA', () => {
  test('el manifest declara los iconos y el arranque @pwa', async ({ page }) => {
    await page.goto('/');
    const href = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(href).toBeTruthy();
    const manifest = (await page.evaluate(async (url) => {
      const res = await fetch(url);
      return res.json() as Promise<Record<string, unknown>>;
    }, href!)) as {
      name: string;
      display: string;
      icons: { sizes: string; purpose?: string }[];
      theme_color: string;
    };
    expect(manifest.name).toBe('Blockfall');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0B0F1A');
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  test('el juego funciona sin conexión tras la primera visita @pwa', async ({ page, context }) => {
    await page.goto('/');
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
      timeout: 15_000,
    });
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'BLOCKFALL', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: 'Jugar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige modo' })).toBeVisible();
    await context.setOffline(false);
  });
});
