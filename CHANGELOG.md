# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]
### Added
- Ajuste para reconocer giros de todas las piezas, no solo de la T, con la regla del inmóvil que usan los juegos competitivos actuales. Tiene tres valores y viene apagado, así que el comportamiento por omisión sigue siendo el de la especificación oficial.
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

- Medida de finesse: calcula las pulsaciones mínimas para cada colocación y muestra el porcentaje de colocaciones perfectas en el marcador y en los resultados, con aviso opcional cuando se gastan teclas de más.

- Repeticiones: cada partida se graba como semilla más lista de pulsaciones, así que ocupa unos pocos kilobytes y se reproduce exactamente igual. Se guarda la mejor de cada modo, se puede volver a ver desde los resultados, descargar como archivo y abrir una guardada.

- Traducción al inglés de toda la interfaz, con detección del idioma del navegador la primera vez y selector en Ajustes. El cambio es inmediato, sin recargar.

- Dos modos nuevos: reto diario, con la misma partida para todo el mundo cada día porque la semilla sale de la fecha, y modo práctica, sin fin y con velocidad constante.

### Added
- Ajuste para reconocer giros de todas las piezas, no solo de la T, con la regla del inmóvil que usan los juegos competitivos actuales. Tiene tres valores y viene apagado, así que el comportamiento por omisión sigue siendo el de la especificación oficial.
- Consejos que aparecen la primera vez que cada mecánica importa: la reserva de pieza, la caída rápida, el giro de la T, encadenar acciones difíciles, los combos, el tablero vacío y la pila en zona de peligro. Cada uno se muestra una sola vez, no interrumpe la partida y se pueden apagar en Ajustes.

### Changed
- La pieza azul cambia a un azul más profundo. Con protanopia era prácticamente el mismo color que la pieza morada, así que dos de las siete piezas eran indistinguibles para aproximadamente uno de cada doce hombres.
- La paleta de alto contraste se rehace entera: pese a su nombre, era la peor de las tres para daltonismo. Su par de piezas más parecido pasa de 2,6 a 9,1 de diferencia perceptual.
- Las etiquetas de las paletas en Ajustes describen lo que hace cada una, en vez de sugerir que la de alto contraste es la más accesible.
- En pantallas pequeñas el tablero se queda con todo el espacio que sobra en lugar de encogerse por una altura reservada a ojo. En un móvil de 360 puntos la celda pasa de 16 a 20 píxeles, y en uno de 320 de 13 a 17.

### Fixed
- `backdrop-filter` en pantallas superpuestas provocaba bloqueos de segundos (F-006).
- El viewport impedía ampliar la página, lo que incumple el criterio WCAG 1.4.4 (F-009).
- La fila de controles táctiles y la cola de piezas siguientes se salían de la pantalla en móviles estrechos (F-018).
- La animación de la cuenta atrás provocaba una barra de desplazamiento horizontal al ampliarse (F-019).
