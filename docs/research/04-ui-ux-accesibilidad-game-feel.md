# 04 · UI/UX, accesibilidad y game feel

- **Fecha:** 2026-09-07 · **Estado:** vigente

## 1. Referencias de excelencia

| Juego                       | Qué copiar                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| TETR.IO                     | Handling configurable (DAS/ARR/SDF), estadísticas PPS/APM/finesse, HUD sobrio, cola de 5, feedback de spins, ARR 0          |
| Tetris Effect               | Estética envolvente reactiva a la música, partículas en line clear, transiciones de nivel, "Zone" (fuera de alcance)        |
| Jstris                      | Arranque instantáneo, minimalismo, modos Sprint/Ultra/Zen, teclas remapeables                                               |
| Puyo Puyo Tetris            | Claridad de HUD y animaciones legibles                                                                                      |
| Tetris (móvil, PlayStudios) | Gestos táctiles estándar: swipe lateral mueve, tap rota, swipe abajo hard drop, arrastre abajo soft drop, swipe arriba hold |

Layout HUD estándar: **hold a la izquierda arriba**, **next (5) a la derecha**, score/level/lines/tiempo bajo hold o bajo next, estadísticas (PPS, APM, finesse) discretas. Tablero con proporción 1:2; celda ≥ 24 px en móvil, ≈ 32-40 px en escritorio.

## 2. Responsive

- Escritorio (landscape): tablero centrado, paneles laterales de 4 celdas de ancho.
- Móvil (portrait): tablero ocupa el ancho disponible menos márgenes; hold y next arriba en una fila compacta; score en la parte superior; controles táctiles sobre el tablero; `env(safe-area-inset-*)`; `100dvh`.
- Fullscreen API en botón; `screen.orientation.lock('portrait')` best-effort.
- Tamaño de celda = `floor(min(availW/10, availH/20))`.

## 3. Controles táctiles (umbrales)

| Gesto              | Regla                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Mover              | arrastre horizontal; cada `cellSize` px recorridos = 1 celda (movimiento relativo, sin DAS) |
| Rotar              | tap (< 200 ms, < 10 px): mitad derecha CW, mitad izquierda CCW (configurable "tap = CW")    |
| Soft drop          | arrastre vertical > 0.6 celdas con velocidad < 1.2 px/ms                                    |
| Hard drop          | flick vertical: velocidad > 1.2 px/ms y desplazamiento > 60 px                              |
| Hold               | swipe hacia arriba > 40 px                                                                  |
| Botones opcionales | fila inferior con 44×44 px mínimo: ◀ ▶ ⟲ ⟳ ▼ ⤓ HOLD                                         |

## 4. Accesibilidad

- **Color no es el único canal:** paleta accesible opcional basada en Okabe-Ito (segura para deuteranopia/protanopia/tritanopia) + **patrones/símbolos por pieza** opcionales.

| Pieza | Paleta neón (por defecto) | Paleta accesible (Okabe-Ito) |
| ----- | ------------------------- | ---------------------------- |
| I     | `#22E5FF`                 | `#56B4E9` (sky blue)         |
| J     | `#4A6BFF`                 | `#0072B2` (blue)             |
| L     | `#FF9F1C`                 | `#E69F00` (orange)           |
| O     | `#FFE600`                 | `#F0E442` (yellow)           |
| S     | `#3BFF7A`                 | `#009E73` (bluish green)     |
| T     | `#C05CFF`                 | `#CC79A7` (reddish purple)   |
| Z     | `#FF3B5C`                 | `#D55E00` (vermillion)       |

- **Alto contraste:** fondo `#000`, bordes de celda blancos, sin bloom.
- **Reducir movimiento:** respetar `prefers-reduced-motion` y ajuste manual → sin shake, sin partículas, transiciones instantáneas.
- **Lectores de pantalla:** `aria-live="polite"` para eventos importantes (line clear, level up, game over), con throttling (≤ 1 anuncio/s); menús con foco visible y navegación por teclado; botones con `aria-label`.
- **Motor:** teclas remapeables (todas las acciones), DAS/ARR/SDF ajustables, pausa automática al perder foco, objetivos táctiles ≥ 44 px, sin parpadeos > 3 Hz.
- Cumplir Game Accessibility Guidelines nivel básico + intermedio (modo daltónico, velocidad ajustable = nivel inicial/gravedad en Zen).

## 5. Game feel ("juice")

| Efecto                   | Parámetros iniciales                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen shake (hard drop) | trauma 0.25 (+0.15 por tetris), shake = trauma², decaimiento 1.5/s, amplitud máx 6 px, rotación ±0.5°                                                                         |
| Line clear               | flash blanco 80 ms → contracción horizontal 120 ms (ease-in) → partículas 12-20 por celda hacia arriba (vida 400-600 ms, gravedad); filas superiores caen con ease-out 120 ms |
| Lock                     | destello de la pieza 60 ms (alpha 0.8→0)                                                                                                                                      |
| Hard drop trail          | rastro vertical alpha 0.35→0 en 120 ms                                                                                                                                        |
| Ghost                    | contorno + relleno alpha 0.2                                                                                                                                                  |
| Combo/B2B/T-spin popup   | texto sobre el tablero, escala 0.8→1.1→1 (200 ms), color por intensidad, desaparece a 900 ms                                                                                  |
| Level up                 | banda horizontal con easing y cambio de tonalidad del fondo (300 ms)                                                                                                          |
| Peligro                  | viñeta roja pulsante (alpha 0.15-0.3, 1 Hz) cuando la pila ≥ fila 15                                                                                                          |
| Tetris / Perfect clear   | "hit stop" 60 ms (congelar render, no lógica) + bloom extra en three                                                                                                          |

Easings: `easeOutCubic` para caídas, `easeOutBack` para popups, `easeInQuad` para desvanecimientos.

## 6. Estética

- Dirección: **neón sobre oscuro** ("synthwave sobrio"): fondo `#0B0F1A` → gradiente a `#141A2E`, grid `rgba(255,255,255,0.05)`, texto `#E6EDF3`, acento `#22E5FF`, acento cálido `#FF9F1C`.
- Tema claro alternativo: fondo `#F5F7FB`, tablero `#FFFFFF`, texto `#111827`.
- Tipografía: fuente del sistema para UI (`system-ui`), números con `font-variant-numeric: tabular-nums`; fuente display opcional self-hosted (`@fontsource-variable/orbitron`) para título y marcadores — sin depender de CDN para funcionar offline.

## 7. Flujo de pantallas

`title → (mode select | settings | records | how to play) → countdown 3·2·1 → playing ⇄ paused → results (score, líneas, nivel, tiempo, PPS, tetris rate, récord nuevo) → retry | title`.
Settings: Juego (modo por defecto, nivel inicial, ghost, next count, 180, SRS+), Handling (DAS/ARR/SDF/DCD, lock reset), Controles (remapeo teclado/gamepad, gestos), Audio (volúmenes, mute, vibración), Vídeo (renderer canvas/three, calidad, partículas, shake), Accesibilidad (paleta, patrones, alto contraste, reducir movimiento, anuncios).

## 8. Métricas locales

PPS = piezas / segundos; APM (single player: "líneas por minuto"); finesse = movimientos extra vs. óptimo (fase 2); tetris rate = líneas por tetris / líneas totales; tabla de récords por modo (top 10) con fecha.

## 9. Riesgos

- Gestos táctiles conflictivos (scroll/pull-to-refresh): `touch-action: none`, `overscroll-behavior: none`.
- Bloom en móvil: coste alto; degradar automáticamente.

## Referencias

- https://gameaccessibilityguidelines.com/full-list/ · https://gameaccessibilityguidelines.com/allow-controls-to-be-remapped-reconfigured/
- https://www.colorcontrast.org/color-blind-colors/ (paleta Wong/Okabe-Ito) · https://visme.co/blog/color-blind-friendly-palette/
- https://playstudios.helpshift.com/hc/en/16-tetris-mobile/faq/2944-tetris-controls/
- https://kidscancode.org/godot_recipes/4.x/2d/screen_shake/index.html (trauma shake) · https://valdemird.com/blog/game-feel-on-the-web/ · https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/
- https://www.gameuidatabase.com/gameData.php?id=199 (Tetris Effect) · https://tetrio.wiki.gg/wiki/Statistics · https://harddrop.com/wiki/Game_interface
