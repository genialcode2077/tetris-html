# 0003 · Motor puro determinista + renderers intercambiables

- Estado: aceptado · Fecha: 2026-09-07

## Contexto

Necesitamos tests exhaustivos de reglas, replays y la posibilidad de un renderer 3D (three.js) sin reescribir la lógica.

## Decisión

`src/core` sin DOM ni aleatoriedad no semillada; API `dispatch(Command)` + `step(dtMs)` → `GameEvent[]`. Interfaz `Renderer` (init/render/effect/resize/dispose). Canvas 2D por defecto; three.js vía `import()`.

## Consecuencias

Más código de "pegamento" (`src/game`), pero motor verificable con property-based tests y golden replays; renderers desacoplados; HUD en DOM.
