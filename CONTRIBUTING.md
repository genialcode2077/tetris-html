# Contribuir

1. Lee `AGENTS.md` y `docs/PROTOCOLO.md`.
2. Crea una rama desde `main` (`feat/…`, `fix/…`, `docs/…`, `research/…`).
3. `pnpm check` debe pasar; añade tests para cualquier regla del motor.
4. Actualiza `CHANGELOG.md` (Unreleased) y `docs/STATUS.md`.
5. Abre un PR con la plantilla; CI debe estar verde; squash merge.

Commits: Conventional Commits. Estilo: Prettier + ESLint (se aplican en pre-commit vía lefthook).
