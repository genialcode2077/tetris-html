# Estado del proyecto (bitácora)

> **Lee esto primero.** Resume dónde está el proyecto, qué se hizo en la última sesión y qué sigue. Actualízalo al final de cada sesión de trabajo (humana o agente).

## Estado actual

- **Fase:** 3 en curso; el renderer premium 3D ya está entregado
- **Versión:** 0.1.0 · **Demo:** https://genialcode2077.github.io/tetris-html/ · **Repo:** https://github.com/genialcode2077/tetris-html
- **Pruebas:** 249 unitarias y de propiedades + 101 de extremo a extremo (escritorio y móvil), todas en verde
- **Seguridad:** política de contenido estricta en la página publicada, verificada inyectando un guion (ADR-0011)
- **Cobertura del motor:** 96 % de líneas, 85 % de ramas
- **Reloj de la simulación:** 240 pasos por segundo (ADR-0009); ninguna pantalla de uso corriente deja cuadros sin lógica
- **Latencia de entrada medida:** 0,20 ms de mediana desde que ocurre la pulsación hasta que la procesa el juego, y 8,0 ms hasta el cuadro siguiente, que es el mínimo posible a 60 Hz
- **Rendimiento medido:** paso lógico 35 µs (0,4 % del presupuesto); render p95 1,0 ms en escritorio y 1,2 ms en móvil. Con el procesador seis veces más lento y partículas, el peor cuadro se queda en 8,4 ms gracias al presupuesto adaptativo
- **Tamaño:** 32,7 KB de JavaScript comprimido y 3,2 KB de CSS; el modo 3D son 239 KB aparte que solo descarga quien lo activa
- **Accesibilidad:** auditoría axe-core WCAG A/AA sin violaciones en las cinco pantallas; las tres paletas verificadas contra las tres dicromacias
- **Instalable y sin conexión:** service worker con 16 archivos precacheados, verificado cortando la red; la versión nueva espera a que termine la partida (ADR-0010)
- **Arranque medido:** primer contenido y mayor elemento pintados a los 140 ms, desplazamiento acumulado 0,035, sin tareas largas
- **Capturas:** `docs/assets/screenshots/` (`pnpm screenshots`)

## Próximos pasos (orden)

1. Prueba manual con lector de pantalla y en un teléfono real (audio, gestos, vibración, modo 3D en GPU móvil, coste de las partículas).
2. Timbre de los efectos de sonido: su equilibrio ya está medido y corregido, pero si cada sonido es el adecuado sigue necesitando oído.

Los dos últimos necesitan a una persona con un dispositivo y con oído; no se pueden cerrar desde aquí sin inventarse el resultado.

## Bloqueos / decisiones pendientes del usuario

- Nombre visible "Blockfall" (ADR-0005): cambiar `APP_TITLE` en `src/app/config.ts` si se prefiere otro.
- Verificación de audio y de gestos táctiles: requiere una persona con un dispositivo real.

## Sesiones

### 2026-09-09 · Sesión 25 (agente, iteración periódica) — controles al alcance del pulgar

- Tema: dónde poner los botones táctiles con el móvil tumbado (informe `docs/research/29`). Era el siguiente paso que dejó anotado el informe 27.
- Fuente: el estudio de observación de Hoober, 1333 personas en la calle, con el reparto de agarres (49 % una mano, 36 % acunado, 15 % dos pulgares) y las zonas de alcance. La conclusión que aplica es geométrica: al sujetar el teléfono por los extremos, los pulgares descansan en los laterales, y una fila centrada abajo obliga a estirarlos hacia dentro.
- Los botones pasan a dos columnas laterales, con el reparto de un mando: mover a la izquierda, girar y soltar a la derecha. Solo cuando la pantalla es apaisada, baja **y el puntero es grueso**: en un portátil con ventana baja no hay pulgares que alcanzar.
- Medido: la celda pasa de 14,3 a **16,4 px** en 667×375 y de 13,3 a 15,4 en 640×360. Frente al punto de partida de la sesión 23 (8,2 px), **se ha duplicado**. Los botones pasan de 34 a 76 px de lado.
- **La primera versión pisaba el botón de pantalla completa**, y se vio en la captura, no en las medidas. Corregido dejando libre el alto de la barra superior, con una prueba nueva que lo comprueba porque era invisible para las que ya había.
- De paso se corrigió el índice de investigación: «guardar la partida en curso» figuraba como pendiente y se había hecho en la sesión 17.

### 2026-09-09 · Sesión 24 (agente, iteración periódica) — movimiento reducido, hipótesis descartada

- Tema: qué alcanza de verdad la preferencia de movimiento reducido (informe `docs/research/28`). El criterio 2.3.3 lo pide, y su guía recuerda que el impacto vestibular puede llegar a la náusea y la migraña.
- **La sospecha era falsa y conviene dejarlo escrito.** El código parecía no aplicar la preferencia a las partículas, y una primera medición lo confirmaba con 160 partículas. Esa medición cambiaba el ajuste sin propagarlo al dibujado. Con el ajuste aplicado como lo haría el jugador: **0 partículas, 0 rastros, 0 temblor**.
- Antes hubo otra medición engañosa: dos casos seguidos en la misma página daban 160 y luego 320, y parecía que la preferencia **duplicaba** las partículas. Era acumulación de la prueba anterior. Con página limpia, 160 en ambos.
- Dos mediciones equivocadas seguidas, cada una apuntando a una conclusión distinta y ambas falsas. El orden correcto es comprobar el instrumento antes que el código.
- Revisado caso por caso, **no falta ninguno**: temblor, partículas, rastro, destellos, modo 3D y hojas de estilo lo respetan, y el modo automático sigue la preferencia del sistema en los dos sentidos. El destello al subir de nivel es solo color, que la norma excluye explícitamente.
- Lo que sí faltaba: **nada de esto estaba comprobado**. Funcionaba porque nadie lo había tocado. Tres pruebas nuevas con control positivo, verificadas quitando la comprobación del código.

### 2026-09-09 · Sesión 23 (agente, iteración periódica) — el juego con el móvil tumbado

- Tema: cómo se reparte el espacio en horizontal (informe `docs/research/27`). El informe 08 arregló el reparto en móviles pequeños, pero **solo se midió en vertical**.
- Medido: en horizontal la celda caía de 30,8 a **8,2 píxeles** y el tablero entero medía ochenta de ancho, menos que un botón. Injugable, no incómodo (F-048). En Pixel 7 tumbado aparecía además barra de desplazamiento.
- La causa: el reparto móvil se decide por ancho y apila los paneles. En vertical funciona porque sobra altura; tumbado el teléfono la altura es justo lo que falta, así que apilar es lo contrario de lo que conviene.
- **Precisión sobre la norma**: el criterio 1.3.4 pide que el contenido no quede restringido a una orientación, y su guía aclara que **no exige igual usabilidad en ambas**. Así que esto no era un incumplimiento. Se arregla porque ocho píxeles no se pueden jugar, no porque lo obligue nadie.
- Ahora una consulta por **altura** (apaisado y menos de 500 px) pone los paneles a los lados y da al tablero todo el alto: celda de 14,3 px en 667×375 y 13,3 en 640×360, sin desplazamiento en ningún caso.
- Dos tropiezos anotados en el informe: el aviso superpuesto del tablero empujaba la página y no bastó ni estirar la rejilla ni un tope calculado (se recorta el desbordamiento en el contenedor), y las pruebas medían botones táctiles de tamaño cero en el perfil sin táctil.
- Seis pruebas nuevas y una captura de referencia en horizontal.

### 2026-09-09 · Sesión 22 (agente, iteración periódica) — política de seguridad de contenido

- Tema: seguridad de la página publicada (informe `docs/research/26`, ADR-0011). El juego guarda ajustes, récords, repeticiones y la partida a medias en el navegador, y no había **ninguna** política que impidiera a un guion ajeno leerlos (F-047).
- Antes se descartó otro candidato midiéndolo: **no hay fugas de memoria**. Tras 380 piezas y seis partidas, con recolección de basura forzada, el montón se queda en 9766 KB, el documento en 404 elementos, los escuchadores en 113 y los nodos en ~1210, sin crecer en ninguna ronda.
- El alojamiento es estático y no permite cabeceras, así que la política va en una etiqueta. La especificación avisa de que así se ignoran `frame-ancestors`, `report-uri` y `sandbox`: no se escriben, y queda anotado que incrustar la página en otra **no queda cubierto**.
- El inventario salió favorable: un solo guion, del propio origen; sin peticiones a terceros; y un único estorbo, el atributo `onsubmit` del formulario de Ajustes, que pasa a manejador normal. Los ocho estilos aplicados desde código no obligaban a relajar nada, porque la política no alcanza las asignaciones a `element.style`.
- Solo se añade al compilar para publicar: el servidor de desarrollo usa guiones en línea y la política los bloquearía.
- Tres pruebas, y una es la que importa: **inyecta un guion en línea y comprueba que no se ejecuta**. Una política que está pero no protege es peor que ninguna.

### 2026-09-09 · Sesión 21 (agente, iteración periódica) — los avisos que se perdían

- Tema: qué se anuncia durante la partida para quien usa lector de pantalla (informe `docs/research/25`).
- Antes se descartaron dos candidatos midiéndolos: el **tamaño de los objetivos táctiles** cumple el criterio 2.5.8 con holgura (los veinte controles pasan de 24×24; el más pequeño es de 36 px, y los de la repetición miden 34×34), y el **idioma del documento** ya se actualiza al cambiar de idioma. Sin defecto ninguno.
- El defecto estaba en el filtro de avisos: descartaba cualquiera llegado antes de 900 ms del anterior **sin mirar cuál era**. En Sprint, el aviso de objetivo completado se emite en el mismo paso que la limpieza que completa las 40 líneas, con cero milisegundos entre ambos: **se perdía siempre**, no de vez en cuando (F-045).
- Además descartaba en vez de retrasar, así que de dos jugadas seguidas se tiraba la segunda, que es justo la que describe el tablero que el jugador tiene delante (F-046).
- Ahora hay una política aparte: lo importante no espera ni se descarta, lo corriente se guarda y sale al terminar el silencio, y dos textos iguales seguidos se distinguen con un espacio final para que la región viva vea un cambio. Siete pruebas.
- **Pendiente y honesto**: esto asegura que los mensajes llegan, no que sean útiles al oído. Probarlo con un lector de pantalla real sigue necesitando a una persona.
- Se intentó además una prueba de navegador que jugara un Sprint hasta el final y se descartó: el montaje resultó frágil y una prueba que no distingue el fallo del acierto no vale de nada. La política, que es donde estaba el defecto, sí queda cubierta.

### 2026-09-09 · Sesión 20 (agente, iteración periódica) — el juego ya no se congela en silencio

- Tema: qué ve el jugador si algo se rompe en marcha (informe `docs/research/24`). Antes se descartó otro candidato: el idioma del documento ya se actualiza al cambiar de idioma, así que ese defecto no existía.
- La especificación de HTML es clara: la función de animación **se retira antes de invocarse** y hay que volver a pedirla. El bucle pedía el cuadro siguiente en su última línea, después de la lógica y el dibujado, así que cualquier excepción se la saltaba.
- Comprobado en el navegador con una partida real y **un solo fallo** al dibujar: el tiempo de juego pasó de 796 a 812 ms y ahí se quedó. Pantalla congelada, teclas sin efecto, ni una palabra al jugador, partida perdida entera (F-044).
- Ahora el cuadro se ejecuta protegido y el siguiente se pide igualmente. Un fallo suelto se absorbe; tres seguidos detienen el bucle, guardan la partida y devuelven al menú con un aviso. Un cuadro bueno borra la cuenta, así que un fallo intermitente no agota la paciencia.
- Lo que convierte la caída en una simple interrupción es el guardado de la sesión 17: se comprobó que con 74 puntos antes del fallo, tras recargar y continuar salen los mismos 74.
- Tres pruebas del bucle y dos de extremo a extremo, verificadas volviendo a dejar escapar la excepción: fallan como deben.

### 2026-09-09 · Sesión 19 (agente, iteración periódica) — diálogos accesibles y la causa real de la intermitencia

- Tema: navegación por teclado en los diálogos (informe `docs/research/23`). La auditoría automática lleva quince sesiones sin violaciones, pero mira el marcado, no el comportamiento.
- Medido tabulando veinticinco veces desde el menú: **nueve pulsaciones caían fuera del diálogo**, y no en cualquier sitio, sino en el botón de pantalla completa que está detrás. Faltaba `aria-modal` y la tecla de escape no cerraba nada (F-043).
- Arreglado en el gestor de pantallas: el foco da la vuelta dentro del diálogo en ambos sentidos, `aria-modal` solo mientras está abierto, y la tecla de escape pulsa el botón de volver que cada diálogo ya tiene, en vez de repetir a dónde va cada uno. Cede mientras se reasigna una tecla en Ajustes, donde esa tecla ya tenía dueño.
- **Corrección de la sesión anterior**: di F-025 por cerrado con tres pasadas verdes y fue prematuro. El fallo volvió, otra vez con dos puntos de diferencia. La causa de fondo es que al reproducir una repetición las pulsaciones se aplicaban un paso antes que en la partida original: quien juega pulsa entre dos pasos y su orden la consume el siguiente (F-042). Corregido drenando con el reloj anterior al paso, y truncando el tiempo al grabar en vez de redondearlo. Cuatro pasadas seguidas limpias.
- Encontrado de paso que las capturas del modo 3D tardan 17 s y el límite general son 30, así que en paralelo se pasaban (F-041). Marcadas como lentas.
- Diez pruebas de extremo a extremo nuevas, verificadas quitando el arreglo: el foco vuelve a escaparse al botón de detrás.

### 2026-09-09 · Sesión 18 (agente, iteración periódica) — por qué fallaba la suite

- Tema: F-025, los fallos intermitentes de la suite de extremo a extremo. Llevaba nueve sesiones abierto con la nota «no se pudo reproducir», y la sesión anterior lo empeoró: dos de tres pasadas fallaron.
- La sospecha escrita era contención de procesador entre trabajadores. **Era falsa.** Se reprodujo ejecutando la suite tres veces: falló una, y no fue ninguna de las pruebas de rendimiento, que eran las sospechosas. Falló la de continuar partida, con «Expected: 96, Received: 98»: dos puntos, exactamente una celda de caída rápida. No era ruido de medida sino una partida distinta.
- **Causa**: el gancho que usan las pruebas para avanzar el tiempo tenía el paso escrito a mano, `1000 / 120`, y se quedó atrás cuando la simulación pasó a 240 pasos por segundo en la sesión 15. Desde entonces todas las pruebas de extremo a extremo medían un juego que no existe en producción: la gravedad, el retardo de bloqueo y el reparto de piezas dependen del tamaño del paso. Seguían pasando porque eran coherentes consigo mismas (F-040).
- El fallo intermitente salía cuando algo comparaba los dos relojes. La prueba de continuar partida hace justo eso: juega con el gancho y reconstruye con el reloj que va dentro de la repetición, que sí es el de verdad.
- Arreglo: el bucle expone su paso y el gancho lo usa, así que ya no hay dos sitios que puedan discrepar. Tres pasadas seguidas limpias después.
- La prueba que lo ata necesitó dos intentos: la primera comprobaba que pedir mil milisegundos avanzaba mil, y eso sale igual con los dos relojes. Hizo falta pedir seis milisegundos, que delatan la granularidad. Verificada restaurando el número antiguo: falla como debe.
- Corregidos los demás restos del reloj anterior: dos comentarios, el diagrama de `ARCHITECTURE.md` y el paso de las pruebas de reproducción.
- Lección anotada en F-025: lo que resolvió el caso fue leer el mensaje de error concreto, no contar cuántas pruebas fallaban.

### 2026-09-08 · Sesión 17 (agente, iteración periódica) — continuar la partida a medias

- Tema del backlog: guardar la partida en curso para no perderla al cerrar la pestaña (informe `docs/research/21`).
- **Cuándo guardar**: la documentación de Chrome es tajante. `unload` es «extremely unreliable, especially on mobile» y no se dispara al cerrar la pestaña desde el conmutador; `beforeunload` tampoco es de fiar. El estado oculto es «the last reliable time to save app and user data». Y la especificación del ciclo de vida confirma que el descarte por falta de memoria no avisa: no hay último aviso posible.
- **Qué guardar**: no el tablero, sino la semilla y las pulsaciones. El motor es determinista, así que reproducirlas devuelve la misma partida exacta. Ocupa unos kilobytes, reutiliza el formato de repeticiones ya versionado, y rehacer diez minutos de maratón son unas décimas de segundo porque el paso cuesta menos de un microsegundo.
- La partida vuelve en pausa, y mientras haya una a medias empezar otra deja de ser la acción destacada del menú, para que no compitan dos botones por la atención.
- Dos fallos que sacó la prueba del ciclo doble (guardar, continuar, volver a guardar, volver a continuar, comparando el tablero celda a celda): **pausar mentía**, porque soltaba las teclas sin anotarlo en el registro (F-038), y **sumar milisegundos en dos tramos no da lo mismo** en coma flotante, y un paso de diferencia es una fila de caída (F-039). Sin ese ciclo doble ninguno se habría visto.
- Seis pruebas unitarias y una de extremo a extremo que hace el recorrido real en el navegador: jugar, ocultar la página, recargar, continuar y comparar el tablero.
- La suite de extremo a extremo volvió a fallar de forma intermitente: de tres pasadas, dos fallaron con pruebas distintas y ambas pasan aisladas. Anotado en F-025, que apunta a contención de procesador entre trabajadores.

### 2026-09-08 · Sesión 16 (agente, iteración periódica) — actualizar sin pisar la partida

- El backlog solo dejaba los dos temas que necesitan a una persona, así que se buscó un área sin cubrir: qué le pasa a quien está jugando cuando se publica una versión nueva (informe `docs/research/20`, ADR-0010).
- La aplicación instalada se actualizaba sola. La especificación de service workers lo dice sin adornos: saltarse la espera activa la versión nueva **mientras hay páginas usando la anterior**. Y la configuración borraba además las cachés viejas al activarse.
- Este juego tiene justo el caso que la documentación de Chrome señala como peligroso: el modo 3D se descarga aparte, con el nombre marcado por el contenido. Entre dos compilaciones de la misma tarde pasó de `ThreeRenderer-DEFhGv_3.js` a `ThreeRenderer-C_GjVOkI.js`. Quien tuviera la página abierta al publicarse una versión y activara luego el modo 3D pedía un archivo que ya no estaba ni en la caché ni en el servidor (F-036). Degradaba al modo clásico, pero perdía el 3D sin motivo.
- Peor aún, nada avisaba: la página se quedaba con el código antiguo en memoria mientras el service worker nuevo servía archivos nuevos (F-037).
- Ahora la versión nueva espera y la aplicación le da paso cuando no hay partida que perder: al terminar una o al volver al menú. Una partida en pausa cuenta como viva, porque recargar la perdería igual. El service worker se registra con la API del navegador para no añadir dependencias.
- De paso se midió el arranque, que nunca se había mirado: 140 ms al primer contenido y al mayor elemento pintados, 0,035 de desplazamiento acumulado, sin tareas largas. Está sobrado y no hay nada que tocar.
- Nueve pruebas nuevas. Una comprueba sobre el archivo publicado que el service worker no se adelanta; se verificó volviendo a poner la configuración anterior, y falla como debe. Suite completa de extremo a extremo en verde (62 casos).

### 2026-09-08 · Sesión 15 (agente, iteración periódica) — reloj de la simulación a 240 Hz

- Tema del backlog: subir la frecuencia lógica y versionar las repeticiones (informe `docs/research/19`, ADR-0009). Era el punto que la sesión anterior dejó abierto por miedo a perder las repeticiones guardadas.
- Al medirlo apareció un segundo motivo, más importante que el primero: **el retardo de auto-repetición no era el configurado**. Pidiendo 167 ms, la pieza se movía de verdad a los 175,0 ms, casi un 5 % más lento. Un evento solo puede ocurrir al terminar un paso, así que el sesgo era sistemático y siempre hacia tarde (F-035).
- El obstáculo de las repeticiones tenía una salida sencilla que no se había visto: el problema no era cambiar el reloj, sino no saber con cuál se grabó cada repetición. Ahora cada una lo guarda y se reproduce con el suyo; las antiguas no lo llevan pero se sabe que era 120 Hz, así que **siguen reproduciéndose exactamente igual y no se pierde ninguna**.
- Con el reloj a 240 Hz: el error del retardo baja de 8,0 a 3,8 ms y desaparecen los cuadros sin lógica en pantallas de 144, 165 y 240 Hz (F-033 queda resuelto). Por encima de 240 Hz el problema reaparece, que es aritmética y no un fallo; hay una prueba que lo deja fijado.
- El gasto se dobla pero sigue siendo despreciable: medido con el motor caliente, 0,8 µs por paso, dos centésimas por ciento de un núcleo.
- Ocho pruebas nuevas y suite completa de extremo a extremo en verde (60 casos), que era la verificación importante al tocar el reloj del motor.

### 2026-09-08 · Sesión 14 (agente, iteración periódica) — latencia de entrada

- Tema del backlog: latencia de entrada, de la pulsación al cuadro dibujado (informe `docs/research/18`).
- La especificación de HTML fija que las funciones de animación corren antes de recalcular estilos y disposición, y que los eventos se reparten antes de eso. Medido en el navegador con cuarenta pulsaciones de una partida real: 0,20 ms de mediana desde que ocurre la pulsación hasta que el juego la procesa, y 7,8 ms más hasta el cuadro siguiente, que es medio cuadro a 60 Hz. Es el mínimo que permite la plataforma: no hay ningún cuadro que recortar.
- Se comprobó también si el arranque del bucle mezcla bases de tiempo, porque fija su referencia con `performance.now()` y luego recibe la marca del cuadro. En treinta arranques la diferencia salió siempre positiva. No es un problema, y queda escrito para no volver a sospecharlo.
- Sí apareció un punto flojo: con la lógica a 120 Hz, en pantallas más rápidas hay cuadros que no ejecutan ningún paso (17 % a 144 Hz, 50 % a 240 Hz) y el peor caso de espera a 144 Hz dobla con creces al de 120 Hz. Cambiar a una pantalla más rápida empeora el peor caso (F-033).
- No se corrige hoy: subir la frecuencia lógica cambia el momento en que se aplican las pulsaciones grabadas, así que invalidaría todas las repeticiones guardadas. Eso es una decisión con pérdida de datos del usuario, no el retoque de una constante; queda como primer próximo paso con su ADR.
- Lo que sí faltaba y se hizo: el bucle era el único módulo de `src/game` sin una sola prueba (F-034). Doce pruebas nuevas, verificadas invirtiendo el orden de lógica y dibujado y quitando el tope de parón: cazan ambas regresiones.
- Evidencia visual en `docs/assets/latencia-por-refresco.svg`.

### 2026-09-08 · Sesión 13 (agente, iteración periódica) — sonoridad medida de los efectos

- Tema del backlog: afinar los efectos de sonido (informe `docs/research/17`). Estaba marcado como bloqueado por necesitar oído. Lo está en parte: el timbre sí, pero el equilibrio entre unos efectos y otros es un número, y el orden entre ellos lo dicta la tabla de puntuación del propio juego.
- La UIT-R BS.1770 define cómo se mide la sonoridad percibida: un filtro de dos etapas que corrige que el oído no pesa igual todas las frecuencias, y la energía de la señal filtrada. El recorte por bloques que también describe no aplica aquí, porque usa bloques de 400 ms y casi todos los efectos duran menos.
- Medidos los veintiséis, salió un defecto claro: el sonido del tetris era el más flojo de las cuatro limpiezas, 2,3 dB por debajo del triple y medio decibelio por debajo de un simple, con el volumen nominal más alto de los cuatro. El volumen del preset no predice la sonoridad porque cada efecto tiene forma de onda, envolvente y duración distintas (F-031).
- También salió que la caída rápida, que suena en cada pieza, era el cuarto efecto más fuerte del juego y competía con las limpiezas (F-032).
- Escalera ajustada a decibelio y medio por peldaño y siete pruebas que la fijan, incluida la comprobación de conformidad de la recomendación: un tono de 1 kHz a plena escala debe medir −3,01 LKFS y el medidor da −3,004. Se verificó que la prueba caza el defecto original volviendo a poner el valor antiguo.
- Evidencia visual en `docs/assets/sonoridad-efectos.svg`: la curva de antes se desploma justo en el tetris.

### 2026-09-08 · Sesión 12 (agente, iteración periódica) — posiciones preparadas

- Tema del backlog: posiciones preparadas en el modo práctica (informe `docs/research/16`).
- La wiki de Hard Drop documenta una regla que no se descubre jugando: si la T entra usando la última prueba del ajuste, el giro asciende a completo aunque las esquinas no cumplan la condición de siempre. Es justo el tipo de jugada que merece una posición para entrenarla.
- Cuatro posiciones en el modo práctica, cada una con su tablero montado y su cola de piezas fija: giro doble de la T, giro triple, vaciar el tablero y giro por encaje. La del encaje enciende sola los giros de todas las piezas, que es lo único con lo que cuenta.
- El motor admite ahora arrancar con un tablero y una cola dados. Es lo que hace posibles las posiciones, y sirve igual para cualquiera que se añada después.
- Siete pruebas que juegan la solución de cada posición y comprueban lo prometido: tipo de giro, líneas, puntos y, en el giro triple, que el ajuste usado es la quinta prueba. Una captura de referencia con la posición montada.

### 2026-09-08 · Sesión 11 (agente, iteración periódica) — controles de la repetición

- Tema del backlog: controles de avance y velocidad al ver una repetición (informe `docs/research/15`).
- El W3C tiene los requisitos escritos con identificadores concretos, que sirven de lista de comprobación: velocidad ajustable entre la mitad y dos veces y media, función para volverla a la normal, poder pausar y reanudar, y que todo se maneje con el teclado.
- Barra que aparece solo durante una repetición: volver al principio, pausar, velocidad en ciclo, avance y salir. Con etiquetas, foco visible y atajos de teclado que reutilizan las teclas del juego, inertes durante la reproducción.
- La velocidad multiplica cuántos pasos se dan por segundo, nunca el tamaño del paso. Así el motor recibe siempre lo mismo y el resultado no cambia: hay una prueba que compara el tablero final a cinco velocidades distintas.
- Seis pruebas nuevas y una captura de referencia.

### 2026-09-08 · Sesión 10 (agente, iteración periódica) — comparar con tu récord

- Tema del backlog: fantasma del récord en Sprint (informe `docs/research/14`).
- Se descartó el fantasma visual. En un juego de carreras es un coche translúcido en una pista; aquí serían bloques translúcidos sobre el mismo tablero, compitiendo con la pieza fantasma y con los colores, que son la única señal que distingue cada pieza.
- En su lugar se trajo lo que hacen las carreras contrarreloj: comparación por hitos. Cada diez líneas se muestra cuánto se va por delante o por detrás del récord, en verde o en naranja, y el panel del modo enseña la mejor marca como referencia.
- Los récords guardan ahora los tiempos parciales. Los guardados antes siguen valiendo: simplemente no tienen con qué comparar, y hay una prueba que lo fija.
- Diez pruebas del módulo de hitos, más dos capturas de referencia.
- Los controles de avance al ver una repetición quedan para otra iteración.

### 2026-09-08 · Sesión 9 (agente, iteración periódica) — basura y gravedad máxima

- Tema del backlog: subida de basura y gravedad máxima para el modo práctica (informe `docs/research/13`).
- La wiki oficial publica la tabla de cuántas filas envía cada jugada, cómo se acumulan en una cola y cómo limpiar líneas las cancela antes de que entren. La wiki de Hard Drop añade las proporciones de huecos alineados según el tipo de basura.
- El modo práctica gana subida de basura configurable, con hueco que se mantiene y cambia con cierta probabilidad, más niveles hasta el veinte para entrenar con gravedad máxima.
- La basura se genera con el mismo generador que las piezas, así que una repetición sigue reproduciendo exactamente las mismas filas. Hay una prueba que lo fija.
- Diecisiete pruebas nuevas: la tabla de ataque completa, la cancelación, la subida, el hueco, el determinismo y que los demás modos nunca traen basura.
- Volvió a fallar una sustitución automática sobre el HTML y los controles nuevos no llegaron a la página. Solo se vio al mirar la captura (F-028).

### 2026-09-08 · Sesión 8 (agente, iteración periódica) — partículas en equipos lentos

- Tema del backlog: coste de las partículas en un teléfono de gama baja (informe `docs/research/12`).
- Sin teléfono a mano, se midió con el freno de procesador del navegador. Conviene ser explícito: la documentación de Chrome avisa de que eso no simula un móvil de verdad, así que las medidas dicen cómo escala el coste, no cómo se comporta en un aparato concreto.
- Hallazgo: el límite de partículas era un número fijo de 600 que no miraba nada. Con el procesador seis veces más lento aparecían picos de 114 milisegundos, casi siete cuadros perdidos, y justo al limpiar líneas.
- Ahora el presupuesto se recorta tras varios cuadros lentos seguidos y se recupera despacio, con el mismo criterio que ya usaba el modo tridimensional para su resplandor.
- Resultado: con el procesador seis veces más lento, el peor cuadro pasa de 114 a 8,4 milisegundos y el percentil 95 vuelve dentro del presupuesto. En una máquina holgada no cambia nada.
- Once pruebas nuevas del módulo de efectos y una de extremo a extremo que frena el procesador y comprueba que el presupuesto baja de verdad.

### 2026-09-08 · Sesión 7 (agente, iteración periódica) — giros de todas las piezas

- Tema del backlog: giros de piezas distintas de la T y verificación de la tabla de giro de 180 (informe `docs/research/11`).
- La regla del inmóvil está definida sin ambigüedad en la wiki de Hard Drop: un giro cuenta si la pieza se fija sin poder moverse a la izquierda, a la derecha ni hacia arriba. TETR.IO la aplica desde julio de 2024 y desde enero de 2025 la extiende también a la T.
- Ajuste nuevo con tres valores, apagado por omisión: solo la T con la regla oficial, todas las piezas con la T por esquinas, o todas incluyendo la T por encaje. Los giros de otras piezas puntúan como giro menor y cuentan como jugada difícil.
- La tabla de giro de 180 sigue sin fuente numérica pública, así que F-001 continúa abierto. Se añadieron cuatro pruebas de sus propiedades, que es lo máximo verificable sin acceso al juego original.
- Quince pruebas nuevas, incluidas dos maniobras completas que comprueban que el comportamiento por omisión no cambia.

### 2026-09-08 · Sesión 6 (agente, iteración periódica) — aprender jugando

- Tema del backlog: tutorial interactivo de un minuto (informe `docs/research/10`).
- La investigación desaconseja ese formato: los avisos que interrumpen al arrancar se saltan, no se recuerdan y no mejoran el desempeño. Solo compensan con formas de interacción genuinamente nuevas, y mover bloques que caen no lo es.
- Lo que sí es opaco aquí es otra cosa: la reserva de pieza, la caída rápida, el giro de la T, el bono por encadenar y los combos. Nada de eso se descubre solo.
- Se descartó el tutorial y se hicieron consejos contextuales: aparecen la primera vez que cada mecánica importa, una sola vez en la vida, sin bloquear la partida y con un intervalo mínimo entre ellos. Se pueden apagar en Ajustes.
- Módulo `src/game/coaching.ts` sin dependencias del navegador, con nueve pruebas, más dos de extremo a extremo y una captura de referencia.
- De paso se descubrió que el interruptor de avisos de finesse nunca había llegado al formulario de Ajustes.

### 2026-09-07 · Sesión 5 (agente, iteración periódica) — colores y daltonismo

- Tema del backlog: verificar la paleta con simuladores de daltonismo (informe `docs/research/09`). Se saltó el ajuste de efectos de sonido, que figuraba como siguiente, porque exige que alguien escuche y compare y no se puede verificar de otro modo.
- Método: simulación de las tres dicromacias con las matrices de Machado, Oliveira y Fernandes, y medida de la diferencia percibida entre cada par de piezas con CIEDE2000.
- Hallazgo grave: en la paleta por defecto, la pieza azul y la morada tenían una diferencia de 2,0 con protanopia, es decir eran el mismo color. Afecta a una de cada doce personas de sexo masculino.
- Segundo hallazgo: la paleta llamada "alto contraste" era la peor de las tres para daltonismo, justo lo contrario de lo que su nombre sugiere.
- Cambios: azul más profundo para la pieza J (2,0 → 6,7), paleta de alto contraste rehecha (2,6 → 9,1) y etiquetas de Ajustes que describen lo que hace cada opción.
- Módulo nuevo `src/render/colorVision.ts` con la simulación y la fórmula de diferencia de color, más nueve pruebas que impiden que una paleta futura empeore.

### 2026-09-07 · Sesión 4 (agente, iteración periódica) — espacio en móviles pequeños

- Tema del backlog: legibilidad del marcador en pantallas de 360 puntos o menos (informe `docs/research/08`).
- La medición cambió el diagnóstico: la tipografía ya estaba bien a 16 píxeles; lo que fallaba era el reparto del espacio. El tablero ocupaba 160 puntos de los 360 disponibles porque el ancho se calculaba restando una altura fija de 300 píxeles.
- Ahora el contenedor del juego reparte el alto con una rejilla y el tablero se queda con lo que sobra. La celda pasa de 16 a 20 píxeles en un móvil de 360, y de 13 a 17 en uno de 320.
- Corregidos dos desbordamientos horizontales: los siete botones táctiles pedían más ancho del que había, y la animación de la cuenta atrás arrastraba la página al ampliarse.
- Prueba nueva que falla si el tablero se encoge por debajo de un tamaño de celda razonable, si algo se sale a lo ancho o si el marcador baja del mínimo legible. Distingue entre tener o no la fila de botones táctiles a la vista, porque ocupa 64 puntos y eso son 3 píxeles menos de celda.
- Medidas del tamaño de celda tras el cambio: 17 y 13 píxeles en una pantalla de 320 puntos (sin y con botones táctiles), 20 y 17 en una de 360, y 30 y 27 en una de 390.

### 2026-09-07 · Sesión 3 (agente Claude) — renderer 3D y finesse

- Decidido con el usuario: three.js para el renderer premium (ADR-0008), con las cuatro líneas de trabajo restantes aprobadas.
- `ThreeRenderer` completo: pozo con paredes iluminadas, cubos biselados por instancia, fantasma, partículas en tres dimensiones, sacudida y balanceo de cámara, pulso de luz al subir de nivel y aviso rojo cuando la pila sube.
- Resplandor con `RenderPipeline` y bloom de TSL. Se ajustó tras verlo en pantalla: la primera versión quemaba todo a blanco porque la emisión era global en lugar de venir del color de cada pieza.
- WebGPU con vuelta atrás automática a WebGL2 y, si tampoco hay, a Canvas 2D. Verificado con una prueba que simula un dispositivo sin GPU.
- Carga diferida real: el fragmento de three.js queda fuera de la precarga del service worker y se guarda en caché solo cuando alguien usa el modo.
- Coste de render en 3D: 1,9 ms en el percentil 95, dentro del presupuesto de 8 ms.
- Medida de finesse: pulsaciones mínimas por colocación con Dijkstra, porcentaje en el marcador y en resultados, y aviso opcional al gastar teclas de más. El primer intento usaba búsqueda en anchura y daba mínimos incorrectos.
- Las pruebas de extremo a extremo pasaron a tener su propio `tsconfig.json`, para poder usar tipos de Node sin contaminar el código del navegador.
- Repeticiones: semilla más lista de pulsaciones. La prueba clave comprueba que reproducir una partida da el mismo tablero, la misma puntuación y las mismas piezas.
- Traducción al inglés de toda la interfaz, con detección del idioma del navegador y cambio inmediato desde Ajustes.
- Modos nuevos: reto diario con semilla derivada de la fecha (misma partida para todos, sin servidor) y modo práctica sin fin.

### 2026-09-07 · Sesión 2 (agente Claude) — validación y aplicación instalable

- Validación del motor con maniobras reales en `src/core/maneuvers.test.ts`: T-Spin Triple con la 5ª prueba del kick, T-Spin Double con back-to-back, I-spin en pozo, perfect clear normal y encadenado, combos, mini T-spin y fin de partida. Todas correctas.
- Dos aserciones propias estaban mal y el motor tenía razón: un Tetris que vacía el tablero también es perfect clear, y la segunda limpieza consecutiva suma combo.
- Medido el rendimiento: 35 µs por paso lógico y 1,0 ms de render en el peor caso. Hay margen amplio para un renderer más ambicioso.
- Auditoría de accesibilidad con axe-core: una violación real corregida (el viewport impedía el zoom, criterio WCAG 1.4.4).
- Aplicación instalable y sin conexión con `vite-plugin-pwa`; iconos generados por script con Playwright (`pnpm icons`).
- Integración continua ampliada: ahora también verifica accesibilidad, presupuesto de render y funcionamiento sin conexión.
- Cerrado el PR de TypeScript 7 (incompatible con typescript-eslint) y rebasados los demás de Dependabot.
- Informe `docs/research/07-validacion-y-plan-fase-3.md` con los datos y el plan.

### 2026-09-07 · Sesión 1 (agente Claude)

- Investigación completa en `docs/research/01..06` (fuentes primarias: tetris.wiki vía curl; npm; docs de tooling).
- Verificado: TypeScript 7.0.2 incompatible con typescript-eslint 8.69 (`<6.1.0`) → se usa TS 6.0.3.
- Arquitectura y ADRs 0001-0007; AGENTS.md/CLAUDE.md; protocolo de iteración.
- Andamiaje del proyecto en curso; repositorio GitHub `genialcode2077/tetris-html` pendiente de crear.
- Hallazgos registrados en `docs/FINDINGS.md` (F-001..F-005).
