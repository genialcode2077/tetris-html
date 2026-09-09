# Changelog

Formato [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/), versionado [SemVer](https://semver.org/lang/es/).

## [Unreleased]

### Added

- Pruebas del bucle de juego, que era el único módulo de su carpeta sin ninguna: paso fijo, arrastre del tiempo sobrante entre cuadros, orden de lógica antes de dibujado, tope de parón y reinicio del reloj. Incluyen un presupuesto de latencia que fija cuánto espera una pulsación en pantallas de 30 a 240 Hz.

### Fixed
- El sonido del tetris era el más flojo de las cuatro limpiezas, por debajo incluso del de una línea simple, pese a tener el volumen nominal más alto. Medida la sonoridad de los veintiséis efectos con el algoritmo de la UIT-R BS.1770, la recompensa sonora ahora crece con la jugada. La caída rápida, que suena en cada pieza, baja para no competir con las limpiezas.

### Added
- El modo práctica puede empezar con una posición ya montada: giro doble de la T, giro triple, vaciar el tablero y giro por encaje. Cada una trae su tablero y su cola de piezas fija, así la misma jugada se repite hasta que sale sin volver al menú.
- Al ver una repetición aparece una barra con volver al principio, pausar, velocidad y salir, más un indicador de avance. La velocidad va de la mitad al doble y se maneja también con el teclado, siguiendo los requisitos de accesibilidad para reproducir contenido.
- En Sprint y en el reto diario, al cruzar cada diez líneas se muestra cuánto se va por delante o por detrás de tu mejor marca, en verde o en naranja. El panel del modo enseña además el récord como referencia. Los récords guardan ahora los tiempos parciales.
- El modo práctica admite subida de basura y niveles hasta el veinte, donde la pieza cae de golpe. La basura sube cada tantas piezas con un hueco que a veces cambia de columna, y limpiar líneas la cancela según la tabla oficial. Todo se genera con la semilla de la partida, así que una repetición sigue reproduciéndose igual.
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
- El modo práctica admite subida de basura y niveles hasta el veinte, donde la pieza cae de golpe. La basura sube cada tantas piezas con un hueco que a veces cambia de columna, y limpiar líneas la cancela según la tabla oficial. Todo se genera con la semilla de la partida, así que una repetición sigue reproduciéndose igual.
- Ajuste para reconocer giros de todas las piezas, no solo de la T, con la regla del inmóvil que usan los juegos competitivos actuales. Tiene tres valores y viene apagado, así que el comportamiento por omisión sigue siendo el de la especificación oficial.
- Consejos que aparecen la primera vez que cada mecánica importa: la reserva de pieza, la caída rápida, el giro de la T, encadenar acciones difíciles, los combos, el tablero vacío y la pila en zona de peligro. Cada uno se muestra una sola vez, no interrumpe la partida y se pueden apagar en Ajustes.

### Changed
- Las partículas ajustan solas su número según lo que cuesta dibujar. En una máquina holgada no cambia nada; en una que va justa se ven menos partículas en lugar de perderse cuadros. Con el procesador seis veces más lento, el peor cuadro pasa de 114 a 8,4 milisegundos.
- La pieza azul cambia a un azul más profundo. Con protanopia era prácticamente el mismo color que la pieza morada, así que dos de las siete piezas eran indistinguibles para aproximadamente uno de cada doce hombres.
- La paleta de alto contraste se rehace entera: pese a su nombre, era la peor de las tres para daltonismo. Su par de piezas más parecido pasa de 2,6 a 9,1 de diferencia perceptual.
- Las etiquetas de las paletas en Ajustes describen lo que hace cada una, en vez de sugerir que la de alto contraste es la más accesible.
- En pantallas pequeñas el tablero se queda con todo el espacio que sobra en lugar de encogerse por una altura reservada a ojo. En un móvil de 360 puntos la celda pasa de 16 a 20 píxeles, y en uno de 320 de 13 a 17.

### Fixed
- `backdrop-filter` en pantallas superpuestas provocaba bloqueos de segundos (F-006).
- El viewport impedía ampliar la página, lo que incumple el criterio WCAG 1.4.4 (F-009).
- La fila de controles táctiles y la cola de piezas siguientes se salían de la pantalla en móviles estrechos (F-018).
- La animación de la cuenta atrás provocaba una barra de desplazamiento horizontal al ampliarse (F-019).
