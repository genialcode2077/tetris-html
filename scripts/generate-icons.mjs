/**
 * Genera los iconos PNG de la PWA a partir de un SVG, usando el Chromium de Playwright.
 * Uso: pnpm icons
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const OUT = new URL('../public/icons/', import.meta.url);

/** Icono estándar: el logotipo con margen. */
const icon = (size, maskable) => {
  // Un icono "maskable" necesita que el contenido quepa en el 80 % central (safe zone).
  const pad = maskable ? size * 0.14 : size * 0.06;
  const inner = size - pad * 2;
  const u = inner / 8; // rejilla de 8 unidades
  const r = u * 0.22;
  const cell = (x, y, color) =>
    `<rect x="${pad + x * u}" y="${pad + y * u}" width="${u * 0.94}" height="${u * 0.94}" rx="${r}" fill="${color}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#141A2E"/><stop offset="1" stop-color="#0B0F1A"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${maskable ? 0 : size * 0.2}" fill="url(#bg)"/>
  ${cell(2, 1, '#C05CFF')}
  ${cell(1, 2, '#C05CFF')}${cell(2, 2, '#C05CFF')}${cell(3, 2, '#C05CFF')}
  ${cell(4, 2, '#22E5FF')}${cell(5, 2, '#22E5FF')}${cell(6, 2, '#22E5FF')}
  ${cell(1, 4, '#FF9F1C')}${cell(2, 4, '#FF9F1C')}
  ${cell(1, 5, '#FF9F1C')}${cell(2, 5, '#FF9F1C')}
  ${cell(4, 5, '#3BFF7A')}${cell(5, 5, '#3BFF7A')}
  ${cell(3, 6, '#3BFF7A')}${cell(4, 6, '#3BFF7A')}
  ${cell(6, 4, '#FFE600')}${cell(6, 5, '#FFE600')}${cell(6, 6, '#FFE600')}${cell(5, 6, '#FFE600')}
</svg>`;
};

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-192.png', 192, true],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, maskable] of targets) {
  const svg = icon(size, maskable);
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;padding:0;background:transparent}</style>${svg}`,
  );
  const buf = await page.screenshot({ omitBackground: true });
  await writeFile(new URL(name, OUT), buf);
  console.log(`✓ ${name} (${size}×${size}${maskable ? ', maskable' : ''})`);
}
await browser.close();
