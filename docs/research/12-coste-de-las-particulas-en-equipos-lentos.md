# 12 · Coste de las partículas en equipos lentos

- **Fecha:** 2026-09-08 · **Estado:** vigente
- **Tema del backlog:** rendimiento de las partículas en un teléfono de gama baja.

## Contexto / pregunta

Las partículas saltan justo al limpiar líneas, que es el momento en que más importa que el juego responda. Nunca se había medido cuánto cuestan cuando la máquina va justa, y el límite está puesto a mano en seiscientas.

## Método y su límite

No hay un teléfono de gama baja a mano. Lo que sí se puede hacer es aplicar el freno de procesador que ofrece el navegador, que multiplica el tiempo de cálculo por un factor.

Conviene ser explícito con lo que esto es y lo que no es. La documentación de Chrome lo dice sin rodeos: **no se pueden simular de verdad los procesadores de un móvil, porque su arquitectura no se parece a la de un ordenador**. El multiplicador es un factor relativo sobre la máquina que ejecuta la prueba, y no hay ninguna equivalencia oficial entre un factor concreto y una gama de dispositivo.

Así que estas medidas no dicen «así se comporta en un móvil barato». Dicen algo más modesto y aun así útil: **cómo escala el coste cuando el procesador va cuatro y seis veces más lento**, que es lo que hace falta para saber si el sistema aguanta o se derrumba.

## Hallazgos

Coste de un cuadro con el tablero lleno y una tormenta de partículas cada treinta cuadros:

| Partículas | Freno   | Mediana | Percentil 95 | Peor caso    |
| ---------- | ------- | ------- | ------------ | ------------ |
| sí         | ninguno | 1,1 ms  | 1,8 ms       | 4,4 ms       |
| sí         | 4×      | 4,5 ms  | 8,2 ms       | 20,4 ms      |
| sí         | 6×      | 6,0 ms  | 11,0 ms      | **114,1 ms** |
| no         | ninguno | 0,8 ms  | 1,2 ms       | 3,6 ms       |
| no         | 4×      | 1,8 ms  | 7,0 ms       | 11,5 ms      |

Tres cosas:

1. **Sin freno no hay problema.** Las partículas cuestan tres décimas de milisegundo de más sobre un presupuesto de dieciséis. Ni se notan.
2. **Con el procesador cuatro veces más lento, sí.** La mediana se multiplica por dos y medio respecto a jugar sin partículas, y el percentil 95 se sale del presupuesto propio del proyecto.
3. **Con seis veces más lento el peor caso se dispara a ciento catorce milisegundos**, que son casi siete cuadros perdidos de golpe. Y ocurre justo al limpiar líneas.

El motivo es que el límite de partículas es un número fijo escrito a mano. Da igual si la máquina va sobrada o ahogada: siempre intenta dibujar las mismas.

Merece la pena notar que el modo tridimensional ya resuelve esto para su propio efecto de resplandor: si dibujar se pone caro de forma sostenida, lo apaga solo. El modo clásico no tenía nada equivalente.

## Decisión recomendada

Dar a las partículas un presupuesto que se ajuste solo, con el mismo criterio que ya usa el modo tridimensional:

- El renderer mide lo que tarda en dibujar cada cuadro.
- Si se pasa del presupuesto de forma sostenida, recorta el número máximo de partículas.
- Si vuelve a ir holgado, lo recupera poco a poco hasta el tope original.

Quien tenga una máquina capaz no notará ninguna diferencia. Quien no la tenga verá menos partículas en lugar de perder cuadros, que es el intercambio correcto en un juego donde la respuesta a las teclas es lo primero.

Se descarta bajar el límite fijo para todos, porque penalizaría a la mayoría para proteger a una minoría, y también dejarlo como está, porque el peor caso medido es inaceptable.

## Acción

- Presupuesto ajustable en el sistema de partículas, con recorte y recuperación graduales.
- Pruebas de la lógica de ajuste, sin depender del navegador.
- Prueba de extremo a extremo que aplica el freno de procesador y comprueba que el presupuesto baja de verdad.

## Resultado medido

Las mismas condiciones, ya con el presupuesto que se ajusta solo:

| Freno | Mediana antes | Mediana ahora | Percentil 95 antes | Percentil 95 ahora | Peor caso antes | Peor caso ahora |
| ----- | ------------- | ------------- | ------------------ | ------------------ | --------------- | --------------- |
| 4×    | 4,5 ms        | **2,3 ms**    | 8,2 ms             | **5,1 ms**         | 20,4 ms         | **6,5 ms**      |
| 6×    | 6,0 ms        | **3,2 ms**    | 11,0 ms            | **6,5 ms**         | 114,1 ms        | **8,4 ms**      |

El peor caso baja de ciento catorce milisegundos a ocho y medio, trece veces menos, y el percentil 95 vuelve dentro del presupuesto en ambos casos.

Un detalle que confirma que el ajuste funciona como se quería: al terminar la medición el presupuesto había vuelto a su valor máximo. El sistema recorta cuando aprieta y recupera cuando puede, en lugar de quedarse encogido para siempre.

## Riesgos

Un ajuste demasiado nervioso haría que las partículas aparecieran y desaparecieran de forma visible. Se acota recortando solo tras varios cuadros lentos seguidos y recuperando despacio. Sigue pendiente comprobarlo en un teléfono de verdad, que es lo único que zanja la pregunta original.

## Referencias

- https://developer.chrome.com/docs/devtools/performance/reference (freno de procesador y su advertencia sobre simular móviles)
- Informe 07 de este directorio, con los presupuestos de dibujado del proyecto.
- Informe 04, sección 5, sobre los efectos y su intención.
