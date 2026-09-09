# 21 · Continuar la partida a medias

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** guardar la partida en curso para no perderla al cerrar la pestaña.

## Contexto / pregunta

La sesión anterior protegió la partida de las recargas por actualización. Quedaba el caso más común: cerrar la pestaña sin querer, que el móvil mate la aplicación en segundo plano, o quedarse sin batería. Un maratón son diez minutos de trabajo del jugador y se perdían enteros.

Dos preguntas: **cuándo** se puede guardar de forma fiable, y **qué** hay que guardar.

## Hallazgos

### Cuándo: el único momento fiable es cuando la página se oculta

La documentación de Chrome sobre el ciclo de vida de la página es tajante con los eventos que uno esperaría usar:

> Sobre `unload`: «does not fire in many typical unload situations, including closing a tab from the tab switcher on mobile or closing the browser app from the app switcher», y lo califica de «**extremely unreliable**, especially on mobile!».

Con `beforeunload` pasa algo parecido: algunos navegadores no lo disparan si la página va a la caché de ida y vuelta, y otros exigen que haya habido interacción previa.

La recomendación es explícita:

> «it's always better to rely on the `visibilitychange` event to determine when a session ends, and consider the hidden state the **last reliable time to save app and user data**».

La razón de fondo la confirma la especificación del ciclo de vida: una página puede ser **descartada** por presión de memoria, y esa transición **no dispara ningún evento**. Es decir, no existe un «último aviso»: hay que dar por terminada la sesión en cuanto la página deja de verse.

### Qué: no el estado, sino cómo llegar a él

La tentación es serializar el tablero, la cola, la pieza en juego, el estado del generador, los temporizadores de bloqueo… Es mucha superficie y cada campo nuevo del motor sería una ocasión de olvidarse de uno.

Pero este motor es determinista: misma semilla y mismas pulsaciones dan la misma partida. Es la propiedad sobre la que ya se apoyan las repeticiones. Así que **guardar la partida es guardar su repetición**: semilla, reglas, ajustes, reloj y la lista de pulsaciones. Recuperarla es reproducirla a toda velocidad hasta el instante guardado.

Sale barato en las dos direcciones. Ocupa unos kilobytes en vez de un tablero serializado, y reconstruir una partida entera son décimas de segundo: cada paso lógico cuesta menos de un microsegundo, así que rehacer diez minutos de maratón son unos 144.000 pasos, alrededor de una décima.

Y no hay formato nuevo que mantener: se reutiliza el de las repeticiones, que ya está versionado y ya tiene lector con validación.

### Dos cosas que salieron al probarlo

**Pausar mentía.** Al pausar, la sesión soltaba las teclas pulsadas sin anotarlo en el registro. La partida seguía sin esas teclas, pero quien la reprodujera o la continuara vería otra cosa. Ahora los soltados se anotan antes de cambiar de estado (F-038).

**Sumar milisegundos en dos tramos no da lo mismo.** Reconstruir avanzando «mientras el tiempo sea menor que el guardado» dependía de la acumulación en coma flotante, y un paso de diferencia es una fila de caída. Se cuentan pasos enteros (F-039).

Ambas las encontró la prueba que guarda, continúa, vuelve a guardar y vuelve a continuar, comparando el tablero celda a celda. Sin ese ciclo doble las dos habrían pasado desapercibidas.

## Opciones y comparativa

| Opción                         | Tamaño     | Superficie a mantener             | Fidelidad                   |
| ------------------------------ | ---------- | --------------------------------- | --------------------------- |
| Serializar el estado del motor | Un tablero | Cada campo nuevo hay que añadirlo | Exacta si no se olvida nada |
| Guardar semilla y pulsaciones  | Unos kB    | Ninguna: ya existe el formato     | Exacta por construcción     |

## Decisión recomendada

Guardar la repetición en curso al ocultarse la página, en su propia clave del almacén para no depender de serializar el resto de ajustes. Al volver, el menú ofrece continuar.

La partida vuelve **en pausa**: nadie debe perder piezas mientras se sitúa. Y como continuar es lo que se espera hacer cuando hay una partida a medias, empezar una nueva deja de ser la acción destacada del menú mientras tanto.

El reto diario se queda fuera: es la misma partida para todo el mundo cada día y guardarla a medias invitaría a repetirla.

## Acción

- Módulo con el formato guardado y su lector.
- Reconstrucción en la sesión, reproduciendo y devolviendo el control al jugador.
- Guardado al ocultarse la página; borrado al terminar la partida o al empezar otra.
- Botón de continuar en el menú, visible solo cuando hay algo que continuar.

## Riesgos

Si el almacén está lleno o bloqueado, el guardado falla en silencio y la partida se pierde igual que antes. No se rompe nada, pero tampoco se avisa.

Una partida guardada con un reloj lógico anterior se reconstruye con el suyo, que va dentro de la repetición, pero al continuar se juega con el actual. El cambio es de milisegundos y no afecta a lo ya jugado.

El tope de seis horas de reconstrucción evita que un archivo manipulado cuelgue el arranque.

## Referencias

- https://developer.chrome.com/docs/web-platform/page-lifecycle-api — por qué `unload` y `beforeunload` no sirven y por qué el estado oculto es el último momento fiable para guardar.
- https://wicg.github.io/page-lifecycle/ — el descarte por presión de memoria no dispara ningún evento.
- ADR-0009, sobre el reloj que llevan dentro las repeticiones.
- Informe 20, sobre proteger la partida de las actualizaciones, que es el caso hermano de este.
