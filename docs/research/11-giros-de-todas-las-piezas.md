# 11 · Giros de todas las piezas y regla del inmóvil

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** giros de piezas distintas de la T con la regla del inmóvil, y verificación de la tabla de giro de 180.

## Contexto / pregunta

El motor solo reconoce giros de la pieza T, con la regla de las tres esquinas que fija la especificación oficial. Los juegos competitivos modernos premian además los giros del resto de piezas, y lo hacen con otro criterio. Faltaba saber cuál exactamente y si conviene adoptarlo.

## Hallazgos

### La regla del inmóvil

La wiki de Hard Drop la define sin ambigüedad, y es la que estrenó _The New Tetris_:

> Se reconoce un giro si la pieza se fija en una posición desde la que no puede moverse a la izquierda, a la derecha ni hacia arriba. Solo hay recompensa si además se completan filas.

Es decir, la pieza queda encajada. No mira esquinas ni geometría concreta, así que vale para las siete piezas por igual. Hacia abajo no se comprueba porque al fijarse ya está apoyada.

### Cómo lo aplica un juego competitivo actual

La wiki de TETR.IO documenta dos variantes con fechas:

| Variante  | Desde                     | Qué hace                                                                                                         |
| --------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| All-Mini  | Beta 1.0.0, julio de 2024 | Todas las piezas pueden hacer giros. Las que no son la T se detectan por inmóvil y cuentan como giro menor       |
| All-Mini+ | Beta 1.5.0, enero de 2025 | Además, la T también puede reconocerse por inmóvil. Es el valor por defecto en multijugador y en su modo sin fin |

Los giros así reconocidos cuentan como jugada difícil, o sea que alimentan la cadena de bonificación por encadenar.

### La tabla de giro de 180

Sigue sin fuente numérica pública. La wiki solo publica un diagrama que un miembro del equipo compartió en su servidor de conversación, y no hay tabla en texto que copiar ni contrastar. El hallazgo F-001 queda abierto: verificarla exigiría medir el comportamiento dentro del juego, que no está a mi alcance. Lo que sí se puede hacer, y se hace, es comprobar que la tabla actual cumple las propiedades que se le suponen.

## Opciones y comparativa

| Opción                                                   | Efecto                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Dejarlo como está                                        | Fiel a la especificación oficial, pero el juego ignora jugadas que en cualquier juego moderno puntúan |
| Cambiar el valor por defecto a giros de todas las piezas | Se aleja de la especificación sin que nadie lo haya pedido                                            |
| Añadirlo como ajuste, apagado por defecto                | Se conserva la fidelidad y quien venga de un juego competitivo encuentra lo que espera                |

## Decisión recomendada

Añadir un ajuste de detección de giros con tres valores, apagado por defecto:

- **Solo la T**, con la regla de las tres esquinas. Es lo que dice la especificación y sigue siendo lo predeterminado.
- **Todas las piezas**: la T por tres esquinas y el resto por inmóvil, contando como giro menor. Equivale a la primera variante de TETR.IO.
- **Todas las piezas, incluida la T por inmóvil**: añade el reconocimiento de la T por encaje. Equivale a la segunda variante.

Los giros de piezas que no son la T puntúan con la tabla de giro menor, que ya existe, y cuentan como jugada difícil para la cadena de bonificación, igual que en el juego de referencia.

## Acción

- Generalizar la detección de giros del motor para admitir la regla del inmóvil.
- Ajuste nuevo en las reglas y en la pantalla de opciones.
- Pruebas de la regla, de la puntuación resultante y de que el comportamiento por defecto no cambia.
- Prueba de las propiedades de la tabla de giro de 180, que es lo máximo verificable sin acceso al juego original.

## Riesgos

La regla del inmóvil es más permisiva que la de las tres esquinas y puede premiar colocaciones que no se sienten como un giro. Por eso queda apagada por defecto y solo la activa quien la busca. El comportamiento predeterminado no cambia, y hay pruebas que lo fijan.

## Referencias

- https://harddrop.com/wiki/List_of_twists (definición de la regla del inmóvil)
- https://tetris.wiki/T-Spin (regla de las tres esquinas y variantes)
- https://tetris.wiki/TETR.IO (All-Mini y All-Mini+, con sus fechas)
- Informe 01 de este mismo directorio, sección 9, sobre la detección actual.
