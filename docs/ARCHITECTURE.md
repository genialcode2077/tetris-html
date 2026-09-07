# Arquitectura

> Última revisión: 2026-09-07. Si cambias un contrato de esta página, actualiza también el ADR correspondiente y `docs/STATUS.md`.

## Principios

1. **Motor puro y determinista** (`src/core`): sin DOM, sin `Date`, sin `Math.random`. Entradas: comandos + tiempo (`step(dtMs)`); salidas: estado + eventos. Misma semilla + mismas entradas ⇒ mismo resultado (tests, replays).
2. **Renderers intercambiables** tras una interfaz: `Canvas2DRenderer` (por defecto) y `ThreeRenderer` (carga diferida). El renderer solo _lee_ el estado.
3. **HUD y menús en DOM** (accesibilidad, texto nítido); el canvas solo dibuja el tablero y los efectos.
4. **Audio procedural** sin assets (sintetizador propio) detrás de un `AudioManager` que escucha eventos del juego.
5. **Persistencia versionada** en `localStorage` con migraciones.
6. **Sin framework UI**; TypeScript estricto; módulos pequeños con una responsabilidad.

## Mapa de módulos

```
src/
├─ core/            Motor (puro)
│  ├─ constants.ts  BOARD_W=10, VISIBLE_H=20, BOARD_H=40, tipos de pieza
│  ├─ types.ts      PieceType, Rotation, ActivePiece, GameState, Command, GameEvent, RuleSet
│  ├─ pieces.ts     matrices de spawn → celdas por rotación (precalculadas)
│  ├─ srs.ts        tablas de kicks: 'srs' | 'srs-plus' | 180
│  ├─ rng.ts        PRNG semillado (mulberry32)
│  ├─ randomizer.ts 7-bag
│  ├─ board.ts      colisión, fijar pieza, filas completas, limpiar/compactar
│  ├─ gravity.ts    msPorFila(nivel), 20G
│  ├─ scoring.ts    tabla de puntos, combo, back-to-back, perfect clear
│  ├─ tspin.ts      detección 3 esquinas / mini / kick 5
│  ├─ rules.ts      RuleSet por defecto y presets de modo
│  └─ game.ts       Máquina de estados: spawn→falling→locking→clearing→…; step(dt); dispatch(cmd)
├─ game/            Orquestación (depende de core; sin DOM salvo timers inyectados)
│  ├─ loop.ts       requestAnimationFrame + paso fijo 120 Hz + pausa por visibilidad
│  ├─ handling.ts   Estado de teclas → comandos con DAS/ARR/SDF/DCD en ms
│  ├─ session.ts    Partida: Game + handling + objetivos de modo + cronómetro + estadísticas
│  └─ stats.ts      PPS, líneas/min, tetris rate, finesse (fase 3)
├─ input/           keyboard.ts (event.code), gamepad.ts (polling), touch.ts (gestos), keymap.ts
├─ render/
│  ├─ types.ts      interface Renderer { init, render(state, tMs), effect(evt), resize, dispose }
│  ├─ palette.ts    paletas (neón, accesible, alto contraste)
│  ├─ canvas2d/     CanvasRenderer.ts, effects.ts (partículas, shake, flashes)
│  └─ three/        ThreeRenderer.ts (fase 3, import() dinámico)
├─ audio/           synth.ts (estilo ZzFX), sfx.ts (mapa evento→sonido), music.ts (secuenciador), manager.ts
├─ ui/              screens/ (title, modes, settings, pause, results, records), hud.ts, dom.ts, styles.css
├─ storage/         store.ts (documento versionado + migraciones), settings.ts, highscores.ts
└─ app/             main.ts (bootstrap), version.ts
tests/e2e/          Playwright (flujos + capturas)
```

Regla de dependencias: `core` ← `game` ← `app`; `render`, `audio`, `input`, `ui`, `storage` dependen solo de `core/types` y `game` (nunca entre sí, salvo `ui` que consume `render`/`audio` para ajustes). ESLint puede vigilarlo (fase 2: `eslint-plugin-boundaries`).

## Contratos clave

### Estado del juego (`GameState`, lectura para renderers)

- `board: Uint8Array(400)` índice `y * 10 + x`, `y = 0` es la **fila inferior**; valor 0 vacío, 1-7 tipo de pieza (`I J L O S T Z`), 8 basura.
- `active: { type, rotation (0|1|2|3 = 0,R,2,L), x, y } | null` (x,y = esquina inferior-izquierda de la caja de rotación).
- `ghostY`, `hold`, `holdUsed`, `queue` (≥ 5 siguientes), `phase` (`countdown | spawning | falling | locking | clearing | gameover`), `level`, `lines`, `score`, `combo`, `b2b`, `clearing` (filas y progreso), `stats`, `timeMs`.

### Comandos (`Command`)

`left | right | cw | ccw | r180 | softDropOn | softDropOff | hardDrop | hold`. El motor no conoce DAS: `game/handling.ts` convierte teclas mantenidas en comandos repetidos.

### Eventos (`GameEvent`)

`spawn, move, rotate, rotateFail, softDrop, hardDrop{distance}, lock, lineClear{rows,count,tspin,mini,b2b,combo,perfectClear,points}, levelUp{level}, hold, holdFail, gameOver{reason}`. Los consumen renderer (efectos), audio (SFX) y UI (anuncios ARIA).

### Renderer

```ts
interface Renderer {
  init(container: HTMLElement, options: RenderOptions): void;
  resize(): void;
  render(state: Readonly<GameState>, timeMs: number): void;
  effect(event: GameEvent, state: Readonly<GameState>): void;
  dispose(): void;
}
```

### Invariantes (verificadas por tests y property-based)

- La pieza activa nunca solapa celdas ocupadas ni sale del tablero.
- Cada bolsa de 7 contiene exactamente una pieza de cada tipo.
- Tras `clearing` no queda ninguna fila completa; las filas superiores bajan exactamente `n`.
- `holdUsed` impide un segundo hold hasta el siguiente lock.
- Lock delay: 500 ms; máximo 15 resets por pieza en la misma fila más baja; bajar a una fila nueva reinicia el contador.
- La puntuación solo crece; el nivel = `startLevel + floor(lines / 10)` (fixed-goal) con tope según modo.

## Flujo por frame

```
rAF → loop.acumula(dt≤250ms) → mientras acc ≥ 8.333ms: handling.step → game.dispatch(cmds); game.step(8.333) → eventos → audio/render.effect/ui
     → renderer.render(state, now) → hud.update(state)
```

## Decisiones registradas

Ver `docs/adr/`. Cambios de contrato requieren ADR nuevo o actualización del existente.
