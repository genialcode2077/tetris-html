# ADR-0010 · La versión nueva espera a que termine la partida

- **Fecha:** 2026-09-08 · **Estado:** aceptada
- **Contexto:** hallazgos F-036 y F-037, informe `docs/research/20`.

## Contexto

La aplicación instalable se configuró con actualización automática. Eso hace dos cosas a la vez: el service worker nuevo se salta la espera y toma el control de las páginas ya abiertas, y las cachés anteriores se borran al activarse.

La especificación de service workers describe el efecto sin adornos:

> «The skip waiting flag of a service worker causes activation of the service worker registration to occur **while service worker clients are using the service worker registration**.»

Es decir, la versión nueva entra mientras hay páginas usando la anterior. La documentación de Chrome sobre actualizaciones señala la consecuencia práctica: las páginas que siguen ejecutando la versión anterior «may reference assets that no longer exist or have changed».

Este juego tiene exactamente ese caso: el modo 3D se descarga aparte, con el nombre marcado por el contenido. Entre dos compilaciones de la misma tarde ese nombre pasó de `ThreeRenderer-DEFhGv_3.js` a `ThreeRenderer-C_GjVOkI.js`. Si alguien tiene la página abierta cuando se publica una versión y luego activa el modo 3D, pide un archivo que ya no está ni en la caché, recién limpiada, ni en el servidor.

## Decisión

**El service worker nuevo se queda esperando, y la aplicación le da paso cuando no hay una partida que perder.**

- Se registra a mano con la API del navegador, sin dependencias nuevas.
- Al detectar una versión esperando, la aplicación decide: si no hay partida abierta o ya ha terminado, le da paso y se recarga; si hay una en curso, espera.
- Una partida en pausa cuenta como partida en curso: recargar la perdería igual.
- El momento se vuelve a consultar al terminar cada partida y al volver al menú, no con un temporizador.

## Consecuencias

**A favor**

- Nadie pierde una partida por una actualización. Un maratón son diez minutos de trabajo del jugador.
- Se acaba la mezcla de versiones: la página que carga una versión se queda con ella hasta que se recarga entera.
- La decisión de cuándo actualizar es código propio, con pruebas, en vez de un efecto del empaquetador.

**En contra**

- Quien deje la pestaña abierta jugando sin parar puede tardar en recibir la versión nueva. Es el precio de no interrumpirle, y se recupera en cuanto vuelve al menú.
- Hay que mantener el registro del service worker a mano, unas treinta líneas, en lugar de delegarlo.

**Descartado**

- _Seguir con actualización automática_: es lo que provoca el problema.
- _Preguntar al jugador si quiere actualizar_: una pregunta más que casi nadie sabe responder, para algo que se puede decidir solo.
- _Usar el módulo auxiliar del empaquetador_: arrastra una dependencia nueva, y AGENTS.md las condiciona a un ADR que no compensa abrir para treinta líneas.
