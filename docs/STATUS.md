# Estado del proyecto (bitácora)

> **Lee esto primero.** Resume dónde está el proyecto, qué se hizo en la última sesión y qué sigue. Actualízalo al final de cada sesión de trabajo (humana o agente).

## Estado actual

- **Fase:** 3 en curso; el renderer premium 3D ya está entregado
- **Versión:** 0.1.0 · **Demo:** https://genialcode2077.github.io/tetris-html/ · **Repo:** https://github.com/genialcode2077/tetris-html
- **Pruebas:** 191 unitarias y de propiedades + 50 de extremo a extremo (escritorio y móvil), todas en verde
- **Cobertura del motor:** 96 % de líneas, 85 % de ramas
- **Rendimiento medido:** paso lógico 35 µs (0,4 % del presupuesto); render p95 1,0 ms en escritorio y 1,2 ms en móvil. Con el procesador seis veces más lento y partículas, el peor cuadro se queda en 8,4 ms gracias al presupuesto adaptativo
- **Tamaño:** 23,0 KB de JavaScript comprimido y 2,9 KB de CSS; el modo 3D son 238 KB aparte que solo descarga quien lo activa
- **Accesibilidad:** auditoría axe-core WCAG A/AA sin violaciones en las cinco pantallas; las tres paletas verificadas contra las tres dicromacias
- **Instalable y sin conexión:** service worker con 17 archivos precacheados, verificado cortando la red
- **Capturas:** `docs/assets/screenshots/` (`pnpm screenshots`)

## Próximos pasos (orden)

1. Posiciones preparadas en el modo práctica para entrenar giros concretos.
2. Prueba manual con lector de pantalla y en un teléfono real (audio, gestos, vibración, modo 3D en GPU móvil, coste de las partículas).
3. Afinar los efectos de sonido, que necesita a alguien que escuche y compare.

## Bloqueos / decisiones pendientes del usuario

- Nombre visible "Blockfall" (ADR-0005): cambiar `APP_TITLE` en `src/app/config.ts` si se prefiere otro.
- Verificación de audio y de gestos táctiles: requiere una persona con un dispositivo real.

## Sesiones

### 2026-09-08 · Sesión 11 (agente, iteración periódica) — controles de la repetición

- Tema del backlog: controles de avance y velocidad al ver una repetición (informe `docs/research/15`).
- El W3C tiene los requisitos escritos con identificadores concretos, que sirven de lista de comprobación: velocidad ajustable entre la mitad y dos veces y media, función para volverla a la normal, poder pausar y reanudar, y que todo se maneje con el teclado.
- Barra que aparece solo durante una repetición: volver al principio, pausar, velocidad en ciclo, avance y salir. Con etiquetas, foco visible y atajos de teclado que reutilizan las teclas del juego, inertes durante la reproducción.
- La velocidad multiplica cuántos pasos se dan por segundo, nunca el tamaño del paso. Así el motor recibe siempre lo mismo y el resultado no cambia: hay una prueba que compara el tablero final a cinco velocidades distintas.
- Seis pruebas nuevas y una captura de referencia.

### 2026-09-08 · Sesión 10 (agente, iteración periódica) — comparar con tu récord

- Tema del backlog: fantasma del récord en Sprint (informe `docs/research/14`).
- Se descartó el fantasma visual. En un juego de carreras es un coche translúcido en una pista; aquí serían bloques translúcidos sobre el mismo tablero, compitiendo con la pieza fantasma y con los colores, que son la única señal que distingue cada pieza.
- En su lugar se trajo lo que hacen las carreras contrarreloj: comparación por hitos. Cada diez líneas se muestra cuánto se va por delante o por detrás del récord, en verde o en naranja, y el panel del modo enseña la mejor marca como referencia.
- Los récords guardan ahora los tiempos parciales. Los guardados antes siguen valiendo: simplemente no tienen con qué comparar, y hay una prueba que lo fija.
- Diez pruebas del módulo de hitos, más dos capturas de referencia.
- Los controles de avance al ver una repetición quedan para otra iteración.

### 2026-09-08 · Sesión 9 (agente, iteración periódica) — basura y gravedad máxima

- Tema del backlog: subida de basura y gravedad máxima para el modo práctica (informe `docs/research/13`).
- La wiki oficial publica la tabla de cuántas filas envía cada jugada, cómo se acumulan en una cola y cómo limpiar líneas las cancela antes de que entren. La wiki de Hard Drop añade las proporciones de huecos alineados según el tipo de basura.
- El modo práctica gana subida de basura configurable, con hueco que se mantiene y cambia con cierta probabilidad, más niveles hasta el veinte para entrenar con gravedad máxima.
- La basura se genera con el mismo generador que las piezas, así que una repetición sigue reproduciendo exactamente las mismas filas. Hay una prueba que lo fija.
- Diecisiete pruebas nuevas: la tabla de ataque completa, la cancelación, la subida, el hueco, el determinismo y que los demás modos nunca traen basura.
- Volvió a fallar una sustitución automática sobre el HTML y los controles nuevos no llegaron a la página. Solo se vio al mirar la captura (F-028).

### 2026-09-08 · Sesión 8 (agente, iteración periódica) — partículas en equipos lentos

- Tema del backlog: coste de las partículas en un teléfono de gama baja (informe `docs/research/12`).
- Sin teléfono a mano, se midió con el freno de procesador del navegador. Conviene ser explícito: la documentación de Chrome avisa de que eso no simula un móvil de verdad, así que las medidas dicen cómo escala el coste, no cómo se comporta en un aparato concreto.
- Hallazgo: el límite de partículas era un número fijo de 600 que no miraba nada. Con el procesador seis veces más lento aparecían picos de 114 milisegundos, casi siete cuadros perdidos, y justo al limpiar líneas.
- Ahora el presupuesto se recorta tras varios cuadros lentos seguidos y se recupera despacio, con el mismo criterio que ya usaba el modo tridimensional para su resplandor.
- Resultado: con el procesador seis veces más lento, el peor cuadro pasa de 114 a 8,4 milisegundos y el percentil 95 vuelve dentro del presupuesto. En una máquina holgada no cambia nada.
- Once pruebas nuevas del módulo de efectos y una de extremo a extremo que frena el procesador y comprueba que el presupuesto baja de verdad.

### 2026-09-08 · Sesión 7 (agente, iteración periódica) — giros de todas las piezas

- Tema del backlog: giros de piezas distintas de la T y verificación de la tabla de giro de 180 (informe `docs/research/11`).
- La regla del inmóvil está definida sin ambigüedad en la wiki de Hard Drop: un giro cuenta si la pieza se fija sin poder moverse a la izquierda, a la derecha ni hacia arriba. TETR.IO la aplica desde julio de 2024 y desde enero de 2025 la extiende también a la T.
- Ajuste nuevo con tres valores, apagado por omisión: solo la T con la regla oficial, todas las piezas con la T por esquinas, o todas incluyendo la T por encaje. Los giros de otras piezas puntúan como giro menor y cuentan como jugada difícil.
- La tabla de giro de 180 sigue sin fuente numérica pública, así que F-001 continúa abierto. Se añadieron cuatro pruebas de sus propiedades, que es lo máximo verificable sin acceso al juego original.
- Quince pruebas nuevas, incluidas dos maniobras completas que comprueban que el comportamiento por omisión no cambia.

### 2026-09-08 · Sesión 6 (agente, iteración periódica) — aprender jugando

- Tema del backlog: tutorial interactivo de un minuto (informe `docs/research/10`).
- La investigación desaconseja ese formato: los avisos que interrumpen al arrancar se saltan, no se recuerdan y no mejoran el desempeño. Solo compensan con formas de interacción genuinamente nuevas, y mover bloques que caen no lo es.
- Lo que sí es opaco aquí es otra cosa: la reserva de pieza, la caída rápida, el giro de la T, el bono por encadenar y los combos. Nada de eso se descubre solo.
- Se descartó el tutorial y se hicieron consejos contextuales: aparecen la primera vez que cada mecánica importa, una sola vez en la vida, sin bloquear la partida y con un intervalo mínimo entre ellos. Se pueden apagar en Ajustes.
- Módulo `src/game/coaching.ts` sin dependencias del navegador, con nueve pruebas, más dos de extremo a extremo y una captura de referencia.
- De paso se descubrió que el interruptor de avisos de finesse nunca había llegado al formulario de Ajustes.

### 2026-09-07 · Sesión 5 (agente, iteración periódica) — colores y daltonismo

- Tema del backlog: verificar la paleta con simuladores de daltonismo (informe `docs/research/09`). Se saltó el ajuste de efectos de sonido, que figuraba como siguiente, porque exige que alguien escuche y compare y no se puede verificar de otro modo.
- Método: simulación de las tres dicromacias con las matrices de Machado, Oliveira y Fernandes, y medida de la diferencia percibida entre cada par de piezas con CIEDE2000.
- Hallazgo grave: en la paleta por defecto, la pieza azul y la morada tenían una diferencia de 2,0 con protanopia, es decir eran el mismo color. Afecta a una de cada doce personas de sexo masculino.
- Segundo hallazgo: la paleta llamada "alto contraste" era la peor de las tres para daltonismo, justo lo contrario de lo que su nombre sugiere.
- Cambios: azul más profundo para la pieza J (2,0 → 6,7), paleta de alto contraste rehecha (2,6 → 9,1) y etiquetas de Ajustes que describen lo que hace cada opción.
- Módulo nuevo `src/render/colorVision.ts` con la simulación y la fórmula de diferencia de color, más nueve pruebas que impiden que una paleta futura empeore.

### 2026-09-07 · Sesión 4 (agente, iteración periódica) — espacio en móviles pequeños

- Tema del backlog: legibilidad del marcador en pantallas de 360 puntos o menos (informe `docs/research/08`).
- La medición cambió el diagnóstico: la tipografía ya estaba bien a 16 píxeles; lo que fallaba era el reparto del espacio. El tablero ocupaba 160 puntos de los 360 disponibles porque el ancho se calculaba restando una altura fija de 300 píxeles.
- Ahora el contenedor del juego reparte el alto con una rejilla y el tablero se queda con lo que sobra. La celda pasa de 16 a 20 píxeles en un móvil de 360, y de 13 a 17 en uno de 320.
- Corregidos dos desbordamientos horizontales: los siete botones táctiles pedían más ancho del que había, y la animación de la cuenta atrás arrastraba la página al ampliarse.
- Prueba nueva que falla si el tablero se encoge por debajo de un tamaño de celda razonable, si algo se sale a lo ancho o si el marcador baja del mínimo legible. Distingue entre tener o no la fila de botones táctiles a la vista, porque ocupa 64 puntos y eso son 3 píxeles menos de celda.
- Medidas del tamaño de celda tras el cambio: 17 y 13 píxeles en una pantalla de 320 puntos (sin y con botones táctiles), 20 y 17 en una de 360, y 30 y 27 en una de 390.

### 2026-09-07 · Sesión 3 (agente Claude) — renderer 3D y finesse

- Decidido con el usuario: three.js para el renderer premium (ADR-0008), con las cuatro líneas de trabajo restantes aprobadas.
- `ThreeRenderer` completo: pozo con paredes iluminadas, cubos biselados por instancia, fantasma, partículas en tres dimensiones, sacudida y balanceo de cámara, pulso de luz al subir de nivel y aviso rojo cuando la pila sube.
- Resplandor con `RenderPipeline` y bloom de TSL. Se ajustó tras verlo en pantalla: la primera versión quemaba todo a blanco porque la emisión era global en lugar de venir del color de cada pieza.
- WebGPU con vuelta atrás automática a WebGL2 y, si tampoco hay, a Canvas 2D. Verificado con una prueba que simula un dispositivo sin GPU.
- Carga diferida real: el fragmento de three.js queda fuera de la precarga del service worker y se guarda en caché solo cuando alguien usa el modo.
- Coste de render en 3D: 1,9 ms en el percentil 95, dentro del presupuesto de 8 ms.
- Medida de finesse: pulsaciones mínimas por colocación con Dijkstra, porcentaje en el marcador y en resultados, y aviso opcional al gastar teclas de más. El primer intento usaba búsqueda en anchura y daba mínimos incorrectos.
- Las pruebas de extremo a extremo pasaron a tener su propio `tsconfig.json`, para poder usar tipos de Node sin contaminar el código del navegador.
- Repeticiones: semilla más lista de pulsaciones. La prueba clave comprueba que reproducir una partida da el mismo tablero, la misma puntuación y las mismas piezas.
- Traducción al inglés de toda la interfaz, con detección del idioma del navegador y cambio inmediato desde Ajustes.
- Modos nuevos: reto diario con semilla derivada de la fecha (misma partida para todos, sin servidor) y modo práctica sin fin.

### 2026-09-07 · Sesión 2 (agente Claude) — validación y aplicación instalable

- Validación del motor con maniobras reales en `src/core/maneuvers.test.ts`: T-Spin Triple con la 5ª prueba del kick, T-Spin Double con back-to-back, I-spin en pozo, perfect clear normal y encadenado, combos, mini T-spin y fin de partida. Todas correctas.
- Dos aserciones propias estaban mal y el motor tenía razón: un Tetris que vacía el tablero también es perfect clear, y la segunda limpieza consecutiva suma combo.
- Medido el rendimiento: 35 µs por paso lógico y 1,0 ms de render en el peor caso. Hay margen amplio para un renderer más ambicioso.
- Auditoría de accesibilidad con axe-core: una violación real corregida (el viewport impedía el zoom, criterio WCAG 1.4.4).
- Aplicación instalable y sin conexión con `vite-plugin-pwa`; iconos generados por script con Playwright (`pnpm icons`).
- Integración continua ampliada: ahora también verifica accesibilidad, presupuesto de render y funcionamiento sin conexión.
- Cerrado el PR de TypeScript 7 (incompatible con typescript-eslint) y rebasados los demás de Dependabot.
- Informe `docs/research/07-validacion-y-plan-fase-3.md` con los datos y el plan.

### 2026-09-07 · Sesión 1 (agente Claude)

- Investigación completa en `docs/research/01..06` (fuentes primarias: tetris.wiki vía curl; npm; docs de tooling).
- Verificado: TypeScript 7.0.2 incompatible con typescript-eslint 8.69 (`<6.1.0`) → se usa TS 6.0.3.
- Arquitectura y ADRs 0001-0007; AGENTS.md/CLAUDE.md; protocolo de iteración.
- Andamiaje del proyecto en curso; repositorio GitHub `genialcode2077/tetris-html` pendiente de crear.
- Hallazgos registrados en `docs/FINDINGS.md` (F-001..F-005).
