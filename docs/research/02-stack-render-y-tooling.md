# 02 · Stack tecnológico, render y tooling

- **Fecha:** 2026-09-07 · **Estado:** vigente · **Versiones verificadas en npm el 2026-09-07**

## 1. Versiones actuales (npm, 2026-09-07)

| Paquete                    | Versión                    | Nota                                                                                                                                                                                  |
| -------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vite                       | 8.2.2                      | Rolldown (Rust) como único bundler; requiere Node ^20.19 ‖ ≥22.12                                                                                                                     |
| typescript                 | 7.0.2 (latest) / **6.0.3** | **Usar 6.0.3**: typescript-eslint 8.69 exige `typescript >=4.8.4 <6.1.0`; TS 6 es la última versión JS y prepara la migración a 7 (Go). Reevaluar cuando typescript-eslint soporte 7. |
| vitest                     | 5.0.0                      | Requiere Vite ≥6.4, Node ≥22.12; `vi.mock` ya no se puede llamar dentro de funciones; config no busca en directorios padre                                                            |
| @playwright/test           | 1.63.0                     | `toHaveScreenshot` para regresión visual                                                                                                                                              |
| eslint / typescript-eslint | 10.10.0 / 8.69.0           | flat config, `projectService: true`                                                                                                                                                   |
| prettier                   | 3.9.6                      |                                                                                                                                                                                       |
| three / @types/three       | 0.185.1 / 0.185.4          | WebGPURenderer con fallback WebGL2; TSL; PostProcessing con `bloom`                                                                                                                   |
| pixi.js                    | 8.20.1                     | Alternativa 2D (≈450 KB min vs ≈1.2 MB three)                                                                                                                                         |
| vite-plugin-pwa            | 1.3.0                      | generateSW (Workbox)                                                                                                                                                                  |
| fast-check                 | 4.9.0                      | property-based testing                                                                                                                                                                |
| knip                       | 6.34.0                     | código/deps muertos                                                                                                                                                                   |
| lefthook                   | 2.1.12                     | git hooks en Go, paralelo, 1 YAML                                                                                                                                                     |
| pnpm / node                | 11.20.0 / 26.8.1 (local)   | fijar `engines` y `.node-version` (usar 24 LTS en CI)                                                                                                                                 |

## 2. Comparativa de tecnologías de render para un Tetris

| Opción               | Bundle (min)                        | Rendimiento                           | Curva      | Capacidades visuales                                                                              | Móvil                                       | Veredicto                                             |
| -------------------- | ----------------------------------- | ------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| **Canvas 2D nativo** | 0 KB                                | Sobrado para 10×20 (≈300 rects/frame) | baja       | Gradientes, sombras, partículas simples; sin bloom real (se puede simular con `shadowBlur`/capas) | excelente                                   | **Base por defecto**                                  |
| DOM/CSS Grid         | 0 KB                                | OK pero layout thrash con animaciones | baja       | Limitado                                                                                          | bueno                                       | Solo para HUD/menús                                   |
| PixiJS v8            | ≈450 KB                             | Muy alto (batching, WebGPU/WebGL)     | media      | Filtros (bloom, glow), partículas, shaders 2D                                                     | muy bueno                                   | Buena alternativa "premium 2D"; no aporta 3D          |
| **three.js r185**    | ≈600 KB–1.2 MB (tree-shaking ayuda) | Alto                                  | media-alta | 3D real, iluminación, InstancedMesh, bloom TSL, WebGPU                                            | bueno (con cuidado de pixelRatio y post-FX) | **Renderer premium opcional**, cargado bajo demanda   |
| Babylon.js           | > 1 MB                              | Alto                                  | alta       | 3D completo                                                                                       | bueno                                       | Excesivo                                              |
| Phaser 3/4           | ≈1 MB                               | Alto                                  | media      | Motor completo (escenas, input, audio)                                                            | bueno                                       | Impone su arquitectura; motor propio es más testeable |
| Kaplay               | ≈300 KB                             | Medio                                 | baja       | 2D casual                                                                                         | bueno                                       | Menos control                                         |
| WebGPU/WebGL puro    | 0 KB                                | Máximo                                | muy alta   | Todo, a mano                                                                                      | variable                                    | No compensa                                           |

**Decisión:** arquitectura **core agnóstico + renderers intercambiables**: `Canvas2DRenderer` (por defecto, cero dependencias, accesible, arranque instantáneo) y `ThreeRenderer` (opcional, `import()` dinámico solo si el usuario lo activa o si el dispositivo lo soporta bien). Ver informe 06.

## 3. Game loop

- `requestAnimationFrame` para render; **paso lógico fijo** (`LOGIC_HZ = 120`, dt = 8.333 ms) con acumulador: permite DAS/ARR en ms con resolución fina y determinismo (misma secuencia de entradas → mismo resultado).
- Clamp del delta (máx. 250 ms) para evitar la "espiral de la muerte"; al volver de pestaña oculta (`visibilitychange`) se **pausa** y se descarta el tiempo acumulado.
- El render no interpola (juego en cuadrícula); los efectos (partículas, shake, flashes) usan tiempo de render con easing.
- Pausa automática al perder foco (`blur`) y al ocultar la pestaña.

```ts
let acc = 0,
  last = performance.now();
function frame(now: number) {
  acc += Math.min(now - last, 250);
  last = now;
  while (acc >= STEP_MS) {
    game.step(STEP_MS);
    acc -= STEP_MS;
  }
  renderer.render(game.snapshot(), now);
  requestAnimationFrame(frame);
}
```

## 4. Entrada

- Teclado: `keydown`/`keyup` por `event.code` (independiente de layout), ignorar `event.repeat` (DAS propio), `preventDefault` en teclas del juego (evitar scroll con flechas/espacio). Mapa remapeable persistido.
- Gamepad API: polling en cada paso lógico (`navigator.getGamepads()`), mapeo estándar (d-pad/stick, A/B rotar, LB/RB hold).
- Táctil: Pointer Events; gestos: arrastre horizontal (umbral = 1 celda), tap (rotar; mitad izquierda CCW / derecha CW), arrastre vertical lento (soft drop), flick rápido hacia abajo (hard drop, velocidad > 1.2 px/ms y > 60 px), deslizar arriba (hold). Botones en pantalla opcionales. `touch-action: none` sobre el tablero.

## 5. Canvas High-DPI y layout

- `canvas.width = cssW * dpr` con `dpr = min(devicePixelRatio, 2)`; `ctx.setTransform(dpr,0,0,dpr,0,0)`.
- `ResizeObserver` sobre el contenedor; tamaño de celda entero (`Math.floor`) para evitar seams; tablero centrado con letterboxing.
- Capas: fondo/grid cacheado en canvas offscreen; capa de tablero+pieza; capa de efectos. HUD en DOM (texto nítido, accesible).

## 6. Toolchain recomendado

```
pnpm create vite (vanilla-ts) → vite 8 + typescript 6 (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
eslint 10 flat config + typescript-eslint recommendedTypeChecked + prettier
vitest 5 (unit, coverage v8, umbral 90 % en src/core) · playwright 1.63 (e2e + screenshots)
lefthook (pre-commit: lint-staged-like con eslint/prettier; pre-push: typecheck+test)
knip (deps/exports muertos) · vite-plugin-pwa (offline) · @fontsource-variable/* para fuentes self-hosted
```

Scripts estándar: `dev`, `build`, `preview`, `lint`, `format`, `typecheck`, `test`, `test:watch`, `test:e2e`, `check` (= lint+typecheck+test+build).

## 7. Deploy: GitHub Pages con Actions

Workflow con `actions/checkout@v6`, `actions/setup-node@v5` (o pnpm/action-setup@v4 + cache), `actions/configure-pages@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v4`. `base: '/tetris-html/'` en Vite (o `process.env.BASE_PATH`). Pages en modo "GitHub Actions" (no rama gh-pages). PWA con `generateSW`, `registerType: 'autoUpdate'`, `globPatterns: ['**/*.{js,css,html,svg,png,woff2}']`.

## 8. Rendimiento y presupuestos

| Métrica                            | Presupuesto                                                 |
| ---------------------------------- | ----------------------------------------------------------- |
| JS inicial (gz)                    | ≤ 60 KB sin three.js; three.js en chunk aparte ≤ 250 KB gz  |
| Tiempo a interactivo (móvil medio) | < 2 s                                                       |
| Frame time                         | ≤ 4 ms lógica+render en Canvas 2D; 60 fps estables en móvil |
| Latencia de entrada                | procesar en el siguiente paso lógico (≤ 8.3 ms)             |
| Lighthouse (PWA/perf/a11y)         | ≥ 95                                                        |

Medición: `performance.now()` por fase, overlay de debug (fps, step time), Lighthouse CI en PR (treosh/lighthouse-ci-action@v12, 3 runs).

## 9. Persistencia

`localStorage` con un único documento versionado `tetris-html:v1` `{ version, settings, keymap, highscores[], stats }` y migraciones por versión. IndexedDB solo si se guardan replays largos (futuro).

## 10. Riesgos

- TS 7 vs typescript-eslint: revisar trimestralmente.
- Vitest 5 y Vite 8 son recientes: fijar versiones exactas con `pnpm-lock.yaml`.
- three.js cambia API entre releases (r1xx): fijar `0.185.x` y aislarlo tras la interfaz `Renderer`.

## Referencias

- https://vite.dev/blog/announcing-vite8 · https://vite.dev/guide/migration
- https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html · https://www.infoq.com/news/2026/08/typescript-7-released/
- https://vitest.dev/blog/vitest-5.html · https://vitest.dev/guide/migration/
- https://typescript-eslint.io/getting-started/typed-linting/ · https://typescript-eslint.io/users/configs/
- https://appscale.blog/en/blog/pixijs-vs-threejs-web-graphics-engine-comparison-2026
- https://threejs.org/manual/en/webgpurenderer.html · https://github.com/mrdoob/three.js/releases
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages · https://github.com/actions/deploy-pages
- https://vite-pwa-org.netlify.app/workbox/generate-sw
- https://isaacsukin.com/news/2015/01/detailed-explanation-javascript-game-loops-and-timing · https://jakesgordon.com/writing/javascript-game-foundations-the-game-loop/
- https://github.com/treosh/lighthouse-ci-action · https://www.pkgpulse.com/guides/husky-vs-lefthook-vs-lint-staged-git-hooks-nodejs-2026
