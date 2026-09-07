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
- [~] Accesibilidad: paleta daltónica, patrones, alto contraste, reducir movimiento, ARIA live, foco — implementados, sin auditoría con lector de pantalla
- [ ] PWA offline + iconos + manifest
- [~] E2E Playwright (smoke) · pendiente: capturas de regresión visual y Lighthouse CI
- [x] Modo Zen; estadísticas PPS/tetris rate/combos en resultados

## Fase 3 · Premium

- [ ] Renderer three.js (WebGPU/WebGL2, InstancedMesh, bloom TSL, fallback)
- [ ] Replays (semilla + entradas) y fantasma de récord
- [ ] Finesse y estadísticas avanzadas; tutorial interactivo; i18n es/en
- [ ] Tabla 180 verificada y all-spin opcional

## Fase 4 · Mejora continua (investigaciones periódicas)

- [ ] Ejecutar `docs/research/README.md` → backlog, un informe por iteración, acción concreta por informe
- [ ] Revisión trimestral de versiones (TS 7 / typescript-eslint, Vite, three)
