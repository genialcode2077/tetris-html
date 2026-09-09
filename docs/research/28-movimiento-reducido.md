# 28 · Movimiento reducido

- **Fecha:** 2026-09-09 · **Estado:** vigente
- **Tema:** qué respeta la preferencia de movimiento reducido. No estaba en el backlog; se buscó un área sin cubrir.

## Contexto / pregunta

El juego tiene temblor de pantalla, partículas, rastros de la caída rápida y destellos. Existe un ajuste de movimiento reducido, pero **nunca se había comprobado qué alcanza de verdad**.

## Hallazgos

### Lo que pide la norma

El criterio 2.3.3 de WCAG dice:

> «Motion animation triggered by interaction can be disabled, unless the animation is essential to the functionality or the information being conveyed.»

Y la guía es explícita sobre por qué importa: el impacto vestibular puede llegar a la náusea, la migraña y «potentially needing bed rest to recover». Recomienda apoyarse en la preferencia del sistema operativo.

Un detalle que resultó decisivo: la definición **excluye** los cambios de color, desenfoque u opacidad que no alteran el tamaño, la forma o la posición percibidos.

### La sospecha inicial era falsa

Una lectura rápida del código apuntaba a un defecto: la preferencia aparecía en el temblor y en el modo tridimensional, pero no junto a las partículas. Una primera medición pareció confirmarlo, dando ciento sesenta partículas con el movimiento reducido activado.

**Esa medición estaba mal.** Cambiaba el ajuste en el almacén pero no lo propagaba al dibujado, así que el renderer seguía con la preferencia apagada. Con el ajuste aplicado como lo haría el jugador, el resultado es el correcto:

| Ajuste              | Partículas | Rastros | Temblor |
| ------------------- | ---------- | ------- | ------- |
| Movimiento normal   | 160        | 1       | sí      |
| Movimiento reducido | **0**      | **0**   | **0**   |

Antes hubo otra medición engañosa: comparar dos casos seguidos en la misma página daba ciento sesenta y luego trescientas veinte, y parecía que la preferencia **duplicaba** las partículas. Era acumulación de la prueba anterior. Repetido con una página limpia cada vez, salían ciento sesenta en ambos casos.

Dos mediciones equivocadas seguidas, cada una apuntando a una conclusión distinta y ambas falsas. Merece quedar escrito: el orden correcto es comprobar el instrumento antes que el código.

### Revisado caso por caso, no falta ninguno

| Efecto                     | Respeta la preferencia                                    |
| -------------------------- | --------------------------------------------------------- |
| Temblor de pantalla        | Sí, y además se limpia al activarla                       |
| Partículas al limpiar      | Sí                                                        |
| Rastro de la caída rápida  | Sí                                                        |
| Destello al bloquear pieza | Sí                                                        |
| Temblor al perder          | Sí                                                        |
| Destello al subir de nivel | Sí al dibujar; además es solo color, que la norma excluye |
| Avisos del marcador        | Sí                                                        |
| Modo tridimensional        | Sí, incluido el resplandor                                |
| Hojas de estilo            | Sí, con la consulta correspondiente                       |

El modo automático también funciona: emulando la preferencia del sistema en los dos sentidos, el dibujado la sigue.

### Lo que sí faltaba

**Nada de esto estaba comprobado.** Funcionaba porque nadie lo había tocado. Es un criterio de accesibilidad cuyo incumplimiento puede provocar náuseas, y bastaba con que alguien quitara una línea para romperlo sin enterarse.

## Opciones y comparativa

| Opción                      | Qué aporta                                                   |
| --------------------------- | ------------------------------------------------------------ |
| Dar por bueno lo auditado   | Nada: la próxima sesión que toque el dibujado puede romperlo |
| Añadir pruebas que lo fijen | Convierte un acierto frágil en una garantía                  |

## Decisión recomendada

La segunda. Se cierra el hueco de verificación, no el de comportamiento, porque el comportamiento ya era correcto.

Las pruebas llevan **control positivo**: con la preferencia apagada se comprueba que los efectos sí ocurren. Sin eso, una prueba que solo mira que no hay partículas pasaría también si los efectos estuvieran rotos por cualquier otro motivo, y daría una tranquilidad falsa.

## Acción

- Tres pruebas: con la preferencia apagada los efectos ocurren, con ella encendida no hay ninguno, y en automático se sigue la del sistema en ambos sentidos.
- Verificadas quitando la comprobación del código: fallan como deben.

## Riesgos

Las pruebas miran el estado interno del dibujado, no los píxeles. Si un efecto futuro moviera algo por otra vía, habría que añadirlo a la lista. Comparar imágenes sería más completo pero mucho más frágil.

Esto no sustituye a que alguien con sensibilidad vestibular pruebe el juego. Lo que se garantiza es que el ajuste hace lo que dice.

## Referencias

- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html — criterio 2.3.3, la excepción de lo esencial y la exclusión de los cambios de solo color.
- Informe 12, sobre el presupuesto de partículas, que es el efecto con más movimiento del juego.
