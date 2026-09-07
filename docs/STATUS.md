# Estado del proyecto (bitácora)

> **Lee esto primero.** Resume dónde está el proyecto, qué se hizo en la última sesión y qué sigue. Actualízalo al final de cada sesión de trabajo (humana o agente).

## Estado actual

- **Fase:** 2 (pulido) muy avanzada; fase 3 pendiente de una decisión de producto (renderer premium)
- **Versión:** 0.1.0 · **Demo:** https://genialcode2077.github.io/tetris-html/ · **Repo:** https://github.com/genialcode2077/tetris-html
- **Pruebas:** 89 unitarias y de propiedades + 22 de extremo a extremo (escritorio y móvil), todas en verde
- **Cobertura del motor:** 96 % de líneas, 85 % de ramas
- **Rendimiento medido:** paso lógico 35 µs (0,4 % del presupuesto); render p95 1,0 ms en escritorio y 1,2 ms en móvil (6 % del presupuesto de 60 fps)
- **Tamaño:** 21,7 KB de JavaScript comprimido y 2,8 KB de CSS
- **Accesibilidad:** auditoría axe-core WCAG A/AA sin violaciones en las cinco pantallas
- **Instalable y sin conexión:** service worker con 17 archivos precacheados, verificado cortando la red
- **Capturas:** `docs/assets/screenshots/` (`pnpm screenshots`)

## Próximos pasos (orden)

1. **Decidir el renderer premium** (ver `docs/research/07`, sección 2): PixiJS para 2D con resplandor, o three.js para volumen y cámara. La interfaz `Renderer` ya admite ambos con carga diferida.
2. Estadísticas de finesse (pulsaciones mínimas por colocación) y panel de resultados ampliado.
3. Repeticiones a partir de la semilla y las entradas; fantasma del récord propio.
4. Prueba manual con lector de pantalla y en un teléfono real (audio, gestos, vibración).
5. Presupuestos de Lighthouse en cada propuesta de cambio.

## Bloqueos / decisiones pendientes del usuario

- Renderer premium: elección entre PixiJS y three.js (o quedarse solo con Canvas 2D).
- Nombre visible "Blockfall" (ADR-0005): cambiar `APP_TITLE` en `src/app/config.ts` si se prefiere otro.
- Verificación de audio y de gestos táctiles: requiere una persona con un dispositivo real.

## Sesiones

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
