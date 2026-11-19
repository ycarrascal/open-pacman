// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const GHOST_RELEASE_INTERVAL = 1500;

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g, i ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      released: i === 0,
    } ) ),
    ghostRelease: {
      nextIndex: 1,
      nextAt: null,
    },
  };
}

function resetGhostRelease( game, startTime ) {
  game.ghosts.forEach( ( g, i ) => {
    g.released = i === 0;
  } );
  game.ghostRelease = {
    nextIndex: 1,
    nextAt: startTime + GHOST_RELEASE_INTERVAL,
  };
}

function updateGhostRelease( game, timestamp ) {
  const release = game.ghostRelease;
  if ( release.nextIndex >= game.ghosts.length ) return;

  // La primera actualización de una partida establece el origen del reloj.
  if ( release.nextAt === null ) {
    release.nextAt = timestamp + GHOST_RELEASE_INTERVAL;
    return;
  }
  if ( timestamp < release.nextAt ) return;

  // Liberar solo uno por actualización. El siguiente intervalo comienza
  // desde la salida efectiva, aunque el navegador haya retrasado un frame.
  game.ghosts[ release.nextIndex ].released = true;
  release.nextIndex++;
  release.nextAt = timestamp + GHOST_RELEASE_INTERVAL;
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function ghostNeighbors( grid, x, y ) {
  const width = grid[ 0 ].length;
  const neighbors = [];

  for ( const [ dir, delta ] of Object.entries( DIRS ) ) {
    if ( !canMove( grid, x, y, dir, 'ghost' ) ) continue;

    let nx = x + delta.x;
    const ny = y + delta.y;
    if ( ny === TUNNEL_ROW ) {
      if ( nx < 0 ) nx = width - 1;
      else if ( nx >= width ) nx = 0;
    }
    neighbors.push( { x: nx, y: ny, dir } );
  }

  return neighbors;
}

function shortestGhostRoute( grid, start, target ) {
  const startX = Math.round( start.x );
  const startY = Math.round( start.y );
  const targetX = Math.round( target.x );
  const targetY = Math.round( target.y );
  const startKey = startX + ',' + startY;
  const visited = new Set( [ startKey ] );
  const queue = [ {
    x: startX,
    y: startY,
    distance: 0,
    firstDir: null,
  } ];

  for ( let head = 0; head < queue.length; head++ ) {
    const current = queue[ head ];
    if ( current.x === targetX && current.y === targetY ) {
      return { direction: current.firstDir, distance: current.distance };
    }

    for ( const next of ghostNeighbors( grid, current.x, current.y ) ) {
      const key = next.x + ',' + next.y;
      if ( visited.has( key ) ) continue;
      visited.add( key );
      queue.push( {
        x: next.x,
        y: next.y,
        distance: current.distance + 1,
        firstDir: current.firstDir || next.dir,
      } );
    }
  }

  return null;
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function projectedPacmanTarget( pacman, distance ) {
  const direction = DIRS[ pacman.dir ] || { x: 0, y: 0 };
  return {
    x: Math.round( pacman.x ) + direction.x * distance,
    y: Math.round( pacman.y ) + direction.y * distance,
  };
}

function resolveGhostTarget( grid, target ) {
  const targetX = Math.round( target.x );
  const targetY = Math.round( target.y );
  if ( !isWall( grid, targetX, targetY, 'ghost' ) ) {
    return { x: targetX, y: targetY };
  }

  let nearest = null;
  let nearestDistance = Infinity;
  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[ 0 ].length; x++ ) {
      if ( isWall( grid, x, y, 'ghost' ) ) continue;
      const distance = Math.abs( x - targetX ) + Math.abs( y - targetY );
      if ( distance < nearestDistance ) {
        nearest = { x, y };
        nearestDistance = distance;
      }
    }
  }

  return nearest;
}

function getGhostTarget( game, g ) {
  const pacmanTarget = { x: Math.round( game.pacman.x ), y: Math.round( game.pacman.y ) };

  if ( g.kind === 'ambusher' ) {
    return projectedPacmanTarget( game.pacman, 4 );
  }

  if ( g.kind === 'vector' ) {
    const ahead = projectedPacmanTarget( game.pacman, 2 );
    const red = game.ghosts[ 0 ];
    return {
      x: ahead.x * 2 - Math.round( red.x ),
      y: ahead.y * 2 - Math.round( red.y ),
    };
  }

  if ( g.kind === 'shy' ) {
    const route = shortestGhostRoute( game.grid, g, pacmanTarget );
    if ( route && route.distance <= 8 ) return { x: 1, y: 29 };
  }

  return pacmanTarget;
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const target = resolveGhostTarget( grid, getGhostTarget( game, g ) );
  const route = target && shortestGhostRoute( grid, g, target );
  if ( route && route.direction ) g.dir = route.direction;
}

function moveGhost( game, g ) {
  if ( !g.released ) return;

  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game, timestamp ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
  } );
  resetGhostRelease( game, timestamp );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game, timestamp ) {
  if ( game.state !== 'playing' ) return;

  updateGhostRelease( game, timestamp );
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( !g.released ) continue;
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game, timestamp );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
