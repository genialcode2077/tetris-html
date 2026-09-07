# 07 · Validación del sistema y plan de la fase 3

- **Fecha:** 2026-09-07 · **Estado:** vigente
- **Objetivo:** comprobar que lo construido cumple las reglas y los presupuestos documentados, y decidir en qué invertir a continuación.

## 1. Resultados de la validación

### 1.1 Corrección del juego (motor)

Se añadió `src/core/maneuvers.test.ts`, que no prueba funciones sueltas sino **maniobras reales** que un jugador reconoce. Es la validación más fuerte de que las tablas SRS, la detección de giros y la puntuación están bien.

| Maniobra                    | Qué demuestra                                                                                            | Resultado |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | --------- |
| T-Spin Triple               | La 5ª prueba del kick `(-1,-2)` mete la T en un pozo de 3 filas; se puntúa 1600 y se activa back-to-back | correcto  |
| T-Spin Double tras Tetris   | Multiplicador back-to-back ×1.5 (1200 → 1800) más 50 de combo                                            | correcto  |
| Double normal tras cadena   | Rompe la cadena back-to-back y no aplica multiplicador                                                   | correcto  |
| I-spin en pozo de 1 columna | Kicks propios de la pieza I                                                                              | correcto  |
| Perfect clear               | Bono de 2000, y de 3200 cuando encadena con back-to-back                                                 | correcto  |
| Combos 1-2-3                | 0, 50 y 100 puntos de combo en nivel 1                                                                   | correcto  |
| Mini T-spin                 | Tres esquinas con una sola frontal y sin kick 1×2 puntúa 100                                             | correcto  |
| Fantasma                    | La posición final del hard drop coincide siempre con el fantasma                                         | correcto  |
| Fin de partida              | La pila alcanza la zona de aparición y termina por block out                                             | correcto  |

Dos aserciones iniciales estaban mal planteadas y el motor tenía razón: un Tetris que vacía el tablero **también** es perfect clear, y la segunda limpieza consecutiva suma combo. Ambos casos quedaron como prueba explícita.

Suite completa: 89 pruebas en 15 archivos. Cobertura del motor: 96 % de líneas y 85 % de ramas.

### 1.2 Rendimiento

| Medición                           | Valor              | Presupuesto      | Margen       |
| ---------------------------------- | ------------------ | ---------------- | ------------ |
| Paso lógico del motor              | 35 µs              | 8333 µs (120 Hz) | usa el 0,4 % |
| Coste de render por frame (p50)    | 0,8 ms             | 16,7 ms (60 fps) | usa el 5 %   |
| Coste de render por frame (p95)    | 1,0 ms             | 16,7 ms          | usa el 6 %   |
| Coste de render (máximo observado) | 2,3 ms             | 16,7 ms          | usa el 14 %  |
| JavaScript inicial                 | 21,7 KB comprimido | 60 KB            | usa el 36 %  |
| CSS inicial                        | 2,8 KB comprimido  | —                | —            |

El escenario medido es el peor caso: tablero lleno hasta la fila 16 con partículas y efectos activos. La conclusión práctica es que **hay presupuesto de sobra para un renderer mucho más ambicioso**, y que las optimizaciones pendientes de Canvas 2D (cachear el fondo, rectángulos sucios) no son urgentes.

### 1.3 Accesibilidad

Auditoría automática con axe-core sobre las cinco pantallas principales, con las reglas WCAG 2.0/2.1/2.2 de niveles A y AA. Una única violación real encontrada y corregida: el `viewport` impedía hacer zoom, lo que incumple el criterio 1.4.4 sobre redimensionar texto. Se eliminó `user-scalable=no`; los gestos del juego siguen sin provocar zoom porque el tablero declara `touch-action: none`.

La herramienta automática cubre entre el 30 % y el 50 % de los criterios, así que sigue pendiente una prueba manual con lector de pantalla y navegación solo por teclado.

### 1.4 Aplicación instalable y sin conexión

Se añadió `vite-plugin-pwa` con estrategia de precarga: 17 archivos y 278 KB en caché. El manifest declara nombre, ámbito, color de tema e iconos de 192 y 512 píxeles, incluidos los recortables para Android. Los iconos se generan con `pnpm icons`, un script que dibuja el logotipo y lo captura con el navegador de Playwright, así que no dependen de ningún binario externo ni de un editor gráfico.

Una prueba automática corta la red y recarga la página para comprobar que el juego arranca y se puede navegar sin conexión.

## 2. Decisión pendiente: el renderer premium

Es la bifurcación principal del proyecto y conviene tomarla con datos.

| Criterio                | Canvas 2D (actual)  | PixiJS 8                    | three.js 0.185                   |
| ----------------------- | ------------------- | --------------------------- | -------------------------------- |
| Peso añadido comprimido | 0 KB                | ~150 KB                     | ~250 KB                          |
| Naturaleza              | 2D por CPU          | 2D por GPU                  | 3D real                          |
| Resplandor y destellos  | imitado con sombras | filtro de resplandor nativo | resplandor real por post-proceso |
| Partículas              | cientos             | decenas de miles            | decenas de miles                 |
| Profundidad y cámara    | no                  | no                          | sí, es su razón de ser           |
| Riesgo                  | ninguno             | bajo                        | medio                            |

Ambas opciones caben detrás de la interfaz `Renderer` que ya existe y se cargarían solo si el jugador las activa, así que la versión ligera nunca paga su coste.

La recomendación técnica para una rejilla plana sería PixiJS. La recomendación de producto es three.js si se busca que el juego se vea distinto de los demás: bloques con volumen, cámara que reacciona, iluminación que responde a las líneas eliminadas. El coste real de esa diferencia son unos 250 KB que solo descarga quien elige ese modo.

## 3. Plan propuesto

**Ya entregado en esta sesión:** validación por maniobras, presupuestos de rendimiento medidos y vigilados en integración continua, auditoría de accesibilidad automatizada, y aplicación instalable que funciona sin conexión.

**Siguiente bloque, sin dependencias:**

1. Estadísticas de finesse: contar las pulsaciones mínimas para cada colocación y mostrar los fallos. Es lo que distingue a un juego para jugadores serios.
2. Repeticiones: guardar semilla y entradas permite revivir partidas y comparar con el récord propio, y cuesta poco porque el motor ya es determinista.
3. Prueba manual con lector de pantalla y en un teléfono real.
4. Presupuestos de Lighthouse en cada propuesta de cambio.

**Bloque dependiente de la decisión anterior:** el renderer premium, con detección de capacidades y vuelta atrás automática a Canvas 2D.

## Referencias

- https://web.dev/articles/canvas-performance · https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas
- https://playwright.dev/docs/accessibility-testing · https://www.npmjs.com/package/@axe-core/playwright
- https://vite-pwa-org.netlify.app/workbox/generate-sw · https://logofoundry.app/blog/pwa-icon-requirements-safe-areas
- https://appscale.blog/en/blog/pixijs-vs-threejs-web-graphics-engine-comparison-2026 · https://pixijs.com/8.x/guides/components/filters
- https://harddrop.com/wiki/Finesse · https://tetris.wiki/Movement_finesse
- https://www.corewebvitals.io/core-web-vitals/interaction-to-next-paint
