# 19 · Precisión del reloj lógico

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** subir la frecuencia lógica y versionar las repeticiones (F-033).

## Contexto / pregunta

El informe 18 dejó abierto que con la lógica a 120 Hz las pantallas más rápidas tienen cuadros que no ejecutan ningún paso. Subir la frecuencia parecía resolverlo, pero se frenó porque cambiaría el momento en que se aplican las pulsaciones grabadas y las repeticiones guardadas dejarían de reproducirse igual. La pregunta de esta sesión: **¿hay forma de subirla sin perder ninguna repetición, y merece la pena?**

## Hallazgos

### El DAS que se configura no es el que se recibe

La wiki de Tetris explica que el retardo de auto-repetición viene del mundo de los cuadros:

> «DAS delay is usually measured either in milliseconds or frames […] This corresponds to the number of frames that the direction needs to be held down in order to activate an auto-shift.»

Es decir, el valor en milisegundos es una traducción de un contador de cuadros, y en un reloj discreto el evento solo puede ocurrir al terminar un paso. Eso se puede medir. Poniendo el DAS del juego en 167 ms y mirando en qué milisegundo se mueve de verdad la pieza:

| Reloj  | Paso     | DAS pedido | DAS real     | Error       |
| ------ | -------- | ---------- | ------------ | ----------- |
| 60 Hz  | 16,67 ms | 167 ms     | 183,3 ms     | +16,3 ms    |
| 120 Hz | 8,33 ms  | 167 ms     | **175,0 ms** | **+8,0 ms** |
| 240 Hz | 4,17 ms  | 167 ms     | 170,8 ms     | +3,8 ms     |
| 480 Hz | 2,08 ms  | 167 ms     | 168,8 ms     | +1,8 ms     |

Con el reloj que tenía el juego, **quien configuraba 167 ms recibía 175**, casi un 5 % más lento. El error se reparte a la mitad cada vez que se dobla la frecuencia, y nunca se adelanta: siempre llega tarde, porque el paso solo puede completarse.

Es un ajuste que los jugadores afinan al milisegundo, así que un sesgo sistemático de ocho milisegundos no es un detalle.

El intervalo de repetición sale bien a cualquier reloj (33,3 ms para 33 pedidos), porque el temporizador arrastra el resto entre repeticiones en vez de reiniciarse a cero. El problema es solo el primer disparo.

### Cómo subir la frecuencia sin perder ninguna repetición

El obstáculo era real pero tenía una salida sencilla que no se había visto: **el problema no es cambiar el reloj, es no saber con cuál se grabó cada repetición.**

Basta con guardar la frecuencia dentro de la propia repetición. Al reproducir se usa la que trae, no la actual. Las repeticiones anteriores no llevan el dato, pero se sabe cuál era: 120 Hz. Leerlas con ese valor las deja **exactamente igual que antes**.

Así el formato pasa a versión 2 sin que nadie pierda nada, y de paso las repeticiones ganan un dato que les faltaba para ser interpretables en el futuro.

## Opciones y comparativa

| Opción                            | Cuadros sin lógica a 144 Hz | Error del DAS | Repeticiones guardadas |
| --------------------------------- | --------------------------- | ------------- | ---------------------- |
| Quedarse en 120 Hz                | 17 %                        | +8,0 ms       | Intactas               |
| Subir a 240 Hz sin versionar      | 0 %                         | +3,8 ms       | **Se pierden**         |
| Subir a 240 Hz guardando el reloj | 0 %                         | +3,8 ms       | Intactas               |
| Subir a 480 Hz guardando el reloj | 0 %                         | +1,8 ms       | Intactas               |

## Decisión recomendada

Subir a 240 Hz y guardar el reloj en cada repetición. Queda en ADR-0009.

No se va a 480 Hz porque no cubre ningún refresco nuevo de uso real y duplicaría otra vez el gasto para ganar dos milisegundos en un solo ajuste.

## Acción

- Frecuencia lógica a 240 Hz.
- Formato de repetición versión 2 con el reloj dentro; el lector acepta las dos versiones y rellena 120 Hz en las antiguas.
- El bucle adopta el reloj de la repetición que se esté viendo.
- Pruebas: lectura de ambas versiones, rechazo de versiones desconocidas y de relojes imposibles, y el error del DAS acotado a un paso y menor que antes.

## Riesgos

Las partidas nuevas no son bit a bit comparables con las antiguas: la misma semilla y las mismas pulsaciones pueden dar un resultado ligeramente distinto con otro reloj. Los récords guardados se conservan como números y las repeticiones como estaban; lo que cambia es cómo se jugaría hoy.

Por encima de 240 Hz vuelven a aparecer cuadros sin lógica. Es aritmética, no un fallo, y queda fijado con una prueba para que se vea si alguien mueve la frecuencia.

## Referencias

- https://tetris.wiki/DAS — el retardo de auto-repetición y su origen en cuadros. Devuelve 403 a las peticiones normales; hay que pedirla con un agente de navegador.
- Informe 18 de este directorio, donde salió el problema de los cuadros sin lógica.
- ADR-0009, con la decisión y sus consecuencias.
