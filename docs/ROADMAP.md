# Roadmap

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho · `[-]` descartado. Cada tarea grande debe tener issue en GitHub cuando el repo exista.

## Fase 0 · Investigación y planificación (2026-09-07)

- [x] Investigación: reglas Guideline, stack, audio, UI/UX/a11y, proceso agéntico, three.js (`docs/research/`)
- [x] Arquitectura, ADRs, protocolo de iteración, AGENTS.md/CLAUDE.md
- [x] Andamiaje: Vite 8 + TS 6 + Vitest 5 + ESLint 10 + Prettier + lefthook + Playwright
- [x] Repositorio GitHub + CI + despliegue a GitHub Pages (https://genialcode2077.github.io/tetris-html/)

## Fase 1 · MVP jugable (objetivo: primera versión desplegada)

- [x] Motor `src/core`: piezas, SRS (kicks), 7-bag semillado, gravedad, lock delay (move reset 15), hold, ghost, hard/soft drop, líneas, scoring completo (combo, B2B, T-spin, perfect clear), top-out
- [x] Tests unitarios y de propiedades del motor (cobertura ≥ 90 %)
- [x] Loop de paso fijo + handling DAS/ARR/SDF
- [x] Renderer Canvas 2D (HiDPI, responsive) + HUD DOM (hold, next 5, score, nivel, líneas, tiempo)
- [x] Teclado remapeable (Guideline por defecto) + pausa automática al perder foco
- [x] Pantallas: título, modos (Marathon/Sprint/Ultra), countdown, pausa, resultados
- [x] Persistencia: ajustes y récords
- [x] Verificación visual en navegador + captura en `docs/STATUS.md`

## Fase 2 · Pulido y sensación

- [x] Audio procedural (SFX) + música chiptune original adaptativa + ajustes de volumen (pendiente afinar por escucha)
- [x] Game feel: shake, partículas, flashes, popups de combo/T-spin, viñeta de peligro, hit-stop
- [~] Controles táctiles (gestos + botones) y gamepad — implementados, sin verificar en dispositivo real
- [x] Accesibilidad: paleta daltónica, patrones, alto contraste, reducir movimiento, ARIA live, foco; auditoría axe-core WCAG A/AA en CI (falta prueba manual con lector de pantalla)
- [x] PWA offline + iconos generados por script + manifest con iconos recortables
- [x] E2E Playwright: flujo, capturas, accesibilidad, presupuesto de render y funcionamiento sin conexión · pendiente: Lighthouse CI
- [x] Modo Zen; estadísticas PPS/tetris rate/combos en resultados

## Fase 3 · Premium (decidida el 2026-09-07)

### 3.1 Renderer three.js (ADR-0008) — entregado

- [x] Dependencia `three@0.185.x` y `@types/three`; fragmento separado (238 KB comprimidos) y carga con `import()`
- [x] `ThreeRenderer` tras la interfaz `Renderer`: escena, cámara, pozo con paredes, pieza activa y fantasma
- [x] Celdas con `InstancedMesh` y color por instancia; cubos biselados
- [x] Iluminación de tres puntos y materiales con relieve; rejilla y paredes del pozo
- [x] Resplandor por post-proceso (`RenderPipeline` + bloom TSL) que se apaga solo si el coste se dispara
- [x] Efectos: sacudida y balanceo de cámara, partículas 3D al limpiar, filas que se encogen y giran, pulso de luz al subir de nivel y aviso de peligro
- [x] Detección de capacidades: WebGPU, luego WebGL2, luego Canvas 2D; verificado con una prueba que simula un dispositivo sin GPU
- [x] Selector en Ajustes con persistencia; presupuesto de render propio (p95 de 3,3 ms frente a 8 de límite)

### 3.2 Finesse y estadísticas

- [ ] Cálculo de las pulsaciones mínimas por colocación (búsqueda en anchura sobre el estado de la pieza)
- [ ] Contador de fallos de finesse en el HUD y en resultados; APM
- [ ] Panel de resultados ampliado con desglose por tipo de limpieza

### 3.3 Repeticiones

- [ ] Grabación de semilla, reglas y entradas con marca de tiempo; formato versionado
- [ ] Reproducción con controles de avance y velocidad
- [ ] Fantasma del récord propio en Sprint
- [ ] Exportar e importar como archivo

### 3.4 Tutorial y traducción

- [ ] Tutorial interactivo de un minuto: mover, rotar, hold, hard drop, T-spin
- [ ] Traducción a inglés con detección del idioma del navegador y selector

### 3.5 Modos adicionales

- [ ] Práctica de T-spins y de perfect clear con posiciones preparadas
- [ ] Subida de basura configurable y 20G
- [ ] Desafío diario con semilla derivada de la fecha

## Fase 4 · Mejora continua (investigaciones periódicas)

- [ ] Ejecutar `docs/research/README.md` → backlog, un informe por iteración, acción concreta por informe
- [ ] Revisión trimestral de versiones (TS 7 / typescript-eslint, Vite, three)
