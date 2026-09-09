# 27 · El juego en horizontal

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** cómo se reparte el espacio cuando el móvil está tumbado. No estaba en el backlog; se buscó un área sin cubrir.

## Contexto / pregunta

El informe 08 arregló el reparto de espacio en móviles pequeños, pero **solo se midió en vertical**. Nadie había comprobado qué pasa al girar el teléfono, que es una postura natural para jugar.

## Hallazgos

### En horizontal el tablero quedaba injugable

Medido sobre la compilación publicada, con el tamaño de celda como referencia:

| Pantalla                       | Celda      | Tablero | Desplazamiento |
| ------------------------------ | ---------- | ------- | -------------- |
| Pixel 7 vertical (412×915)     | 30,8 px    | 300×615 | no             |
| Pixel 7 horizontal (915×412)   | 14,3 px    | 140×287 | **vertical**   |
| iPhone SE horizontal (667×375) | **8,2 px** | 80×164  | no             |
| Móvil pequeño (640×360)        | **8,2 px** | 80×164  | no             |

Ocho píxeles de celda: el tablero entero medía ochenta píxeles de ancho, menos que un botón. No es incómodo, es **injugable** (F-048).

### Por qué

El reparto móvil se decide por ancho, con una consulta de hasta 720 píxeles, y apila los paneles: marcador arriba, tablero en medio, cola abajo. En vertical funciona porque sobra altura. Tumbado el teléfono, la altura es lo que falta y el ancho lo que sobra, así que apilar es justo lo contrario de lo que conviene: los paneles se comen el alto y al tablero le quedan las migajas.

En el caso de 915 píxeles de ancho ni siquiera entraba el reparto móvil, así que usaba el de escritorio, con el tablero calculado a partir de una altura que no tenía.

### Qué dice la norma, y qué no

El criterio 1.3.4 de WCAG dice:

> «Content does not restrict its view and operation to a single display orientation, such as portrait or landscape, unless a specific display orientation is essential.»

Y la guía aclara algo importante: **no exige que se use igual de bien en las dos orientaciones**, solo que no quede restringido a una. Así que esto **no era un incumplimiento**: el juego funcionaba tumbado, solo que mal. Conviene decirlo con precisión, porque apoyar el arreglo en una norma que no lo pide sería inventarse la autoridad. Se arregla porque ocho píxeles de celda no se pueden jugar, no porque lo obligue nadie.

## Opciones y comparativa

| Opción                                    | Celda en 667×375 | Coste                                 |
| ----------------------------------------- | ---------------- | ------------------------------------- |
| Dejarlo como estaba                       | 8,2 px           | Ninguno                               |
| Bloquear la orientación vertical          | —                | Restringe a una orientación: peor     |
| Paneles a los lados cuando falta altura   | 14,3 px          | Una consulta de estilo por altura     |
| Además los controles táctiles a los lados | ~18 px estimado  | Rediseño del marcado; queda pendiente |

## Decisión recomendada

La tercera: cuando la pantalla es apaisada y baja, los paneles van a los lados y el tablero se queda con todo el alto. La consulta mira la **altura**, que es lo que escasea, en vez del ancho.

Con eso la celda pasa de 8,2 a 14,3 píxeles en un móvil de 667×375, y de 8,2 a 13,3 en uno de 640×360. El desplazamiento vertical desaparece en todos los casos.

## Acción

- Consulta de estilo para pantallas apaisadas de menos de 500 píxeles de alto: paneles a los lados, tablero con el alto completo, marcador en columna, dos piezas siguientes en vez de cinco y botones táctiles algo más bajos, todavía por encima del mínimo de la norma.
- Seis pruebas que fijan el tamaño mínimo de celda y que nada se sale ni a lo ancho ni a lo alto.
- Captura de referencia en horizontal.

## Riesgos

Dos cosas costaron más de lo previsto y conviene dejarlas escritas:

**El aviso superpuesto del tablero desbordaba la página.** Cubre el contenedor entero, y al no estar acotado su altura empujaba el documento y sacaba una barra de desplazamiento. Se intentó primero estirando el contenido de la rejilla y luego con un tope de altura calculado; ninguna de las dos bastó en todas las medidas. Lo que funciona es recortar el desbordamiento en el contenedor, que no depende de ningún número escrito a ojo.

**Los botones táctiles no se miden en el perfil sin táctil.** La primera versión de las pruebas exigía un tamaño mínimo también donde la barra está oculta, y medía cero. La comprobación solo se hace donde los botones se ven.

Los controles táctiles siguen ocupando una franja abajo, que es alto que el tablero no aprovecha. Llevarlos a los lados daría unos cuatro píxeles más de celda, pero exige tocar el marcado y reorganizar los siete botones. Queda anotado como posible siguiente paso, no como pendiente urgente.

## Referencias

- https://www.w3.org/WAI/WCAG22/Understanding/orientation.html — criterio 1.3.4 y su aclaración de que no exige igual usabilidad.
- Informe 08, que arregló el reparto en vertical y donde se estableció el método de medir por tamaño de celda.
