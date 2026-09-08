import { expect, test, type Page } from '@playwright/test';

/** Fija el idioma y vuelve a aplicar los ajustes sin recargar. */
async function useLocale(page: Page, locale: 'es' | 'en'): Promise<void> {
  await page.evaluate((value: 'es' | 'en') => {
    window.__blockfall?.store.updateSettings((s) => {
      s.locale = value;
    });
    window.__blockfall?.app.refreshSettings();
  }, locale);
}

test.describe('idioma', () => {
  test('la interfaz cambia entre español e inglés @i18n', async ({ page }) => {
    await page.goto('/');

    await useLocale(page, 'es');
    await expect(page.getByRole('button', { name: 'Jugar', exact: true })).toBeVisible();
    expect(await page.getAttribute('html', 'lang')).toBe('es');
    await page.getByRole('button', { name: 'Jugar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Elige modo' })).toBeVisible();
    await expect(page.getByText('Limpia 40 líneas lo más rápido posible.')).toBeVisible();

    await useLocale(page, 'en');
    await expect(page.getByRole('heading', { name: 'Choose a mode' })).toBeVisible();
    await expect(page.getByText('Clear 40 lines as fast as you can.')).toBeVisible();
    expect(await page.getAttribute('html', 'lang')).toBe('en');
    // El marcador de detrás también se traduce, aunque lo tape el menú.
    expect(await page.locator('[data-i18n="hud.score"]').textContent()).toBe('SCORE');
    await useLocale(page, 'es');
    expect(await page.locator('[data-i18n="hud.score"]').textContent()).toBe('PUNTOS');
  });

  test('el idioma elegido se conserva al recargar @i18n', async ({ page }) => {
    await page.goto('/');
    await useLocale(page, 'en');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await useLocale(page, 'es');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Jugar', exact: true })).toBeVisible();
  });

  test('sin elección previa se usa el idioma del navegador @i18n', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await context.close();

    const spanish = await browser.newContext({ locale: 'es-ES' });
    const page2 = await spanish.newPage();
    await page2.goto('/');
    await expect(page2.getByRole('button', { name: 'Jugar', exact: true })).toBeVisible();
    await spanish.close();
  });
});
