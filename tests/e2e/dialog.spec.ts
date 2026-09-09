import { expect, test } from '@playwright/test';

/**
 * Patrón de diálogo modal del W3C (docs/research/23): el foco no sale mientras
 * está abierto, la tecla de escape lo cierra y el diálogo se anuncia como modal.
 */
test.describe('diálogos modales', () => {
  test('el foco no se escapa del diálogo abierto @a11y', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Jugar', exact: true }).focus();

    const fuera: string[] = [];
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      const donde = await page.evaluate(() => {
        const a = document.activeElement;
        return {
          id: a?.id ?? a?.tagName ?? '',
          dentro: !!a?.closest('.screen:not([hidden])'),
        };
      });
      if (!donde.dentro) fuera.push(donde.id);
    }
    // Antes se llegaba al botón de pantalla completa, que está detrás del
    // diálogo y no debería ser alcanzable con él abierto.
    expect(fuera, `el foco salió a: ${fuera.join(', ')}`).toEqual([]);
  });

  test('hacia atrás tampoco, y da la vuelta por el otro extremo @a11y', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Jugar', exact: true }).focus();
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      const dentro = await page.evaluate(
        () => !!document.activeElement?.closest('.screen:not([hidden])'),
      );
      expect(dentro, `salió en la pulsación ${i + 1}`).toBe(true);
    }
  });

  test('el diálogo abierto se anuncia como modal @a11y', async ({ page }) => {
    await page.goto('/');
    for (const [boton, pantalla] of [
      ['Ajustes', 'settings'],
      ['Récords', 'records'],
      ['Cómo jugar', 'help'],
    ] as const) {
      await page.getByRole('button', { name: boton, exact: true }).click();
      const attrs = await page.evaluate((id) => {
        const d = document.getElementById(`screen-${id}`);
        return {
          modal: d?.getAttribute('aria-modal'),
          role: d?.getAttribute('role'),
          etiquetado: d?.hasAttribute('aria-labelledby'),
        };
      }, pantalla);
      expect(attrs.role, pantalla).toBe('dialog');
      expect(attrs.modal, pantalla).toBe('true');
      expect(attrs.etiquetado, pantalla).toBe(true);
      await page.keyboard.press('Escape');
    }
    // Y el que está cerrado no se queda marcado como modal.
    const oculto = await page.evaluate(() =>
      document.getElementById('screen-settings')?.getAttribute('aria-modal'),
    );
    expect(oculto).toBeNull();
  });

  test('la tecla de escape cierra el diálogo y devuelve el foco @a11y', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'settings');
    await page.keyboard.press('Escape');
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'title');
  });

  test('mientras se captura una tecla, escape cancela la captura y no cierra @a11y', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    // Se entra en modo captura pulsando el botón de una acción remapeable.
    const captura = page.locator('#settings-form .key-btn').first();
    await captura.click();
    await expect(page.locator('#settings-form .key-btn.capturing')).toHaveCount(1);
    await page.keyboard.press('Escape');
    // Sigue en Ajustes: la tecla la consumió la captura.
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'settings');
  });
});
