# Protocolo de trabajo para agentes (y humanos)

## A. Iteración estándar (60-120 min)

1. **Contexto (≤ 10 min):** leer `docs/STATUS.md`, `docs/ROADMAP.md`, `docs/FINDINGS.md`; `git log --oneline -15`; `pnpm check` para conocer la salud.
2. **Elegir tarea:** la primera no bloqueada de la fase actual del ROADMAP (o issue `priority:p0/p1`). Una tarea por iteración.
3. **Rama:** `git switch -c feat/<tema>` (o `fix/`, `docs/`, `research/`).
4. **Implementar** con tests primero cuando toque `src/core`. Sin `any`, sin `console.log` residual, sin dependencias nuevas sin ADR.
5. **Verificar:** `pnpm check` (lint + typecheck + test + build). Si tocó UI/render/audio: `pnpm dev`, abrir en navegador, jugar 60 s, capturar pantalla (`docs/assets/screenshots/YYYY-MM-DD-<tema>.png`), revisar consola sin errores.
6. **Documentar:** `CHANGELOG.md` (Unreleased), `docs/STATUS.md` (sesión), `docs/FINDINGS.md` (nuevo hallazgo o cierre), ADR si hubo decisión de arquitectura.
7. **Entregar:** commit convencional; push; PR con plantilla; merge cuando CI está verde; comprobar despliegue en Pages.

## B. Investigación periódica de mejora (UI/UX, audio, usabilidad, rendimiento, a11y)

1. Tomar el siguiente tema del backlog en `docs/research/README.md` (o uno urgente de FINDINGS).
2. Investigar con fuentes primarias (docs oficiales, wikis de la comunidad, repos). Si un sitio devuelve 403 a fetchers, usar `curl -A "<UA de navegador>"` y convertir HTML a texto.
3. Escribir `docs/research/NN-tema.md` con la plantilla (hallazgos con URLs, comparativa, decisión, acción, riesgos).
4. Convertir la decisión en **una acción concreta** en la misma iteración (cambio pequeño + verificación visual) o en un issue con etiqueta `type:research`.
5. Registrar en STATUS y, si aplica, en FINDINGS.

## C. Cadencia

- En sesión interactiva con Claude Code: programar un recordatorio recurrente (CronCreate/`/loop`) cada 45-60 min que ejecute B con el siguiente tema del backlog, y cada 2-3 iteraciones una verificación visual completa (A.5). Los jobs de sesión expiran a los 7 días.
- Alternativa persistente: routine en la nube (`/schedule`) semanal que abre un PR con el informe y la mejora.

## D. Definition of Done

- CI verde; cobertura de `src/core` ≥ 90 %.
- Sin regresión visual (capturas de Playwright) ni de rendimiento (frame ≤ 4 ms en Canvas 2D).
- Documentación actualizada (CHANGELOG, STATUS, FINDINGS/ADR/research según aplique).
- Verificación en navegador realizada y anotada.

## E. Reglas de oro

- No renombrar módulos ni cambiar contratos de `docs/ARCHITECTURE.md` sin ADR.
- No añadir assets con licencia dudosa; sin la marca "Tetris" en título/logo visibles.
- Preferir cambios pequeños y verificables; una idea grande → issue + ADR primero.
