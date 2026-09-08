# 13 · Subida de basura y gravedad máxima

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** subida de basura y gravedad máxima para el modo práctica.

## Contexto / pregunta

El modo práctica es hoy una partida sin fin y sin prisa. Le falta lo que de verdad se entrena: aguantar bajo presión. Las dos formas habituales de ponerla son la basura que sube desde abajo y la gravedad al máximo, donde la pieza cae de golpe. Faltaba saber con qué reglas se hace en los juegos de referencia.

## Hallazgos

### Cuánta basura envía cada jugada

La wiki oficial publica la tabla que siguen los juegos de la especificación:

| Jugada            | Filas limpiadas | Filas de basura                          |
| ----------------- | --------------- | ---------------------------------------- |
| Simple            | 1               | 0                                        |
| Doble             | 2               | 1                                        |
| Triple            | 3               | 2                                        |
| Cuádruple         | 4               | 4                                        |
| Giro menor simple | 1               | 0                                        |
| Giro menor doble  | 2               | 1                                        |
| Giro simple       | 1               | 2                                        |
| Giro doble        | 2               | 4                                        |
| Giro triple       | 3               | 6                                        |
| Tablero vacío     | 1 a 4           | 10, más lo que corresponda a la limpieza |

Encadenar jugadas difíciles añade una fila más en los giros simples y menores, dos en el giro doble y en el cuádruple, y tres en el giro triple.

### Cómo entra y cómo se cancela

La basura no aparece al instante: se acumula en una cola y entra por debajo cuando el jugador coloca la siguiente pieza sin limpiar líneas. Si limpia, lo que enviaría se descuenta de esa cola en lugar de salir hacia fuera, y solo el sobrante se envía. Es lo que hace que defenderse y atacar sean la misma acción.

### Dónde va el hueco

Cada fila de basura lleva un hueco. Los juegos varían en si ese hueco se queda en la misma columna varias filas seguidas o cambia:

- Con basura del todo aleatoria, salen dos huecos alineados una de cada diez filas, tres una de cada cien y cuatro una de cada mil.
- Los juegos primeros cambiaban de columna cada nueve filas más o menos.
- Hay preferencias enfrentadas: la basura alineada se limpia de golpe y hace que la partida oscile mucho, mientras que la del todo aleatoria es más exigente y constante.

## Opciones y comparativa

| Opción                                 | Qué aporta                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------- |
| Basura del todo aleatoria en cada fila | La más dura, se limpia fila a fila                                            |
| Hueco fijo que cambia de vez en cuando | Permite construir un pozo y limpiar varias de golpe, que es lo que se entrena |
| Sin basura                             | Lo que hay ahora                                                              |

## Decisión recomendada

Añadir la subida de basura al modo práctica con **hueco que se mantiene y cambia con una probabilidad configurable**, que es el término medio entre las dos escuelas y el más útil para entrenar. Dos ajustes: cada cuántas piezas sube una fila y con qué probabilidad cambia de columna el hueco.

La cancelación se implementa con la tabla oficial: al limpiar líneas se descuenta de la basura pendiente antes de que entre. Así se practica la mecánica real y no una imitación.

La gravedad máxima ya se puede jugar eligiendo el nivel veinte, así que basta con dejarlo al alcance desde el modo práctica en lugar de añadir nada nuevo.

Todo se genera con la semilla de la partida, así que una repetición sigue reproduciéndose igual. Eso no es negociable: el motor es determinista y debe seguir siéndolo.

## Acción

- Reglas nuevas para la basura, con su cola y su cancelación según la tabla oficial.
- Generación de las filas con el generador de números de la partida, para no romper el determinismo.
- Ajustes en la pantalla de modos, visibles solo en práctica.
- Pruebas del motor: la tabla de ataque, la cancelación, la subida, el hueco y que una repetición con basura sigue dando el mismo resultado.

## Riesgos

Meter basura toca el tablero desde fuera del ciclo normal de la pieza, así que puede afectar al final de la partida y a la detección de giros. Se acota con pruebas de las dos cosas y dejándolo apagado salvo en el modo práctica.

## Referencias

- https://tetris.wiki/Garbage (tabla de ataque y mecánica de la cola)
- https://harddrop.com/wiki/Garbage (alineación de huecos y sus proporciones)
- Informe 01 de este directorio, sección 8, sobre la puntuación de cada jugada.
