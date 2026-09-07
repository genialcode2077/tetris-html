# 06 · Renderer premium con three.js

- **Fecha:** 2026-09-07 · **Estado:** vigente (fase 2 del roadmap)

## 1. Estado de three.js (r185, 2026-09)

- `WebGPURenderer` usa WebGPU si está disponible (≈95 % de usuarios) y **cae a WebGL 2 automáticamente**; el foco del proyecto está en WebGPU/TSL; `WebGLRenderer` ya no recibe grandes features.
- **TSL** (Three Shading Language) permite escribir shaders en JS/TS; post-procesado con `PostProcessing` + nodos (`pass`, `bloom`) sin `EffectComposer`.
- Tipos en `@types/three` (three-ts-types) al día con cada release.
- Tree-shaking real con ESM: importar de `three` y `three/tsl`/`three/webgpu`; el chunk de three se carga con `import()` solo cuando el usuario elige el renderer 3D.

## 2. Escena para Tetris

- Cámara **perspectiva suave** (fov 35°) mirando al tablero, con leve inclinación para dar volumen; alternativa ortográfica para "look 2.5D".
- Unidad = 1 celda. Tablero 10×20 centrado en el origen; buffer oculto no se renderiza.
- **InstancedMesh** único para todas las celdas (200 tablero + 4 activa + 4 ghost + 20 next/hold) con `RoundedBoxGeometry`-like (BoxGeometry con bisel via `bevel` en geometría propia) e `instanceColor`; escala 0 para celdas vacías; actualización solo del rango que cambió (`instanceMatrix.needsUpdate`).
- Material `MeshStandardMaterial` con `emissive` por color (neón) y `emissiveIntensity` que el bloom recoge. Ghost: instancia con opacidad 0.25 (material aparte).
- Luces: ambient 0.4 + directional 1.0 + point cálido cerca del tablero; sombras desactivadas en móvil.
- Fondo: gradiente en un plano con TSL, partículas lentas (Points) en escritorio.

## 3. Post-procesado

```ts
import { PostProcessing, WebGPURenderer } from 'three/webgpu';
import { pass, bloom } from 'three/tsl';
const scenePass = pass(scene, camera);
const bloomPass = bloom(scenePass, 0.6 /*strength*/, 0.4 /*radius*/, 0.85 /*threshold*/);
post.outputNode = scenePass.add(bloomPass);
```

Degradación: si `gl.getParameter(MAX_TEXTURE_SIZE) < 4096`, `devicePixelRatio > 2` o fps < 50 durante 2 s → desactivar bloom; si el contexto falla → volver a Canvas 2D.

## 4. Efectos

- Line clear: partículas (InstancedMesh de 256 cubos pequeños con física simple en CPU) + flash emissive.
- Camera shake con trauma (ver informe 04) aplicado a la posición de cámara.
- Caída de filas: interpolación de `y` de instancias con easeOutCubic 120 ms (solo visual; el motor ya está en el estado final).
- Tween propio (≈40 líneas), sin gsap.

## 5. Rendimiento

- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, `powerPreference: 'high-performance'`, `antialias: false` con post-FX.
- Sin allocations por frame (reutilizar `Matrix4`, `Color`); `dispose()` de geometrías/materiales/render targets al cambiar de renderer.
- Render continuo solo mientras hay animaciones; en pausa/menu, render bajo demanda.

## 6. Integración

- HUD siempre en DOM (accesible), superpuesto al canvas 3D; el canvas 3D ocupa el mismo contenedor que el Canvas 2D → misma lógica de layout.
- Contrato `Renderer { init(container, opts), render(snapshot, timeMs), resize(w,h), effect(event), dispose() }` compartido con Canvas 2D; el `GameSnapshot` es inmutable y el renderer hace diff por celda.
- Texto en escena: no; usar DOM (troika-three-text solo si se quiere texto 3D decorativo).

## 7. PixiJS como alternativa

PixiJS 8 (≈450 KB) da bloom/glow 2D con filtros y mayor rendimiento en sprites, pero sin 3D real. Si en el futuro se descarta el 3D, PixiJS sería el "premium 2D". Con la interfaz `Renderer` ambas pueden convivir.

## 8. Decisión

Fase 1: Canvas 2D. Fase 2: `ThreeRenderer` con WebGPURenderer (fallback WebGL2), InstancedMesh, bloom TSL, carga diferida, detección de capacidades y fallback a Canvas 2D. Fijar `three@0.185.x`.

## Referencias

- https://threejs.org/manual/en/webgpurenderer.html · https://threejs.org/docs/pages/WebGPURenderer.html · https://threejs.org/docs/pages/TSL.html
- https://threejs.org/examples/webgpu_postprocessing_bloom.html · https://threejsroadmap.com/blog/the-complete-guide-to-threejs-post-processing-in-2026
- https://www.utsubo.com/blog/threejs-best-practices-100-tips · https://www.utsubo.com/blog/webgpu-threejs-migration-guide
- https://github.com/mrdoob/three.js/wiki/Migration-Guide · https://github.com/three-types/three-ts-types/releases
