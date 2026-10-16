# La casa está en orden

Juego de organización con seis habitaciones, 43 objetos y tres lugares en el canasto. La mayoría de los objetos pertenecen a otro ambiente. El motor está en `house-model.js`, los gráficos SVG en `house-art.js` y la interfaz en `house.js` y `house.css`.

Hay cadenas finitas: levantar el almohadón revela una media; el pantalón oculta la otra; la campera tapa la llave de la alacena. El paño permite limpiar tres pasadas por rincón. El lavarropas recibe la ropa usada y el par de medias, y después entrega tres prendas limpias para guardar. La primera inspección exitosa revela seis objetos finales, uno en cada ambiente; después de guardarlos, la segunda inspección termina la partida.

Nunca se generan tareas infinitas. Se puede dejar lo que se lleva en el piso de cualquier habitación y volver a buscarlo, para que el límite del canasto no bloquee la solución. Los objetos que estaban tapados aparecen donde se levantó el objeto que los escondía.

«Llorar un rato» está dentro del baño. Es una pausa voluntaria, no borra objetos, detiene el reloj y el lavado y recupera hasta 30 puntos de paciencia. La partida se guarda en el dispositivo. El final ofrece «Jugar de nuevo».

Pruebas: `node tests/house.cjs` verifica una solución completa, inventario, bloqueo de alacena, medias, limpieza, baño y guardado. `node tests/gameplay.cjs` verifica los juegos anteriores. En Wyleman, `scripts/qa/qa-house-browser.mjs` recorre la partida completa con controles reales y valida una pantalla táctil de 390 px.
