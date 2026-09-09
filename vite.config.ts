import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

function gitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

const BASE = process.env.BASE_PATH ?? '/';

/**
 * Todo se sirve desde el propio origen: no hay guiones en línea, ni fuentes o
 * imágenes externas, ni peticiones a terceros. `frame-ancestors` y `report-uri`
 * no se ponen porque se ignoran cuando la política llega en una etiqueta.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  base: BASE,
  plugins: [
    {
      // Política de seguridad de contenido, solo en la compilación publicada:
      // el servidor de desarrollo usa guiones en línea que la política
      // bloquearía (ADR-0011, docs/research/26).
      name: 'blockfall-csp',
      apply: 'build',
      transformIndexHtml(html: string) {
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        );
      },
    },
    VitePWA({
      // No se adelanta solo: el service worker nuevo espera y la aplicación
      // decide cuándo entrar, para no recargar a mitad de partida (ADR-0010).
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Blockfall',
        short_name: 'Blockfall',
        description:
          'Juego de bloques que caen con reglas modernas: SRS, hold, T-spins, back-to-back y perfect clear.',
        lang: 'es',
        dir: 'ltr',
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0B0F1A',
        theme_color: '#0B0F1A',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // El modo 3D pesa mucho y solo lo usa quien lo activa: se guarda en cache
        // la primera vez que se pide, no en la precarga inicial (ADR-0008).
        globIgnores: ['**/ThreeRenderer-*.js', '**/*.map'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 3_000_000,
        runtimeCaching: [
          {
            urlPattern: /ThreeRenderer-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'blockfall-3d',
              expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_COMMIT__: JSON.stringify(gitShortSha()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    // El modo 3D es un fragmento aparte y grande a propósito; no es una regresión.
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 5180,
    strictPort: false,
  },
  preview: {
    port: 4517,
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/core/types.ts'],
      reporter: ['text', 'html', 'lcov'],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
