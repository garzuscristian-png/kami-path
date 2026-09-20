# Colisiones, cultivo y escenarios

Basado en `0b56e4d` de `garzuscristian-png/kami-path`. Conserva el combate, inventario, refugio y cooperativo existentes.

## Cambios

- Los edificios, árboles y rocas comparten posiciones, dimensiones y rotación con sus colisionadores. El jugador y los zombis usan la misma resolución. El movimiento se subdivide para evitar atravesar barricadas al correr o recibir retroceso.
- La costa tiene casas dispersas; el bosque, árboles densos; la ciudad, bloques de edificios separados por calles; el campo, parcelas y casas; las montañas y el volcán, formaciones rocosas; la nieve, coníferas y ondulaciones. También cambia la función de altura por bioma y semilla.
- La semilla del nodo reproduce el mismo escenario al regresar. No se cambia automáticamente por visita para mantener compatibilidad con las coordenadas del modo cooperativo.
- El centro reservado para la casa y el huerto permanece fijo. El nivel del refugio y el huerto se guardan en este navegador; no hay sincronización de cultivos entre jugadores o dispositivos.
- Cuatro bancales junto a casa: abrir **Huerto de casa**, acercarse, sembrar y regar. Tras 90 segundos activos, cosechar 3 alimentos y 2 semillas. La cosecha tiene una despensa propia y puede comerse desde el panel para recuperar 20 de salud.
- Los cultivos no crecen sin agua, con el juego pausado o con la pestaña oculta. Esta primera versión tiene regadera ilimitada.
- Radar y mapa reciben los elementos generados. Los recursos y enemigos no se colocan dentro de edificios. Los clics de interfaz no atacan ni permiten recoger objetos lejanos.
- La iluminación del escenario ahora responde al estado de noche existente.

## Ejecución y comprobaciones

Usar las instrucciones de instalación del README y `npm run dev`. Para las pruebas nuevas se requiere Node 22.18+ o Node 24:

```sh
node --test tests/survival.test.mjs
npm run build
```

Las pruebas cubren semillas, diferencias entre biomas, terreno fijo de casa, penetración central, barricadas delgadas, deslizamiento lateral, riego, crecimiento, cosecha y restauración del guardado.

## Límites de esta entrega

Modelos geométricos provisionales. Colisión horizontal; no es un motor físico 3D completo ni navegación inteligente alrededor de edificios. La casa sigue siendo un edificio sólido, con interacción desde fuera. Los marcadores del mapa representan terreno, no detección real de enemigos. El cooperativo existente no sincroniza cultivos. El chequeo estricto de TypeScript del proyecto original tiene errores previos en callbacks opcionales y partículas; la compilación de producción sí pasa. La prueba visual en navegador quedó bloqueada por el acceso al servidor local del entorno; no se certifican FPS ni aspecto visual.
