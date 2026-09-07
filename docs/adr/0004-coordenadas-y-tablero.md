# 0004 · Coordenadas con y hacia arriba y tablero 10×40

- Estado: aceptado · Fecha: 2026-09-07 · Fuente: `docs/research/01`

## Decisión

`board[y * 10 + x]`, `y = 0` fila inferior, 40 filas (20 visibles + 20 buffer). Las tablas SRS (+y arriba) se aplican sin cambio de signo. Spawn con las celdas en `y` 20-21 y descenso inmediato de una fila si es posible. El renderer invierte el eje.

## Consecuencias

Implementación literal de la Guideline; cualquier agente puede cotejar el código con las tablas del informe 01.
