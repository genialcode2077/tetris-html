# tetris-html · Blockfall

Juego de bloques que caen (estilo Tetris, reglas Guideline/SRS) en HTML5 + TypeScript, sin frameworks, con motor determinista testeado, renderer Canvas 2D (y three.js opcional en el roadmap), audio procedural y controles de teclado, táctil y gamepad.

- **Demo:** https://genialcode2077.github.io/tetris-html/ (se publica automáticamente desde `main`)
- **Estado:** ver `docs/STATUS.md` · **Roadmap:** `docs/ROADMAP.md`
- **Para agentes de IA / colaboradores:** empieza por `AGENTS.md`

## Ejecutar

```bash
pnpm install
pnpm dev        # http://localhost:5180
pnpm check      # lint + typecheck + tests + build
```

## Controles (por defecto)

← → mover · ↑ / X rotar horario · Z / Ctrl rotar antihorario · ↓ soft drop · Espacio hard drop · C / Shift hold · Esc / P pausa · M silenciar. Todo remapeable en Ajustes. En móvil: deslizar para mover, tocar para rotar, deslizar abajo rápido para hard drop, arriba para hold.

## Documentación

`docs/ARCHITECTURE.md` · `docs/adr/` · `docs/research/` (reglas, stack, audio, UI/UX, proceso, three.js) · `docs/PROTOCOLO.md` · `docs/FINDINGS.md` · `CHANGELOG.md`

## Aviso legal

Proyecto educativo y de código abierto, **no afiliado** a The Tetris Company. "Tetris" es marca registrada de su titular y aquí se usa únicamente de forma descriptiva. El juego se presenta con el nombre "Blockfall" y no incluye música ni logotipos de la marca.

## Licencia

MIT — ver `LICENSE`.
