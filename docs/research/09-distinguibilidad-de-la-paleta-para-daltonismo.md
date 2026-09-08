# 09 · Distinguibilidad de la paleta para daltonismo

- **Fecha:** 2026-09-07 · **Estado:** vigente
- **Tema del backlog:** paleta y contraste verificados con simuladores de daltonismo. Estaba marcado como parcial porque la revisión automática de accesibilidad solo mira el contraste del texto, nunca si las siete piezas se distinguen entre sí.

## Contexto

En este juego el color no es decoración: es la única señal que identifica cada pieza en la cola y en la pila. Si dos piezas se ven iguales, el juego se vuelve confuso para quien tiene una deficiencia de visión del color, que afecta aproximadamente a uno de cada doce hombres. La revisión automática que ya corría en cada cambio no cubría esto en absoluto.

Se saltó el tema que figuraba como siguiente, el ajuste de los efectos de sonido, porque exige que una persona escuche y compare. Sin eso no se puede verificar nada de forma honesta, así que queda a la espera.

## Método

Se simularon las tres dicromacias completas con las matrices de Machado, Oliveira y Fernandes, que operan sobre RGB lineal. Después se midió la diferencia entre cada par de piezas con la fórmula CIEDE2000, que es la métrica estándar de diferencia percibida. Un valor de 1 es el mínimo que el ojo distingue en condiciones ideales de laboratorio; para reconocer una pieza de un vistazo mientras se juega hace falta bastante más.

## Hallazgos

Diferencia del par de piezas más parecido en cada paleta, cuanto más alto mejor:

| Paleta                 | Visión normal | Protanopia | Deuteranopia | Tritanopia | Par crítico                 |
| ---------------------- | ------------- | ---------- | ------------ | ---------- | --------------------------- |
| Neón (por defecto)     | 18,6          | **2,0**    | 9,2          | 6,7        | azul J contra morado T      |
| Daltonismo (Okabe-Ito) | 21,7          | 12,2       | 11,6         | 10,9       | naranja L contra amarillo O |
| Alto contraste         | 23,4          | **2,6**    | 6,8          | 9,3        | azul J contra morado T      |

Dos conclusiones incómodas:

1. **La paleta por defecto era inservible con protanopia.** Una diferencia de 2,0 significa que la pieza azul y la morada son el mismo color a efectos prácticos. No es un matiz: son dos de las siete piezas.
2. **La paleta llamada "alto contraste" era la peor de las tres.** Su nombre invita a pensar que es la opción accesible, y en cambio empataba con la neón en el peor caso. Alto contraste y seguridad para daltonismo son cosas distintas, y el nombre las confundía.

La paleta de Okabe-Ito cumple con holgura, que es justo para lo que fue diseñada.

## Decisión

Tres cambios, ninguno de ellos cosmético por gusto:

1. **El azul de la J pasa a un tono más profundo.** Se probaron nueve candidatos midiendo a la vez la separación entre piezas y el contraste sobre el fondo del tablero. El elegido alcanza el máximo posible sin dejar de ser reconociblemente azul, y es el que mejor contraste conserva de los que llegan a ese máximo. El peor caso de la paleta sube de 2,0 a 6,7.
2. **La paleta de alto contraste se rehace entera**, priorizando la separación entre piezas por encima de la estética, que es lo que su nombre promete. Su peor caso sube de 2,6 a 9,1.
3. **Las etiquetas de los ajustes dicen la verdad.** La opción de daltonismo se presenta como la más distinguible, y la de alto contraste describe lo que hace de verdad: fondo negro y colores vivos.

No se toca la paleta de Okabe-Ito, que ya cumplía.

## Acción

- Módulo nuevo con la simulación de dicromacias y la fórmula de diferencia de color, para poder medir esto desde las pruebas.
- Prueba automática que fija un mínimo por paleta y falla si alguna empeora, además de comprobar que la de daltonismo es la más segura de las tres.
- Colores nuevos y etiquetas revisadas.

## Riesgos

Las matrices simulan dicromacia completa, que es el caso extremo. Las formas leves y moderadas, que son más frecuentes, quedan cubiertas por arrastre al resolver el caso peor, pero no se miden por separado. La comprobación tampoco sustituye a que una persona con deficiencia de visión del color pruebe el juego, algo que sigue pendiente junto al resto de verificaciones que necesitan a alguien delante.

## Referencias

- https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html (matrices de simulación)
- https://en.wikipedia.org/wiki/Color_difference (fórmula CIEDE2000 y umbrales de percepción)
- https://www.colorcontrast.org/color-blind-colors/ (paleta de Okabe-Ito)
- https://gameaccessibilityguidelines.com/full-list/ (no usar el color como única señal)
