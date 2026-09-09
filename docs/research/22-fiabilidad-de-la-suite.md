# 22 · Fiabilidad de la suite de pruebas

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** F-025, la suite de extremo a extremo fallaba de vez en cuando sin motivo aparente. Abierto desde la sesión 8 y sin diagnosticar.

## Contexto / pregunta

Una suite que falla al azar es peor que no tenerla: enseña a volver a ejecutarla en vez de a mirar el fallo. F-025 estaba abierto desde hacía nueve sesiones con la nota «no se pudo reproducir», y la sesión anterior lo empeoró: de tres pasadas, dos fallaron con pruebas distintas.

La sospecha escrita era contención de procesador entre trabajadores en paralelo. Esta sesión empieza por comprobarla en vez de darla por buena.

## Hallazgos

### La sospecha era falsa

Se ejecutó la suite tres veces seguidas sin tocar nada. Falló una de las tres, y **no fue ninguna de las pruebas de rendimiento**, que eran las sospechosas por medir tiempos con el procesador frenado veinte veces. Falló la de continuar la partida, con un mensaje concreto:

```
Expected: 96
Received: 98
  > 45 |   expect(despues.score).toBe(antes.score);
```

Dos puntos de diferencia, que es exactamente una celda de caída rápida. No es ruido de medida: es una partida que sale distinta.

### La causa: el gancho de pruebas avanzaba con un reloj que ya no existía

Las pruebas de extremo a extremo no dependen del refresco de pantalla: avanzan el juego llamando a un gancho de depuración. Ese gancho tenía el paso escrito a mano:

```js
const step = 1000 / 120;
```

En la sesión 15 la simulación pasó de 120 a 240 pasos por segundo (ADR-0009) y **este número se quedó atrás**. Desde entonces, todas las pruebas de extremo a extremo avanzaban el juego a 8,33 ms por paso mientras el juego real usa 4,17.

Nadie lo detectó porque las pruebas seguían pasando: medían un juego coherente consigo mismo, solo que distinto del que se publica. La gravedad, el retardo de bloqueo y el reparto de piezas dependen del tamaño del paso, así que **se estaba verificando un juego que no existe en producción**.

El fallo intermitente aparece cuando algo compara las dos cosas. La prueba de continuar partida hace justo eso: juega con el gancho, guarda, y reconstruye la partida con el reloj que va dentro de la repetición, que sí es el de verdad. Dos relojes distintos, dos partidas distintas, y la diferencia se nota o no según dónde caiga cada pieza.

### Por qué costó nueve sesiones

Porque el síntoma no señalaba a la causa. Un fallo intermitente en una prueba de tiempos invita a culpar al paralelismo, y esa explicación es lo bastante plausible como para dejar de buscar. Lo que la descartó fue leer el mensaje de error concreto en vez de contar cuántas pruebas fallaban.

## Opciones y comparativa

| Opción                                     | Qué arregla                                              |
| ------------------------------------------ | -------------------------------------------------------- |
| Reducir el paralelismo o poner reintentos  | Esconde el síntoma y deja el juego mal verificado        |
| Aislar las pruebas de rendimiento          | Habría sido tratar una causa que no era                  |
| Que el gancho use el paso del propio bucle | Quita el número duplicado, que es lo que se desincronizó |

## Decisión recomendada

La tercera. El bucle expone su paso y el gancho lo usa. No hay dos sitios que puedan discrepar, así que el fallo no puede volver por esta vía.

Se añade además una prueba que lo ata: pide al gancho un tiempo que no es múltiplo de ningún paso plausible y comprueba que avanza exactamente un paso del bucle. Un total redondo no habría servido, porque sale igual con los dos relojes; hizo falta un valor que delatara la granularidad.

## Acción

- El bucle expone su paso; el gancho de depuración lo usa en vez de un número propio.
- Prueba que comprueba que ambos coinciden, verificada restaurando el número antiguo.
- Corregidos los otros restos del reloj anterior: el comentario del gancho, el de las repeticiones, el diagrama de `ARCHITECTURE.md` y el paso de las pruebas de reproducción.

## Corrección posterior (sesión 19)

**La conclusión de esta sesión fue prematura.** El paso equivocado del gancho era un defecto real y grave, pero no era la única causa: el fallo volvió a la sesión siguiente, otra vez en la prueba de continuar partida y otra vez con dos puntos de diferencia.

La causa de fondo estaba en cómo se reproducen las pulsaciones. Quien juega pulsa **entre** dos pasos, y su orden la consume el paso siguiente. Al reproducir, en cambio, las pulsaciones se aplicaban después de avanzar el reloj, es decir un paso antes de lo que les tocaba. Un paso puede ser una fila de caída, así que la partida rehecha salía distinta de vez en cuando (F-042).

Se corrigió drenando las pulsaciones con el reloj anterior al paso, que es el que tenían al grabarse. Cuatro pasadas seguidas limpias después.

La lección de esta sesión sigue en pie, y se refuerza: lo que resuelve estos casos es leer el mensaje de error concreto. Lo que falló fue dar por cerrada la causa con tres pasadas verdes en lugar de explicar por qué el error decía exactamente dos puntos.

## Riesgos

Cuatro pasadas limpias no demuestran que no quede ninguna otra fuente de intermitencia; demuestran que estas dos estaban y ya no. F-025 se cierra con la causa encontrada, y si vuelve a aparecer un fallo suelto habrá que leer su mensaje, no suponer.

Las pruebas del motor en `src/core` siguen avanzando con su propio paso. Ahí es deliberado: el motor tiene que funcionar con cualquier intervalo, y probarlo con uno distinto del de producción es una comprobación más, no un descuido.

## Referencias

- https://playwright.dev/docs/test-parallel — reparto en paralelo, modo serie y cerrojos entre pruebas. Se consultó para la solución que finalmente no hizo falta.
- ADR-0009, donde la simulación pasó a 240 pasos por segundo.
- Informe 21, cuya prueba de continuar partida fue la que destapó la discrepancia.
