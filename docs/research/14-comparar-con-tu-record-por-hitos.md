# 14 · Comparar con tu récord por hitos

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** fantasma del récord en Sprint y controles al ver una repetición.

## Contexto / pregunta

El modo Sprint consiste en limpiar cuarenta líneas lo más rápido posible. Ahora mismo el jugador ve su tiempo corriendo, pero no sabe si va mejor o peor que su mejor marca hasta que termina. La idea anotada era un «fantasma» del récord, tomada de los juegos de carreras. Antes de construirlo conviene ver si esa forma encaja aquí.

## Hallazgos

### Qué es el modo y qué importa en él

La wiki oficial lo deja claro: en las cuarenta líneas la puntuación no cuenta para nada, **el tiempo es lo único que importa**. Algunos juegos dejan elegir nivel, altura del campo o basura inicial, pero el objetivo no cambia.

### Cómo se compara contra uno mismo en las carreras contrarreloj

El mundo del speedrunning tiene esto resuelto desde hace años, y su herramienta de referencia trabaja con estos conceptos:

- **Hitos**: puntos intermedios en los que se toma el tiempo.
- **Comparaciones**: contra el récord personal, contra la suma de los mejores tramos, o contra la media de los intentos.
- **Diferencia**: cuánto se va por delante o por detrás respecto a esa comparación, mostrada mientras se juega.
- **Ritmo**: el tiempo final proyectado a partir de cómo va el intento.

Lo importante es que la comparación es **numérica y por tramos**, no una silueta que persigue al jugador.

### Por qué un fantasma visual encaja mal aquí

En un juego de carreras el fantasma es un coche translúcido en una pista: ocupa un espacio que no es el tuyo y se entiende de un vistazo. Aquí el equivalente sería dibujar las piezas del récord sobre el mismo tablero, encima de las tuyas. Eso choca de frente con dos cosas que ya existen: la pieza fantasma, que indica dónde caerá la actual, y los colores, que son la única señal que distingue cada pieza. Añadir una segunda capa de bloques translúcidos convertiría el tablero en un jeroglífico justo en el modo donde más rápido hay que leerlo.

## Opciones y comparativa

| Opción                                         | Coste   | Claridad                                               |
| ---------------------------------------------- | ------- | ------------------------------------------------------ |
| Fantasma de piezas del récord sobre el tablero | alto    | mala: compite con la pieza fantasma y con los colores  |
| Diferencia por hitos cada diez líneas          | bajo    | buena: un número que se lee de un vistazo              |
| Solo mostrar el récord al terminar             | ninguno | pobre: no ayuda mientras se juega, que es cuando sirve |

## Decisión recomendada

Descartar el fantasma visual y llevar al juego lo que hacen los corredores: **comparación por hitos**.

- En Sprint los hitos son cada diez líneas: diez, veinte, treinta y cuarenta.
- Al cruzar cada uno se muestra la diferencia contra el récord, con su signo, y se colorea según se vaya por delante o por detrás.
- El marcador enseña el tiempo del récord mientras se juega, para tener una referencia.
- El récord guarda los tiempos de cada hito, no solo el total.

Es más barato, no ensucia el tablero y da la información en el momento en que sirve para algo, que es a mitad de partida y no al final.

Los controles de avance al ver una repetición se dejan para otra iteración: son una funcionalidad aparte y esta ya tiene su propio alcance.

## Acción

- Módulo con la lógica de hitos y comparación, sin depender del navegador.
- Los récords guardan los tiempos parciales; los guardados antes siguen valiendo, simplemente no tienen con qué comparar.
- El marcador muestra la referencia y la diferencia al cruzar cada hito.
- Pruebas de los hitos, de la comparación y de que un récord antiguo sin parciales no rompe nada.

## Riesgos

Un número que aparece a mitad de partida puede distraer justo cuando hace falta concentración. Se acota mostrándolo en el mismo sitio que los demás avisos, de forma breve, y solo en los modos donde el tiempo es el objetivo.

## Referencias

- https://tetris.wiki/Sprint (definición del modo y qué se mide en él)
- https://github.com/LiveSplit/LiveSplit (hitos, tipos de comparación, diferencia y ritmo)
- Informe 04 de este directorio, sobre la lectura del tablero y la pieza fantasma.
