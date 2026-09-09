# ADR-0009 · Subir la frecuencia lógica a 240 Hz y versionar las repeticiones

- **Fecha:** 2026-09-08 · **Estado:** aceptada
- **Contexto:** hallazgos F-033 y F-035, informes `docs/research/18` y `docs/research/19`.

## Contexto

La simulación avanzaba a paso fijo de 120 Hz, un paso cada 8,33 ms. Dos medidas justifican revisarlo:

1. **Cuadros sin lógica** (F-033). En pantallas más rápidas que 120 Hz hay cuadros en los que no cabe ningún paso: 17 % a 144 Hz, 27 % a 165 Hz, 50 % a 240 Hz. Una pulsación que llega en uno de esos cuadros espera al siguiente, y el peor caso a 144 Hz sube a 10,4 ms, dos veces y media el de 120 Hz.

2. **El DAS que se configura no es el que se recibe** (F-035). Un evento solo puede ocurrir al terminar un paso, así que un DAS de 167 ms se dispara en el primer paso que lo alcanza. Medido en el motor: a 120 Hz llega a los **175,0 ms**, ocho milisegundos tarde, casi un 5 % por encima de lo pedido.

El obstáculo para subirla nunca fue el coste de cálculo, sino las repeticiones: se guardan como semilla más pulsaciones con marca de tiempo, y al reproducirlas se aplican cuando el tiempo simulado las alcanza. Cambiar el tamaño del paso cambia esos instantes, así que las repeticiones guardadas dejarían de reproducirse fielmente.

## Decisión

**Subir la frecuencia lógica a 240 Hz y guardar en cada repetición la frecuencia con la que se jugó.**

Al reproducir se usa la frecuencia grabada, no la actual. Las repeticiones anteriores no llevan el dato y se leen como 120 Hz, que es la frecuencia con la que se grabaron, de modo que **siguen reproduciéndose exactamente igual que antes**. Ninguna se pierde.

El formato pasa a versión 2. El lector acepta las dos versiones.

### Por qué 240 y no otro valor

Es la primera potencia de dos por encima de 120 que cubre los refrescos habituales (60, 90, 120, 144, 165, 240) sin dejar cuadros sin lógica, y divide exacto en 60 y 120. Con 480 el error de temporización bajaría a la mitad otra vez, pero el gasto se duplicaría sin cubrir ningún refresco nuevo de uso real.

### Por qué es una constante y no depende del dispositivo

Si la frecuencia dependiera del refresco de cada pantalla, dos personas con la misma semilla jugarían partidas distintas y el reto diario dejaría de ser comparable. La frecuencia es del juego, no del monitor.

## Consecuencias

**A favor**

- Ningún cuadro sin lógica hasta 240 Hz: la espera de una pulsación vuelve a estar acotada por el intervalo de cuadro en todas las pantallas de uso corriente.
- El error de temporización se reduce a la mitad: el DAS de 167 ms pasa de 175,0 a 170,8 ms.
- Las repeticiones ganan un dato que faltaba y que las hace interpretables en el futuro: con qué reloj se jugaron.

**En contra**

- El doble de pasos por segundo. Con la cifra de 35 µs por paso que traía la bitácora, el gasto pasaría del 0,4 % al 0,8 % de un núcleo. Midiéndolo ahora con el motor caliente sale mucho más barato, 0,8 µs por paso, que a 240 Hz son dos centésimas por ciento de un núcleo. Sea cual sea la cifra buena, es el doble que antes y sigue siendo despreciable.
- Las partidas nuevas no son bit a bit comparables con las viejas: un mismo conjunto de pulsaciones a 240 Hz puede dar un resultado ligeramente distinto que a 120 Hz. Los récords guardados se conservan como números; lo que cambia es el reloj con el que se jugarían hoy.
- El formato de repetición tiene ahora dos versiones que mantener.

**Descartado**

- _Dejarlo en 120 Hz_: mantiene un error de temporización del 5 % en un ajuste que los jugadores afinan al milisegundo.
- _Adaptar la frecuencia al refresco de la pantalla_: rompe que la misma semilla dé la misma partida.
- _Un ajuste para que cada persona elija_: añade una opción que casi nadie sabría interpretar y multiplica los casos a probar.
