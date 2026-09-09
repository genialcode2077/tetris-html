# Investigaciones

Cada informe es fechado y termina con "Decisiones recomendadas" y "Riesgos". Las decisiones firmes se elevan a `docs/adr/`.

| #   | Tema                                                                                                 | Fecha      | Estado  |
| --- | ---------------------------------------------------------------------------------------------------- | ---------- | ------- |
| 01  | [Reglas Tetris Guideline (SRS, scoring, gravedad, T-spin)](01-reglas-tetris-guideline.md)            | 2026-09-07 | vigente |
| 02  | [Stack, render y tooling](02-stack-render-y-tooling.md)                                              | 2026-09-07 | vigente |
| 03  | [Audio y música](03-audio-y-musica.md)                                                               | 2026-09-07 | vigente |
| 04  | [UI/UX, accesibilidad y game feel](04-ui-ux-accesibilidad-game-feel.md)                              | 2026-09-07 | vigente |
| 05  | [Ingeniería y proceso agéntico](05-ingenieria-y-proceso-agentico.md)                                 | 2026-09-07 | vigente |
| 06  | [Renderer premium three.js](06-three-js-renderer-premium.md)                                         | 2026-09-07 | vigente |
| 07  | [Validación del sistema y plan de la fase 3](07-validacion-y-plan-fase-3.md)                         | 2026-09-07 | vigente |
| 08  | [Legibilidad y espacio en móviles pequeños](08-legibilidad-y-espacio-en-moviles-pequenos.md)         | 2026-09-07 | vigente |
| 09  | [Distinguibilidad de la paleta para daltonismo](09-distinguibilidad-de-la-paleta-para-daltonismo.md) | 2026-09-07 | vigente |
| 10  | [Aprendizaje contextual en lugar de tutorial](10-aprendizaje-contextual-en-lugar-de-tutorial.md)     | 2026-09-08 | vigente |
| 11  | [Giros de todas las piezas y regla del inmóvil](11-giros-de-todas-las-piezas.md)                     | 2026-09-08 | vigente |
| 12  | [Coste de las partículas en equipos lentos](12-coste-de-las-particulas-en-equipos-lentos.md)         | 2026-09-08 | vigente |
| 13  | [Subida de basura y gravedad máxima](13-basura-y-gravedad-maxima.md)                                 | 2026-09-08 | vigente |
| 14  | [Comparar con tu récord por hitos](14-comparar-con-tu-record-por-hitos.md)                           | 2026-09-08 | vigente |
| 15  | [Controles al ver una repetición](15-controles-al-ver-una-repeticion.md)                             | 2026-09-08 | vigente |
| 16  | [Posiciones preparadas para entrenar](16-posiciones-preparadas-para-entrenar.md)                     | 2026-09-08 | vigente |
| 17  | [Sonoridad medida de los efectos](17-sonoridad-medida-de-los-efectos.md)                             | 2026-09-08 | vigente |

## Backlog de investigación (para iteraciones periódicas)

Orden sugerido; cada una produce un informe `NN-tema.md` y al menos una acción concreta. Los temas ya cubiertos quedan marcados para no repetirlos.

| Tema                                                     | Estado                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Finesse y estadísticas avanzadas                         | hecho, sesión 3                                                                 |
| Repeticiones y fantasma del récord                       | hecho (falta el fantasma), sesión 3                                             |
| Renderer three.js                                        | hecho, informe 06 y sesión 3                                                    |
| Modos extra (Zen, reto diario, práctica)                 | hecho (falta basura y 20G), sesión 3                                            |
| Traducción es/en                                         | hecho, sesión 3                                                                 |
| Tipografía y espacio en móviles de 360 puntos o menos    | hecho, informe 08                                                               |
| Tuning de efectos de sonido con escucha comparada        | equilibrio medido y corregido, informe 17; el timbre sigue necesitando oído     |
| Paleta y contraste con simuladores de daltonismo         | hecho, informe 09                                                               |
| Rendimiento de partículas en un teléfono de gama baja    | hecho con freno de procesador, informe 12; falta probarlo en un teléfono real   |
| Tutorial interactivo de un minuto                        | descartado por la evidencia; sustituido por consejos contextuales, informe 10   |
| All-spin (regla inmóvil) y tabla de giro de 180          | hecho el all-spin, informe 11; la tabla de 180 sigue sin fuente pública (F-001) |
| Subida de basura y gravedad máxima para el modo práctica | hecho, informe 13                                                               |
| Fantasma del récord en Sprint                            | descartado por la evidencia; sustituido por comparación por hitos, informe 14   |
| Controles de avance y velocidad al ver una repetición    | hecho, informe 15                                                               |
| Posiciones preparadas en el modo práctica                | hecho, informe 16                                                               |
| Prueba en un teléfono real y con lector de pantalla      | **siguiente**: necesita a alguien con un dispositivo                            |
| Latencia de entrada: de la pulsación al cuadro dibujado  | pendiente                                                                       |

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
