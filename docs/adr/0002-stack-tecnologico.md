# 0002 · Stack tecnológico

- Estado: aceptado · Fecha: 2026-09-07 · Fuente: `docs/research/02`

## Contexto

Juego de cuadrícula ligero, offline, sin backend; debe ser fácil de mantener por agentes y de desplegar en GitHub Pages.

## Opciones

1. Vanilla TS + Vite (elegida). 2. React/Svelte para UI. 3. Motor de juego (Phaser).

## Decisión

Vite 8.2 · TypeScript 6.0 (strict; no 7.x hasta que typescript-eslint lo soporte) · pnpm 11 · Vitest 5 + fast-check · Playwright 1.63 · ESLint 10 + typescript-eslint 8 (typed) · Prettier 3 · lefthook · knip. UI en DOM sin framework. three.js 0.185 solo en el renderer premium (carga diferida, fase 3).

## Consecuencias

Bundle inicial < 60 KB gz, arranque instantáneo, tests rápidos. Sin framework, la UI se escribe con helpers propios (`src/ui/dom.ts`). Revisar versiones trimestralmente.
