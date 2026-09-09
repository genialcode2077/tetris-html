# 25 · Avisos para lector de pantalla

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** qué se anuncia durante la partida y cuándo. No estaba en el backlog; se buscó un área sin cubrir.

## Contexto / pregunta

El juego tiene una región viva que va contando lo que pasa: la jugada y sus puntos, la subida de nivel, el final de la partida. Nunca se había revisado **qué se anuncia de verdad**, solo que existiera.

Antes se descartaron dos candidatos midiéndolos, y conviene dejarlo escrito para no volver a mirarlos:

- **Tamaño de los objetivos táctiles** (criterio 2.5.8 de WCAG 2.2, que pide 24×24 píxeles): los veinte controles del juego cumplen, y el lado más pequeño de todos es de 36 píxeles. Los botones de la repetición, que eran los sospechosos por pequeños, miden 34×34.
- **Idioma del documento**: ya se actualiza al cambiar de idioma en Ajustes.

Ninguno de los dos tenía defecto.

## Hallazgos

### Lo que pide la norma

El criterio 4.1.3 de WCAG dice:

> «In content implemented using markup languages, status messages can be programmatically determined through role or properties such that they can be presented to the user by assistive technologies without receiving focus.»

Es decir: los mensajes tienen que **poder presentarse**. Una región viva que existe pero que descarta lo que anuncia no cumple el espíritu del criterio, aunque el marcado esté bien puesto.

### El limitador se comía lo importante

Los avisos pasaban por un filtro de una línea: si habían pasado menos de 900 milisegundos desde el anterior, **se descartaba sin más**, sin mirar de qué se trataba.

El problema es dónde caen los avisos importantes. En Sprint, el aviso de objetivo completado se emite **en el mismo paso** que la limpieza que completa las cuarenta líneas: los dos eventos salen del mismo cálculo, con cero milisegundos entre ellos. Con un filtro por tiempo a secas, el segundo nunca se anunciaba. **El mensaje de que has terminado la partida se perdía siempre**, no de vez en cuando.

Lo mismo con el fin por derrota, que llega justo después de colocar la pieza que desborda el tablero, muchas veces tras haber limpiado líneas.

### Y perdía lo demás en vez de retrasarlo

Descartar tampoco es lo correcto para los avisos corrientes. Si se limpian dos veces en menos de un segundo, la segunda jugada es la que describe el tablero que el jugador tiene delante, y es justo la que se tiraba.

### Dos avisos iguales no suenan dos veces

La región viva anuncia cuando el texto **cambia**. Dos dobles seguidos producen exactamente el mismo texto, así que el segundo pasa desapercibido aunque llegue en buen momento.

## Opciones y comparativa

| Opción                         | Fin de partida | Jugadas seguidas                      |
| ------------------------------ | -------------- | ------------------------------------- |
| Filtro por tiempo, como estaba | Se pierde      | Se pierde la segunda                  |
| Sin filtro                     | Se oye         | Ruido continuo                        |
| Filtro con prioridad y espera  | Se oye siempre | Se oye la última al pasar el silencio |

## Decisión recomendada

La tercera, en un módulo aparte con la política, para poder probarla sin depender del navegador.

- Lo importante, que es el final de la partida, **no espera ni se descarta nunca**.
- Lo corriente respeta el silencio de novecientos milisegundos, pero **se guarda en vez de tirarse**, y sale cuando el silencio termina. De varias que se acumulen se suelta la última, que es la que describe el tablero actual.
- Un aviso importante descarta lo que estuviera esperando: si la partida ha terminado, la jugada anterior ya no importa.
- Dos textos iguales seguidos se distinguen añadiendo un espacio al final: la región viva ve un cambio y lo que se lee en voz alta no cambia.

## Acción

- Módulo con la política de avisos y siete pruebas.
- El marcador la usa; el fin de partida y el fin de objetivo van marcados como importantes.
- La política se reinicia al empezar una partida, para no arrastrar avisos de la anterior.

## Riesgos

**Esto no sustituye a probarlo con un lector de pantalla de verdad**, que sigue pendiente y necesita a una persona. Lo que se corrige aquí es que los mensajes lleguen a la región viva; si lo que dicen es útil y si el ritmo es cómodo de escuchar solo se sabe escuchándolo.

Se intentó cubrir el caso completo con una prueba de navegador que jugara un Sprint hasta el final, y se descartó: montar el tablero para que la partida terminara de forma determinista resultó frágil, y una prueba que no distingue el fallo del acierto no vale de nada. La política, que es donde estaba el defecto, queda cubierta con pruebas propias que sí reproducen el caso exacto: un aviso importante en el mismo instante que uno corriente.

El espacio final para distinguir textos iguales depende de que el lector no lo recorte antes de comparar. Es la técnica habitual, pero entra en lo que habría que confirmar escuchando.

## Referencias

- https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html — criterio 4.1.3, qué cuenta como mensaje de estado.
- https://www.w3.org/TR/WCAG22/#target-size-minimum — criterio 2.5.8, comprobado y cumplido.
- Informe 04, donde se montaron la región viva y la auditoría automática.
