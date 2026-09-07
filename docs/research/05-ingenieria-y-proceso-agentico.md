# 05 · Ingeniería y proceso para agentes de IA

- **Fecha:** 2026-09-07 · **Estado:** vigente

## 1. Archivos de contexto para agentes

- **AGENTS.md** (raíz): estándar abierto (Agentic AI Foundation / Linux Foundation) leído por Codex, Copilot, Cursor, Gemini CLI, Jules, Aider, Zed, Windsurf, Devin… Contenido eficaz: descripción, comandos de build/test, estructura, convenciones, "definition of done", límites operativos, flujo git. **≤ 200-300 líneas**; las reglas después de la línea 300 se ignoran más.
- **CLAUDE.md**: importa AGENTS.md (`@AGENTS.md`) y añade notas específicas de Claude Code (verificación visual con Chrome, skills).
- Evitar: narrativa larga, reglas contradictorias, contenido generado sin verificar.

## 2. Documentación viva (docs/)

| Archivo                            | Propósito                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `README.md`                        | Qué es, demo, cómo ejecutar                                                                            |
| `AGENTS.md` / `CLAUDE.md`          | Contexto para agentes                                                                                  |
| `docs/STATUS.md`                   | **Bitácora**: estado actual, última sesión, próximos pasos, bloqueos. Primer archivo que lee un agente |
| `docs/ROADMAP.md`                  | Fases, hitos, tareas con estado                                                                        |
| `docs/FINDINGS.md`                 | Hallazgos: bugs, deuda, optimizaciones, ideas; con severidad y estado                                  |
| `docs/ARCHITECTURE.md`             | Módulos, flujo de datos, invariantes, contratos                                                        |
| `docs/adr/NNNN-*.md`               | Decisiones (MADR 4.0 mínimo: contexto, opciones, decisión, consecuencias)                              |
| `docs/research/NN-*.md`            | Investigaciones fechadas con decisiones y acciones                                                     |
| `docs/PROTOCOLO.md`                | Protocolo de iteración e investigación periódica                                                       |
| `CHANGELOG.md`                     | Keep a Changelog + SemVer                                                                              |
| `CONTRIBUTING.md`, `LICENSE` (MIT) |                                                                                                        |

## 3. Gestión de trabajo

- GitHub Issues con labels `type:{bug,feature,research,chore}`, `area:{core,render,audio,input,ui,a11y,infra,docs}`, `priority:{p0,p1,p2}`; milestones por fase del roadmap; plantillas de issue y PR.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `perf:`, `refactor:`), trunk-based con ramas cortas `feat/...`, PR con CI verde, squash merge.

## 4. CI/CD (GitHub Actions)

- `ci.yml`: en PR y push a main → `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test --coverage`, `build`, `test:e2e` (Playwright con navegador cacheado). Versiones: `actions/checkout@v6`, `actions/setup-node@v5`, `pnpm/action-setup@v4`.
- `deploy.yml`: en push a main → build → `actions/configure-pages@v5` → `upload-pages-artifact@v4` → `deploy-pages@v4`.
- Dependabot semanal (npm + actions), CodeQL opcional, Lighthouse CI en PR (fase 2).

## 5. Testing para el juego

- **Unitarios (Vitest):** tablas SRS (cada transición y test), 7-bag (cada bolsa contiene las 7), gravedad por nivel, scoring (todas las filas de la tabla), T-spin (casos de 3 esquinas, mini, kick 5), lock delay (move reset 15), top out.
- **Propiedades (fast-check):** para secuencias aleatorias de comandos: nunca solapamiento ni fuera de límites; puntuación monótona; líneas completas nunca permanecen; hold no se usa dos veces seguidas.
- **Golden replays:** JSON con semilla + entradas → estado final esperado (protege contra regresiones del motor).
- **E2E (Playwright):** flujo title→play→pause→game over; `toHaveScreenshot` en estados deterministas (semilla fija, animaciones desactivadas) con baselines generadas en CI (Linux); smoke de rendimiento (fps > 55 durante 5 s).
- Cobertura mínima: `src/core` 90 %.

## 6. Tooling local

`pnpm` scripts estándar; `lefthook` (pre-commit: eslint+prettier sobre staged; pre-push: `check`); `.editorconfig`; `.node-version`; `engines`; `.vscode/extensions.json` (eslint, prettier, playwright, vitest).

## 7. Releases

Tags `vX.Y.Z` + GitHub Release; versión visible en el juego vía `import.meta.env.VITE_APP_VERSION` (inyectada desde package.json) y hash corto de commit. release-please (fase 2).

## 8. Protocolo de iteración para agentes (resumen; detalle en docs/PROTOCOLO.md)

1. Leer `docs/STATUS.md` → `docs/ROADMAP.md` → `docs/FINDINGS.md` (10 min máx).
2. Elegir la tarea de mayor prioridad no bloqueada; crear rama `feat/…`.
3. Implementar con tests; `pnpm check` verde.
4. Verificar visualmente (dev server + navegador/captura) y anotar evidencia.
5. Documentar: CHANGELOG (Unreleased), STATUS (sesión), FINDINGS (nuevos hallazgos), ADR si hubo decisión.
6. Commit convencional, PR/merge, despliegue automático.

**Protocolo de investigación periódica:** cada iteración de mejora (UI/UX, audio, usabilidad, rendimiento) produce `docs/research/NN-tema.md` con fecha, hallazgos, decisión y acción concreta (issue o cambio), y se enlaza desde `docs/research/README.md`.

## 9. Estructura de carpetas recomendada

```
tetris-html/
├─ AGENTS.md  CLAUDE.md  README.md  CHANGELOG.md  CONTRIBUTING.md  LICENSE
├─ docs/{STATUS,ROADMAP,FINDINGS,ARCHITECTURE,PROTOCOLO}.md  docs/adr/  docs/research/
├─ .github/workflows/{ci,deploy}.yml  .github/ISSUE_TEMPLATE/  dependabot.yml
├─ src/core/      motor puro (board, pieces, srs, randomizer, scoring, gravity, game)
├─ src/game/      loop, sesión, modos, estadísticas, input→comandos (DAS/ARR)
├─ src/input/     keyboard, gamepad, touch
├─ src/render/    Renderer interface, canvas2d/, three/ (lazy)
├─ src/audio/     synth, sfx, music
├─ src/ui/        pantallas DOM, HUD, settings
├─ src/storage/   persistencia versionada
├─ src/app/       bootstrap
├─ tests/e2e/     Playwright
└─ public/        manifest, iconos
```

## 10. Riesgos

- Docs desincronizadas del código: el protocolo obliga a actualizar STATUS/CHANGELOG en cada PR; CI comprueba que `docs/STATUS.md` cambió cuando cambia `src/` (check ligero, fase 2).

## Referencias

- https://www.morphllm.com/agents-md-guide · https://asdlc.io/practices/agents-md-spec/ · https://www.augmentcode.com/guides/how-to-build-agents-md
- https://adr.github.io/madr/ · https://github.com/adr/madr
- https://keepachangelog.com · https://www.conventionalcommits.org
- https://github.com/actions/deploy-pages · https://github.com/actions/upload-pages-artifact
- https://argos-ci.com/blog/playwright-visual-regression-testing-ci · https://fast-check.dev
