Actúa como un desarrollador senior de videojuegos web especializado en JavaScript, HTML5 Canvas, diseño de gameplay y prototipado rápido.

Crea un prototipo jugable de un videojuego 2D horizontal de supervivencia y persecución. El resultado debe funcionar directamente en un navegador moderno.

## ENTREGA

Genera un único archivo llamado `index.html` que incluya:

- HTML
- CSS
- JavaScript
- Toda la lógica del juego
- Todos los elementos visuales generados mediante Canvas, CSS o figuras geométricas

No utilices frameworks, librerías externas, imágenes externas, fuentes externas, servidores ni procesos de compilación.

El archivo debe poder ejecutarse simplemente abriéndolo en un navegador.

## CONCEPTO

El jugador conduce una motoneta vintage por una carretera posapocalíptica mientras una horda de zombis lo persigue desde el lado izquierdo.

El jugador nunca puede bajarse de la motoneta.

La velocidad horizontal es constante. El desafío no consiste en acelerar o frenar, sino en:

- Anticipar obstáculos
- Activar mecanismos al pasar
- Encender y apagar el faro
- Administrar batería y combustible
- Tomar rampas correctamente
- Recoger recursos
- Evitar que la horda alcance al jugador

El prototipo debe transmitir:

- Presión constante
- Vulnerabilidad
- Incertidumbre
- Oscuridad
- Sensación de persecución
- Supervivencia improvisada

## DIRECCIÓN VISUAL

Usa una estética de horror cinematográfico 2D lateral inspirada en los juegos de supervivencia posapocalípticos de siluetas, sin copiar personajes, escenarios, interfaces ni recursos visuales de ningún videojuego existente.

Características visuales:

- Paleta desaturada
- Negros, grises y azul oscuro
- Luces cálidas en amarillo y naranja
- Personajes en silueta
- Fondos con niebla
- Carretera rural o industrial abandonada
- Árboles, postes, alambrados y edificios destruidos
- Varias capas de parallax
- Horda representada como una masa de siluetas
- Ligero movimiento de cámara
- Polvo generado por la motoneta
- Vibración visual del motor
- Viñeta oscura en los bordes
- Interfaz minimalista

Los recursos provisionales deben ser figuras geométricas simples pero claramente reconocibles.

La motoneta puede construirse con:

- Dos círculos para las ruedas
- Cuerpo rectangular o trapezoidal
- Faro circular
- Conductor en silueta
- Suspensión animada

Los zombis pueden construirse con:

- Cabezas circulares
- Cuerpos irregulares
- Brazos extendidos
- Diferentes escalas y velocidades de animación

## ESTRUCTURA GENERAL

El prototipo debe tener los siguientes estados:

1. Menú principal
2. Pantalla breve de instrucciones
3. Partida
4. Pausa
5. Game Over
6. Victoria o final del prototipo

## MENÚ PRINCIPAL

Mostrar:

- Título provisional: “LAST LIGHT”
- Subtítulo: “No te detengas”
- Botón “INICIAR NUEVO JUEGO”
- Botón “INSTRUCCIONES”
- Botón para activar o desactivar sonido, aunque el sonido sea generado proceduralmente
- Fondo animado con la motoneta avanzando y siluetas de la horda

El botón de inicio debe comenzar inmediatamente una nueva partida.

## CONTROLES

Implementar controles de teclado:

- W, flecha arriba o Espacio: tomar una rampa, levantar ligeramente la rueda delantera o ejecutar la acción de salto cuando corresponda
- F: encender o apagar el faro
- E: acción contextual para activar mecanismos cercanos
- Escape o P: pausar
- R: reiniciar después de perder

La motoneta avanza automáticamente.

Diseñar el código para que posteriormente sea sencillo implementar dos velocidades, mínima y máxima, pero no agregar controles de velocidad en esta versión.

## CÁMARA

- Cámara lateral
- El jugador se mantiene aproximadamente en el tercio izquierdo o central de la pantalla
- El escenario se desplaza hacia la izquierda
- Pequeña anticipación visual hacia la derecha
- Temblor suave cuando la horda se acerca
- Temblor más fuerte en impactos o aterrizajes
- Parallax en al menos tres capas

## CORE LOOP

El ciclo principal debe ser:

1. Avanzar automáticamente
2. Leer el terreno y detectar obstáculos
3. Encender el faro cuando no haya visibilidad
4. Activar botones o mecanismos al pasar
5. Atravesar una puerta antes de que se cierre
6. Usar rampas para evitar obstáculos o alcanzar interruptores
7. Recoger batería y combustible
8. Mantener distancia respecto de la horda
9. Llegar al siguiente tramo
10. Repetir con mayor presión

## RECURSOS

### Combustible

- Disminuye lentamente de forma constante
- Cuando llega a cero, la motoneta falla
- Al fallar, pierde distancia respecto de la horda
- El jugador puede recoger bidones de combustible
- Los bidones deben aparecer en posiciones planificadas, no completamente aleatorias
- Mostrar combustible mediante una barra o aguja minimalista

### Batería

La batería alimenta el faro.

- Con el faro encendido, la batería disminuye
- Con el faro apagado, la batería no disminuye
- El jugador puede recoger baterías
- Con batería baja, el faro debe parpadear
- Al llegar a cero, el faro deja de funcionar
- Mostrar batería mediante una barra o indicador minimalista

## FARO

El faro debe ser una mecánica central.

Cuando está encendido:

- Proyecta un cono de luz delante de la motoneta
- Permite ver rampas, obstáculos, interruptores e ítems
- Consume batería
- Mejora ligeramente el contraste del escenario cercano

Cuando está apagado:

- El escenario se vuelve mucho más oscuro
- Los obstáculos solo son visibles al estar muy cerca
- Los objetos lejanos se representan como siluetas ambiguas
- La batería se conserva

El efecto de luz puede implementarse con Canvas usando:

- Máscara oscura semitransparente
- Gradiente radial o cónico
- Operaciones de composición
- Parpadeo procedural

Debe seguir siendo posible jugar con figuras simples.

## HORDA

La horda funciona como una presión dinámica.

- Aparece desde el borde izquierdo
- Se representa mediante numerosas siluetas superpuestas
- No necesita colisiones individuales
- Utilizar una variable numérica de distancia entre el jugador y la horda
- Resolver visualmente la posición de la horda a partir de esa distancia

La horda se acerca cuando:

- El jugador choca
- Se queda sin combustible
- Falla un salto
- No abre una puerta a tiempo
- Pierde tiempo frente a un obstáculo

La horda se aleja ligeramente cuando:

- El jugador completa correctamente un puzle
- Atraviesa una puerta
- Usa una trampa del entorno
- Recoge un recurso importante

Cuando la distancia sea crítica:

- Aumentar el temblor de cámara
- Incrementar los sonidos
- Mostrar manos o siluetas cerca de la rueda trasera
- Aplicar un ligero tono rojo en los bordes
- Intensificar la música o pulso procedural

Si la horda alcanza al jugador, activar Game Over.

## PUZLE PRINCIPAL

Implementar un puzle sencillo de puerta temporizada:

1. El jugador se aproxima a una instalación oscura.
2. Una gran puerta bloquea la carretera.
3. Antes de la puerta hay un interruptor.
4. El interruptor puede activarse pulsando E al estar dentro de su zona.
5. También puede existir una variante que se active al pasar por encima.
6. Al activarlo, la puerta comienza a abrirse.
7. La puerta permanece abierta durante pocos segundos.
8. El jugador debe atravesarla antes de que vuelva a cerrarse.
9. Si el jugador falla, recibe una penalización y la horda se acerca.
10. Debe existir una forma clara y rápida de reintentar sin bajarse de la moto.

Comunicar visualmente el estado mediante:

- Luz roja: puerta bloqueada
- Luz amarilla: mecanismo activándose
- Luz verde: paso habilitado
- Parpadeo: la puerta está a punto de cerrarse

No mostrar largos textos explicativos durante la partida.

## SEGUNDO MICROPUZLE

Implementar un interruptor elevado:

- El interruptor se encuentra sobre una estructura
- Hay una rampa antes del interruptor
- El jugador debe pulsar el control de acción o salto en el momento adecuado
- La motoneta salta
- El jugador golpea o atraviesa el interruptor
- El mecanismo activa una trampa que retrasa a la horda

La trampa puede ser:

- Una valla que cae
- Un contenedor que bloquea el camino
- Una explosión abstracta
- Una compuerta que separa temporalmente a la horda

## OBSTÁCULOS

Agregar obstáculos sencillos:

- Vehículos abandonados
- Pozos
- Barreras
- Escombros
- Troncos
- Puertas
- Pendientes
- Zonas de oscuridad total

Los impactos no deben detener completamente la partida. Deben:

- Sacudir la cámara
- Reducir combustible o integridad
- Acercar a la horda
- Reproducir partículas
- Dar un breve período de invulnerabilidad

## GENERACIÓN DEL NIVEL

Crear un nivel corto y diseñado manualmente de entre dos y cuatro minutos.

Orden sugerido:

1. Inicio relativamente seguro
2. Primer bidón de combustible
3. Entrada gradual en oscuridad
4. Tutorial natural del faro
5. Batería visible
6. Primer obstáculo simple
7. Rampa de práctica
8. Puerta con interruptor
9. Tramo con la horda acercándose
10. Interruptor elevado
11. Trampa ambiental
12. Túnel oscuro con faro inestable
13. Secuencia final de persecución
14. Llegada a un refugio o portón de salida

Al alcanzar el final, mostrar una pantalla indicando:

- “PROTOTIPO COMPLETADO”
- Tiempo de partida
- Combustible restante
- Batería restante
- Botón “JUGAR DE NUEVO”
- Botón “VOLVER AL MENÚ”

## DIFICULTAD

La dificultad debe aumentar gradualmente:

- Mayor oscuridad
- Menor margen para las puertas
- Recursos ligeramente más separados
- Obstáculos que exigen anticipación
- Horda más cercana durante el final

Evitar una dificultad injusta. El jugador debe comprender por qué perdió.

## INTERFAZ

Mostrar durante la partida:

- Combustible
- Batería
- Distancia aproximada de la horda
- Estado del faro
- Indicador contextual de E cuando haya un mecanismo cercano
- Mensajes breves como “BATERÍA BAJA” o “HORDA CERCA”

No cubrir demasiado espacio de juego.

## AUDIO PROCEDURAL

Si es posible, usar Web Audio API para generar sonidos simples:

- Motor continuo
- Cambio en el motor al recibir daño
- Interruptor
- Puerta metálica
- Recogida de objetos
- Alerta de batería
- Murmullo grave de la horda
- Golpe al aterrizar

El audio debe comenzar únicamente después de una interacción del usuario.

Agregar un botón para silenciarlo.

## PAUSA Y REINICIO

La pausa debe detener:

- Movimiento
- Consumo de recursos
- Animaciones de gameplay
- Progreso de la horda

El reinicio debe restaurar completamente:

- Posición
- Recursos
- Distancia de la horda
- Estado de interruptores
- Puertas
- Ítems
- Temporizadores

## ADAPTACIÓN DE PANTALLA

- Usar Canvas responsivo
- Mantener relación aproximada de 16:9
- Ajustarse a diferentes tamaños de ventana
- Mostrar un mensaje si la pantalla es demasiado pequeña
- Evitar scroll accidental
- Permitir pantalla completa si es sencillo implementarlo

## CALIDAD DEL CÓDIGO

Organizar el JavaScript en sistemas o clases claramente separadas:

- Game
- Player
- Scooter
- Horde
- Level
- Camera
- Lighting
- UI
- AudioManager
- InputManager
- Entity
- Obstacle
- Collectible
- Switch
- Door
- Ramp

Incluir comentarios claros.

Usar:

- requestAnimationFrame
- Delta time
- Máquina de estados
- Colisiones simples AABB o círculos
- Limpieza correcta de eventos y temporizadores

Evitar variables globales innecesarias.

## PARÁMETROS AJUSTABLES

Crear al inicio del JavaScript un objeto `CONFIG` con valores fácilmente modificables:

- Velocidad constante
- Consumo de combustible
- Consumo de batería
- Distancia inicial de la horda
- Velocidad de acercamiento
- Duración de puertas
- Intensidad del faro
- Longitud del cono de luz
- Gravedad
- Potencia de salto
- Intensidad del temblor
- Volumen general

## CRITERIOS DE ACEPTACIÓN

El prototipo estará completo si:

- El menú funciona
- “Iniciar nuevo juego” comienza una partida
- La motoneta avanza automáticamente
- La cámara sigue al jugador
- Existe una horda visible y amenazante
- La horda puede alcanzar al jugador
- El faro puede encenderse y apagarse
- El faro consume batería
- El combustible disminuye
- Se pueden recoger combustible y baterías
- Existe al menos una puerta con interruptor
- Existe al menos una rampa funcional
- Existe al menos un interruptor elevado
- Hay Game Over
- Hay final del prototipo
- Se puede reiniciar
- No hay errores visibles en la consola
- Todo funciona sin recursos externos

## PRIORIDADES

Prioriza en este orden:

1. Gameplay funcional
2. Sensación de persecución
3. Faro y oscuridad
4. Claridad de obstáculos y puzles
5. Administración de recursos
6. Presentación visual
7. Audio y efectos adicionales

Si alguna característica resulta demasiado compleja, simplifícala sin eliminar el ciclo principal.

Entrega únicamente el contenido completo y funcional de `index.html`.
No entregues pseudocódigo, explicaciones separadas ni archivos incompletos.