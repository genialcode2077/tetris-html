# 01 · Reglas del juego (Tetris Guideline) — fuente de verdad del motor

- **Fecha:** 2026-09-07 · **Autor:** agente (research engineer) · **Estado:** vigente
- **Fuentes primarias:** tetris.wiki (SRS, Scoring, Tetris_Guideline, T-Spin, Lock_delay, Marathon, Random_Generator, Top_out, ARE, Hold_piece, TETR.IO), tetrio.team2xh.net (defaults de handling de TETR.IO).
- **Alcance:** todo lo necesario para implementar `src/core` de forma determinista y fiel a la Guideline moderna (2009+, con prácticas de TETR.IO/Jstris donde la Guideline es ambigua).

## 1. Tablero (Matrix)

| Parámetro                           | Valor                                                                                                                                                                                                           | Nota                                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Ancho                               | 10 columnas                                                                                                                                                                                                     |                                                                                               |
| Alto visible                        | 20 filas                                                                                                                                                                                                        | Se recomienda mostrar una "rendija" de la fila 21                                             |
| Buffer oculto                       | 20 filas adicionales (total 40)                                                                                                                                                                                 | Guideline: buffer de 20 filas sobre el tablero                                                |
| Convención de coordenadas del motor | `x` 0..9 izquierda→derecha, `y` 0..39 **de abajo hacia arriba**                                                                                                                                                 | Elegida porque las tablas SRS usan +y = arriba; evita cambios de signo. El renderer invierte. |
| Spawn                               | Las piezas aparecen ocupando las filas 21 y 22 (1-indexadas) = `y` 20 y 21 (0-indexadas), centradas y redondeadas a la izquierda; lado plano abajo; **bajan una fila inmediatamente** al aparecer si es posible | Guideline. Juegos modernos (tetris.com) aparecen 1-2 filas más abajo.                         |
| Spawn X por pieza                   | JLSTZ (caja 3×3): x=3 · I (caja 4×4): x=3 · O (caja 2×2): x=4                                                                                                                                                   | `floor((10 - anchoCaja)/2)`                                                                   |

**Condiciones de fin de partida (Guideline):**

- **Block out:** la pieza nueva aparece solapando al menos un bloque.
- **Lock out:** una pieza se fija completamente por encima de la zona visible (todas sus celdas con `y >= 20`).
- **Top out (garbage):** un bloque es empujado por encima del buffer de 20 filas (solo con basura/multijugador).

## 2. Tetrominós, orientación de spawn y colores

Estados de rotación: `0` (spawn), `R` (horario), `2` (180°), `L` (antihorario). Matrices de spawn (fila superior primero, origen arriba-izquierda; rotar la matriz en sentido horario dentro de su caja produce exactamente los estados SRS `R`, `2`, `L`):

```
I: 0000   J: 100   L: 001   O: 11   S: 011   T: 010   Z: 110
   1111      111      111      11      110      111      011
   0000      000      000              000      000      000
   0000
```

| Pieza | Color Guideline   | Hex de referencia (paleta base del proyecto) |
| ----- | ----------------- | -------------------------------------------- |
| I     | azul claro (cian) | `#00F0F0`                                    |
| J     | azul oscuro       | `#0000F0`                                    |
| L     | naranja           | `#F0A000`                                    |
| O     | amarillo          | `#F0F000`                                    |
| S     | verde             | `#00F000`                                    |
| T     | magenta/púrpura   | `#A000F0`                                    |
| Z     | rojo              | `#F00000`                                    |

La Guideline solo fija los nombres de color, no los hex; los hex son los de facto en la comunidad. La paleta visual final (neón) y la paleta accesible se definen en el informe 04.

## 3. SRS — Super Rotation System (wall kicks)

Convención: desplazamientos `(x, y)` relativos a la rotación básica, **+x derecha, +y arriba**. Se prueban en orden; la primera posición libre gana; si ninguna es válida, la rotación falla (no cambia nada). La pieza **O no hace kicks** (rotación no-op).

### 3.1 J, L, S, T, Z

| Transición | Test 1  | Test 2  | Test 3  | Test 4  | Test 5  |
| ---------- | ------- | ------- | ------- | ------- | ------- |
| 0→R        | ( 0, 0) | (-1, 0) | (-1,+1) | ( 0,-2) | (-1,-2) |
| R→0        | ( 0, 0) | (+1, 0) | (+1,-1) | ( 0,+2) | (+1,+2) |
| R→2        | ( 0, 0) | (+1, 0) | (+1,-1) | ( 0,+2) | (+1,+2) |
| 2→R        | ( 0, 0) | (-1, 0) | (-1,+1) | ( 0,-2) | (-1,-2) |
| 2→L        | ( 0, 0) | (+1, 0) | (+1,+1) | ( 0,-2) | (+1,-2) |
| L→2        | ( 0, 0) | (-1, 0) | (-1,-1) | ( 0,+2) | (-1,+2) |
| L→0        | ( 0, 0) | (-1, 0) | (-1,-1) | ( 0,+2) | (-1,+2) |
| 0→L        | ( 0, 0) | (+1, 0) | (+1,+1) | ( 0,-2) | (+1,-2) |

### 3.2 I (Guideline)

| Transición | Test 1  | Test 2  | Test 3  | Test 4  | Test 5  |
| ---------- | ------- | ------- | ------- | ------- | ------- |
| 0→R        | ( 0, 0) | (-2, 0) | (+1, 0) | (-2,-1) | (+1,+2) |
| R→0        | ( 0, 0) | (+2, 0) | (-1, 0) | (+2,+1) | (-1,-2) |
| R→2        | ( 0, 0) | (-1, 0) | (+2, 0) | (-1,+2) | (+2,-1) |
| 2→R        | ( 0, 0) | (+1, 0) | (-2, 0) | (+1,-2) | (-2,+1) |
| 2→L        | ( 0, 0) | (+2, 0) | (-1, 0) | (+2,+1) | (-1,-2) |
| L→2        | ( 0, 0) | (-2, 0) | (+1, 0) | (-2,-1) | (+1,+2) |
| L→0        | ( 0, 0) | (+1, 0) | (-2, 0) | (+1,-2) | (-2,+1) |
| 0→L        | ( 0, 0) | (-1, 0) | (+2, 0) | (-1,+2) | (+2,-1) |

### 3.3 I simétrica (Arika/TGM3; base de "SRS+" de TETR.IO)

TETR.IO (desde Alpha 5.0.0) usa por defecto kicks de I simétricos respecto al eje y ("SRS+"), similar a TGM3 pero espejando el lado izquierdo. Tabla Arika verificada:

| Transición | Test 1  | Test 2  | Test 3  | Test 4  | Test 5  |
| ---------- | ------- | ------- | ------- | ------- | ------- |
| 0→R        | ( 0, 0) | (-2, 0) | (+1, 0) | (+1,+2) | (-2,-1) |
| R→0        | ( 0, 0) | (+2, 0) | (-1, 0) | (+2,+1) | (-1,-2) |
| R→2        | ( 0, 0) | (-1, 0) | (+2, 0) | (-1,+2) | (+2,-1) |
| 2→R        | ( 0, 0) | (-2, 0) | (+1, 0) | (-2,+1) | (+1,-1) |
| 2→L        | ( 0, 0) | (+2, 0) | (-1, 0) | (+2,+1) | (-1,-1) |
| L→2        | ( 0, 0) | (+1, 0) | (-2, 0) | (+1,+2) | (-2,-1) |
| L→0        | ( 0, 0) | (-2, 0) | (+1, 0) | (-2,+1) | (+1,-2) |
| 0→L        | ( 0, 0) | (+2, 0) | (-1, 0) | (-1,+2) | (+2,-1) |

Decisión: el motor expone `rotationSystem: 'srs' | 'srs-plus'`; **por defecto `srs`** (Guideline pura). `srs-plus` es una opción.

### 3.4 Rotación 180° (opcional, no Guideline)

TETR.IO añade una tabla propia de kicks 180 (0.6.0-pre0). En tetris.wiki solo existe como diagrama; la tabla siguiente es la reproducida habitualmente por clones y **debe verificarse contra el juego** (registrado en `docs/FINDINGS.md`):

| Transición | Kicks (en orden)                           |
| ---------- | ------------------------------------------ |
| 0→2        | (0,0) (0,+1) (+1,+1) (-1,+1) (+1,0) (-1,0) |
| 2→0        | (0,0) (0,-1) (-1,-1) (+1,-1) (-1,0) (+1,0) |
| R→L        | (0,0) (+1,0) (+1,+2) (+1,+1) (0,+2) (0,+1) |
| L→R        | (0,0) (-1,0) (-1,+2) (-1,+1) (0,+2) (0,+1) |

Para I en 180 se usa solo (0,0) hasta verificar. Decisión: tecla 180 **desactivada por defecto**, activable en ajustes.

## 4. Generador aleatorio, cola, hold, fantasma

- **7-bag (Random Generator):** se barajan las 7 piezas y se reparten una a una; al vaciarse se genera otra bolsa. Consecuencias: máximo 12 piezas entre dos I; máximo 4 S/Z seguidas. PRNG **con semilla** (determinismo → tests y replays).
- **Next queue:** Guideline muestra hasta 6; decisión: **5 visibles** (estándar competitivo), configurable 1-6.
- **Hold:** una vez por pieza (se bloquea hasta que la pieza activa se fija); la pieza guardada vuelve a su orientación de spawn; al intercambiar, la pieza nueva aparece en la posición de spawn.
- **Ghost piece:** proyección de la pieza a su posición de hard drop; desactivable.
- **IRS/IHS:** rotación/hold inicial mantenidos durante ARE o line-clear delay se aplican al aparecer la pieza. Decisión: implementar buffer de entrada durante `lineClearDelay` (equivale a IRS/IHS/DAS charge).

## 5. Gravedad, niveles y modos

Fórmula Guideline (Tetris Worlds): **segundos por fila = (0.8 − (nivel − 1) × 0.007) ^ (nivel − 1)**.

| Nivel | G (celdas/frame a 60 Hz) | ms por fila (fórmula)  |
| ----- | ------------------------ | ---------------------- |
| 1     | 0.01667                  | 1000.0                 |
| 2     | 0.021017                 | 793.0                  |
| 3     | 0.026977                 | 617.8                  |
| 4     | 0.035256                 | 472.7                  |
| 5     | 0.04693                  | 355.2                  |
| 6     | 0.06361                  | 262.0                  |
| 7     | 0.0879                   | 189.7                  |
| 8     | 0.1236                   | 134.7                  |
| 9     | 0.1775                   | 93.9                   |
| 10    | 0.2598                   | 64.2                   |
| 11    | 0.388                    | 42.9                   |
| 12    | 0.59                     | 28.2                   |
| 13    | 0.92                     | 18.2                   |
| 14    | 1.46                     | 11.4                   |
| 15    | 2.36                     | 7.1                    |
| 16    | 3.91                     | 4.3                    |
| 17    | 6.61                     | 2.5                    |
| 18    | 11.43                    | 1.5                    |
| 19    | 20.23                    | 0.8                    |
| 20    | 36.6                     | 0.46 → tratar como 20G |

- **Marathon (fixed-goal):** 10 líneas por nivel; empezar en nivel N exige las mismas líneas acumuladas que desde 1 (nivel 5 → 50 líneas para pasar a 6). Tope habitual nivel 15 (150 líneas); si "Endless", la gravedad deja de subir. Decisión: Marathon 150 líneas con opción Endless (gravedad crece hasta nivel 20 = 20G y se mantiene; lock delay fijo 500 ms).
- **Soft drop:** velocidad = gravedad × SDF (Tetris Zone usa 20×; TETR.IO por defecto 6×, opción ∞). Decisión: SDF **20** por defecto, opciones 6/10/20/40/∞, y mínimo 20 filas/s.
- **Hard drop:** instantáneo, fija la pieza (lock inmediato).
- **Modos:** Marathon (150 líneas / endless), Sprint 40 líneas (tiempo), Ultra 2 minutos (puntos), Zen (sin fin, sin game over por tope: en TETR.IO Zen no hay gravedad creciente). Sprint/Ultra: gravedad fija de nivel 1 (o configurable).

## 6. Lock delay, ARE y line clear

| Parámetro         | Valor Guideline                                                                                                                                                                     | Decisión tetris-html                                                    |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Lock delay        | **500 ms** con gravedad < 20G                                                                                                                                                       | 500 ms                                                                  |
| Esquema de reset  | Move reset (Extended Placement): mover/rotar reinicia el temporizador, **máximo 15** movimientos/rotaciones; el contador se reinicia cuando la pieza baja a una fila nueva más baja | Move reset, 15                                                          |
| Alternativas      | Infinity (sin límite), Step reset (solo al bajar)                                                                                                                                   | opción `lockReset: 'move' \| 'step' \| 'infinite'`                      |
| ARE (entry delay) | recomendado 6 frames ≈ 100 ms; la mayoría de juegos Guideline usan 0 salvo tras line clear                                                                                          | **0 ms** (opción)                                                       |
| Line clear delay  | TGM/Tetris DS 400-700 ms; TETR.IO ≈ 0 con animación superpuesta                                                                                                                     | **200 ms** en Marathon/Ultra (animación), **0** en Sprint; configurable |

## 7. DAS / ARR / SDF / DCD

| Parámetro           | Guideline (recomendado)  | TETR.IO default | Decisión (por defecto)      |
| ------------------- | ------------------------ | --------------- | --------------------------- |
| DAS                 | 10 frames ≈ 167 ms       | 10 F            | **167 ms** (rango 0-333)    |
| ARR                 | 2 frames ≈ 33 ms (30 Hz) | 2 F             | **33 ms** (0 = instantáneo) |
| SDF                 | "velocidad designada"    | 6×              | **20×** (ver §5)            |
| DCD (DAS cut delay) | —                        | 0-2 F comunes   | 0 ms                        |

Implementación: temporizadores en **milisegundos dentro del paso lógico fijo** (no en frames de pantalla), con DAS "cargable" durante line-clear delay. Con ARR = 0 la pieza salta hasta la pared en un solo paso. Al cambiar de dirección se reinicia DAS.

## 8. Puntuación (Guideline, juegos recientes)

`level` = nivel **antes** de la limpieza.

| Acción                 | Puntos                                                      | ¿Difícil (B2B)?   |
| ---------------------- | ----------------------------------------------------------- | ----------------- |
| Single                 | 100 × level                                                 | no                |
| Double                 | 300 × level                                                 | no                |
| Triple                 | 500 × level                                                 | no                |
| Tetris                 | 800 × level                                                 | sí                |
| Mini T-Spin sin líneas | 100 × level                                                 | no (no rompe B2B) |
| T-Spin sin líneas      | 400 × level                                                 | no (no rompe B2B) |
| Mini T-Spin Single     | 200 × level                                                 | sí                |
| T-Spin Single          | 800 × level                                                 | sí                |
| Mini T-Spin Double     | 400 × level                                                 | sí                |
| T-Spin Double          | 1200 × level                                                | sí                |
| T-Spin Triple          | 1600 × level                                                | sí                |
| Back-to-Back           | puntuación de la acción × **1.5** (no aplica a drops)       | —                 |
| Combo                  | **50 × combo × level** (combo = limpiezas consecutivas − 1) | —                 |
| Soft drop              | 1 por celda                                                 | —                 |
| Hard drop              | 2 por celda                                                 | —                 |

Solo un Single/Double/Triple normal rompe la cadena B2B. Bonus de **Perfect Clear** (se suma al de la línea):

| Perfect clear | Puntos       |
| ------------- | ------------ |
| Single        | 800 × level  |
| Double        | 1200 × level |
| Triple        | 1800 × level |
| Tetris        | 2000 × level |
| B2B Tetris    | 3200 × level |

## 9. Detección de T-Spin (regla de 3 esquinas + "pointing side")

Al fijarse una T:

1. La **última acción** de la pieza debe haber sido una rotación (con o sin kick).
2. De las 4 celdas diagonales al centro de la T, **al menos 3 ocupadas** (pared/suelo cuentan como ocupadas).
3. **Esquinas frontales** = las dos adyacentes al "pico" de la T (lado al que apunta). Si las 2 frontales están ocupadas (y ≥1 trasera) → **T-Spin completo**. Si solo 1 frontal y 2 traseras → **Mini**, **salvo** que el último kick haya desplazado el centro 1×2 (test 5 de SRS: |dx| = 1 y |dy| = 2) → completo.

Esquinas frontales por estado: `0` (pico arriba): superiores; `R` (pico derecha): derechas; `2` (pico abajo): inferiores; `L` (pico izquierda): izquierdas.

TETR.IO además puntúa "all-spin" para otras piezas (regla inmóvil); fuera de alcance del MVP (registrado como mejora).

## 10. Máquina de estados de la pieza / partida

```
[countdown] → spawn → (blockout? → GAME OVER)
  falling: gravedad, entrada, DAS/ARR, hold, rotaciones
  → al tocar suelo: locking (timer 500 ms, move-reset ≤15) → hard drop fija ya
  → lock: (lockout? → GAME OVER) → detectar T-spin → limpiar líneas
  → clearing (lineClearDelay, entrada bufferizada: DAS/IRS/IHS)
  → puntuar (combo, B2B, PC) → subir nivel → ARE (0) → spawn
Estados de partida: title → mode-select → countdown(3·2·1) → playing ⇄ paused → gameover/results
```

## 11. Referencias de implementación open-source

| Proyecto                    | Qué mirar                                                     | URL                                      |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------- |
| Techmino (Lua/LÖVE)         | Reglas modernas, kicks alternativos, 180, spins               | https://github.com/26F-Studio/Techmino   |
| Cambridge (Lua/LÖVE)        | Arquitectura de modos y rotation systems intercambiables      | https://github.com/SashLilac/cambridge   |
| NullpoMino (Java)           | Referencia histórica de reglas y randomizers                  | https://github.com/nullpomino/nullpomino |
| python-tetris               | Motor puro y testeable, sistemas de rotación como estrategias | https://github.com/dzshn/python-tetris   |
| tetr.js / TETR.IO (no open) | UX competitiva, handling, estadísticas                        | https://tetr.io                          |

## 12. Decisiones recomendadas para tetris-html

1. Motor **puro y determinista** (`src/core`), sin DOM, con PRNG semillado y API de comandos → eventos.
2. Coordenadas con `y` hacia arriba para aplicar tablas SRS literalmente.
3. Valores por defecto: SRS Guideline, 7-bag, next 5, hold, ghost, lock 500 ms move-reset 15, DAS 167 / ARR 33 / SDF 20, gravedad Guideline con tope 20G, line clear delay 200 ms (Sprint 0), puntuación §8, T-spin §9, B2B ×1.5, combos, perfect clear.
4. Opciones avanzadas: SRS+ (I simétrica), 180 (tabla por verificar), SDF ∞, ARR 0, lockReset.
5. Tests: unitarios por tabla (cada transición de kick), propiedades (7-bag, no solapamiento, invariantes de puntuación), replays "golden".

## 13. Riesgos y ambigüedades

- **Marca "Tetris":** The Tetris Company posee la marca TETRIS (y marca sonora sobre Korobeiniki en videojuegos) y ha sido agresiva (takedowns de "Setris", demanda "Mino" por trade dress). Recomendación: **título visible del juego distinto de "Tetris"** (ver ADR-0002), no usar el logo oficial, no copiar trade dress (la disposición del tablero y las piezas son mecánica de juego, pero colores+forma exacta de UI se litigaron en _Tetris Holding v. Xio_). El nombre del repositorio `tetris-html` es descriptivo; se mantiene por decisión del usuario.
- Tabla 180 sin fuente primaria numérica (verificar).
- Guideline filtrada de 2009: valores de soft drop y ARE varían por juego; se dejan configurables.

## Referencias

- https://tetris.wiki/Super_Rotation_System · https://tetris.wiki/Scoring · https://tetris.wiki/Tetris_Guideline · https://tetris.wiki/T-Spin · https://tetris.wiki/Lock_delay · https://tetris.wiki/Marathon · https://tetris.wiki/Random_Generator · https://tetris.wiki/Top_out · https://tetris.wiki/ARE · https://tetris.wiki/Hold_piece · https://tetris.wiki/TETR.IO
- https://tetrio.team2xh.net/?t=faq (defaults `room_handling_arr=2`, `das=10`, `sdf=6`)
- https://tetrio.github.io/faq/mechanics.html · https://tetrio.wiki.gg/wiki/Mechanics
- https://en.wikipedia.org/wiki/The_Tetris_Company · https://itch.io/takedowns/2073998 · https://publicknowledge.org/tetris-copyright-decision-shows-how-complicated-copyright-for-games-can-be/
