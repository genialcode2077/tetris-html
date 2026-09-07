# Estado del proyecto (bitácora)

> **Lee esto primero.** Resume dónde está el proyecto, qué se hizo en la última sesión y qué sigue. Actualízalo al final de cada sesión de trabajo (humana o agente).

## Estado actual

- **Fase:** 0 → 1 (planificación cerrada; comenzando MVP)
- **Versión:** 0.1.0 (sin release)
- **Demo:** pendiente (GitHub Pages se configura en Fase 0)
- **Salud:** CI pendiente de primer run

## Próximos pasos (orden)

1. Implementar `src/core` con tests (ver `docs/ARCHITECTURE.md` y `docs/research/01-*`).
2. Loop + handling + Canvas 2D + HUD + teclado → partida jugable en Marathon.
3. Verificación visual en navegador; captura en esta bitácora.
4. Pantallas, persistencia, modos; primer despliegue.

## Bloqueos / decisiones pendientes del usuario

- Nombre visible del juego: se usa "Blockfall" (ADR-0005); cambiar `APP_TITLE` si se prefiere otro.

## Sesiones

### 2026-09-07 · Sesión 1 (agente Claude)

- Investigación completa en `docs/research/01..06` (fuentes primarias: tetris.wiki vía curl; npm; docs de tooling).
- Verificado: TypeScript 7.0.2 incompatible con typescript-eslint 8.69 (`<6.1.0`) → se usa TS 6.0.3.
- Arquitectura y ADRs 0001-0007; AGENTS.md/CLAUDE.md; protocolo de iteración.
- Andamiaje del proyecto en curso; repositorio GitHub `genialcode2077/tetris-html` pendiente de crear.
- Hallazgos registrados en `docs/FINDINGS.md` (F-001..F-005).
