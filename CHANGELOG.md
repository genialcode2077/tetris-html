# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### Added
- Investigación inicial (`docs/research/01..06`), arquitectura, ADRs 0001-0007, protocolo de iteración, AGENTS.md/CLAUDE.md.
- Andamiaje: Vite 8, TypeScript 6, Vitest 5, Playwright, ESLint 10, Prettier, lefthook, CI y despliegue a GitHub Pages.
- Motor determinista (`src/core`): SRS con kicks Guideline y SRS+, 7-bag semillado, gravedad Guideline, lock delay con move reset, hold, ghost, T-spin (3 esquinas + mini + kick 5), scoring completo (B2B, combo, perfect clear), modos Marathon/Sprint/Ultra/Zen.
- Loop de paso fijo a 120 Hz, handling DAS/ARR/SDF/DCD, sesión con cuenta atrás y estadísticas (PPS, tetris rate).
- Renderer Canvas 2D HiDPI con fantasma, animación de limpieza, partículas, shake por trauma, rastro de hard drop y viñeta de peligro; HUD en DOM con hold/next y popups.
- Pantallas: título, modos, ajustes (handling, reglas, teclas remapeables, audio, vídeo, accesibilidad), récords, ayuda, pausa y resultados; persistencia versionada en localStorage.
- Audio procedural: sintetizador estilo ZzFX (26 SFX) y música chiptune original adaptativa al nivel con capa de peligro.
- Entrada: teclado (`event.code`), gamepad estándar y gestos táctiles con botones opcionales.
- Gancho de depuración/e2e `window.__blockfall` (solo dev/`VITE_E2E`).
- Aplicación instalable que funciona sin conexión: service worker con precarga, manifest con iconos normales y recortables, e iconos generados por script (`pnpm icons`).
- Validación del motor con maniobras reales (T-Spin Triple con kick, back-to-back, perfect clear, combos, mini T-spin, I-spin).
- Pruebas de accesibilidad con axe-core (WCAG A y AA) y de presupuesto de render, ambas vigiladas en integración continua.

- Modo de dibujo en tres dimensiones opcional con three.js (ADR-0008): cubos con volumen, pozo con paredes, resplandor por post-proceso, partículas y cámara que reacciona. Se descarga aparte y vuelve al modo clásico si el dispositivo no lo soporta.

### Fixed
- `backdrop-filter` en pantallas superpuestas provocaba bloqueos de segundos (F-006).
- El viewport impedía ampliar la página, lo que incumple el criterio WCAG 1.4.4 (F-009).
