# LAST LIGHT — Documento de diseño funcional

## Sobre este documento

Esto es una **especificación funcional de diseño de juego**, no una guía de implementación. Describe reglas, comportamientos, curvas y valores — no prescribe un motor, lenguaje, framework de render ni sistema de audio. El objetivo es que un equipo pueda reconstruir el mismo juego en **Unity, Godot, Unreal, un motor propio, o cualquier stack 2D**, tomando sus propias decisiones técnicas (arquitectura de escenas, sistema de físicas, pipeline de audio, gestión de assets) sin perder ninguna regla de diseño ni de balance.

Existe un prototipo de referencia ya funcional (HTML5 Canvas + JavaScript, sin frameworks). Este documento describe su comportamiento de forma independiente de esa implementación concreta, incluyendo ajustes de balance ya validados por iteración y prueba. Donde se citan valores numéricos (velocidades, tiempos, distancias), son los valores ya probados y ajustados — un punto de partida sólido, no una sugerencia arbitraria.

Convención de unidades: las distancias y velocidades del mundo de juego se expresan en "unidades de mundo" (u) y "unidades por segundo" (u/s), independientes de resolución de pantalla — es responsabilidad de la capa de presentación de cada motor mapear esas unidades a píxeles o unidades de motor según su propia cámara y escala.

---

## 1. Concepto

Un jugador conduce una motoneta vintage por una carretera posapocalíptica mientras una horda de zombis lo persigue desde el lado izquierdo de la pantalla.

El jugador **nunca se baja de la motoneta**. Toda la interacción con el mundo (esquivar, activar mecanismos, recolectar recursos, tomar rampas) sucede desde el vehículo en movimiento.

El desafío central no es "acelerar o frenar" en el sentido tradicional: es **administrar recursos y posición bajo presión constante** — decidir cuándo gastar combustible extra para ganar distancia, cuándo conservarlo, en qué carril ubicarse, cuándo encender el faro a costa de la batería, y cómo resolver mecanismos del entorno sin perder el control de ninguna de esas variables.

El prototipo debe transmitir:

- Presión constante
- Vulnerabilidad
- Incertidumbre
- Oscuridad
- Sensación de persecución
- Supervivencia improvisada

## 2. Dirección visual

Estética de horror cinematográfico 2D lateral, inspirada en juegos de supervivencia posapocalípticos de siluetas — **sin copiar** personajes, escenarios, interfaces ni recursos visuales de ningún juego existente. La vista de carriles (sección 7) toma como referencia funcional la disposición de pista de *Excite Bike* (NES): varias líneas paralelas de avance visibles simultáneamente, sin replicar su arte, personajes ni HUD.

Características visuales:

- Paleta desaturada: negros, grises y azul oscuro, con luces cálidas en amarillo y naranja como único acento cromático.
- Personajes y horda en silueta.
- Fondos con niebla y varias capas de parallax (al menos 3: lejana, media, cercana).
- Carretera rural o industrial abandonada; árboles, postes, alambrados y edificios destruidos como set dressing de fondo.
- Horda representada como una masa de siluetas superpuestas, no como enemigos individuales.
- Ligero movimiento de cámara (temblor) que se intensifica con la proximidad de la horda o los impactos.
- Polvo generado por la motoneta al avanzar (y, en menor medida, al retroceder).
- Vibración visual sutil y constante del motor.
- Viñeta oscura en los bordes de pantalla, que se tiñe de rojo cuando la horda está cerca.
- Interfaz minimalista que no cubre espacio de juego significativo.

Los recursos visuales pueden ser figuras geométricas simples pero claramente reconocibles (la motoneta con dos círculos de ruedas y cuerpo trapezoidal, el conductor como silueta, los zombis con cabeza circular + cuerpo irregular + brazos extendidos).

## 3. Estados del juego

Máquina de estados con las siguientes fases, cada una con su propia pantalla/interfaz:

1. **Menú principal**
2. **Instrucciones** (pantalla breve, sin bloquear el flujo)
3. **Partida** (gameplay activo)
4. **Pausa**
5. **Game Over**
6. **Victoria** (dos variantes posibles — ver sección 16)

Transiciones relevantes:

- El menú y la pantalla de instrucciones comparten un fondo animado no interactivo: la motoneta avanzando sola por la pista, con la horda visible a lo lejos (usa la misma vista de carriles, sin lógica de recursos ni colisiones real).
- Pausa y reinicio deben funcionar de forma fiable desde cualquier estado relevante, incluida la pantalla de Game Over (reintentar no debería depender de en qué estado exacto haya quedado la partida).
- El audio debe iniciarse únicamente tras una interacción explícita del usuario (requisito común a la mayoría de motores/navegadores para reproducir sonido).

## 4. Menú principal

Debe mostrar:

- Título provisional: **"LAST LIGHT"**
- Subtítulo: **"No te detengas"**
- Botón **"INICIAR NUEVO JUEGO"** → comienza la partida inmediatamente
- Botón **"INSTRUCCIONES"**
- Control para activar/desactivar sonido (aunque sea generado proceduralmente)
- Opcional: alternar pantalla completa, si la plataforma lo permite fácilmente
- Fondo animado (ver sección 3)

## 5. Controles

| Entrada | Acción |
|---|---|
| Avanzar (p. ej. flecha derecha) | Avanza en marcha **Normal** |
| Avanzar + Turbo (p. ej. flecha derecha + Shift) | Avanza en marcha **Turbo** (más rápido, consume combustible más rápido) |
| Retroceder (p. ej. flecha izquierda) | Retrocede (maniobra táctica — ver sección 9) |
| Cambiar de carril arriba / abajo (p. ej. flecha arriba / abajo) | Mueve la motoneta al carril adyacente (ver sección 7) |
| Saltar (p. ej. W o Espacio) | Toma una rampa si hay una alineada con el carril actual; fuera de una rampa, es sólo un gesto cosmético (no otorga altura real) |
| Faro (p. ej. F) | Enciende/apaga el faro |
| Interactuar (p. ej. E) | Activa un mecanismo cercano (interruptor de puerta) |
| Pausar (p. ej. Esc o P) | Alterna pausa |
| Reintentar (p. ej. R) | Reinicia la partida tras un Game Over |

Reglas de control importantes:

- **Sin ninguna entrada de avance presionada, la motoneta se detiene por completo.** No hay avance automático — es una decisión de diseño deliberada: quedarse quieto dejará que la horda gane terreno rápidamente (ver sección 12), así que "no detenerse" es una tensión activa, no pasiva.
- Si se presionan avanzar y retroceder al mismo tiempo, se cancelan mutuamente (velocidad neta cero).
- El cambio de carril es independiente del avance/retroceso y del salto: las tres entradas pueden combinarse libremente, incluso en el aire.
- El salto real (con altura que permite esquivar un obstáculo) sólo debe ocurrir en el contexto de una rampa alineada con el carril actual del jugador. Presionar salto en cualquier otro momento debe dar sólo una respuesta cosmética menor (p. ej. la rueda delantera se levanta levemente), nunca una esquiva real — esto evita que el salto se use como comodín para evitar todos los obstáculos sin usar los carriles ni las rampas.
- El Turbo sólo tiene efecto avanzando; no existe una variante "turbo en reversa".

## 6. Cámara

- Cámara lateral (2D, side-scrolling).
- El jugador se mantiene aproximadamente en el tercio izquierdo de la pantalla (≈30% desde el borde izquierdo); el escenario se desplaza hacia la izquierda para simular el avance.
- Pequeña anticipación visual hacia la derecha (look-ahead).
- Temblor suave cuando la horda se acerca (umbral de proximidad), temblor más fuerte en impactos y aterrizajes de salto.
- Parallax en al menos tres capas, con velocidades de desplazamiento distintas relativas al avance del jugador (p. ej. 25%, 50% y 85% de la velocidad de cámara para capas lejana, media y cercana).
- La cámara **no** necesita moverse verticalmente para seguir los cambios de carril: los tres carriles deben caber simultáneamente en el encuadre vertical fijo (ver sección 7).

## 7. Carriles (vista tipo Excitebike)

La pista tiene **varios carriles paralelos visibles simultáneamente** en pantalla, en lugar de un único plano de suelo. Esta es la diferencia central de vista/control respecto de un runner lateral tradicional de un solo carril.

- Cantidad de carriles: **3** (superior, central, inferior). El sistema debe soportar un número configurable de carriles, aunque el nivel de referencia (sección 15) está diseñado específicamente para 3.
- El jugador cambia de carril con una entrada dedicada (arriba/abajo), independiente de avanzar/retroceder y de saltar.
- **El cambio de carril debe resolverse en dos capas separadas:**
  - *Lógica*: el carril activo cambia **al instante** al presionar la entrada (para que la colisión sea predecible y justa — no debe haber ambigüedad sobre "en qué carril estoy" al momento de decidir si algo te golpea).
  - *Presentación*: la posición visual se desliza suavemente hacia el carril nuevo (ease/lerp con una constante de tiempo corta, del orden de 0.1–0.2s), para que el movimiento se sienta fluido sin introducir demora ni ambigüedad en la colisión real.
- El salto (rampas) es ortogonal al carril: saltar no cambia de carril, y cambiar de carril no interrumpe un salto en curso.
- **Qué elementos están atados a un carril y cuáles no:**
  - Obstáculos, rampas y el interruptor elevado (micropuzle) están anclados a **un carril específico**: sólo interactúan con el jugador si éste se encuentra en ese mismo carril en el momento del cruce. Estos son los elementos que dan sentido al cambio de carril como desafío.
  - Los ítems recolectables (combustible, batería), la puerta principal (macropuzle) y el interruptor que la abre son **independientes del carril**: se recogen/activan por estar cerca en el eje de avance, sin importar el carril. Esto es deliberado, no un descuido: si los recursos dependieran del carril exacto, esquivar un obstáculo cercano podría hacer perder un recurso sin que el jugador lo note, y eso puede volver el nivel imposible de completar por pura mala suerte de posicionamiento en vez de por una decisión de recursos consciente. El carril es el desafío de los obstáculos; los recursos deben poder recogerse siempre que se pase cerca.
  - La horda (sección 12) es visualmente independiente del carril: se representa como una masa que ocupa el ancho completo de los tres carriles, no un carril en particular.
- **Regla de equidad de nivel**: en cualquier posición del recorrido donde uno o más carriles estén bloqueados por un obstáculo, **siempre debe quedar al menos un carril libre**. La dificultad se escala aumentando cuántos carriles están ocupados simultáneamente (nunca los tres a la vez), no bloqueando el paso por completo.

## 8. Ciclo principal (core loop)

1. Elegir carril y marcha (Normal/Turbo) momento a momento.
2. Leer el terreno y anticipar obstáculos por carril.
3. Encender el faro cuando no haya visibilidad suficiente.
4. Activar mecanismos al pasar (interruptores).
5. Atravesar la puerta antes de que se cierre.
6. Usar rampas (alineando el carril correcto) para evitar obstáculos o alcanzar el interruptor elevado.
7. Recoger combustible y batería, también eligiendo el carril correcto.
8. Administrar Turbo vs. Normal para mantener o recuperar distancia respecto de la horda.
9. Retroceder tácticamente cuando reposicionarse vale más que seguir de largo.
10. Llegar al siguiente tramo.
11. Repetir con mayor presión (oscuridad creciente, carriles bloqueados con más frecuencia, horda más agresiva).

## 9. Movimiento y marchas

No hay velocidad automática fija: el jugador controla activamente si avanza, retrocede o permanece detenido, y a qué marcha lo hace.

| Marcha | Cuándo se activa | Velocidad relativa | Costo de combustible |
|---|---|---|---|
| Detenida | Sin entrada de avance/retroceso | 0 | Ninguno |
| Normal | Avanzar, sin Turbo | Velocidad base | Consumo base |
| Turbo | Avanzar + Turbo, con combustible disponible | ≈1.67× la velocidad Normal | ≈1.9× el consumo base |
| Retroceso | Retroceder | ≈0.71× la velocidad Normal | Consumo base (igual que Normal) |
| Sin combustible ("stall") | Combustible en 0 | Se aplica un multiplicador de penalización (≈0.85×) sobre la velocidad de avance o retroceso que corresponda | — |

Reglas de diseño detrás de estos valores (mantenerlas al ajustar números):

- El Turbo requiere combustible disponible; si el tanque está vacío, se fuerza a marcha Normal automáticamente y el botón de Turbo deja de tener efecto hasta recargar.
- El multiplicador de penalización sin combustible debe ser lo bastante severo para sentirse como una falla real, pero **nunca tan bajo que una sola falla de combustible sea una muerte instantánea e inevitable** independientemente de qué tan lejos esté la horda — debe seguir dando una ventana real de reacción (ver sección 12, penalización puntual vs. continua).
- Un jugador que se queda quieto (marcha Detenida) siempre debe perder terreno frente a la horda: la inacción tiene un costo, incluso sin combustible de por medio.

## 10. Recursos: combustible y batería

### Combustible

- Disminuye de forma constante mientras la motoneta esté en movimiento (Normal, Turbo o Retroceso); no disminuye si está detenida.
- Al llegar a cero, la motoneta "falla": ver la marcha "Sin combustible" en la sección 9. El momento exacto en que el tanque llega a cero debe generar una penalización puntual y acotada sobre la distancia respecto de la horda (un golpe fijo, no una espiral), además de una alerta sonora/visual clara.
- El jugador puede recoger bidones de combustible en posiciones planificadas del nivel (no aleatorias), independientes del carril (ver sección 7).
- Mostrar el nivel de combustible mediante una barra o aguja minimalista, con un umbral de "bajo" que cambia de color y dispara un aviso.
- **El presupuesto total de combustible del nivel (tanque inicial + todos los bidones) debe cubrir de sobra un recorrido completo incluso con uso generoso de Turbo** — recordar que en marcha Normal la horda gana terreno (sección 12), así que terminar el nivel exige usar Turbo con cierta frecuencia, no como opción ocasional. Dimensionar la cantidad y el valor de los bidones en función de ese consumo real, no sólo del consumo en marcha Normal; validar completabilidad jugando (o simulando) un recorrido completo con uso mixto de marchas antes de dar el balance por bueno.

### Batería

Alimenta exclusivamente al faro.

- Con el faro encendido, la batería disminuye de forma constante.
- Con el faro apagado, la batería no disminuye.
- El jugador puede recoger baterías, también en posiciones planificadas y atadas a un carril.
- Con batería baja, el faro debe parpadear (ver sección 11) como aviso.
- Al llegar a cero, el faro deja de poder encenderse hasta recargar.
- Mostrar el nivel de batería mediante una barra o indicador minimalista independiente del de combustible.

## 11. Faro

Mecánica central de visibilidad, no un accesorio cosmético.

**Encendido:**
- Proyecta un cono de luz delante de la motoneta.
- Permite ver con claridad rampas, obstáculos, interruptores e ítems dentro del cono.
- Consume batería de forma constante.
- Mejora el contraste del escenario cercano fuera del cono también, en menor medida.

**Apagado:**
- El escenario se vuelve mucho más oscuro.
- Los obstáculos sólo son claramente visibles muy cerca.
- Los objetos lejanos se leen como siluetas ambiguas.
- La batería se conserva.

**Batería baja:** el cono de luz debe parpadear de forma procedural (no un simple on/off regular — variación de intensidad con algo de ruido) para comunicar urgencia sin depender de texto.

**Oscuridad ambiente base:** independientemente del faro, el nivel de oscuridad ambiente general debe variar a lo largo del recorrido (ver sección 15), incluyendo al menos un tramo de "oscuridad total" con parpadeo del faro forzado e inestable como parte del diseño del nivel (un túnel u obstáculo de visibilidad), no sólo como consecuencia de batería baja.

El efecto de luz puede resolverse con cualquier técnica de máscara/oclusión/gradiente que soporte el motor elegido (máscara de oscuridad + recorte cónico, luces 2D nativas, shaders, etc.). El requisito funcional es el resultado — cono de luz direccional con caída de intensidad, oscuridad ambiente graduable, parpadeo procedural — no la técnica.

## 12. Horda

La horda es presión dinámica, no un enemigo con colisión individual.

**Modelo de distancia:** se representa mediante una única variable numérica de distancia entre el jugador y la horda (no posiciones individuales de zombis para efectos de colisión). Esa distancia:

- Tiene un valor inicial y un máximo (la distancia nunca crece de forma indefinida).
- Cambia continuamente en función de la **velocidad relativa** entre el jugador y la horda: la horda tiene su propia "velocidad de avance" (que aumenta gradualmente con el progreso en el nivel), y en cada instante la distancia crece si el jugador es más rápido que la horda, y se reduce si es más lento (incluida la marcha Detenida o el Retroceso, que cuentan como muy lentos o negativos a estos efectos).
- **Regla de diseño no negociable**: en marcha Normal la horda debe ser más rápida que el jugador (así que Normal por sí sola implica perder terreno de a poco); en Turbo el jugador debe ser más rápido que la horda (así que Turbo por sí solo implica ganar terreno). Esta relación debe mantenerse válida en *todo* el recorrido, incluidos los tramos de mayor presión — el jugador siempre debe poder confirmar, empíricamente, que acelerar aleja a la horda y no avanzar la acerca. Es aceptable que el margen se reduzca en el tramo final (exigiendo buen manejo de recursos, no sólo mantener Turbo apretado), pero no que se invierta.
- Por encima de ese modelo continuo, eventos puntuales empujan o alivian la distancia de forma **instantánea y acotada** (nunca como un multiplicador continuo que pueda espiralizar): chocar con un obstáculo, fallar la puerta a tiempo, quedarse sin combustible, o el equivalente conceptual de esos eventos. Del otro lado, completar un puzle, atravesar la puerta con éxito, activar la trampa ambiental o recoger un recurso importante alivian la distancia también de forma puntual.
- Tramos guionados del nivel (ver sección 15) pueden añadir presión temporal extra (una "velocidad de horda" mayor mientras el jugador atraviesa esa zona), pero estos bonos de presión **nunca se combinan/suman entre sí ni con la penalización de quedarse sin combustible** — se aplica siempre la presión más alta activa en ese momento, nunca la suma de varias. Esto es intencional: evita que una mala racha de eventos simultáneos produzca una velocidad de horda desproporcionada e injusta.
- Existe una distancia mínima de "contacto": si la distancia cae a ese umbral (muy cercano a cero — la horda debe estar prácticamente encima, no sólo "cerca"), se considera que la horda alcanzó al jugador y termina la partida en Game Over. Este umbral es la única condición de derrota del juego.

**Presentación visual:** la posición y visibilidad en pantalla de la masa de siluetas debe estar fuertemente atada a esa distancia (proximidad = 1 − distancia/distanciaMáxima):

- Con la horda lejos, debe ser prácticamente invisible / estar fuera de cuadro — no importa que "se pierda de vista"; lo único que determina el contacto es la variable de distancia, nunca lo que se ve en cámara.
- A medida que la proximidad aumenta, la masa de siluetas debe crecer en tamaño aparente, densidad/opacidad y cercanía al borde de la pantalla, hasta llegar visualmente a la rueda trasera de la motoneta cuando la distancia se acerca al umbral de contacto.
- La horda debe leerse como una amenaza distinguible del fondo (p. ej. un tono ligeramente cálido/rojizo contra un entorno frío/azulado), y dibujarse en una capa que quede por delante de la vegetación/elementos de fondo cercanos — que se camufle contra el paisaje rompe la lectura de peligro.
- Con proximidad alta, intensificar: temblor de cámara, sonidos, una silueta de mano/brazo cerca de la rueda trasera, tono rojo en los bordes de pantalla, intensidad de la música o pulso procedural.

## 13. Puzles

### Puerta con interruptor (macropuzle)

1. El jugador se aproxima a una instalación oscura; una puerta de ancho completo (los tres carriles) bloquea el paso.
2. Antes de la puerta hay un interruptor, activable desde cualquier carril presionando la entrada de interacción dentro de su zona.
3. Al activarlo, la puerta comienza a abrirse (transición gradual, no instantánea).
4. La puerta permanece abierta un tiempo limitado y luego empieza a cerrarse.
5. El jugador debe atravesarla antes de que vuelva a cerrarse.
6. Si el jugador queda frenado contra la puerta cerrada, debe recibir una penalización continua y acotada (no un bloqueo permanente) mientras siga ahí, más una sacudida de cámara — pero **la puerta cerrada sólo debe bloquear el avance hacia ella, nunca impedir retroceder**: el jugador debe poder alejarse y reintentar el interruptor sin quedar atrapado ni tener que reiniciar la partida.
7. El interruptor debe seguir siendo activable las veces que haga falta mientras la puerta esté cerrada, para permitir ese reintento inmediato sin bajarse de la moto.

Comunicar el estado visualmente mediante color (p. ej. rojo = bloqueada, amarillo = abriéndose/a punto de cerrar, verde = paso habilitado) y parpadeo cuando esté a punto de cerrarse. No usar textos largos durante la partida — el color y el temporizador visual deben bastar.

### Interruptor elevado + trampa ambiental (micropuzle)

1. El interruptor está montado en alto, sobre un carril específico.
2. Hay una rampa alineada con ese mismo carril, antes del interruptor.
3. El jugador debe estar en el carril correcto y saltar en el momento adecuado para tocar el interruptor en el aire.
4. La ventana de contacto (posición horizontal + altura durante el arco de salto) debe ser lo bastante generosa para ser alcanzable de forma consistente incluso en marcha Normal (no sólo en Turbo, que da más alcance horizontal durante el mismo tiempo de vuelo) — evitar que dependa de un salto en el margen exacto de un solo frame.
5. Al activarlo, dispara una trampa ambiental que retrasa a la horda: una reducción temporal y significativa de la presión de la horda (varios segundos), representada narrativamente como una valla que cae, un contenedor que bloquea el paso, una explosión abstracta o una compuerta que separa temporalmente a la horda.

## 14. Obstáculos

Tipos sugeridos: vehículos abandonados, pozos, barreras, escombros, troncos, pendientes/rampas leves, y zonas de oscuridad total (estas últimas no son colisionables — son tramos de baja visibilidad ambiental, ver sección 11).

Cada obstáculo colisionable está atado a un carril específico (sección 7). Los impactos **no detienen la partida**; deben:

- Sacudir la cámara.
- Aplicar una penalización puntual a los recursos del jugador (p. ej. una pequeña pérdida de combustible) y a la distancia respecto de la horda.
- Reproducir partículas de impacto.
- Otorgar un breve período de invulnerabilidad tras el golpe (para que un mismo obstáculo o una sucesión inmediata de eventos no genere múltiples penalizaciones injustas por el mismo error).
- El obstáculo debe poder esquivarse por dos vías independientes según el diseño del tramo: cambiando a un carril libre, o saltándolo mediante una rampa alineada con su carril (cuando exista una).

## 15. Diseño del nivel

Nivel corto, diseñado manualmente, de entre dos y cuatro minutos de duración a ritmo de juego normal/mixto.

Orden sugerido de eventos a lo largo del recorrido:

1. Inicio relativamente seguro.
2. Primer bidón de combustible.
3. Tutorial natural del cambio de carril (primer obstáculo simple, sin rampa cercana — obliga a resolverlo cambiando de carril).
4. Entrada gradual en oscuridad.
5. Tutorial natural del faro.
6. Batería visible.
7. Rampa de práctica (alineada con un obstáculo esquivable también por carril, para mostrar que hay más de una solución).
8. Puerta con interruptor.
9. Tramo con la horda acercándose (presión guionada temporal).
10. Interruptor elevado + rampa asociada.
11. Trampa ambiental (consecuencia de lo anterior).
12. Túnel oscuro con faro inestable.
13. Secuencia final de persecución: mayor densidad de obstáculos, incluyendo momentos con dos carriles bloqueados simultáneamente (nunca los tres).
14. Llegada a un refugio o portón de salida.

Los recursos (combustible y batería) deben estar distribuidos en posiciones planificadas a lo largo de todo el recorrido, alternando carriles, de forma que recolectarlos exija cierto movimiento activo pero nunca dependa de suerte.

Mensajes contextuales breves (una línea, pocos segundos en pantalla) pueden reforzar momentos clave — p. ej. al introducir el cambio de carril, el faro, o la proximidad de la horda — pero deben ser la excepción, no un tutorial constante.

## 16. Condiciones de victoria

El prototipo debe ofrecer **dos condiciones de victoria independientes**, ambas llevando a la misma pantalla de resultado con distinto título y las mismas estadísticas:

1. **Llegada al final**: alcanzar el punto físico de salida/refugio al final del recorrido diseñado. Título: *"PROTOTIPO COMPLETADO"* (o el nombre de campaña que corresponda al proyecto final).
2. **Supervivencia por tiempo**: sobrevivir un tiempo mínimo definido (del orden de dos minutos y medio) sin ser alcanzado por la horda, independientemente de si ya se llegó al final físico del recorrido. Título: *"ESCAPASTE DE LA HORDA"*. Esta condición existe como red de contención — permite validar/demostrar la sensación de persecución sin depender de que el jugador complete todo el recorrido diseñado, y da una segunda forma legítima de "ganar" acorde al concepto (sobrevivir, no necesariamente llegar a un lugar).

Cualquiera de las dos debe mostrar, al activarse:

- Tiempo de partida transcurrido.
- Combustible restante.
- Batería restante.
- Opción de jugar de nuevo.
- Opción de volver al menú principal.

## 17. Dificultad

La dificultad debe aumentar de forma gradual y perceptible a lo largo del recorrido, mediante (no mediante velocidad de avance impuesta, que el jugador ya controla):

- Mayor oscuridad ambiente.
- Menor margen de tiempo para resolver la puerta cómodamente (sin volverla injusta).
- Recursos ligeramente más espaciados.
- Obstáculos que exigen más anticipación (más frecuentes, más carriles bloqueados a la vez).
- Horda con velocidad base más alta y techo de distancia máxima más bajo hacia el final del recorrido.

Evitar una dificultad injusta: el jugador debe poder entender siempre, con la información visible en pantalla, por qué perdió (se quedó sin combustible, chocó reiteradamente, no llegó a la puerta a tiempo, etc.), nunca sentir que la horda lo alcanzó "porque sí".

## 18. Interfaz (HUD)

Mostrar durante la partida, sin cubrir espacio de juego significativo:

- Combustible (barra o indicador análogo).
- Batería (barra o indicador análogo).
- Estado del faro (encendido/apagado).
- Marcha actual (Detenida / Normal / Turbo / Retrocediendo / Sin combustible), ya que ahora es una decisión activa del jugador y no un estado implícito.
- Carril actual, de forma clara y a simple vistazo (p. ej. un indicador de tres segmentos con el activo resaltado).
- Distancia aproximada de la horda (numérica y/o barra de proximidad).
- Indicador contextual de la acción de interactuar cuando haya un mecanismo cercano.
- Mensajes breves y transitorios ("BATERÍA BAJA", "HORDA CERCA", "COMBUSTIBLE BAJO", confirmaciones de mecanismos activados) que aparecen y desaparecen solos, sin requerir que el jugador los cierre.
- Progreso aproximado dentro del recorrido (barra fina, opcional pero recomendable).

## 19. Audio

Audio dinámico/dependiente del estado del juego, generado o sintetizado en tiempo real en la medida en que la plataforma lo permita razonablemente (no depende de archivos de audio pregrabados como requisito, aunque tampoco lo prohíbe si el motor elegido lo resuelve mejor así):

- Motor continuo, con tono/timbre que reacciona a la marcha actual (más agudo/intenso en Turbo, más grave/apagado sin combustible).
- Cambio perceptible en el sonido del motor al recibir daño.
- Sonido de interruptor al activarse.
- Sonido de puerta metálica al abrir/cerrar.
- Sonido de recolección de ítems.
- Alerta sonora de batería baja.
- Murmullo grave y continuo de la horda, cuyo volumen escala con la proximidad.
- Sonido de impacto al aterrizar un salto.

El audio debe comenzar únicamente después de una interacción explícita del usuario (requisito de la mayoría de plataformas). Debe existir un control accesible para silenciar todo el audio del juego.

## 20. Pausa y reinicio

**La pausa debe detener por completo:**
- Todo movimiento (jugador y horda).
- Todo consumo de recursos.
- Todas las animaciones de gameplay.
- Todos los temporizadores de gameplay (puerta, trampas, invulnerabilidad, etc.).

La pantalla sigue renderizándose (congelada) con la superposición de pausa visible; nada de gameplay debe seguir procesándose en segundo plano mientras está en pausa.

**El reinicio debe restaurar por completo:**
- Posición y carril del jugador.
- Todos los recursos (combustible, batería) a sus valores iniciales.
- Distancia respecto de la horda a su valor inicial.
- Estado de todos los interruptores, la puerta y los ítems recolectables.
- Todos los temporizadores del nivel.
- El tiempo de partida transcurrido.

No debe quedar ningún temporizador de una partida anterior corriendo en segundo plano tras un reinicio o una vuelta al menú (es decir, evitar cualquier mecanismo de "espera diferida" que no esté atado al propio bucle de actualización del juego, para que respete pausa y reinicio correctamente).

## 21. Adaptación de pantalla

- El área de juego debe ser responsiva a distintos tamaños de ventana/pantalla, manteniendo una relación de aspecto aproximada de 16:9 (con recorte o bandas según convenga, no distorsión).
- Si la pantalla disponible es demasiado pequeña para jugar cómodamente, mostrar un aviso claro en lugar de un juego inutilizable.
- Evitar cualquier comportamiento de scroll accidental de la página/ventana contenedora provocado por las teclas de control.
- Permitir pantalla completa si la plataforma lo soporta de forma sencilla.

## 22. Arquitectura recomendada (sistemas, no clases literales)

La lógica debe organizarse en responsabilidades claramente separadas — el nombre exacto y el patrón (clases, componentes de entidad, ScriptableObjects, nodos, sistemas ECS, etc.) queda a criterio de cada motor/equipo:

- **Controlador de juego / máquina de estados**: gestiona las transiciones entre Menú, Instrucciones, Partida, Pausa, Game Over y Victoria, y el bucle de actualización general.
- **Jugador**: recursos (combustible, batería), marcha actual, carril actual, estado del faro, invulnerabilidad.
- **Vehículo**: física de salto/suspensión, animaciones (ruedas, vibración de motor), independiente de la lógica de recursos del jugador.
- **Horda**: variable de distancia, velocidad relativa, eventos de empuje/alivio, presentación visual.
- **Nivel**: definición de obstáculos, rampas, interruptores, puerta, ítems, zonas de oscuridad, mensajes — todo con su posición en el mundo y, cuando corresponda, su carril.
- **Cámara**: seguimiento horizontal, look-ahead, temblor.
- **Iluminación**: oscuridad ambiente por progreso en el nivel, cono de faro, parpadeo.
- **Interfaz**: HUD y pantallas de estado.
- **Audio**: sonidos reactivos al estado del juego.
- **Entrada**: mapeo de controles a acciones lógicas (avanzar, retroceder, carril arriba/abajo, saltar, faro, interactuar, pausa, reintentar), desacoplado de las teclas/botones físicos concretos.
- **Entidades del nivel**: obstáculo, coleccionable, interruptor (con variante elevada), puerta, rampa — como tipos de datos reutilizables con posición en el mundo, carril (o "todos los carriles"), y su propio estado de resuelto/activado/usado.

Requisitos técnicos transversales, independientes del motor:

- Actualización de simulación independiente del framerate (paso de tiempo delta, no lógica atada a frames fijos).
- Colisiones simples (cajas o círculos alineados a ejes), sin necesidad de física realista ni colisión individual por zombi de la horda.
- Limpieza correcta de temporizadores y listeners de entrada al reiniciar o cambiar de estado (nada debe seguir corriendo en segundo plano tras un reinicio).
- Evitar variables globales innecesarias / estado compartido implícito entre sistemas que no lo requieran.
- Parámetros de balance centralizados y fácilmente ajustables (ver sección 23) — no "mágicos" dispersos por el código.

## 23. Parámetros de diseño ajustables

Valores ya probados y balanceados en el prototipo de referencia. Deben quedar centralizados y fácilmente editables (un asset de configuración, ScriptableObject, archivo de datos, etc.) para permitir iteración posterior sin tocar lógica.

**Carriles**

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Cantidad de carriles | 3 | Superior / central / inferior |
| Duración de transición visual entre carriles | ≈0.1–0.2 s | Sólo afecta presentación, no la lógica de colisión (que cambia al instante) |

**Movimiento**

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Velocidad Normal | 210 u/s | Avance base |
| Velocidad Turbo | 350 u/s | ≈1.67× Normal |
| Velocidad de Retroceso | 150 u/s | ≈0.71× Normal |
| Multiplicador de consumo en Turbo | 1.9× | Sobre el consumo base de combustible |
| Multiplicador de velocidad sin combustible | 0.85× | Aplicado sobre la velocidad de avance/retroceso vigente |

**Recursos**

| Parámetro | Valor de referencia |
|---|---|
| Combustible máximo | 100 |
| Consumo de combustible (en movimiento, marcha Normal) | 1.55 / s |
| Combustible por bidón recogido | 38 |
| Cantidad de bidones de combustible en el recorrido | 8 |
| Batería máxima | 100 |
| Consumo de batería (faro encendido) | 9 / s |
| Batería por pack recogido | 38 |
| Umbral de combustible bajo | 22 |
| Umbral de batería baja | 20 |

**Horda**

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Distancia inicial | 900 u | |
| Distancia máxima | 1050 u (decreciente con el progreso, hasta −260 al final) | Techo que se reduce con el avance en el nivel |
| Distancia de contacto (derrota) | 8 u | Debe estar prácticamente encima del jugador |
| Velocidad base de la horda | 225 u/s | Mayor que Normal (210), menor que Turbo (350) |
| Incremento de velocidad base por progreso | +55 u/s (gradual, 0→100% del nivel) | |
| Presión extra en zona de acercamiento guionada | +40 u/s | No se suma a otras presiones — reemplaza |
| Presión extra en persecución final | +90 u/s | No se suma a otras presiones — reemplaza |
| Presión propia de "sin combustible" | +20 u/s (más un golpe puntual de 110 u a la distancia, una sola vez) | Reemplaza cualquier bono de zona activo, nunca se combina |
| Frenado de la horda al activar la trampa ambiental | −200 u/s durante ≈6 s | |
| Penalización puntual por choque con obstáculo | 70 u | |
| Penalización continua por quedar bloqueado en la puerta | 45 u cada ≈0.6 s mientras dure | |
| Alivio por activar el interruptor de la puerta (primera vez) | 60 u | |
| Alivio por atravesar la puerta exitosamente | 90 u | |
| Alivio por activar la trampa ambiental | 130 u | |
| Alivio por recoger un ítem | 12 u | |

**Puerta**

| Parámetro | Valor de referencia |
|---|---|
| Duración abierta | 3.4 s |
| Velocidad de apertura/cierre | recorre su rango en ≈0.6 s |
| Aviso de cierre inminente (parpadeo) | últimos 1.1 s abierta |

**Faro**

| Parámetro | Valor de referencia |
|---|---|
| Intensidad | 0.95 (sobre 1) |
| Longitud del cono | 430 u |
| Semiapertura angular del cono | ≈35.5° (0.62 rad) |

**Salto**

| Parámetro | Valor de referencia |
|---|---|
| Gravedad | 1550 u/s² |
| Potencia de salto estándar (rampa) | 560 u/s iniciales |
| Potencia de salto con impulso (rampa + salto bien cronometrado) | 780 u/s iniciales |
| Altura mínima para considerar "esquivado por altura" un obstáculo | 46 u |

**Nivel y victoria**

| Parámetro | Valor de referencia |
|---|---|
| Longitud total del recorrido | 42000 u (≈2–3 min a ritmo mixto Normal/Turbo) |
| Tiempo para la victoria alternativa por supervivencia | 150 s |

**Cámara**

| Parámetro | Valor de referencia |
|---|---|
| Posición horizontal del jugador en pantalla | ≈30% desde el borde izquierdo |
| Look-ahead | 46 u |
| Umbral de proximidad de horda que inicia temblor ambiente | 55% de proximidad |

## 24. Diseño de nivel de referencia (posiciones y carriles)

Tabla completa del recorrido de referencia, expresando cada posición como fracción del largo total del nivel (0.0 = inicio, 1.0 = final físico) y su carril (0 = superior, 1 = central, 2 = inferior) donde aplica — el carril es sólo dato de posicionamiento visual para los recolectables (no filtra su recolección; ver sección 7).

**Combustible** (8 bidones — validado por simulación de recorrido completo, ver nota de la sección 10): 0.04 · 0.28 · 0.335 · 0.50 · 0.63 · 0.70 · 0.815 · 0.90 — el bidón de 0.335 está pensado específicamente para reponer justo después de la puerta (el primer bloqueo real del nivel), y los de 0.63 y 0.815 cubren el tramo de mayor consumo (túnel oscuro y persecución final, donde el Turbo es casi obligatorio).

**Batería:** 0.16 (2) · 0.36 (0) · 0.58 (1) · 0.82 (2)

**Obstáculos** (tipo, posición, carril):

| Posición | Tipo | Carril |
|---|---|---|
| 0.20 | Barrera | 1 |
| 0.245 | Pozo | 1 (alineado con la rampa de práctica) |
| 0.34 | Escombros | 0 |
| 0.365 | Vehículo | 2 |
| 0.39 | Barrera | 0 |
| 0.41 | Pendiente | 2 |
| 0.56 | Tronco | 1 |
| 0.605 | Escombros | 2 |
| 0.76 | Vehículo | 0 |
| 0.76 | Barrera | 2 *(doble bloqueo: sólo el carril 1 queda libre)* |
| 0.78 | Barrera | 1 |
| 0.80 | Escombros | 2 |
| 0.83 | Tronco | 0 |
| 0.83 | Escombros | 1 *(doble bloqueo: sólo el carril 2 queda libre)* |
| 0.86 | Vehículo | 1 |
| 0.89 | Barrera | 0 |

**Rampas:** 0.24, carril 1 (práctica) · 0.46, carril 0 (lleva al interruptor elevado)

**Puerta:** 0.322 (todos los carriles) · **Interruptor de puerta:** 0.300 (cualquier carril)

**Interruptor elevado:** 0.465, carril 0 (alineado con la rampa de 0.46)

**Zona de acercamiento guionada de la horda:** 0.34 – 0.42

**Zona de persecución final:** 0.75 – 0.92

**Zona de oscuridad total / faro inestable (túnel):** 0.55 – 0.62 (oscuridad ambiente sube a ~95% del máximo en ese tramo)

**Curva de oscuridad ambiente general** (fracción del nivel → nivel de oscuridad 0–1, interpolado linealmente entre puntos): 0.00→0.06 · 0.05→0.10 · 0.20→0.55 · 0.54→0.55 · 0.55→0.95 · 0.62→0.95 · 0.64→0.55 · 0.75→0.62 · 0.90→0.85 · 1.00→0.85

**Portón de salida / final físico:** 0.99 (a 400 u del final del recorrido)

## 25. Criterios de aceptación

El prototipo estará completo si:

- El menú funciona y "Iniciar nuevo juego" comienza una partida limpia.
- La motoneta sólo avanza/retrocede mientras el jugador sostiene la entrada correspondiente; detenerse es una opción válida (con consecuencias).
- El jugador puede cambiar entre los tres carriles con una entrada dedicada, de forma inmediata y sin ambigüedad de colisión.
- La cámara sigue al jugador horizontalmente y los tres carriles son visibles simultáneamente.
- Existe una horda visible y amenazante, cuya distancia responde de forma consistente y verificable a la velocidad relativa del jugador (Normal acerca, Turbo aleja, en todo el recorrido).
- La horda puede alcanzar al jugador y terminar la partida.
- El faro puede encenderse y apagarse, y consume batería sólo mientras está encendido.
- El combustible disminuye sólo mientras hay movimiento, y se puede recolectar combustible y batería sin importar el carril (ver sección 7).
- El presupuesto total de combustible del recorrido alcanza para completarlo con uso mixto de marchas — verificado jugando el nivel de punta a punta, no sólo por cálculo.
- Existe al menos una puerta con interruptor que bloquea los tres carriles, con reintento posible sin quedar atrapado.
- Existe al menos una rampa funcional atada a un carril.
- Existe al menos un interruptor elevado atado a un carril, alcanzable de forma consistente.
- Los obstáculos están distribuidos por carril, siempre dejando al menos uno libre en cada posición.
- Hay Game Over cuando la horda alcanza al jugador.
- Hay victoria al llegar al final físico del recorrido, y una segunda forma de victoria por tiempo de supervivencia.
- Se puede reiniciar la partida por completo, sin arrastrar estado de la partida anterior.
- La pausa detiene absolutamente todo el gameplay (movimiento, consumo, temporizadores, animaciones).
- No hay errores en tiempo de ejecución bajo uso normal.

## 26. Prioridades de implementación

1. Gameplay funcional (avance/retroceso, carriles, colisión por carril).
2. Sensación de persecución (modelo de distancia de la horda respondiendo de forma clara a las decisiones del jugador).
3. Faro y oscuridad.
4. Claridad de obstáculos y puzles (incluida la legibilidad de qué carril está bloqueado).
5. Administración de recursos (combustible, batería, marchas).
6. Presentación visual (vista de carriles, parallax, silueta de la horda).
7. Audio y efectos adicionales.

Si alguna característica resulta demasiado compleja para una plataforma o motor en particular, simplificarla sin eliminar el ciclo principal ni la regla central de la sección 12 (acelerar aleja a la horda, no avanzar la acerca).
