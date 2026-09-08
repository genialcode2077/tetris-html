# 16 · Posiciones preparadas para entrenar

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** posiciones preparadas en el modo práctica.

## Contexto / pregunta

El modo práctica ya permite jugar sin fin, con basura y con gravedad máxima. Le falta lo más útil para aprender: empezar con una situación concreta ya montada y repetirla hasta que salga. Faltaba saber qué situaciones merece la pena preparar.

## Hallazgos

### El giro de la T que asciende por el kick

La wiki de Hard Drop documenta una regla que no es evidente y que cuesta descubrir jugando:

> Si la pieza T entra usando el ajuste del giro triple, que es la última prueba del sistema de rotación en las transiciones desde la posición de aparición hacia la derecha o desde la media vuelta hacia la izquierda, el giro **asciende automáticamente a completo**, sin mirar las celdas de las esquinas.

Es decir, hay colocaciones que puntúan como giro completo aunque solo tengan una esquina frontal ocupada. La propia wiki cita como ejemplo la primera T de una configuración conocida. Esto es exactamente lo que ya implementa el motor, y es un caso perfecto para entrenar: nadie lo deduce mirando.

### Las configuraciones para vaciar el tablero

La wiki oficial explica que vaciar el tablero era casi imposible en los juegos antiguos, y que **el generador de siete piezas es lo que lo hizo alcanzable** con configuraciones concretas:

| Configuración             | Forma                                                                | Probabilidad de éxito                |
| ------------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Apertura de tablero vacío | Caja de cuatro por cuatro con I, J, L y O, más una pila con T, S y Z | 61,19 %, o 84,64 % si se guarda la I |
| Sistema Grace             | Rectángulo de seis por cuatro                                        | 88,57 % si se guarda la T            |

Lo interesante para nosotros no es la probabilidad, que depende de la secuencia de piezas, sino la **forma**: un rectángulo lleno salvo un hueco que se cierra con la pieza adecuada.

### Qué distingue una buena posición de entrenamiento

De lo anterior se deduce el criterio: sirve la situación que **no se descubre sola** y que **se resuelve de una forma concreta**. Colocar piezas en un tablero vacío no enseña nada; encajar la T en una ranura de tres filas, sí.

## Opciones y comparativa

| Opción                                            | Qué aporta                                                    |
| ------------------------------------------------- | ------------------------------------------------------------- |
| Tablero aleatorio con basura                      | Ya existe; entrena a sobrevivir, no jugadas concretas         |
| Posiciones fijas con la cola de piezas prefijada  | Repetible: la misma situación tantas veces como haga falta    |
| Generador de posiciones aleatorias del mismo tipo | Más variedad, mucho más trabajo, y no hace falta para empezar |

## Decisión recomendada

Un catálogo pequeño de posiciones preparadas, cada una con su tablero inicial y su cola de piezas fija, para que la jugada sea siempre la misma:

1. **Giro doble de la T**: la ranura clásica, la puerta de entrada.
2. **Giro triple de la T**: la que obliga a usar la última prueba del ajuste, la regla que nadie deduce.
3. **Vaciar el tablero**: un rectángulo al que le falta una pieza, la forma que describen las configuraciones documentadas.
4. **Giro de otra pieza**: un hueco de dos por dos donde la O queda encajada, para practicar la regla del encaje. Se eligió la O porque su encaje es inequívoco: no puede moverse a ningún lado y no hay ambigüedad sobre si el giro cuenta. Solo tiene sentido con los giros de todas las piezas activados, así que la posición lo enciende sola.

Cada posición fija además las primeras piezas de la cola, todas del tipo que hace falta, para poder intentarlo varias veces seguidas sin volver al menú.

## Acción

- Catálogo de posiciones en el motor, con tablero y cola.
- El motor admite empezar con un tablero y una cola dados.
- Selector en el modo práctica.
- Pruebas de que cada posición es resoluble y da exactamente lo que promete.

## Riesgos

Una posición mal montada enseñaría algo falso, que es peor que no enseñar nada. Se acota con una prueba por posición que ejecuta la solución y comprueba el resultado: el tipo de giro, las líneas y los puntos.

## Referencias

- https://harddrop.com/wiki/T-Spin (ascenso del giro por la última prueba del ajuste, y esquinas frontales)
- https://tetris.wiki/Perfect_clear (configuraciones para vaciar el tablero y sus probabilidades)
- Informe 01 de este directorio, sección 9, sobre la detección de giros.
- Informe 11, sobre la regla del encaje para el resto de piezas.
