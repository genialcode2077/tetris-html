# 24 · Resistencia a fallos del bucle

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** qué pasa si algo lanza una excepción mientras el juego corre. No estaba en el backlog: los dos que quedan necesitan a una persona, así que se buscó un área sin cubrir.

## Contexto / pregunta

El proyecto tiene el motor probado, el dibujado medido y la partida a salvo si se cierra la pestaña. Faltaba la pregunta incómoda: **si algo se rompe en marcha, ¿qué ve el jugador?**

## Hallazgos

### La plataforma no perdona un error en el cuadro

La especificación de HTML describe cómo se ejecutan las funciones de animación:

> «Let callback be callbacks[handle]. **Remove callbacks[handle].** Invoke callback with « now » and "report".»

El callback se **retira antes de invocarse**, y nadie vuelve a ponerlo: para que haya otro cuadro, el propio callback tiene que volver a pedirlo. Y el `"report"` significa que si lanza, la excepción se anota en la consola y ahí acaba todo.

El bucle del juego pedía el cuadro siguiente en su última línea, después de la lógica y el dibujado. Cualquier excepción por el camino se saltaba esa línea.

### Lo que pasaba de verdad

Se comprobó en el navegador con una partida en marcha, haciendo que el dibujado fallara **una sola vez**:

```
tiempo de juego antes: 796 ms
tiempo 1,5 s después:  812 ms
¿sigue vivo? NO — CONGELADO
errores en consola: 1 [ 'fallo simulado al dibujar' ]
¿avisa al jugador? NO
```

Un tropiezo puntual y el juego se queda parado para siempre. La pantalla congelada con la pieza a medio caer, el marcador quieto, las teclas sin efecto, y ni una palabra de explicación. La partida se pierde entera (F-044).

Que solo haya pasado en pruebas no lo hace hipotético: el contexto de dibujado se puede perder al cambiar de tarjeta gráfica o al suspender el equipo, y el juego tiene además un modo 3D con una biblioteca externa.

### Lo que hace falta distinguir

No todos los fallos son iguales. Uno suelto conviene absorberlo y seguir, porque interrumpir una partida por un tropiezo sería peor que el tropiezo. Uno que se repite cuadro tras cuadro significa que algo está roto de verdad, y ahí seguir intentándolo solo llena la consola.

## Opciones y comparativa

| Opción                                    | Fallo puntual   | Fallo persistente                      |
| ----------------------------------------- | --------------- | -------------------------------------- |
| Dejarlo como estaba                       | Mata la partida | Mata la partida                        |
| Capturar y seguir siempre                 | Se absorbe      | Miles de errores por segundo           |
| Capturar, absorber, y rendirse si insiste | Se absorbe      | Se para, se avisa y se salva lo jugado |

## Decisión recomendada

La tercera. El cuadro se ejecuta dentro de una captura de errores y siempre se pide el siguiente, salvo que fallen tres seguidos. Un cuadro bueno borra la cuenta, así que un fallo intermitente no acaba agotando la paciencia del bucle.

Cuando se rinde, no se queda callado: **guarda la partida y devuelve al jugador al menú**, donde le espera el botón de continuar. Eso lo hace posible el guardado del informe 21, que resulta ser exactamente la pieza que faltaba: la caída deja de ser una pérdida y pasa a ser una interrupción.

## Acción

- El cuadro se ejecuta protegido; el siguiente se pide igualmente.
- Tres cuadros seguidos con error detienen el bucle y avisan a quien lo gobierna.
- La aplicación guarda la partida, vuelve al menú y lo dice con un mensaje traducido.
- Tres pruebas del bucle y dos de extremo a extremo, verificadas volviendo a dejar escapar la excepción.

## Riesgos

Absorber errores puede ocultar un fallo real durante el desarrollo. Se compensa escribiéndolo siempre en la consola con su causa, y el aviso al jugador solo aparece cuando el bucle se rinde.

Si lo que está roto es permanente, continuar la partida vuelve a fallar y a devolver al menú. Es lo correcto: no hay forma de seguir jugando con el dibujado roto. Lo que sí se consigue es que la partida sobreviva a una recarga, y eso se comprobó: setenta y cuatro puntos antes del fallo, los mismos setenta y cuatro tras recargar y continuar.

Tres cuadros seguidos son unos cincuenta milisegundos a sesenta hercios. Es un margen corto a propósito: más tiempo con la pantalla congelada se nota.

## Referencias

- https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html — las funciones de animación se retiran antes de invocarse y hay que volver a pedirlas.
- https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model — dónde encajan esas funciones dentro del cuadro.
- Informe 21, cuyo guardado de la partida es lo que convierte la caída en una interrupción.
