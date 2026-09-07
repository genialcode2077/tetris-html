# Estado del proyecto (bitácora)

> **Lee esto primero.** Resume dónde está el proyecto, qué se hizo en la última sesión y qué sigue. Actualízalo al final de cada sesión de trabajo (humana o agente).

## Estado actual

- **Fase:** 1 completada (MVP jugable desplegado) → Fase 2 en curso (pulido)
- **Versión:** 0.1.0 (sin release etiquetada)
- **Demo:** https://genialcode2077.github.io/tetris-html/ (despliegue automático desde `main`)
- **Repositorio:** https://github.com/genialcode2077/tetris-html
- **Capturas de verificación:** `docs/assets/screenshots/` (generadas con `pnpm exec playwright test --grep @screenshots`; escritorio y móvil)
- **Salud:** `pnpm check` verde en local (79 tests unitarios/propiedades, cobertura core 96 % líneas / 85 % ramas); E2E smoke en chromium y móvil; CI en GitHub Actions

## Próximos pasos (orden)

1. Verificar en dispositivo móvil real (gestos, botones, audio iOS) y guardar capturas en `docs/assets/screenshots/`.
2. PWA (vite-plugin-pwa, iconos PNG generados por script, manifest) y Lighthouse CI con presupuestos.
3. Capturas de regresión visual en Playwright (semilla fija, `__blockfall.tick`).
4. Iteraciones de investigación periódica según `docs/research/README.md` (SFX A/B, tipografía HUD móvil, paleta).
5. Fase 3: prototipo de renderer three.js tras la interfaz `Renderer`.

## Bloqueos / decisiones pendientes del usuario

- Nombre visible del juego: se usa "Blockfall" (ADR-0005); cambiar `APP_TITLE` en `src/app/config.ts` si se prefiere otro.
- Verificación de audio: no se puede escuchar desde el agente; requiere prueba humana.

## Sesiones

### 2026-09-07 · Sesión 1 (agente Claude)

- Investigación completa en `docs/research/01..06` (fuentes primarias: tetris.wiki vía curl; npm; docs de tooling).
- Verificado: TypeScript 7.0.2 incompatible con typescript-eslint 8.69 (`<6.1.0`) → se usa TS 6.0.3.
- Arquitectura y ADRs 0001-0007; AGENTS.md/CLAUDE.md; protocolo de iteración.
- Andamiaje del proyecto en curso; repositorio GitHub `genialcode2077/tetris-html` pendiente de crear.
- Hallazgos registrados en `docs/FINDINGS.md` (F-001..F-005).
