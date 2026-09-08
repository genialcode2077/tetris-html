# Investigaciones

Cada informe es fechado y termina con "Decisiones recomendadas" y "Riesgos". Las decisiones firmes se elevan a `docs/adr/`.

| #   | Tema                                                                                         | Fecha      | Estado  |
| --- | -------------------------------------------------------------------------------------------- | ---------- | ------- |
| 01  | [Reglas Tetris Guideline (SRS, scoring, gravedad, T-spin)](01-reglas-tetris-guideline.md)    | 2026-09-07 | vigente |
| 02  | [Stack, render y tooling](02-stack-render-y-tooling.md)                                      | 2026-09-07 | vigente |
| 03  | [Audio y música](03-audio-y-musica.md)                                                       | 2026-09-07 | vigente |
| 04  | [UI/UX, accesibilidad y game feel](04-ui-ux-accesibilidad-game-feel.md)                      | 2026-09-07 | vigente |
| 05  | [Ingeniería y proceso agéntico](05-ingenieria-y-proceso-agentico.md)                         | 2026-09-07 | vigente |
| 06  | [Renderer premium three.js](06-three-js-renderer-premium.md)                                 | 2026-09-07 | vigente |
| 07  | [Validación del sistema y plan de la fase 3](07-validacion-y-plan-fase-3.md)                 | 2026-09-07 | vigente |
| 08  | [Legibilidad y espacio en móviles pequeños](08-legibilidad-y-espacio-en-moviles-pequenos.md) | 2026-09-07 | vigente |

## Backlog de investigación (para iteraciones periódicas)

Orden sugerido; cada una produce un informe `NN-tema.md` y al menos una acción concreta. Los temas ya cubiertos quedan marcados para no repetirlos.

| Tema                                                       | Estado                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------- |
| Finesse y estadísticas avanzadas                           | hecho, sesión 3                                         |
| Repeticiones y fantasma del récord                         | hecho (falta el fantasma), sesión 3                     |
| Renderer three.js                                          | hecho, informe 06 y sesión 3                            |
| Modos extra (Zen, reto diario, práctica)                   | hecho (falta basura y 20G), sesión 3                    |
| Traducción es/en                                           | hecho, sesión 3                                         |
| Tipografía y espacio en móviles de 360 puntos o menos      | hecho, informe 08                                       |
| Tuning de efectos de sonido con escucha comparada          | **siguiente**, requiere una persona que escuche         |
| Paleta y contraste con simuladores de daltonismo           | parcial: axe-core ya vigila el contraste en cada cambio |
| Rendimiento de partículas en un teléfono de gama baja      | pendiente, requiere dispositivo real                    |
| Tutorial interactivo de un minuto                          | pendiente                                               |
| All-spin (regla inmóvil) y tabla de giro de 180 verificada | pendiente                                               |

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
