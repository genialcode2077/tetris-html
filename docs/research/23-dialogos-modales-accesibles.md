# 23 · Diálogos modales accesibles

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** navegación por teclado en los diálogos. No estaba en el backlog: los dos que quedaban necesitan a una persona, así que se buscó un área sin cubrir.

## Contexto / pregunta

El proyecto pasa una auditoría automática de accesibilidad sin violaciones desde el informe 04. Esa auditoría comprueba el marcado: contraste, etiquetas, nombres accesibles. Lo que no comprueba es **el comportamiento**: qué pasa al pulsar el tabulador dentro de un diálogo abierto.

## Hallazgos

### Lo que exige la guía del W3C

La guía de patrones de ARIA describe el diálogo modal en términos verificables:

> **Tabulador:** «Moves focus to the next tabbable element inside the dialog. If focus is on the last tabbable element inside the dialog, moves focus to the first tabbable element inside the dialog.»
>
> **Escape:** «Closes the dialog.»
>
> **Al cerrar:** «Focus returns to the element that invoked the dialog.»
>
> **Marcado:** «The dialog container element has aria-modal set to true.»

Y una advertencia que condiciona lo anterior: marcar un diálogo como modal solo cuando el código impide de verdad interactuar con lo de fuera **y** el estilo lo oscurece. Es decir, el atributo no se pone solo: va con el comportamiento.

### Lo que hacía el juego

Se midió tabulando veinticinco veces desde el menú de título y anotando dónde caía el foco:

```
BODY←FUERA btn-fullscreen←FUERA btn-play btn-settings btn-records btn-help
BODY←FUERA btn-fullscreen←FUERA btn-play btn-settings btn-records btn-help ...

salidas del diálogo: 9 / 25
atributos del diálogo: {"role":"dialog","ariaModal":null,"labelledby":"title-heading"}
tras Escape en Ajustes, pantalla activa: settings
```

Tres incumplimientos, los tres invisibles para la auditoría automática:

1. **El foco se escapaba**, y no a cualquier sitio: llegaba al botón de pantalla completa de la barra superior, que está **detrás** del diálogo. Quien navegue con teclado acaba activando controles que no ve.
2. **Faltaba `aria-modal`**, así que un lector de pantalla no anuncia el diálogo como modal ni acota su lectura.
3. **La tecla de escape no cerraba** ningún diálogo de menú: estaba dedicada a pausar la partida.

### El detalle que complicaba lo tercero

En Ajustes se pueden reasignar las teclas, y ahí la tecla de escape ya tiene dueño: cancela la captura en curso. Si el diálogo la interceptara, se perdería esa función. La solución no es elegir una de las dos, sino que el diálogo ceda cuando hay algo que la necesita antes.

## Opciones y comparativa

| Opción                                     | Qué implica                                                     |
| ------------------------------------------ | --------------------------------------------------------------- |
| Marcar el fondo como inerte                | Lo más limpio, pero el juego sigue vivo detrás y debe dibujarse |
| Quitar del orden de tabulación lo de fuera | Hay que acordarse de deshacerlo, y se olvida                    |
| Ciclar el foco dentro del diálogo abierto  | Una sola regla, en un solo sitio, y reversible sola             |

## Decisión recomendada

La tercera. El gestor de pantallas atrapa el tabulador mientras hay un diálogo abierto, marca `aria-modal` solo mientras lo está, y la tecla de escape cierra.

Para cerrar no se repite a dónde vuelve cada pantalla: cada diálogo ya tiene su botón de volver, y la tecla de escape simplemente lo pulsa. Un atributo en cinco botones y ninguna lógica duplicada.

## Acción

- Ciclo del foco dentro del diálogo abierto, en ambos sentidos.
- `aria-modal` mientras está abierto, retirado al cerrar.
- La tecla de escape pulsa el botón de volver del diálogo, y cede mientras se está capturando una tecla.
- Cinco pruebas que fijan lo anterior, verificadas quitando el arreglo.

## Riesgos

El ciclo de foco solo cuenta elementos visibles. Un control que aparezca dentro del diálogo después de abrirlo entra en el ciclo sin más, porque la lista se recalcula en cada pulsación.

La pantalla de título y la de resultados no tienen botón de volver, así que la tecla de escape no hace nada en ellas. Es lo correcto: la primera es la raíz y la segunda pide una decisión.

## Referencias

- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ — patrón de diálogo modal: teclado, foco y atributos.
- Informe 04, donde se montó la auditoría automática que no cubre esto.
