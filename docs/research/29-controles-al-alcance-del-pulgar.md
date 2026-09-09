# 29 · Controles al alcance del pulgar

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** dónde poner los botones táctiles con el móvil tumbado. Es el siguiente paso que dejó anotado el informe 27.

## Contexto / pregunta

El informe 27 arregló el reparto de espacio en horizontal llevando los paneles a los lados, y dejó apuntado que los botones táctiles seguían ocupando una franja abajo. Quedaban dos preguntas: cuánto alto se recupera si se mueven, y **dónde conviene ponerlos** para que se alcancen bien.

## Hallazgos

### Cómo se sujeta un teléfono, con datos

El estudio de observación de Steven Hoober sigue siendo la referencia con muestra grande: 1333 personas observadas en la calle, aeropuertos y transporte, de las cuales 780 estaban tocando la pantalla. El reparto de agarres:

| Agarre                        | Proporción |
| ----------------------------- | ---------- |
| Una mano                      | 49 %       |
| Acunado (dos manos, una toca) | 36 %       |
| Dos manos, los dos pulgares   | 15 %       |

Y un dato que decide el caso: **cuando se usan los dos pulgares, el 90 % lo hace en vertical y solo el 10 % en horizontal**. Es decir, la postura de dos pulgares es minoritaria en general, pero el estudio también describe las zonas de alcance: hay zonas cómodas, zonas que obligan a estirar y zonas que exigen recolocar la mano.

La consecuencia para un juego tumbado es directa. Al girar el teléfono, las manos lo sujetan por los extremos y los pulgares descansan **en los laterales izquierdo y derecho**. Una fila de botones centrada abajo queda en la zona que obliga a estirar los dos pulgares hacia dentro, que es justo lo que el estudio marca como incómodo.

### Lo que se gana midiendo

Con los botones repartidos a los lados:

| Pantalla                       | Antes del informe 27 | Con paneles a los lados | Con botones a los lados |
| ------------------------------ | -------------------- | ----------------------- | ----------------------- |
| Pixel 7 horizontal (915×412)   | 14,3 px              | 16,4 px                 | **17,4 px**             |
| iPhone SE horizontal (667×375) | 8,2 px               | 14,3 px                 | **16,4 px**             |
| Móvil pequeño (640×360)        | 8,2 px               | 13,3 px                 | **15,4 px**             |

El tamaño de celda **se ha duplicado** respecto al punto de partida en las pantallas más apretadas. Y los botones pasan de 34 píxeles de lado a 76, muy por encima del mínimo de la norma.

### El reparto entre las dos manos

Se sigue la convención de los mandos, que es la que la gente ya conoce: **mover con el pulgar izquierdo** (izquierda, derecha y caída suave) y **actuar con el derecho** (los dos giros, la caída rápida y la reserva). La caída suave ocupa doble alto porque es la que más se mantiene pulsada.

## Opciones y comparativa

| Opción                      | Celda en 667×375 | Alcance del pulgar                |
| --------------------------- | ---------------- | --------------------------------- |
| Franja abajo (lo que había) | 14,3 px          | Obliga a estirar hacia dentro     |
| Botones a los lados         | 16,4 px          | Caen donde descansan los pulgares |

## Decisión recomendada

Los botones se reparten en dos columnas laterales cuando la pantalla es apaisada, baja **y el puntero es grueso**. Esa tercera condición importa: en un portátil con ventana baja no hay pulgares que alcanzar y los botones ni siquiera se muestran.

Las columnas se superponen al juego en lugar de entrar en su rejilla, porque los botones viven fuera de ella en el marcado. El centro deja pasar los toques al tablero, así que los gestos sobre el tablero siguen funcionando.

## Acción

- Dos columnas laterales de botones cuando el móvil está tumbado.
- Hueco arriba para no pisar la barra superior.
- Mínimos de celda de las pruebas subidos a la nueva medida, más dos comprobaciones nuevas: que los botones no tapan el tablero y que no chocan con la barra superior.

## Riesgos

**La primera versión pisaba el botón de pantalla completa.** Se vio en la captura, no en las medidas: el botón de girar quedaba justo debajo. Se corrigió dejando libre el alto de la barra superior, y ahora hay una prueba que lo comprueba, porque era invisible para las que ya había.

El estudio de agarres es de 2013 y los teléfonos han crecido bastante desde entonces, lo que solo refuerza el argumento: cuanto más grande la pantalla, más lejos queda el centro. Aun así, la conclusión que se usa aquí es geométrica y no depende del año: al sujetar el aparato por los extremos, los pulgares están en los extremos.

Queda sin resolver si la columna izquierda debería poder cambiarse a la derecha para quien juega con la otra mano. El reparto actual no es simétrico en función, aunque sí en posición.

## Referencias

- https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php — estudio de observación de Steven Hoober: 1333 personas, reparto de agarres y zonas de alcance.
- Informe 27, que arregló el reparto de espacio en horizontal y dejó esto anotado.
