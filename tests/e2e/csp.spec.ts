import { expect, test } from '@playwright/test';

/**
 * Política de seguridad de contenido (docs/research/26, ADR-0011). Va en una
 * etiqueta porque las páginas se publican en un alojamiento estático sin
 * cabeceras, y solo en la compilación publicada: el servidor de desarrollo usa
 * guiones en línea.
 */
test.describe('política de seguridad de contenido', () => {
  test('la página publicada la declara @csp', async ({ page, baseURL }) => {
    const res = await page.request.get(new URL('.', baseURL).href);
    const html = await res.text();
    expect(html).toContain('http-equiv="Content-Security-Policy"');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain("script-src 'self'");
    // Se ignoran cuando la política llega en una etiqueta, así que no se ponen.
    expect(html).not.toContain('frame-ancestors');
    expect(html).not.toContain('report-uri');
  });

  test('bloquea de verdad un guion en línea @csp', async ({ page }) => {
    await page.goto('/');
    const bloqueado = await page.evaluate(async () => {
      const visto: string[] = [];
      const escuchar = (e: SecurityPolicyViolationEvent): void => {
        visto.push(e.violatedDirective);
      };
      document.addEventListener('securitypolicyviolation', escuchar);
      const s = document.createElement('script');
      s.textContent = 'window.__inyectado = true;';
      document.head.append(s);
      await new Promise((r) => setTimeout(r, 100));
      document.removeEventListener('securitypolicyviolation', escuchar);
      s.remove();
      return {
        violaciones: visto,
        ejecutado: (window as unknown as { __inyectado?: boolean }).__inyectado === true,
      };
    });
    // Si esto falla, la política está puesta pero no protege de nada.
    expect(bloqueado.ejecutado).toBe(false);
    expect(bloqueado.violaciones.join(' ')).toContain('script-src');
  });

  test('el juego funciona sin saltarse la política @csp', async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __csp: string[] }).__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => {
        (window as unknown as { __csp: string[] }).__csp.push(
          `${e.violatedDirective} ${e.blockedURI}`,
        );
      });
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Jugar', exact: true }).click();
    await page.getByRole('button', { name: 'Empezar' }).click();
    await page.waitForTimeout(4200);
    for (const k of ['ArrowLeft', 'ArrowUp', 'Space', 'KeyC']) {
      await page.keyboard.press(k);
      await page.waitForTimeout(100);
    }
    // Ajustes, que es donde estaba el atributo en línea que se quitó.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('btn-pause-settings')?.click());
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');

    const violaciones = await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp);
    expect(violaciones, violaciones.join(' | ')).toEqual([]);
    // Y pulsar Intro en el formulario no ha recargado la página.
    await expect(page.locator('#app')).toHaveAttribute('data-screen', 'settings');
  });
});
