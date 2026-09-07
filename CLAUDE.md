@AGENTS.md

## Notas específicas para Claude Code

- Responder y documentar en español; código en inglés.
- Para ver el resultado: `pnpm dev` en segundo plano y abrir `http://localhost:5180` con las herramientas de Chrome (`tabs_create_mcp` → `navigate` → `screenshot`); revisar consola con `read_console_messages` (pattern `error|warn`).
- Antes de cerrar una sesión: actualizar `docs/STATUS.md` (sesión, próximos pasos) y `CHANGELOG.md`.
- Investigaciones periódicas: `docs/PROTOCOLO.md §B/§C` (CronCreate en sesión o `/schedule`).
- Si `tetris.wiki`/`harddrop.com` devuelven 403 a WebFetch, usar `curl -A "Mozilla/5.0 ..."` y convertir a texto.
