# 15 · Controles al ver una repetición

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** controles de avance y velocidad al ver una repetición.

## Contexto / pregunta

Ya se puede volver a ver una partida guardada, pero una vez lanzada no se puede hacer nada: ni parar, ni volver a empezar, ni ir más despacio para fijarse en una jugada. Justo lo que uno quiere hacer al revisar su propio juego.

## Hallazgos

El W3C tiene escritos los requisitos de accesibilidad para reproducir contenido, con identificadores concretos que sirven de lista de comprobación:

| Requisito | Qué exige                                                                        |
| --------- | -------------------------------------------------------------------------------- |
| TSM-1     | Poder ajustar la velocidad entre el 50 % y el 250 % del tiempo real              |
| TSM-4     | Una función que devuelva la velocidad a la normal                                |
| TSM-5     | Poder parar, pausar y reanudar cualquier contenido de tres segundos o más        |
| IC-1      | Que todo se pueda manejar con el teclado                                         |
| IC-2      | Que los controles incluyan reproducir, pausar, parar, ir al principio y al final |

La guía general de reproductores accesibles añade que hacen falta etiquetas claras, foco de teclado visible y contraste suficiente, y sitúa el control de velocidad como una mejora recomendable más que obligatoria. La razón que da para la velocidad variable es interesante: existe en los reproductores de audiolibros desde hace veinte años, y sirve tanto a quien necesita ir más despacio para entender como a quien quiere ir más rápido para no perder tiempo. Las dos cosas aplican a revisar una partida.

El requisito de ir al final no encaja aquí: saltar al final de una repetición es lo mismo que no verla. Ir al principio sí, porque revisar una jugada concreta pasa por repetirla.

## Opciones y comparativa

| Opción                               | Ajuste a los requisitos                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Dejarlo como está                    | Incumple TSM-5 y IC-2: no se puede ni pausar                              |
| Solo pausa y reinicio                | Cumple lo mínimo, se queda corto para revisar                             |
| Pausa, reinicio y velocidad variable | Cumple todo lo aplicable y es lo que se pide para revisar el propio juego |

## Decisión recomendada

Una barra de control que aparece solo mientras se ve una repetición, con:

- **Pausar y reanudar**, que es el requisito mínimo.
- **Volver al principio**, para repetir una jugada concreta.
- **Velocidad** en pasos dentro del rango permitido: la mitad, tres cuartos, normal, vez y media y el doble. Se cambia en ciclo y siempre se puede volver a la normal, como pide el requisito de reposición.
- **Avance**, para saber por dónde va.

Todo con teclado, con etiquetas y sin pisar las teclas del juego: durante una repetición las órdenes del jugador ya se ignoran, así que la barra espaciadora queda libre para pausar y las flechas para la velocidad.

La velocidad se aplica multiplicando el tiempo que avanza el motor en cada paso, no cambiando el reloj del navegador. Así el motor sigue recibiendo pasos del mismo tamaño y la repetición se reproduce igual: solo cambia cuántos se dan por segundo.

## Acción

- Velocidad de reproducción en la sesión, aplicada al avance del tiempo.
- Barra de controles visible solo en repeticiones, con sus etiquetas y sus atajos.
- Pruebas de que la velocidad no altera el resultado, de la pausa, del reinicio y del avance.

## Riesgos

Cambiar la velocidad podría alterar el resultado si el motor recibiera pasos de distinto tamaño, porque el retardo de fijado y la gravedad se miden en milisegundos. Se evita manteniendo el paso fijo y variando solo cuántos se ejecutan, y hay una prueba que compara el tablero final a distintas velocidades.

## Referencias

- https://www.w3.org/TR/media-accessibility-reqs/ (requisitos TSM-1, TSM-4, TSM-5, IC-1 e IC-2)
- https://www.w3.org/WAI/media/av/player/ (etiquetas, foco visible y contraste en reproductores)
- Informe 14 de este directorio, sobre lo que ya se guarda de cada partida.
