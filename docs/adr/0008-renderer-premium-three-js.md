# 0008 · Renderer premium con three.js

- Estado: aceptado · Fecha: 2026-09-07 · Fuente: `docs/research/06`, `docs/research/07` §2

## Contexto

El renderer de Canvas 2D cumple de sobra: usa el 6 % del presupuesto de un frame a 60 fps. El objetivo declarado del proyecto es la mejor visualización posible, y queda margen amplio de rendimiento para gastar en gráficos.

## Opciones

1. **three.js** (elegida): 3D real. Bloques con volumen, iluminación, resplandor por post-proceso y cámara que reacciona. Unos 250 KB comprimidos.
2. **PixiJS 8**: 2D por GPU con filtro de resplandor. Unos 150 KB. Técnicamente más idóneo para una rejilla plana, pero el cambio visual es de grado, no de tipo.
3. **Solo Canvas 2D**: sin coste, sin salto visual.

## Decisión

Implementar `ThreeRenderer` detrás de la interfaz `Renderer` existente, con estas condiciones no negociables:

- **Carga diferida.** Se importa con `import()` solo cuando el jugador elige ese modo. Quien no lo active sigue descargando 21,7 KB.
- **Vuelta atrás automática.** Si el dispositivo no soporta WebGPU se usa WebGL2; si falla la creación del contexto o el rendimiento cae de forma sostenida, se vuelve a Canvas 2D sin interrumpir la partida.
- **El motor no se entera.** `ThreeRenderer` solo lee el estado del juego, igual que el renderer actual. Ninguna regla cambia.
- **Presupuesto propio.** El coste de render debe seguir por debajo de 8 ms en el percentil 95, medido por la misma prueba automática que vigila Canvas 2D.

## Consecuencias

El juego gana una identidad visual difícil de conseguir en 2D. A cambio, hay una dependencia grande que fijar y vigilar (`three@0.185.x`), y una superficie nueva de fallos en dispositivos variados, que se acota con la vuelta atrás automática. La versión ligera no se ve afectada.
