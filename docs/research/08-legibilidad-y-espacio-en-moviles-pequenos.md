# 08 · Legibilidad y aprovechamiento del espacio en móviles pequeños

- **Fecha:** 2026-09-07 · **Estado:** vigente
- **Tema del backlog:** #3, tipografía y legibilidad del marcador en pantallas de 360 píxeles o menos.

## Contexto

El juego se ve bien en escritorio y en un teléfono de tamaño medio, pero nunca se había medido en las pantallas pequeñas que siguen siendo mayoría en gama de entrada: 360×640 y 320×568 puntos.

## Hallazgos

### Medición del estado actual

Se instrumentó una prueba que abre el juego a cada tamaño, lo pone en marcha con una partida ya avanzada y consulta el tamaño real de cada elemento.

| Pantalla | Ancho del tablero | Alto del tablero | Celda | Desbordamiento horizontal |
| -------- | ----------------- | ---------------- | ----- | ------------------------- |
| 320×568  | 130 px            | 267 px           | 13 px | sí                        |
| 360×640  | 160 px            | 328 px           | 16 px | sí                        |

Dos problemas, ninguno de tipografía:

1. **El tablero desaprovecha la pantalla.** En 360 puntos de ancho ocupa 160, menos de la mitad, con márgenes laterales vacíos enormes. La causa es una regla que calcula el ancho restando 300 píxeles fijos al alto de la ventana: `min(100vw - 16px, calc((100dvh - 300px) / 2.05))`. En una pantalla de 640 puntos, esos 300 fijos se comen casi la mitad del espacio.
2. **La página se desborda a lo ancho.** La fila de controles táctiles reparte siete botones con un mínimo de 48 puntos cada uno más separaciones de 8: son 384 puntos, más de los 360 disponibles. La cola de piezas siguientes también se sale porque sus elementos no pueden encogerse dentro de la fila.

El tamaño de letra del marcador ya es de 16 píxeles, por encima del mínimo recomendado, así que la tipografía no era el problema. La medición cambió el diagnóstico.

### Referencias consultadas

- El mínimo habitual para texto de cuerpo en móvil es de 16 píxeles, y las guías de accesibilidad para videojuegos piden un tamaño de letra legible por defecto y evitar que el jugador tenga que esforzarse para leer de un vistazo.
- Un marcador de juego se lee de reojo mientras la atención está en la partida, así que prima el contraste y el tamaño sobre la densidad de información.

## Decisión

Sustituir el cálculo con una constante fija por un reparto real del espacio: el contenedor del juego se convierte en una rejilla de tres filas donde el marcador y la cola ocupan lo que necesitan y **el tablero se queda con todo lo que sobra**. El navegador hace la cuenta, así que funciona en cualquier alto de pantalla sin números mágicos.

Junto a eso, dos correcciones para que nada se salga: los botones táctiles se reparten el ancho disponible en lugar de exigir un mínimo que no cabe, y los elementos de la cola pueden encogerse dentro de su fila.

Se descarta tocar los tamaños de letra: ya cumplen y reducirlos para ganar espacio empeoraría la legibilidad, que es justo lo que se quería proteger.

## Acción

Cambio en `src/ui/styles.css` (bloque de móvil) más una prueba automática que falla si la página vuelve a desbordarse o si el tablero baja de un tamaño de celda razonable.

## Riesgos

El reparto por rejilla depende de `dvh`, que en navegadores antiguos de iOS se comporta de forma distinta cuando aparece y desaparece la barra del navegador. La prueba automática cubre el caso estático; conviene mirarlo en un teléfono real, que ya está anotado como pendiente en el estado del proyecto.

## Referencias

- https://gameaccessibilityguidelines.com/use-an-easily-readable-default-font-size/
- https://www.toptal.com/designers/typography/typography-for-mobile-apps
- https://fontalternatives.com/blog/gaming-fonts-hud-esports-branding/
- https://medium.com/design-bootcamp/font-size-usage-in-ui-ux-design-web-mobile-tablet-52a9e17c16ce
