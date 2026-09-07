# 03 · Audio y música

- **Fecha:** 2026-09-07 · **Estado:** vigente

## 1. Web Audio API: reglas de oro

- **Autoplay:** desde Chrome 66 (y Safari/iOS, Firefox) un `AudioContext` creado sin gesto de usuario nace `suspended`. Crear **un único** contexto y llamar `ctx.resume()` en el primer `pointerdown`/`keydown` (evento confiable). Mostrar indicador "toca para activar sonido" hasta que `ctx.state === 'running'`.
- `new AudioContext({ latencyHint: 'interactive' })`.
- Grafo: `master(Gain) → DynamicsCompressor → destination`; buses `sfx(Gain)` y `music(Gain)` hacia master. **Ducking** de música (−6 dB, 150 ms) en eventos grandes (tetris, T-spin, game over).
- Evitar clics: envolventes con `setTargetAtTime`/`linearRampToValueAtTime`, nunca saltos a 0.
- iOS: el interruptor de silencio silencia Web Audio (esperado); reanudar contexto en `visibilitychange`→visible; algunos iOS requieren `resume()` dentro del handler de `touchend`.
- Silenciar/pausar al perder foco (junto con la pausa del juego).

## 2. Librerías (comparativa)

| Opción           | Tamaño   | Licencia | TS                 | Uso                                               | Veredicto                                                                          |
| ---------------- | -------- | -------- | ------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Web Audio nativo | 0        | —        | sí                 | Todo                                              | **Base**                                                                           |
| ZzFX             | < 1 KB   | MIT      | tipos comunitarios | SFX procedurales por 20 parámetros; diseñador web | **Adoptar el algoritmo** (reimplementación TS propia ~120 líneas, sin dependencia) |
| ZzFXM            | ~1 KB    | MIT      | no                 | Música tracker mini                               | Inspiración para secuenciador propio                                               |
| Howler.js 2.2.4  | ~9 KB gz | MIT      | @types             | Reproducción de archivos, sprites                 | Innecesario sin assets                                                             |
| Tone.js 15.1.22  | ~100 KB+ | MIT      | sí                 | Síntesis avanzada, transporte, secuencias         | Excesivo; solo si crece la música                                                  |
| jsfxr / sfxr-ts  | ~5 KB    | MIT      | parcial            | SFX estilo sfxr                                   | Alternativa a ZzFX                                                                 |

**Decisión:** cero assets de audio y cero dependencias: **sintetizador propio estilo ZzFX** + **secuenciador de pasos** propio para música chiptune. Ventajas: bundle mínimo, sin licencias, offline, parametrizable en caliente (investigaciones futuras pueden afinar cada sonido sin binarios).

## 3. Diseño de SFX (parámetros iniciales)

Notación: onda, frecuencia base → destino, envolvente (attack/sustain/release en ms), extras.

| Evento                  | Diseño                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| move                    | square, 220 Hz, a1 s10 r30, volumen bajo (0.15)                            |
| rotate                  | triangle, 440→520 Hz sweep, a1 s20 r40                                     |
| rotate-fail             | square, 110 Hz, r60, ligero ruido                                          |
| soft-drop tick          | sine, 180 Hz, s5 r20, vol 0.1 (limitar a 1 por 40 ms)                      |
| hard-drop               | ruido + sine 90→40 Hz, s10 r120, "thud"; acompaña screen shake             |
| lock                    | triangle 150 Hz, s10 r60                                                   |
| line-clear ×1/×2/×3     | sawtooth arpegio C5–E5–G5, +1 semitono por línea extra, r200               |
| tetris                  | acorde mayor (C5 E5 G5 C6) sawtooth + sweep de ruido, r500, ducking música |
| t-spin                  | triangle sweep 300→900 Hz "twist", r250                                    |
| combo n                 | tono base C5 subiendo 1 semitono por combo (máx +12), r120                 |
| back-to-back            | dos notas rápidas (G5, C6)                                                 |
| perfect-clear           | arpegio ascendente 6 notas + shimmer, r800                                 |
| level-up                | fanfarria 3 notas (C5 G5 C6), r400                                         |
| hold / hold-fail        | sine 600 Hz corto / square 100 Hz                                          |
| game-over               | descenso cromático 5 notas sawtooth, r900                                  |
| menu hover/confirm/back | sine 800 Hz r30 / triangle 660→990 / triangle 660→440                      |
| countdown 3-2-1 / go    | sine 440 ×3, luego 880                                                     |

Limitar voces simultáneas (≤ 8) y pool de nodos por evento; feedback háptico en móvil con `navigator.vibrate` (hard drop 15 ms, line clear 10-40 ms), respetando ajuste.

## 4. Música

- **Korobeiniki:** melodía folclórica rusa (s. XIX) de **dominio público**, pero The Tetris Company mantiene una **marca sonora** sobre su uso en videojuegos y derechos sobre el arreglo de 1989. Riesgo legal real para un clon con visibilidad. **Decisión: no incluir Korobeiniki por defecto**; componer un **tema chiptune original** (secuenciador propio) con capas: melodía (square), bajo (triangle), percusión (ruido). Documentar la opción de habilitar melodías de dominio público distintas si el usuario lo decide.
- **Música adaptativa:** BPM base 128 + 4 BPM por nivel (tope 176); capa de "peligro" (arpegio filtrado) cuando la pila supera la fila 14; transición en el siguiente compás.
- Fuentes CC0 si en el futuro se quieren pistas grabadas: OpenGameArt (CC0), Kenney (CC0), Freesound (filtro CC0).

## 5. UX de audio

- Ajustes persistidos: master/SFX/música (0-100), mute con tecla `M`, vibración on/off.
- Primer gesto desbloquea audio; sin audio hasta entonces no se rompe nada.
- Reducir volumen de "ticks" repetitivos (soft drop, move) a −12 dB relativo.

## 6. Testing

- `src/audio` recibe un `AudioContext` inyectable; en Vitest se usa un mock mínimo (`createMockAudioContext()`), y se testea que cada evento del motor dispara el SFX correcto y que la música cambia de tempo con el nivel. Sin reproducir audio real en CI.

## 7. Riesgos

- Diferencias de latencia en Android (Chrome) 20-80 ms: usar `latencyHint: 'interactive'` y sonidos con ataque inmediato.
- Voces acumuladas en combos rápidos: pool + límite.

## Referencias

- https://developer.chrome.com/blog/autoplay · https://www.chromium.org/audio-video/autoplay/
- https://github.com/KilledByAPixel/ZzFX · https://github.com/KilledByAPixel/ZzFXM
- https://tetrisconcept.net/threads/korobeiniki-is-a-trademark-of-tetris-holding.636/ · https://en.wikipedia.org/wiki/The_Tetris_Company
- https://howlerjs.com · https://tonejs.github.io
