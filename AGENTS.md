# AGENTS.md — tetris-html ("Blockfall")

Juego tipo Tetris moderno (Guideline SRS) en HTML5 + TypeScript, sin frameworks. Documentación en español; identificadores de código en inglés.

## Empieza aquí (orden de lectura, ≤ 10 min)

1. `docs/STATUS.md` — estado, última sesión, próximos pasos.
2. `docs/ROADMAP.md` — fase actual y tareas.
3. `docs/FINDINGS.md` — hallazgos/bugs/mejoras abiertos.
4. `docs/ARCHITECTURE.md` — módulos y contratos. `docs/adr/` — decisiones. `docs/research/` — investigación con fuentes.
5. `docs/PROTOCOLO.md` — cómo iterar y cómo investigar.

## Comandos

```bash
pnpm install            # Node >= 22.12, pnpm 11
pnpm dev                # http://localhost:5173
pnpm check              # lint + typecheck + test + build (debe pasar antes de commit)
pnpm test               # Vitest (unit + property-based)
pnpm test:e2e           # Playwright (requiere `pnpm exec playwright install chromium` la primera vez)
pnpm build && pnpm preview
```

## Estructura

`src/core` motor puro (sin DOM, determinista, semilla) · `src/game` loop/handling/sesión · `src/input` teclado/gamepad/táctil · `src/render` Canvas 2D (+ three.js diferido) · `src/audio` síntesis procedural · `src/ui` pantallas y HUD en DOM · `src/storage` persistencia versionada · `src/app` bootstrap · `tests/e2e` Playwright · `docs/` documentación viva.

## Convenciones

- TypeScript estricto: sin `any`, sin `!` no justificado, `noUncheckedIndexedAccess` activo.
- ESLint (typed) + Prettier; ejecutar `pnpm lint:fix && pnpm format` antes de commit (lefthook lo hace en pre-commit).
- Tests junto al código: `src/**/x.test.ts`. El motor (`src/core`) exige cobertura ≥ 90 % y tests por cada tabla/regla nueva.
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `perf:`, `chore:`). Ramas `feat/…`, `fix/…`, `docs/…`, `research/…`.
- Reglas del juego: la fuente de verdad es `docs/research/01-reglas-tetris-guideline.md`; si el código difiere, corregir código o abrir hallazgo.
- Coordenadas: `y = 0` es la fila inferior; tablas SRS con +y hacia arriba (ADR-0004).

## Definition of Done

CI verde · docs actualizadas (`CHANGELOG.md` Unreleased, `docs/STATUS.md`, `docs/FINDINGS.md` si aplica) · verificación visual en navegador para cambios de UI/render/audio (captura en `docs/assets/screenshots/`) · sin nuevas dependencias sin ADR.

## Límites

- No usar la marca "Tetris" en título visible, logo ni manifest (ADR-0005). Sin assets de licencia dudosa (ADR-0006).
- No cambiar contratos de `docs/ARCHITECTURE.md` sin ADR. No tocar `pnpm-lock.yaml` a mano.
- No subir secretos; no desactivar tests ni reglas de lint para "pasar".
- Cambios grandes → issue + ADR primero; cambios pequeños y verificables por defecto.

## Verificación visual

`pnpm dev` → abrir `http://localhost:5173` → jugar ≥ 60 s (mover, rotar con kicks contra pared, hold, hard drop, limpiar un Tetris) → consola sin errores → captura de pantalla. En Claude Code usar las herramientas de Chrome; en otros agentes, Playwright (`pnpm test:e2e`).

## Investigación

Sigue `docs/PROTOCOLO.md §B`; escribe `docs/research/NN-tema.md` con la plantilla del README de research y convierte la decisión en una acción concreta.
