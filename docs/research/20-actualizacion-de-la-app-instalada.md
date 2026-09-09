# 20 · Actualización de la aplicación instalada

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema:** qué pasa cuando se publica una versión nueva y alguien tiene el juego abierto. No estaba en el backlog: los dos que quedaban necesitan a una persona con un dispositivo o con oído, así que se buscó un área sin cubrir.

## Contexto / pregunta

El juego se instala y funciona sin conexión. Eso significa que la copia que usa cada persona vive en su dispositivo, no en el servidor. La pregunta que nunca se había hecho: **cuando se publica una versión, ¿qué le pasa a quien está jugando?**

De paso se midió el arranque, porque era otra cosa nunca comprobada.

## Hallazgos

### El arranque está sobrado

Medido sobre la compilación de producción, con las mismas herramientas que usa el navegador para vigilar la experiencia de carga:

| Medida                                 | Valor   | Umbral de «bueno» |
| -------------------------------------- | ------- | ----------------- |
| Primer contenido pintado               | 140 ms  | ≤ 1800 ms         |
| Mayor elemento pintado                 | 140 ms  | ≤ 2500 ms         |
| Desplazamiento acumulado del contenido | 0,035   | ≤ 0,1             |
| Tareas largas                          | ninguna | —                 |

No hay nada que arreglar aquí. Queda anotado para no volver a mirarlo sin motivo.

### La versión nueva entraba pisando a la anterior

La aplicación estaba configurada con actualización automática. La especificación de service workers dice qué implica:

> «The skip waiting flag of a service worker causes activation of the service worker registration to occur **while service worker clients are using the service worker registration**.»

La versión nueva se activa mientras hay páginas usando la anterior. Y la configuración también borraba las cachés viejas al activarse.

La documentación de Chrome sobre actualizaciones nombra la consecuencia: las páginas que siguen ejecutando la versión anterior «may reference assets that no longer exist or have changed».

**Este juego tiene justo ese caso.** El modo 3D se descarga aparte y su nombre lleva la marca del contenido. Entre dos compilaciones de la misma tarde pasó de `ThreeRenderer-DEFhGv_3.js` a `ThreeRenderer-C_GjVOkI.js`. Quien tuviera la página abierta al publicarse una versión y luego activara el modo 3D pediría un archivo que ya no está en ningún sitio: ni en la caché, recién limpiada, ni en el servidor, que solo tiene el nuevo (F-036).

El juego degrada con elegancia, porque vuelve al modo clásico si el 3D falla, así que no se rompe. Pero el jugador pierde el modo 3D sin ningún motivo y sin saber por qué.

### Lo segundo, y peor: nada avisa

Con esa configuración, la página abierta se queda con el código antiguo **en memoria indefinidamente**, hasta que alguien la recargue a mano, mientras el service worker nuevo ya sirve archivos nuevos a las peticiones que salgan. Lo peor de las dos cosas: versiones mezcladas y ningún aviso (F-037).

### Qué hay que decidir en realidad

Lo que hacía falta no era elegir entre actualizar pronto o tarde, sino **decidir el momento**. Recargar la página aplica la versión nueva de golpe y limpia la mezcla; el problema es únicamente que recargar a mitad de partida la pierde, y un maratón son diez minutos de trabajo del jugador.

## Opciones y comparativa

| Opción                                  | Mezcla de versiones | Partida en curso | Coste                           |
| --------------------------------------- | ------------------- | ---------------- | ------------------------------- |
| Actualización automática (lo que había) | Sí                  | Se pierde        | Ninguno                         |
| Preguntar al jugador                    | No                  | A salvo          | Una pregunta que nadie entiende |
| Esperar y entrar cuando sea seguro      | No                  | A salvo          | Unas treinta líneas propias     |

## Decisión recomendada

La tercera, en ADR-0010. El service worker nuevo espera; la aplicación le da paso cuando no hay partida abierta o cuando la que había ya terminó. Una partida en pausa cuenta como viva, porque recargar la perdería igual.

Se registra con la API del navegador en vez del módulo auxiliar del empaquetador, que arrastraba una dependencia nueva y habría necesitado su propio ADR para ahorrar treinta líneas.

## Acción

- Configuración a modo de espera, sin adelantarse.
- Registro propio del service worker con la API del navegador.
- Módulo con la regla de cuándo entrar, con pruebas.
- Prueba que comprueba que el service worker publicado no se adelanta por su cuenta.

## Riesgos

Quien deje la pestaña abierta jugando sin parar tardará en recibir la versión nueva. Se recupera en cuanto vuelva al menú, y es preferible a interrumpirle.

El flujo completo de actualización, con dos versiones desplegadas de verdad, no se prueba de extremo a extremo: haría falta publicar dos veces durante la prueba. Se cubre por partes: la regla de decisión con pruebas propias, y que el service worker publicado no se adelante con una prueba sobre el archivo generado. Esa segunda se verificó volviendo a poner la configuración anterior, y falla como debe.

## Referencias

- https://w3c.github.io/ServiceWorker/ — especificación de service workers; el efecto de saltarse la espera mientras hay clientes usando el registro.
- https://developer.chrome.com/docs/workbox/handling-service-worker-updates — riesgos de activar de inmediato con recursos que se cargan a demanda.
- ADR-0010, con la decisión y sus consecuencias.
- ADR-0008, sobre por qué el modo 3D se descarga aparte, que es lo que hace visible el problema.
