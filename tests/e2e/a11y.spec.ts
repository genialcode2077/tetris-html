import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Auditoría WCAG 2.1/2.2 A y AA en las pantallas principales. */
const screens: [string, (page: Page) => Promise<void>][] = [
  ['title', async () => {}],
  ['modes', async (page) => page.getByRole('button', { name: 'Jugar', exact: true }).click()],
  ['settings', async (page) => page.getByRole('button', { name: 'Ajustes' }).click()],
  ['records', async (page) => page.getByRole('button', { name: 'Récords' }).click()],
  ['help', async (page) => page.getByRole('button', { name: 'Cómo jugar' }).click()],
];

for (const [name, open] of screens) {
  test(`sin violaciones de accesibilidad: ${name} @a11y`, async ({ page }) => {
    await page.goto('/');
    await open(page);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
