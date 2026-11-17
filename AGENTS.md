# Repository guidance

- This is a dependency-free vanilla browser game. The entry point is `src/index.html`; open it directly in a browser (or serve `src/` as static files). No build, test, lint, or package scripts are configured.
- The classic scripts in `src/index.html` share globals and must stay ordered: `maze.js` → `game.js` → `render.js` → `main.js`. Keep that order if changing script tags.
- `src/js/maze.js` defines the pristine 28×31 `MAZE` (tile values: 0 empty, 1 wall, 2 dot, 3 gate). `createGame()` clones it into mutable `game.grid`; consume dots there, not in `MAZE`.
- Responsibilities: `game.js` owns state and rules, `render.js` draws the canvas, and `main.js` handles input, the animation loop, and overlays. The board uses 20px tiles (560×620 canvas); update the canvas and CSS wrapper dimensions together if changing the maze geometry.
- There is no automated test suite. Verify gameplay in a browser: start a game, move with the arrow keys, and check the win/loss overlay and restart flow when changing game logic.
