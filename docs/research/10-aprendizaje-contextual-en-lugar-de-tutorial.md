# 10 · Aprendizaje contextual en lugar de tutorial

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** tutorial interactivo de un minuto.

## Contexto / pregunta

El plan tenía anotado un tutorial guiado de un minuto que enseñara a mover, rotar, guardar una pieza, hacer caída rápida y girar la T en un hueco. Antes de construirlo conviene comprobar si ese formato funciona, porque es la parte más cara de esta línea de trabajo.

## Hallazgos

La investigación sobre incorporación de usuarios del Nielsen Norman Group desmonta el formato:

- **Los avisos que interrumpen al arrancar fallan.** Cortan a quien quiere empezar ya, presentan información fuera de contexto que nadie recuerda, y encima obligan a cerrarlos. No mejoran el desempeño en la tarea.
- **La gente los salta.** Es la llamada paradoja del usuario activo: se prioriza hacer la tarea sobre prepararse para hacerla.
- **Solo compensan con formas de interacción genuinamente nuevas**, del estilo de la realidad aumentada.
- **La ayuda contextual funciona mejor**: mostrar la información cuando hace falta, disparada por lo que el jugador acaba de hacer.
- **Siempre deben poder saltarse**, con acceso posterior desde un menú.
- **Revelación progresiva**: enseñar el detalle solo cuando se pide.

Aplicado a este juego, mover y rotar bloques que caen no es una forma de interacción nueva: casi cualquiera sabe de qué va sin que se lo expliquen. Un tutorial que enseñe eso sería justo el caso que la investigación desaconseja.

Lo que sí es opaco aquí es otra cosa, y ninguna se descubre sola:

| Mecánica                     | Por qué no se descubre sola                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| Guardar una pieza            | No hay nada en pantalla que invite a pulsar la tecla              |
| Caída rápida                 | Se puede jugar la partida entera sin usarla y perder mucho tiempo |
| Giro de la T en un hueco     | La regla de las tres esquinas no es evidente ni mirando           |
| Encadenar acciones difíciles | El bono existe pero nada dice que se está encadenando             |
| Combos                       | Igual: el jugador ve subir la puntuación sin saber por qué        |

## Opciones y comparativa

| Opción                                               | Coste      | Ajuste a la evidencia                                            |
| ---------------------------------------------------- | ---------- | ---------------------------------------------------------------- |
| Tutorial guiado de un minuto al empezar              | alto       | malo: es el formato que se salta                                 |
| Pantalla de ayuda ampliada                           | bajo       | regular: sigue siendo información fuera de contexto, y ya existe |
| Consejos contextuales la primera vez que algo ocurre | medio-bajo | bueno: llega en el momento en que significa algo                 |

## Decisión recomendada

Se descarta el tutorial guiado y se sustituye por **consejos contextuales que aparecen una sola vez**, en el momento en que la mecánica es relevante:

- Al colocar varias piezas sin guardar ninguna, se menciona la reserva.
- Al colocar varias piezas sin usar la caída rápida, se menciona.
- Al lograr el primer giro de la T, se explica lo que acaba de pasar y que puntúa mucho más.
- Al encadenar la primera pareja de acciones difíciles, se explica el bono.
- Al lograr el primer combo, se explica.
- Cuando la pila llega por primera vez a la zona de peligro, se avisa.

Cada consejo se muestra una vez en la vida, se recuerda en el almacenamiento del navegador y no vuelve. No bloquean el juego, aparecen en el mismo sitio que los demás avisos y se pueden desactivar por completo en Ajustes. La pantalla de cómo jugar sigue estando para quien quiera leerlo todo de golpe, que es la vía de acceso posterior que pide la investigación.

Se limita a un consejo cada quince segundos para que no se solapen ni agobien.

## Acción

- Módulo `src/game/coaching.ts` con la lógica, sin depender del navegador para poder probarla.
- Textos en los dos idiomas.
- Registro de consejos vistos en el almacenamiento, junto al resto de preferencias.
- Interruptor en Ajustes.
- Pruebas unitarias de las reglas y una de extremo a extremo del recorrido completo.

## Riesgos

Un consejo mal medido puede molestar más que ayudar. Se acota con tres decisiones: aparecen una sola vez, hay un intervalo mínimo entre ellos y se pueden apagar. Si en el futuro se añaden más, conviene revisar que el total por partida siga siendo bajo.

## Referencias

- https://www.nngroup.com/articles/onboarding-tutorials/
- https://gameaccessibilityguidelines.com/full-list/
- Informe 04 de este mismo directorio, sobre interfaz y sensación de juego.
