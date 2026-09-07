# Investigaciones

Cada informe es fechado y termina con "Decisiones recomendadas" y "Riesgos". Las decisiones firmes se elevan a `docs/adr/`.

| #   | Tema                                                                                      | Fecha      | Estado           |
| --- | ----------------------------------------------------------------------------------------- | ---------- | ---------------- |
| 01  | [Reglas Tetris Guideline (SRS, scoring, gravedad, T-spin)](01-reglas-tetris-guideline.md) | 2026-09-07 | vigente          |
| 02  | [Stack, render y tooling](02-stack-render-y-tooling.md)                                   | 2026-09-07 | vigente          |
| 03  | [Audio y música](03-audio-y-musica.md)                                                    | 2026-09-07 | vigente          |
| 04  | [UI/UX, accesibilidad y game feel](04-ui-ux-accesibilidad-game-feel.md)                   | 2026-09-07 | vigente          |
| 05  | [Ingeniería y proceso agéntico](05-ingenieria-y-proceso-agentico.md)                      | 2026-09-07 | vigente          |
| 06  | [Renderer premium three.js](06-three-js-renderer-premium.md)                              | 2026-09-07 | vigente (fase 2) |

## Backlog de investigación (para iteraciones periódicas)

Orden sugerido; cada una produce un informe `NN-tema.md` y al menos una acción concreta:

1. Finesse y estadísticas avanzadas (APM/PPS/finesse faults) — referencia TETR.IO/Jstris. **Siguiente.**
2. Tuning de SFX con pruebas A/B (percepción de "impacto" del hard drop).
3. Tipografía y legibilidad del HUD en móviles pequeños (≤ 360 px).
4. Paleta y contraste: verificación con simuladores de daltonismo (Coblis, Chrome DevTools). Parcial: axe-core ya vigila el contraste en cada PR.
5. Rendimiento de partículas en Canvas 2D en gama baja (Moto G-class).
6. Onboarding: tutorial interactivo de 60 s (T-spin, hold, hard drop).
7. Replays y "ghost" de récord (grabación de entradas con semilla).
8. Renderer three.js: prototipo, medición de coste de bloom en móvil.
9. Modos extra: Zen, Ultra 3 min, garbage por combo (práctica), 20G.
10. Localización (es/en) y textos.
11. All-spin (regla inmóvil) y tabla 180 verificada.
12. Verificación de la tabla 180 de TETR.IO con pruebas in-game.

## Plantilla

```
# NN · Tema
- Fecha · Autor · Estado (borrador/vigente/superado por NN)
## Contexto / pregunta
## Hallazgos (con fuentes)
## Opciones y comparativa
## Decisión recomendada
## Acción (issue/PR/commit)
## Riesgos
## Referencias
```
