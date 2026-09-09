# 26 · Política de seguridad de contenido

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** seguridad de la página publicada. No estaba en el backlog; se buscó un área sin cubrir.

## Contexto / pregunta

El juego guarda cosas del jugador en el navegador: ajustes, récords, repeticiones y la partida a medias. Nunca se había mirado qué pasaría si algún guion ajeno llegara a ejecutarse en la página.

Antes se descartaron dos candidatos midiéndolos, y conviene dejarlo escrito:

- **Fugas de memoria en partidas largas.** Se midió con recolección de basura forzada tras 380 piezas y seis partidas seguidas: montón de JavaScript estable en 9766 KB, 404 elementos en el documento, 113 escuchadores de eventos y unos 1210 nodos, sin crecer en ninguna ronda. No hay fuga.
- **Tamaño de los objetivos táctiles**, ya comprobado en el informe 25.

## Hallazgos

### No había ninguna política

La página se servía sin `Content-Security-Policy`. Cualquier guion que consiguiera colarse tendría acceso completo al almacenamiento del jugador (F-047).

### El alojamiento no permite cabeceras, y eso limita lo que se puede pedir

La especificación de CSP admite entregar la política en una etiqueta del documento:

> «A `Document` may deliver a policy via one or more HTML `meta` elements whose `http-equiv` attributes are an ASCII case-insensitive match for the string "Content-Security-Policy".»

Pero con una salvedad importante:

> «Neither are the `report-uri`, `frame-ancestors`, and `sandbox` directives.»

Esas tres se ignoran. Escribirlas daría una falsa sensación de protección, así que no se ponen y se deja anotado que **incrustar la página en otra no queda cubierto** por esta vía.

### La página estaba casi lista para una política estricta

El inventario salió favorable:

| Qué                            | Estado                                      |
| ------------------------------ | ------------------------------------------- |
| Guiones                        | Uno solo, externo y del propio origen       |
| Hojas de estilo                | Del propio origen                           |
| Peticiones a terceros          | Ninguna                                     |
| Atributos de evento en línea   | Uno: `onsubmit` en el formulario de Ajustes |
| Estilos aplicados desde código | Ocho, y **no los alcanza la política**      |

Lo último merece explicarse porque es contraintuitivo: la especificación somete a la política los atributos `style` del marcado y las etiquetas de estilo, no las asignaciones a `element.style` desde el código. Así que esos ocho usos no obligaban a relajar nada.

El único obstáculo real era el atributo `onsubmit`, que existía para que pulsar Intro en Ajustes no recargara la página. Pasa a ser un manejador normal.

### Desarrollo y producción no pueden llevar la misma política

El servidor de desarrollo inyecta guiones en línea para recargar en caliente. Una política estricta los bloquearía y dejaría el desarrollo inservible. Por eso la política se añade solo al compilar para publicar.

## Opciones y comparativa

| Opción                                   | Protege | Coste                                   |
| ---------------------------------------- | ------- | --------------------------------------- |
| Sin política                             | Nada    | Ninguno                                 |
| Política con guiones en línea permitidos | Poco    | Ninguno, pero deja pasar lo que importa |
| Política estricta, solo en producción    | Sí      | Un manejador en vez de un atributo      |

## Decisión recomendada

La tercera, en ADR-0011. Todo desde el propio origen, `default-src 'none'` como base, y sin las directivas que se ignoran en etiqueta.

## Acción

- Política añadida al compilar para publicar, mediante un complemento pequeño.
- El atributo de evento del formulario pasa a manejador.
- Tres pruebas: que la página la declara, que **bloquea de verdad** un guion inyectado, y que el juego entero funciona sin saltársela ni una vez.

## Riesgos

Una política que está pero no protege es peor que ninguna, porque invita a confiarse. Por eso una de las pruebas inyecta un guion en línea y comprueba dos cosas: que no se ejecuta y que la infracción se notifica. Si alguien relajara la política, esa prueba lo diría.

Incrustar la página en otra no queda cubierto, porque esa directiva se ignora cuando la política llega en etiqueta. Requeriría una cabecera del servidor, y eso depende de dónde se publique.

Desarrollo y producción difieren. Se compensa con pruebas que corren contra la compilación publicada, que es lo que ve el jugador.

## Referencias

- https://www.w3.org/TR/CSP3/ — entrega en etiqueta, directivas ignoradas, y qué somete la política de los estilos.
- ADR-0011, con la decisión y sus consecuencias.
- Informe 20, sobre el service worker, que sigue funcionando bajo la política.
