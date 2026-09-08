# Estado del proyecto (bitácora)

> **Lee esto primero.** Resume dónde está el proyecto, qué se hizo en la última sesión y qué sigue. Actualízalo al final de cada sesión de trabajo (humana o agente).

## Estado actual

- **Fase:** 3 en curso; el renderer premium 3D ya está entregado
- **Versión:** 0.1.0 · **Demo:** https://genialcode2077.github.io/tetris-html/ · **Repo:** https://github.com/genialcode2077/tetris-html
- **Pruebas:** 114 unitarias y de propiedades + 41 de extremo a extremo (escritorio y móvil), todas en verde
- **Cobertura del motor:** 96 % de líneas, 85 % de ramas
- **Rendimiento medido:** paso lógico 35 µs (0,4 % del presupuesto); render p95 1,0 ms en escritorio y 1,2 ms en móvil (6 % del presupuesto de 60 fps)
- **Tamaño:** 23,0 KB de JavaScript comprimido y 2,9 KB de CSS; el modo 3D son 238 KB aparte que solo descarga quien lo activa
- **Accesibilidad:** auditoría axe-core WCAG A/AA sin violaciones en las cinco pantallas
- **Instalable y sin conexión:** service worker con 17 archivos precacheados, verificado cortando la red
- **Capturas:** `docs/assets/screenshots/` (`pnpm screenshots`)

## Próximos pasos (orden)

1. Tutorial interactivo de un minuto (mover, rotar, hold, hard drop, T-spin).
2. Posiciones preparadas en el modo práctica; subida de basura y 20G.
3. Prueba manual con lector de pantalla y en un teléfono real (audio, gestos, vibración, modo 3D en GPU móvil).

## Bloqueos / decisiones pendientes del usuario

- Nombre visible "Blockfall" (ADR-0005): cambiar `APP_TITLE` en `src/app/config.ts` si se prefiere otro.
- Verificación de audio y de gestos táctiles: requiere una persona con un dispositivo real.

## Sesiones

### 2026-09-07 · Sesión 4 (agente, iteración periódica) — espacio en móviles pequeños

- Tema del backlog: legibilidad del marcador en pantallas de 360 puntos o menos (informe `docs/research/08`).
- La medición cambió el diagnóstico: la tipografía ya estaba bien a 16 píxeles; lo que fallaba era el reparto del espacio. El tablero ocupaba 160 puntos de los 360 disponibles porque el ancho se calculaba restando una altura fija de 300 píxeles.
- Ahora el contenedor del juego reparte el alto con una rejilla y el tablero se queda con lo que sobra. La celda pasa de 16 a 20 píxeles en un móvil de 360, y de 13 a 17 en uno de 320.
- Corregidos dos desbordamientos horizontales: los siete botones táctiles pedían más ancho del que había, y la animación de la cuenta atrás arrastraba la página al ampliarse.
- Prueba nueva que falla si el tablero se encoge por debajo de un tamaño de celda razonable, si algo se sale a lo ancho o si el marcador baja del mínimo legible.

### 2026-09-07 · Sesión 3 (agente Claude) — renderer 3D y finesse

- Decidido con el usuario: three.js para el renderer premium (ADR-0008), con las cuatro líneas de trabajo restantes aprobadas.
- `ThreeRenderer` completo: pozo con paredes iluminadas, cubos biselados por instancia, fantasma, partículas en tres dimensiones, sacudida y balanceo de cámara, pulso de luz al subir de nivel y aviso rojo cuando la pila sube.
- Resplandor con `RenderPipeline` y bloom de TSL. Se ajustó tras verlo en pantalla: la primera versión quemaba todo a blanco porque la emisión era global en lugar de venir del color de cada pieza.
- WebGPU con vuelta atrás automática a WebGL2 y, si tampoco hay, a Canvas 2D. Verificado con una prueba que simula un dispositivo sin GPU.
- Carga diferida real: el fragmento de three.js queda fuera de la precarga del service worker y se guarda en caché solo cuando alguien usa el modo.
- Coste de render en 3D: 1,9 ms en el percentil 95, dentro del presupuesto de 8 ms.
- Medida de finesse: pulsaciones mínimas por colocación con Dijkstra, porcentaje en el marcador y en resultados, y aviso opcional al gastar teclas de más. El primer intento usaba búsqueda en anchura y daba mínimos incorrectos.
- Las pruebas de extremo a extremo pasaron a tener su propio `tsconfig.json`, para poder usar tipos de Node sin contaminar el código del navegador.
- Repeticiones: semilla más lista de pulsaciones. La prueba clave comprueba que reproducir una partida da el mismo tablero, la misma puntuación y las mismas piezas.
- Traducción al inglés de toda la interfaz, con detección del idioma del navegador y cambio inmediato desde Ajustes.
- Modos nuevos: reto diario con semilla derivada de la fecha (misma partida para todos, sin servidor) y modo práctica sin fin.

### 2026-09-07 · Sesión 2 (agente Claude) — validación y aplicación instalable

- Validación del motor con maniobras reales en `src/core/maneuvers.test.ts`: T-Spin Triple con la 5ª prueba del kick, T-Spin Double con back-to-back, I-spin en pozo, perfect clear normal y encadenado, combos, mini T-spin y fin de partida. Todas correctas.
- Dos aserciones propias estaban mal y el motor tenía razón: un Tetris que vacía el tablero también es perfect clear, y la segunda limpieza consecutiva suma combo.
- Medido el rendimiento: 35 µs por paso lógico y 1,0 ms de render en el peor caso. Hay margen amplio para un renderer más ambicioso.
- Auditoría de accesibilidad con axe-core: una violación real corregida (el viewport impedía el zoom, criterio WCAG 1.4.4).
- Aplicación instalable y sin conexión con `vite-plugin-pwa`; iconos generados por script con Playwright (`pnpm icons`).
- Integración continua ampliada: ahora también verifica accesibilidad, presupuesto de render y funcionamiento sin conexión.
- Cerrado el PR de TypeScript 7 (incompatible con typescript-eslint) y rebasados los demás de Dependabot.
- Informe `docs/research/07-validacion-y-plan-fase-3.md` con los datos y el plan.

### 2026-09-07 · Sesión 1 (agente Claude)

- Investigación completa en `docs/research/01..06` (fuentes primarias: tetris.wiki vía curl; npm; docs de tooling).
- Verificado: TypeScript 7.0.2 incompatible con typescript-eslint 8.69 (`<6.1.0`) → se usa TS 6.0.3.
- Arquitectura y ADRs 0001-0007; AGENTS.md/CLAUDE.md; protocolo de iteración.
- Andamiaje del proyecto en curso; repositorio GitHub `genialcode2077/tetris-html` pendiente de crear.
- Hallazgos registrados en `docs/FINDINGS.md` (F-001..F-005).
