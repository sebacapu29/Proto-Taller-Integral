# LAST LIGHT — Documento de diseño funcional

## Sobre este documento

Esto es una **especificación funcional de diseño de juego**, no una guía de implementación. Describe reglas, comportamientos, curvas y valores — no prescribe un motor, lenguaje, framework de render ni sistema de audio. El objetivo es que un equipo pueda reconstruir el mismo juego en **Unity, Godot, Unreal, un motor propio, o cualquier stack 2D**, tomando sus propias decisiones técnicas (arquitectura de escenas, sistema de físicas, pipeline de audio, gestión de assets) sin perder ninguna regla de diseño ni de balance.

Existe un prototipo de referencia ya funcional (HTML5 Canvas + JavaScript, sin frameworks). Este documento describe su comportamiento de forma independiente de esa implementación concreta, incluyendo ajustes de balance ya validados por iteración y prueba. Donde se citan valores numéricos (velocidades, tiempos, distancias), son los valores ya probados y ajustados — un punto de partida sólido, no una sugerencia arbitraria.

Convención de unidades: las distancias y velocidades del mundo de juego se expresan en "unidades de mundo" (u) y "unidades por segundo" (u/s), independientes de resolución de pantalla — es responsabilidad de la capa de presentación de cada motor mapear esas unidades a píxeles o unidades de motor según su propia cámara y escala.

---

## 1. Concepto

Un jugador conduce una motoneta vintage por una carretera posapocalíptica mientras una horda de zombis lo persigue desde el lado izquierdo de la pantalla.

El jugador **nunca se baja de la motoneta**. Toda la interacción con el mundo (esquivar, activar mecanismos, recolectar recursos, tomar rampas) sucede desde el vehículo en movimiento.

El desafío central no es "acelerar o frenar" en el sentido tradicional: es **administrar posición y velocidad bajo presión constante** — decidir en qué carril ubicarse, cuánta velocidad sostener (es la única palanca real contra la horda), cuándo encender el faro a costa de la batería (el único recurso limitado del recorrido), y cómo resolver mecanismos del entorno sin perder el control de ninguna de esas variables.

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
| Avanzar (p. ej. flecha derecha) | Avanza a la velocidad que marque la barra de velocidad (ver más abajo) |
| Retroceder (p. ej. flecha izquierda) | Retrocede (maniobra táctica — ver sección 9) |
| Cambiar de carril arriba / abajo (p. ej. flecha arriba / abajo) | Mueve la motoneta al carril adyacente (ver sección 7) |
| Saltar (p. ej. W o Espacio) | Gesto cosmético menor (no otorga altura real). El salto real en las rampas es **automático** — ver más abajo, no requiere presionar nada |
| Disparar hacia atrás (p. ej. A) | Dispara hacia la horda: la frena un poco (alivio puntual, repetible — ver sección 12) |
| Disparar hacia adelante (p. ej. D) | Dispara hacia adelante: elimina a un zombi de frente antes de que choque (ver sección 9.1 y 14.1) |
| Faro (p. ej. F) | Enciende/apaga el faro |
| Interactuar (p. ej. E) | Activa un mecanismo cercano (interruptor de puerta) |
| Pausar (p. ej. Esc o P) | Alterna pausa |
| Reintentar (p. ej. R) | Reinicia la partida tras un Game Over |
| Barra de velocidad (clic/arrastre con el mouse sobre el control del HUD) | Regula de forma continua la velocidad de avance entre el mínimo y el máximo configurados (ver sección 9) |

Reglas de control importantes:

- **Sin ninguna entrada de avance presionada, la motoneta se detiene por completo.** No hay avance automático — es una decisión de diseño deliberada: quedarse quieto dejará que la horda gane terreno rápidamente (ver sección 12), así que "no detenerse" es una tensión activa, no pasiva.
- Si se presionan avanzar y retroceder al mismo tiempo, se cancelan mutuamente (velocidad neta cero).
- El cambio de carril es independiente del avance/retroceso y del salto: las tres entradas pueden combinarse libremente, incluso en el aire.
- El salto **automático** en rampas (ver sección 9.2) es la vía principal para atravesarlas; presionar el botón de salto cerca de una rampa sigue siendo válido y da un impulso extra (mayor altura), pero no es necesario para lograr el salto en sí. Fuera del contexto de una rampa, el botón de salto sólo da una respuesta cosmética (p. ej. la rueda delantera se levanta levemente), nunca una esquiva real — esto evita que el salto se use como comodín para evitar todos los obstáculos sin usar los carriles ni las rampas.
- La velocidad de avance (barra de velocidad) sólo tiene efecto avanzando; retroceder usa siempre su propia velocidad fija, independiente de la barra.
- Los disparos tienen munición infinita, limitados sólo por un breve cooldown entre uno y otro (no es fuego instantáneo continuo).

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
2. Leer el terreno y anticipar obstáculos por carril, incluidos los zombis de frente (esquivar o dispararles — sección 14.1).
3. Encender el faro cuando no haya visibilidad suficiente.
4. Activar mecanismos al pasar (interruptores).
5. Atravesar la puerta antes de que se cierre.
6. Usar rampas (alineando el carril correcto) para evitar obstáculos o alcanzar el interruptor elevado.
7. Recoger batería, y opcionalmente bidones de combustible (ya no obligatorios, sólo dan un alivio extra de horda), también eligiendo el carril correcto.
8. Administrar Turbo vs. Normal para mantener o recuperar distancia respecto de la horda.
9. Retroceder tácticamente cuando reposicionarse vale más que seguir de largo.
10. Llegar al siguiente tramo.
11. Repetir con mayor presión (oscuridad creciente, carriles bloqueados con más frecuencia, horda más agresiva).

## 9. Movimiento, marchas y disparos

No hay velocidad automática fija: el jugador controla activamente si avanza, retrocede o permanece detenido, y a qué velocidad avanza.

**Barra de velocidad**: la velocidad de avance ya no se elige con una tecla de "turbo" binaria — la regula un control deslizable (slider) en el HUD, que el jugador ajusta con clic/arrastre del mouse. El slider interpola de forma **continua** entre un extremo económico ("Normal") y uno rápido ("Turbo"). Este control reemplaza a la tecla de turbo como forma principal de administrar la velocidad, y sirve también como perilla de calibración para el equipo mientras se sigue ajustando el ritmo general del juego. El combustible es ilimitado (ver sección 10), así que el slider no tiene ningún costo de recurso asociado: la única razón para no mantenerlo siempre a fondo es que, hacia el final del recorrido, la horda cierra bastante el margen (ver sección 12), así que sostener Turbo deja de ser una decisión trivial y pasa a exigir buen manejo del resto de variables (carril, obstáculos, faro).

El slider **arranca a fondo (Turbo)** al empezar la partida (y tras cada reinicio) — la partida es frenética desde el primer segundo por defecto; el jugador puede bajarlo en cualquier momento si prefiere una marcha más económica.

| Estado | Cuándo se activa | Velocidad |
|---|---|---|
| Detenida | Sin entrada de avance/retroceso | 0 |
| Avanzando | Avanzar | Interpolación continua entre el extremo Normal y el extremo Turbo de la barra de velocidad |
| Retroceso | Retroceder | Velocidad de retroceso fija, independiente de la barra de velocidad |

Reglas de diseño detrás de estos valores (mantenerlas al ajustar números):

- Un jugador que se queda quieto (Detenida) siempre debe perder terreno frente a la horda: la inacción tiene un costo.

### 9.1 Disparos

- Dos direcciones de disparo, cada una con su propia entrada: **hacia atrás** (hacia la horda) y **hacia adelante**.
- **Munición infinita** en esta fase — el único límite es un breve cooldown entre disparos consecutivos de una misma dirección (para que no sea fuego instantáneo continuo, aunque sí sostenible mientras se mantenga presionada la entrada).
- **Disparo hacia atrás**: cada disparo que conecta con la horda la frena un poco, lo que se traduce en un **alivio puntual y acotado de la distancia** (aumenta la distancia con el jugador), siguiendo el mismo patrón que los demás eventos de alivio del diseño (puzles resueltos, ítems recogidos, trampa activada — ver sección 12). No es un efecto continuo ni una nueva velocidad de la horda: es un empujón instantáneo por cada disparo, repetible mientras se siga disparando. Con el margen de Turbo tan ajustado (sección 12), este empujón debe sentirse como una **herramienta activa real** en los tramos duros, no como un bonus decorativo — lo bastante grande como para que sostener el gatillo marque una diferencia visible en la distancia, con su propia confirmación en el HUD (además del shake/sonido) para que el jugador note que cada disparo cuenta.
- **Disparo hacia adelante**: elimina a un zombi de frente (ver sección 14.1) que esté en el mismo carril y dentro de su radio de impacto, antes de que llegue a chocar. Es la alternativa activa a esquivarlo cambiando de carril o saltándolo.
- Ambos disparos deben tener una representación visual simple (p. ej. un proyectil breve que viaja en la dirección correspondiente) para dar retroalimentación clara de que la acción ocurrió.

### 9.2 Salto automático en rampas (estilo Excitebike)

El salto en las rampas debe ser **automático y confiable**, no depender de que el jugador presione nada en el momento exacto:

- Al pasar por una rampa que está en el carril actual del jugador, el salto se dispara solo, sin necesidad de presionar el botón de salto.
- Esto debe funcionar de forma robusta sin importar la velocidad de avance del jugador: el disparo del salto no puede depender de una ventana de detección tan angosta que un avance grande en un único paso de simulación pueda saltearla por completo. La forma recomendada es detectar el cruce del punto de inicio de la rampa comparando la posición del frame anterior con la actual, en vez de sólo comprobar si la posición actual cae dentro de un rango fijo.
- También debe funcionar si el jugador cambia hacia el carril de la rampa estando ya dentro del primer tramo de ésta (no sólo al llegar desde atrás en línea recta).
- El botón de salto sigue teniendo un rol opcional: presionarlo en el momento adecuado al entrar a la rampa debe otorgar un impulso mayor (más altura/alcance) que el salto automático estándar, como recompensa por buen timing — mecánica relevante sobre todo para el interruptor elevado (sección 13).

## 10. Recursos: combustible y batería

### Combustible

El combustible es **ilimitado**: no se agota y no requiere gestión por parte del jugador. Es una decisión de diseño deliberada — toda la presión del juego pasa por el carril, la velocidad elegida (barra de velocidad) y la distancia de la horda, sin superponerle un recurso adicional que administrar.

- No existe una marcha de penalización por falta de combustible ni una condición de "falla" asociada a este recurso.
- Los bidones de combustible pueden seguir apareciendo en el nivel, en posiciones planificadas e independientes del carril (ver sección 7), pero son opcionales: recogerlos da el mismo alivio puntual y acotado de distancia que cualquier otro ítem recolectado (ver sección 12) — no reponen ningún indicador ni son necesarios para completar el recorrido.
- No se muestra una barra ni indicador de combustible en el HUD, ya que no hay nada que administrar.

### Batería

Alimenta exclusivamente al faro.

- Con el faro encendido, la batería disminuye de forma constante.
- Con el faro apagado, la batería no disminuye.
- El jugador puede recoger baterías, también en posiciones planificadas y atadas a un carril.
- Con batería baja, el faro debe parpadear (ver sección 11) como aviso.
- Al llegar a cero, el faro deja de poder encenderse hasta recargar.
- Mostrar el nivel de batería mediante una barra o indicador minimalista (es el único recurso administrable, ver sección 10).

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

**Oscuridad ambiente base:** independientemente del faro, el nivel de oscuridad ambiente general debe variar a lo largo del recorrido (ver sección 15), incluyendo al menos un tramo de "oscuridad total" con parpadeo del faro forzado e inestable como parte del diseño del nivel (un túnel u obstáculo de visibilidad), no sólo como consecuencia de batería baja. La curva de progresión (más clara al inicio, más oscura en el túnel) se mantiene, pero la opacidad general del velo de oscuridad debe ser moderada — lo bastante tenue como para que el entorno de fondo y la silueta de la horda se distingan con claridad entre sí incluso con el faro apagado; que la ambientación oscura no debe volverse una pantalla casi negra que aplane toda la lectura visual.

El efecto de luz puede resolverse con cualquier técnica de máscara/oclusión/gradiente que soporte el motor elegido (máscara de oscuridad + recorte cónico, luces 2D nativas, shaders, etc.). El requisito funcional es el resultado — cono de luz direccional con caída de intensidad, oscuridad ambiente graduable, parpadeo procedural — no la técnica.

## 12. Horda

La horda es presión dinámica, no un enemigo con colisión individual.

**Modelo de distancia:** se representa mediante una única variable numérica de distancia entre el jugador y la horda (no posiciones individuales de zombis para efectos de colisión). Esa distancia:

- Tiene un valor inicial y un máximo (la distancia nunca crece de forma indefinida).
- Cambia continuamente en función de la **velocidad relativa** entre el jugador y la horda: la horda tiene su propia "velocidad de avance" (que aumenta gradualmente con el progreso en el nivel), y en cada instante la distancia crece si el jugador es más rápido que la horda, y se reduce si es más lento (incluida la marcha Detenida o el Retroceso, que cuentan como muy lentos o negativos a estos efectos).
- **Regla de diseño no negociable**: en marcha Normal la horda debe ser más rápida que el jugador (así que Normal por sí sola implica perder terreno de a poco); en Turbo el jugador debe ser más rápido que la horda (así que Turbo por sí solo implica ganar terreno). Esta relación debe mantenerse válida en *todo* el recorrido, incluidos los tramos de mayor presión — el jugador siempre debe poder confirmar, empíricamente, que acelerar aleja a la horda y no avanzar la acerca. Es aceptable que el margen se reduzca en el tramo final, incluso hasta quedar mínimo (unos pocos u/s), exigiendo buen manejo de recursos y no sólo mantener Turbo apretado — de hecho el prototipo de referencia empuja el margen deliberadamente a ese extremo para que sostener Turbo solo ya no alcance y el disparo hacia atrás (sección 9.1) pase a ser necesario, no opcional — pero el margen nunca debe invertirse ni llegar a cero de forma permanente.
- Por encima de ese modelo continuo, eventos puntuales empujan o alivian la distancia de forma **instantánea y acotada** (nunca como un multiplicador continuo que pueda espiralizar): chocar con un obstáculo, chocar con un zombi de frente no esquivado (sección 14.1), fallar la puerta a tiempo, o el equivalente conceptual de esos eventos. Del otro lado, completar un puzle, atravesar la puerta con éxito, activar la trampa ambiental, recoger un recurso (batería o un bidón de combustible opcional), eliminar un zombi de frente de un disparo, o conectar un disparo hacia atrás (sección 9.1) alivian la distancia también de forma puntual.
- Tramos guionados del nivel (ver sección 15) pueden añadir presión temporal extra (una "velocidad de horda" mayor mientras el jugador atraviesa esa zona), pero estos bonos de presión **nunca se combinan/suman entre sí** — se aplica siempre la presión más alta activa en ese momento, nunca la suma de varias. Esto es intencional: evita que una mala racha de eventos simultáneos produzca una velocidad de horda desproporcionada e injusta.
- Existe una distancia mínima de "contacto": si la distancia cae a ese umbral (muy cercano a cero — la horda debe estar prácticamente encima, no sólo "cerca"), se considera que la horda alcanzó al jugador y termina la partida en Game Over. Este umbral es la única condición de derrota del juego.

**Presentación visual:** la posición y visibilidad en pantalla de la masa de siluetas debe estar fuertemente atada a esa distancia (proximidad = 1 − distancia/distanciaMáxima):

- Con la horda lejos, debe ser prácticamente invisible / estar fuera de cuadro — no importa que "se pierda de vista"; lo único que determina el contacto es la variable de distancia, nunca lo que se ve en cámara.
- A medida que la proximidad aumenta, la masa de siluetas debe crecer en tamaño aparente, densidad/opacidad y cercanía al borde de la pantalla, hasta llegar visualmente a la rueda trasera de la motoneta cuando la distancia se acerca al umbral de contacto.
- La aparición en pantalla no tiene por qué ser lineal respecto de la proximidad real: conviene adelantarla (p. ej. con una curva que crezca más rápido a proximidades bajas/medias y se aplane cerca de 1) para que la masa se haga notar bastante antes de que la distancia sea realmente crítica — mientras el umbral de contacto (game over) siga dependiendo únicamente del valor real de distancia, nunca de esta curva de aparición.
- La horda debe leerse como una amenaza claramente distinguible del fondo — un tono cálido/rojizo bien saturado (no apenas insinuado) contra un entorno frío/azulado, con un borde de realce (rim light) sutil en cada silueta, y dibujada en una capa que quede por delante de la vegetación/elementos de fondo cercanos. Que se camufle o se pierda contra un escenario oscuro rompe la lectura de peligro — es preferible pecar de visible antes que de sutil.
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
- Aplicar una penalización puntual a la distancia respecto de la horda (ver sección 12).
- Reproducir partículas de impacto.
- Otorgar un breve período de invulnerabilidad tras el golpe (para que un mismo obstáculo o una sucesión inmediata de eventos no genere múltiples penalizaciones injustas por el mismo error).
- **Reducir la velocidad de la moto a la mitad durante unos segundos** (independiente de la barra de velocidad: afecta por igual a cualquier marcha, avanzando o retrocediendo), para que el golpe se sienta más allá del instante del impacto — pasado ese tiempo, la velocidad vuelve sola al 100% sin que el jugador tenga que hacer nada. Dado lo ajustado que puede llegar a ser el margen contra la horda (sección 12), esta penalización puede ser, por sí sola, la diferencia entre escapar y que te alcance — es intencional: un golpe debe doler de verdad, no ser sólo un susto visual.
- El obstáculo debe poder esquivarse por dos vías independientes según el diseño del tramo: cambiando a un carril libre, o saltándolo mediante una rampa alineada con su carril (cuando exista una).
- Esta misma penalización de velocidad (además de la invulnerabilidad y el empujón a la horda) se aplica también al chocar con un zombi de frente no esquivado (sección 14.1): ambos son, mecánicamente, el mismo tipo de "golpe".

### 14.1 Zombis de frente

A diferencia del resto de los obstáculos (estáticos), este es un hazard individual y móvil, atado a un carril específico, pensado para darle un uso real al disparo hacia adelante (sección 9.1):

- Cada zombi de frente aparece "dormido" en una posición fija del recorrido, en un carril puntual. Se mantiene quieto hasta que el jugador se acerca lo suficiente (una distancia de activación configurable) — recién ahí empieza a caminar.
- Una vez activado, camina hacia el jugador a **su propia velocidad**, independiente de la velocidad del jugador (por eso se acerca más rápido que un obstáculo estático: la distancia se cierra por ambos lados).
- Se resuelve de dos formas, ambas válidas:
  - **Esquivarlo**: cambiando a un carril libre, o saltándolo con una rampa alineada con su carril (igual que un obstáculo — sección 14).
  - **Dispararle** con el disparo hacia adelante (sección 9.1): lo elimina antes de que llegue a chocar, y da un pequeño alivio puntual de distancia respecto de la horda, como recompensa por resolverlo activamente en vez de esquivarlo.
- Si ni se esquiva ni se le dispara y termina chocando con el jugador, el efecto es el mismo que el de un obstáculo (sección 14): sacudida de cámara, invulnerabilidad breve, penalización puntual sobre la distancia respecto de la horda, partículas de impacto, y la moto a mitad de velocidad por unos segundos.
- Visualmente debe leerse como una amenaza clara e individual — silueta con un realce cálido (contorno/aura) más marcado que el de la masa de la horda, para que nunca se pierda contra un fondo oscuro (ver sección 2 y 12).
- Al igual que con los obstáculos, la posición de cada zombi de frente debe dejar siempre alguna otra vía de resolución (otro carril libre, o alcance para dispararle a tiempo) — nunca debe ser un bloqueo forzoso de los tres carriles.

## 15. Diseño del nivel

Nivel corto, diseñado manualmente, de entre dos y cuatro minutos de duración a ritmo de juego normal/mixto.

Orden sugerido de eventos a lo largo del recorrido:

1. Inicio relativamente seguro.
2. Primer bidón de combustible (alivio opcional de horda; el combustible ya no es un recurso que pueda agotarse).
3. Tutorial natural del cambio de carril (primer obstáculo simple, sin rampa cercana — obliga a resolverlo cambiando de carril).
4. Tutorial natural del zombi de frente (sección 14.1): primera aparición, con espacio de sobra para decidir entre esquivarlo o dispararle.
5. Entrada gradual en oscuridad.
6. Tutorial natural del faro.
7. Batería visible.
8. Rampa de práctica (alineada con un obstáculo esquivable también por carril, para mostrar que hay más de una solución).
9. Puerta con interruptor.
10. Tramo con la horda acercándose (presión guionada temporal).
11. Interruptor elevado + rampa asociada.
12. Trampa ambiental (consecuencia de lo anterior).
13. Túnel oscuro con faro inestable (con un zombi de frente propio, para que la baja visibilidad se sienta en esta decisión también).
14. Secuencia final de persecución: mayor densidad de obstáculos y zombis de frente, incluyendo momentos con dos carriles bloqueados simultáneamente (nunca los tres).
15. Llegada a un refugio o portón de salida.

Las baterías (recurso limitado) y los bidones de combustible (alivio opcional, ya no limitado) deben estar distribuidos en posiciones planificadas a lo largo de todo el recorrido, alternando carriles, de forma que recolectarlos exija cierto movimiento activo pero nunca dependa de suerte.

Mensajes contextuales breves (una línea, pocos segundos en pantalla) pueden reforzar momentos clave — p. ej. al introducir el cambio de carril, el faro, o la proximidad de la horda — pero deben ser la excepción, no un tutorial constante.

## 16. Condiciones de victoria

El prototipo debe ofrecer **dos condiciones de victoria independientes**, ambas llevando a la misma pantalla de resultado con distinto título y las mismas estadísticas:

1. **Llegada al final**: alcanzar el punto físico de salida/refugio al final del recorrido diseñado. Título: *"PROTOTIPO COMPLETADO"* (o el nombre de campaña que corresponda al proyecto final).
2. **Supervivencia por tiempo**: sobrevivir un tiempo mínimo definido (del orden de dos minutos y medio) sin ser alcanzado por la horda, independientemente de si ya se llegó al final físico del recorrido. Título: *"ESCAPASTE DE LA HORDA"*. Esta condición existe como red de contención — permite validar/demostrar la sensación de persecución sin depender de que el jugador complete todo el recorrido diseñado, y da una segunda forma legítima de "ganar" acorde al concepto (sobrevivir, no necesariamente llegar a un lugar).

Cualquiera de las dos debe mostrar, al activarse:

- Tiempo de partida transcurrido.
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

Evitar una dificultad injusta: el jugador debe poder entender siempre, con la información visible en pantalla, por qué perdió (se quedó sin batería en un mal momento, chocó — incluso una sola vez, dado lo ajustado que puede ser el margen contra la horda y la penalización de velocidad que deja un golpe (sección 14) —, no llegó a la puerta a tiempo, etc.), nunca sentir que la horda lo alcanzó "porque sí".

## 18. Interfaz (HUD)

Mostrar durante la partida, sin cubrir espacio de juego significativo:

- Batería (barra o indicador análogo). El combustible es ilimitado y no se muestra como recurso.
- Estado del faro (encendido/apagado).
- Estado de movimiento (Detenida / Avanzando / Retrocediendo), incluyendo una marca visible mientras dure la penalización de velocidad de un golpe reciente (sección 14) — el jugador debe poder ver que está "renqueando" y no sólo sentirlo por la física.
- **Barra de velocidad interactiva** (clic/arrastre con el mouse) que regula la velocidad de avance — ver sección 9. No sólo informa, también es un control.
- Carril actual, de forma clara y a simple vistazo (p. ej. un indicador de tres segmentos con el activo resaltado).
- Distancia aproximada de la horda (numérica y/o barra de proximidad).
- Indicador contextual de la acción de interactuar cuando haya un mecanismo cercano.
- Mensajes breves y transitorios ("BATERÍA BAJA", "HORDA CERCA", confirmaciones de mecanismos activados) que aparecen y desaparecen solos, sin requerir que el jugador los cierre.
- Progreso aproximado dentro del recorrido (barra fina, opcional pero recomendable).

## 19. Audio

Audio dinámico/dependiente del estado del juego, generado o sintetizado en tiempo real en la medida en que la plataforma lo permita razonablemente (no depende de archivos de audio pregrabados como requisito, aunque tampoco lo prohíbe si el motor elegido lo resuelve mejor así):

- Motor continuo, con tono/timbre que reacciona a la marcha actual (más agudo/intenso en Turbo, más grave en Normal).
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
- Todos los temporizadores de gameplay (puerta, trampas, invulnerabilidad, penalización de velocidad tras un golpe, etc.).

La pantalla sigue renderizándose (congelada) con la superposición de pausa visible; nada de gameplay debe seguir procesándose en segundo plano mientras está en pausa.

**El reinicio debe restaurar por completo:**
- Posición y carril del jugador.
- La batería (único recurso administrable) a su valor inicial.
- Distancia respecto de la horda a su valor inicial.
- Estado de todos los interruptores, la puerta, los ítems recolectables y los zombis de frente (posición, activado/dormido, vivo/eliminado).
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
- **Jugador**: recursos (batería — el combustible es ilimitado y no forma parte de su estado), marcha actual, carril actual, estado del faro, invulnerabilidad, penalización de velocidad tras un golpe (temporizador propio, independiente de la invulnerabilidad).
- **Vehículo**: física de salto/suspensión, animaciones (ruedas, vibración de motor), independiente de la lógica de recursos del jugador.
- **Horda**: variable de distancia, velocidad relativa, eventos de empuje/alivio, presentación visual.
- **Nivel**: definición de obstáculos, zombis de frente, rampas, interruptores, puerta, ítems, zonas de oscuridad, mensajes — todo con su posición en el mundo y, cuando corresponda, su carril.
- **Cámara**: seguimiento horizontal, look-ahead, temblor.
- **Iluminación**: oscuridad ambiente por progreso en el nivel, cono de faro, parpadeo.
- **Interfaz**: HUD y pantallas de estado.
- **Audio**: sonidos reactivos al estado del juego.
- **Entrada**: mapeo de controles a acciones lógicas (avanzar, retroceder, carril arriba/abajo, saltar, faro, interactuar, pausa, reintentar), desacoplado de las teclas/botones físicos concretos.
- **Entidades del nivel**: obstáculo, zombi de frente, coleccionable, interruptor (con variante elevada), puerta, rampa — como tipos de datos reutilizables con posición en el mundo, carril (o "todos los carriles"), y su propio estado de resuelto/activado/usado (el zombi de frente además con estado dormido/activado y vivo/eliminado, y una posición en el mundo que cambia con el tiempo en vez de ser fija).

Requisitos técnicos transversales, independientes del motor:

- Actualización de simulación independiente del framerate (paso de tiempo delta, no lógica atada a frames fijos).
- Colisiones simples (cajas o círculos alineados a ejes), sin necesidad de física realista ni colisión individual por zombi de la horda (la horda en sí sigue siendo una única variable de distancia, no posiciones individuales — ver sección 12). Los zombis de frente (sección 14.1) sí son entidades individuales con su propia colisión, al ser un puñado fijo por nivel y no una masa.
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
| Velocidad Normal (extremo inferior de la barra de velocidad) | 210 u/s | |
| Velocidad Turbo (extremo superior de la barra de velocidad) | 420 u/s | 2× Normal; subida desde 350 tras playtesting para un ritmo más frenético |
| Velocidad de Retroceso | 150 u/s | ≈0.71× Normal; fija, no la afecta la barra de velocidad |
| Multiplicador de velocidad tras un golpe | 0.5× | Sobre la velocidad vigente (cualquier marcha); ver "Golpe" más abajo |
| Duración de la penalización de velocidad tras un golpe | 4 s | Vuelve sola al 100% al cumplirse, sin acción del jugador |

**Golpe** (obstáculo, sección 14, o zombi de frente no esquivado, sección 14.1)

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Multiplicador de velocidad | 0.5× | Igual al de la tabla de Movimiento; se repite acá para tenerlo junto al resto de las consecuencias del golpe |
| Duración | 4 s | |
| Invulnerabilidad tras el golpe | 1.4 s | Evita penalizaciones múltiples por el mismo error o una sucesión inmediata de golpes |

**Disparos**

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Cooldown entre disparos | 0.35 s | Por dirección; con munición infinita, limita la cadencia |
| Alivio de distancia por disparo hacia atrás | 28 u | Instantáneo y acotado, mismo patrón que los demás eventos de alivio; subido desde 14 tras playtesting — con el margen de Turbo tan ajustado (ver Horda), el disparo hacia atrás pasa de ser un bonus menor a una herramienta activa: sostener el gatillo en un tramo duro debe notarse claramente en la distancia |
| Velocidad visual del proyectil | 900 u/s | Sólo afecta la presentación del disparo |
| Duración visual del proyectil | 1.1 s | Antes de desvanecerse |

**Zombis de frente** (sección 14.1)

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Velocidad de avance una vez activado | 95 u/s | Independiente de la velocidad del jugador; la distancia se cierra por ambos lados |
| Distancia de activación | 650 u | A partir de esta distancia deja de estar quieto y empieza a caminar hacia el jugador |
| Penalización puntual por choque no esquivado | 45 u | Mismo patrón que la de un obstáculo (sección 14), algo menor |
| Alivio puntual por eliminarlo de un disparo | 16 u | Recompensa por resolverlo activamente en vez de esquivarlo |
| Cantidad en el recorrido de referencia | 6 | Ver posiciones en sección 24 |

**Recursos**

El combustible es ilimitado (ver sección 10) y no tiene parámetros de consumo/umbral asociados.

| Parámetro | Valor de referencia |
|---|---|
| Cantidad de bidones de combustible en el recorrido (alivio opcional, no consumible) | 8 |
| Batería máxima | 100 |
| Consumo de batería (faro encendido) | 9 / s |
| Batería por pack recogido | 38 |
| Umbral de batería baja | 20 |

**Horda**

| Parámetro | Valor de referencia | Descripción |
|---|---|---|
| Distancia inicial | 500 u | Bajada otra vez (900 → 600 → 500) tras sucesivos playtestings: la horda debe estar prácticamente siempre encima del jugador, no sólo cerca al arrancar |
| Distancia máxima | 1050 u (decreciente con el progreso, hasta −260 al final) | Techo que se reduce con el avance en el nivel; sin tocar — sigue dando margen para que el buen uso de Turbo aleje a la horda de verdad |
| Distancia de contacto (derrota) | 8 u | Debe estar prácticamente encima del jugador |
| Velocidad base de la horda | 370 u/s | Mayor que Normal (210), menor que Turbo (420). Subida fuerte tras playtesting (no un ajuste chico): con el valor anterior (325) alcanzaba con sostener Turbo para dejar a la horda atrás casi sin sobresaltos durante buena parte del recorrido. Con 370, el margen de Turbo ya es ajustado desde el arranque (≈50 u/s), no recién cerca del final |
| Incremento de velocidad base por progreso | +45 u/s (gradual, 0→100% del nivel) | Más chico que antes porque la base ya viene alta y no puede superar a Turbo; con esto la horda llega a 415 u/s hacia el final, dejando un margen mínimo pero siempre positivo frente a Turbo (420) |
| Presión extra en zona de acercamiento guionada | +20 u/s | No se suma a otras presiones — reemplaza |
| Presión extra en persecución final | +6 u/s | No se suma a otras presiones — reemplaza; chico en términos absolutos porque a esa altura la base+rampa ya casi igualan a Turbo — el margen que queda (~3 u/s en el punto más ajustado) es intencionalmente mínimo: sostener Turbo solo ya no alcanza, hace falta ir limpio con los obstáculos y usar el disparo hacia atrás como herramienta activa |
| Frenado de la horda al activar la trampa ambiental | −200 u/s durante ≈6 s | |
| Penalización puntual por choque con obstáculo | 70 u | |
| Penalización continua por quedar bloqueado en la puerta | 45 u cada ≈0.6 s mientras dure | |
| Alivio por activar el interruptor de la puerta (primera vez) | 60 u | |
| Alivio por atravesar la puerta exitosamente | 90 u | |
| Alivio por activar la trampa ambiental | 130 u | |
| Alivio por recoger un ítem | 12 u | |
| Alivio por disparo hacia atrás | 28 u | Ver tabla de Disparos; repetible, limitado por el cooldown |

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
| Gravedad | 1300 u/s² |
| Potencia de salto estándar (rampa) | 620 u/s iniciales |
| Potencia de salto con impulso (rampa + salto bien cronometrado) | 880 u/s iniciales |
| Altura mínima para considerar "esquivado por altura" un obstáculo | 46 u |

Valores subidos respecto del original (gravedad 1550, potencias 560/780): el salto se sentía corto. Al bajar la gravedad y subir la potencia crece tanto la altura como el tiempo en el aire — y como el avance horizontal durante el salto es simplemente la velocidad de avance vigente multiplicada por ese tiempo en el aire (no hay un impulso horizontal propio del salto), más hang-time también significa cubrir más distancia hacia adelante en el mismo arco.

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

**Combustible** (8 bidones — heredados del diseño original; ya no son necesarios para completar el recorrido, sólo dan el alivio de horda estándar de cualquier ítem recolectado, ver sección 12): 0.04 · 0.28 · 0.335 · 0.50 · 0.63 · 0.70 · 0.815 · 0.90.

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
| 0.485 | Pozo | 2 |
| 0.50 | Vehículo | 1 |
| 0.53 | Barrera | 2 |
| 0.545 | Barrera | 0 |
| 0.56 | Tronco | 1 |
| 0.605 | Escombros | 2 |
| 0.615 | Escombros | 1 |
| 0.65 | Escombros | 0 |
| 0.68 | Tronco | 2 |
| 0.70 | Tronco | 0 |
| 0.735 | Barrera | 1 |
| 0.76 | Vehículo | 0 |
| 0.76 | Barrera | 2 *(doble bloqueo: sólo el carril 1 queda libre)* |
| 0.78 | Barrera | 1 |
| 0.80 | Escombros | 2 |
| 0.83 | Tronco | 0 |
| 0.83 | Escombros | 1 *(doble bloqueo: sólo el carril 2 queda libre)* |
| 0.86 | Vehículo | 1 |
| 0.89 | Barrera | 0 |
| 0.905 | Vehículo | 1 |
| 0.93 | Escombros | 0 |
| 0.96 | Vehículo | 2 |

Densidad subida en dos pasadas respecto del diseño original (16 → 23 → 28 obstáculos) tras sucesivos playtestings: el juego se seguía sintiendo demasiado fácil, así que además de llenar el tramo entre la rampa del interruptor elevado (0.46) y la persecución final (0.75) se agregó un obstáculo más justo antes del portón de salida (0.96). En cada posición nueva se verificó que siga quedando al menos un carril libre y que no coincida carril y posición con un zombi de frente (sección 14.1) ya existente.

**Zombis de frente** (posición, carril — ver sección 14.1; cada uno cae en un punto donde los obstáculos de la tabla anterior no ocupan ya ese mismo carril, para que siempre quede una vía de esquive además de dispararle): 0.27 (0) · 0.44 (2) · 0.60 (1) · 0.72 (0) · 0.795 (0) · 0.87 (2).

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
- Existe una horda visible y amenazante, cuya distancia responde de forma consistente y verificable a la velocidad relativa del jugador (el extremo Normal de la barra de velocidad acerca a la horda, el extremo Turbo la aleja, en todo el recorrido).
- La horda puede alcanzar al jugador y terminar la partida.
- El faro puede encenderse y apagarse, y consume batería sólo mientras está encendido.
- El combustible es ilimitado (no se agota bajo ningún uso); se puede recolectar batería, y opcionalmente bidones de combustible como alivio extra, sin importar el carril (ver sección 7).
- Existe al menos una puerta con interruptor que bloquea los tres carriles, con reintento posible sin quedar atrapado.
- Existe al menos una rampa funcional atada a un carril, con salto **automático** al pasar por ella (no depende de presionar nada), confiable sin importar la velocidad de avance.
- Existe al menos un interruptor elevado atado a un carril, alcanzable de forma consistente.
- Los obstáculos están distribuidos por carril, siempre dejando al menos uno libre en cada posición.
- Un golpe (obstáculo o zombi de frente no esquivado) reduce la velocidad de la moto a la mitad durante unos segundos, y se recupera sola al 100% sin acción del jugador; se ve reflejado en el HUD mientras dura.
- Existen zombis de frente (sección 14.1): aparecen quietos, caminan hacia el jugador al activarse, y se resuelven esquivándolos (carril o salto) o eliminándolos con el disparo hacia adelante; un choque no esquivado penaliza igual que un obstáculo.
- El jugador puede disparar hacia atrás y hacia adelante con munición infinita (limitada por cooldown); disparar hacia atrás alivia la distancia respecto de la horda; disparar hacia adelante elimina zombis de frente.
- La velocidad de avance se regula con la barra de velocidad del HUD (clic/arrastre con el mouse), de forma continua entre sus dos extremos.
- Hay Game Over cuando la horda alcanza al jugador.
- Hay victoria al llegar al final físico del recorrido, y una segunda forma de victoria por tiempo de supervivencia.
- Se puede reiniciar la partida por completo, sin arrastrar estado de la partida anterior.
- La pausa detiene absolutamente todo el gameplay (movimiento, consumo, temporizadores, animaciones).
- No hay errores en tiempo de ejecución bajo uso normal.

## 26. Prioridades de implementación

1. Gameplay funcional (avance/retroceso, carriles, colisión por carril).
2. Sensación de persecución (modelo de distancia de la horda respondiendo de forma clara a las decisiones del jugador).
3. Faro y oscuridad.
4. Claridad de obstáculos, zombis de frente y puzles (incluida la legibilidad de qué carril está bloqueado).
5. Administración de recursos (batería, marchas) — el combustible es ilimitado.
6. Presentación visual (vista de carriles, parallax, silueta de la horda).
7. Audio y efectos adicionales.

Si alguna característica resulta demasiado compleja para una plataforma o motor en particular, simplificarla sin eliminar el ciclo principal ni la regla central de la sección 12 (acelerar aleja a la horda, no avanzar la acerca).
