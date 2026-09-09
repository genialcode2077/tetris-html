# ADR-0011 · Política de seguridad de contenido en etiqueta, solo en producción

- **Fecha:** 2026-09-09 · **Estado:** aceptada
- **Contexto:** informe `docs/research/26`, hallazgo F-047.

## Contexto

El juego no tenía ninguna política de seguridad de contenido. No es una web que reciba datos de terceros, pero sí guarda cosas del jugador en el navegador: ajustes, récords, repeticiones y la partida a medias. Cualquier guion que llegara a ejecutarse en la página podría leerlas o alterarlas.

El proyecto se publica en un alojamiento estático que no permite añadir cabeceras, así que la política tiene que viajar en una etiqueta del documento. La especificación acota qué se puede hacer así:

> «Neither are the `report-uri`, `frame-ancestors`, and `sandbox` directives.»

Es decir, esas tres se ignoran y no tiene sentido escribirlas.

El inventario de la página resultó favorable: un único guion, externo y del propio origen; las hojas de estilo, del propio origen; ninguna petición a terceros. Solo estorbaba un atributo `onsubmit` en el formulario de Ajustes.

## Decisión

**Una política estricta, entregada en etiqueta y añadida solo al compilar para publicar.**

```
default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:;
font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self';
base-uri 'none'; form-action 'none'
```

- **Solo en producción**, porque el servidor de desarrollo usa guiones en línea para recargar en caliente y la política los bloquearía. Se añade con un pequeño complemento de la herramienta de compilación.
- **`default-src 'none'`** como base: lo que no está permitido explícitamente, no se carga.
- El atributo `onsubmit` del formulario pasa a ser un manejador normal.

## Consecuencias

**A favor**

- Un guion inyectado no se ejecuta: se comprobó insertando uno y verificando que ni corre ni pasa desapercibido.
- Queda escrito y verificado que el juego no necesita nada de fuera, lo que también protege de añadir una dependencia externa sin darse cuenta: dejaría de cargar y la prueba lo diría.

**En contra**

- La política vive en la configuración de compilación, separada del HTML, así que hay que saber que está ahí. El informe y esta decisión lo dejan escrito.
- No protege contra que la página se incruste en otra, porque esa directiva se ignora en etiqueta. Haría falta una cabecera, y eso depende de dónde se publique.
- Desarrollo y producción difieren en un aspecto. Se compensa con una prueba que corre contra la compilación publicada.

**Descartado**

- _Permitir guiones en línea_: sería tener la política sin la protección.
- _Añadirla también en desarrollo_: rompe la recarga en caliente.
- _No poner nada_: es lo que había, y no cuesta nada mejorarlo.
