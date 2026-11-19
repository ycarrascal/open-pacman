# SPEC 01 — Conductas de cuatro fantasmas

> **Estado:** Implementado
> **Depende de:** Ninguna
> **Fecha:** 2026-11-18
> **Objetivo:** Añadir cuatro fantasmas con conductas de persecución distintas, incluyendo uno que persigue agresivamente a Pac-Man por la ruta más corta.

## Alcance

**Incluye:**

- Añadir cuatro fantasmas con identidades por color: rojo, celeste, rosa y naranja.
- Asignarles conductas diferentes basadas en las personalidades clásicas simplificadas.
- Iniciarlos en cuatro casillas distintas de la casa central y conservar esas posiciones al reiniciar tras perder una vida.
- Calcular rutas válidas más cortas respetando paredes, puerta de la casa y túnel lateral.
- Mantener la velocidad, colisiones y reglas de vidas actuales.

**Fuera de alcance:**

- Modos globales temporizados de persecución y dispersión del arcade original.
- Power pellets, estado asustado o captura de fantasmas.
- Cambios de formas, animaciones o efectos visuales de los fantasmas.
- Persistencia de estados o preferencias entre sesiones.

## Modelo de datos

Se amplía la configuración existente `GHOST_STARTS` en `src/js/maze.js`. Los fantasmas se enumeran en el mismo orden que los colores de renderizado existentes: rojo, celeste, rosa y naranja.

```js
const GHOST_STARTS = [
  { x: 12, y: 14, kind: 'hunter' },
  { x: 13, y: 14, kind: 'vector' },
  { x: 14, y: 14, kind: 'ambusher' },
  { x: 15, y: 14, kind: 'shy' },
];
```

`createGame()` conserva en cada entrada de `game.ghosts` las propiedades existentes `x`, `y`, `dir`, `speed` y `kind`. Los objetivos de persecución se calculan durante la partida y no se guardan entre sesiones.

## Plan de implementación

1. Ampliar `GHOST_STARTS` a cuatro posiciones transitables distintas dentro de la casa y verificar que la creación de partida, el renderizado y el reinicio siguen funcionando con cuatro fantasmas.
2. Añadir en `src/js/game.js` el cálculo de rutas más cortas sobre las conexiones transitables para fantasmas. Incluir el paso por el túnel como conexión entre sus extremos y permitir el cruce de la puerta; conservar las paredes como bloqueos. Aplicar la persecución directa al fantasma rojo, manteniendo `GHOST_SPEED`.
3. Incorporar las estrategias celeste, rosa y naranja en las decisiones de movimiento de los fantasmas. Resolver los objetivos proyectados que caigan en paredes o fuera del laberinto usando la casilla transitable más cercana, y comprobar que los reinicios de posición conservan la identidad y conducta de cada fantasma.

## Criterios de aceptación

- [x] Al iniciar una partida aparecen exactamente cuatro fantasmas, diferenciados por los colores rojo, celeste, rosa y naranja.
- [x] Los fantasmas comienzan en las posiciones `(12,14)`, `(13,14)`, `(14,14)` y `(15,14)`, respectivamente.
- [x] El rojo selecciona una ruta válida más corta hacia la posición de Pac-Man y mantiene la velocidad actual de los fantasmas.
- [x] El rosa calcula su objetivo cuatro casillas delante de la dirección actual de Pac-Man.
- [x] El celeste calcula su objetivo reflejando y duplicando el vector desde la posición del rojo hasta un punto dos casillas delante de Pac-Man.
- [x] El naranja persigue a Pac-Man si la distancia de ruta más corta es mayor que ocho casillas; con una distancia de ocho o menos, se dirige a la casilla transitable inferior izquierda `(1,29)`.
- [x] Si un objetivo calculado cae en una pared o fuera del laberinto, el fantasma se dirige a la casilla transitable más cercana a ese objetivo.
- [x] Las rutas no atraviesan paredes, permiten cruzar la puerta de la casa y consideran el túnel como conexión entre ambos extremos.
- [x] Al colisionar con un fantasma, se pierde una vida y se reinician las posiciones y direcciones de Pac-Man y los cuatro fantasmas según las reglas actuales.
- [x] La partida puede iniciarse, perderse y reiniciarse en el navegador sin errores en la consola.

## Decisiones

- **Sí:** Usar personalidades clásicas simplificadas y recalcular objetivos durante el movimiento. Esto diferencia los fantasmas sin introducir los modos globales temporizados del arcade original.
- **Sí:** Reutilizar los cuatro colores existentes y la apariencia actual. El cambio requerido es de cantidad y conducta.
- **Sí:** Usar rutas más cortas por el laberinto en lugar de la heurística Manhattan actual para la persecución directa.
- **Sí:** Colocar los cuatro fantasmas en las casillas confirmadas de la casa central y conservar las reglas actuales de vidas y colisiones.
- **No:** Añadir power pellets, estado asustado o cambios visuales. No forman parte de las conductas solicitadas.
- **No:** Guardar datos de los fantasmas entre partidas. Sus posiciones y objetivos son estado temporal de la partida.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Los objetivos proyectados de los fantasmas pueden caer en paredes o fuera del tablero. | Sustituirlos por la casilla transitable más cercana antes de calcular la ruta. |
| El túnel o la puerta podrían tratarse de manera distinta entre movimiento y búsqueda de rutas. | Compartir las reglas de transitabilidad del movimiento actual y verificarlas en ambos extremos del túnel y en la puerta. |

## Qué **no** incluye esta spec

- Modos clásicos temporizados de persecución y dispersión.
- Power pellets, fantasmas asustados o captura de fantasmas.
- Nuevos sprites, formas o animaciones.
- Guardado o persistencia del estado de los fantasmas.
