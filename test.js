// ============================================================
// Polis Game — Test Suite
// Run: node test.js
// ============================================================

// --- Extract game logic (no DOM) from index.html ---

const ROWS = 8, COLS = 8;
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const AXES = [[0, 1], [1, 0], [1, 1], [1, -1]];

function makePiece(team, type) {
  return { team, type, stunned: false };
}
const BD = () => makePiece('blue', 'dog');
const RD = () => makePiece('red', 'dog');
const BC = () => makePiece('blue', 'chariot');
const RC = () => makePiece('red', 'chariot');

function cloneBoard(b) {
  return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function updateStun(b) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (p && p.type === 'chariot')
        p.stunned = checkStunAt(b, r, c);
    }
}

function checkStunAt(b, r, c) {
  const p = b[r][c];
  if (!p || p.type !== 'chariot') return false;
  const enemy = p.team === 'blue' ? 'red' : 'blue';
  for (const [dr, dc] of AXES) {
    const r1 = r + dr, c1 = c + dc;
    const r2 = r - dr, c2 = c - dc;
    if (inBounds(r1, c1) && inBounds(r2, c2)) {
      const p1 = b[r1][c1], p2 = b[r2][c2];
      if (p1 && p1.team === enemy && p2 && p2.team === enemy)
        return true;
    }
  }
  return false;
}

function computeHops(b, toR, toC) {
  const mover = b[toR][toC];
  if (!mover) return [];
  const moverTeam = mover.team;
  const hops = [];
  for (const [dr, dc] of DIRS) {
    const nr = toR + dr, nc = toC + dc;
    const tr = toR - dr, tc = toC - dc;
    if (!inBounds(nr, nc) || !inBounds(tr, tc)) continue;
    const neighbor = b[nr][nc];
    if (!neighbor) continue;
    if (neighbor.type === 'chariot' && neighbor.stunned) continue;
    if (b[tr][tc] !== null) continue;
    if (neighbor.team !== moverTeam) {
      const defR = toR + 2 * dr, defC = toC + 2 * dc;
      if (inBounds(defR, defC)) {
        const defender = b[defR][defC];
        if (defender && defender.team === neighbor.team) continue;
      }
    }
    hops.push({ fromR: nr, fromC: nc, toR: tr, toC: tc, piece: neighbor });
  }
  return hops;
}

function resolveHops(b, toR, toC) {
  const hops = computeHops(b, toR, toC);
  const pieces = hops.map(h => b[h.fromR][h.fromC]);
  hops.forEach(h => { b[h.fromR][h.fromC] = null; });
  hops.forEach((h, i) => { b[h.toR][h.toC] = pieces[i]; });
}

function computeCaptures(b) {
  const captured = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = b[r][c];
      if (!p || p.type === 'chariot') continue;
      const enemy = p.team === 'blue' ? 'red' : 'blue';
      for (const [dr, dc] of AXES) {
        const r1 = r + dr, c1 = c + dc;
        const r2 = r - dr, c2 = c - dc;
        if (!inBounds(r1, c1) || !inBounds(r2, c2)) continue;
        const p1 = b[r1][c1], p2 = b[r2][c2];
        if (p1 && p1.team === enemy && !(p1.type === 'chariot' && p1.stunned) &&
          p2 && p2.team === enemy && !(p2.type === 'chariot' && p2.stunned)) {
          captured.push([r, c]);
          break;
        }
      }
    }
  }
  return captured;
}

function executeMove(b, fromR, fromC, toR, toC) {
  b[toR][toC] = b[fromR][fromC];
  b[fromR][fromC] = null;
  updateStun(b);
  resolveHops(b, toR, toC);
  updateStun(b);
  const captured = computeCaptures(b);
  captured.forEach(([r, c]) => { b[r][c] = null; });
  updateStun(b);
  return captured;
}

function isMoveLegal(b, fromR, fromC, toR, toC) {
  const piece = b[fromR][fromC];
  if (!piece) return false;
  if (!inBounds(toR, toC) || b[toR][toC] !== null) return false;
  const dr = Math.abs(toR - fromR), dc = Math.abs(toC - fromC);
  if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return false;
  const sim = cloneBoard(b);
  executeMove(sim, fromR, fromC, toR, toC);
  const movedPiece = sim[toR][toC];
  if (!movedPiece) return false;
  if (movedPiece.type === 'chariot' && movedPiece.stunned) return false;
  return true;
}

function getValidMoves(b, r, c) {
  const piece = b[r][c];
  if (!piece) return [];
  if (piece.type === 'chariot' && piece.stunned) return [];
  const moves = [];
  for (const [dr, dc] of DIRS) {
    const tr = r + dr, tc = c + dc;
    if (inBounds(tr, tc) && b[tr][tc] === null && isMoveLegal(b, r, c, tr, tc))
      moves.push([tr, tc]);
  }
  return moves;
}

function checkWin(b) {
  for (let c = 0; c < COLS; c++) {
    const p7 = b[7][c];
    if (p7 && p7.type === 'chariot' && p7.team === 'blue') return 'blue';
    const p0 = b[0][c];
    if (p0 && p0.type === 'chariot' && p0.team === 'red') return 'red';
  }
  return null;
}

// ============================================================
// Minimal test runner
// ============================================================

let passed = 0, failed = 0, currentSuite = '';

function describe(name, fn) {
  currentSuite = name;
  console.log(`\n  ${name}`);
  fn();
}

function it(name, fn) {
  try {
    fn();
    passed++;
    console.log(`    \x1b[32m✓\x1b[0m ${name}`);
  } catch (e) {
    failed++;
    console.log(`    \x1b[31m✗\x1b[0m ${name}`);
    console.log(`      ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function assertEq(a, b, msg) {
  if (a !== b) throw new Error(msg || `Expected ${b}, got ${a}`);
}

function assertPieceAt(b, r, c, team, type, msg) {
  const p = b[r][c];
  assert(p !== null, (msg || '') + ` — expected piece at (${r},${c}), got null`);
  assertEq(p.team, team, (msg || '') + ` — wrong team at (${r},${c})`);
  assertEq(p.type, type, (msg || '') + ` — wrong type at (${r},${c})`);
}

function assertEmpty(b, r, c, msg) {
  assert(b[r][c] === null, (msg || '') + ` — expected empty at (${r},${c}), got ${JSON.stringify(b[r][c])}`);
}

// ============================================================
// Tests
// ============================================================

console.log('\nPolis Game — Test Suite');
console.log('======================');

// ----------------------------------------------------------
// Board setup
// ----------------------------------------------------------
describe('Board setup', () => {
  it('emptyBoard creates an 8x8 grid of nulls', () => {
    const b = emptyBoard();
    assertEq(b.length, 8);
    for (const row of b) {
      assertEq(row.length, 8);
      for (const cell of row) assert(cell === null);
    }
  });

  it('makePiece creates correct objects', () => {
    const p = makePiece('blue', 'chariot');
    assertEq(p.team, 'blue');
    assertEq(p.type, 'chariot');
    assertEq(p.stunned, false);
  });

  it('cloneBoard produces an independent copy', () => {
    const b = emptyBoard();
    b[0][0] = BD();
    const c = cloneBoard(b);
    c[0][0].team = 'red';
    assertEq(b[0][0].team, 'blue');
  });
});

// ----------------------------------------------------------
// Hopping — cardinal directions
// ----------------------------------------------------------
describe('Hopping — rightward move', () => {
  it('friendly piece on top hops to bottom', () => {
    const b = emptyBoard();
    b[3][3] = BD(); // will move right to (3,4)
    b[2][4] = BD(); // neighbor above destination
    executeMove(b, 3, 3, 3, 4);
    assertEmpty(b, 2, 4);
    assertPieceAt(b, 4, 4, 'blue', 'dog');
  });

  it('friendly piece on bottom hops to top', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    b[4][4] = BD();
    executeMove(b, 3, 3, 3, 4);
    assertEmpty(b, 4, 4);
    assertPieceAt(b, 2, 4, 'blue', 'dog');
  });

  it('friendly piece on left hops to right', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    b[3][3] = BD(); // moves to (3,4)
    b[3][3] = BD();
    // Redo: Blue at (3,2) moves to (3,3). Neighbor at (3,2) is vacated.
    // Better: Blue at (3,3) moves to (3,4). Neighbor at (3,3) is vacated (source).
    // Let me use a clearer setup:
    const b2 = emptyBoard();
    b2[4][4] = BD(); // will move to (4,5)
    b2[4][4] = BD();
    b2[4][5] = null;
    b2[4][4] = BD();
    // Clearest: piece at center, neighbor to the left
    const b3 = emptyBoard();
    b3[3][4] = BD(); // moves to (3,5)
    b3[3][4] = BD();
    b3[3][4] = BD(); // mover
    b3[3][5] = null; // destination (empty)
    b3[3][4] = BD(); // at source
    // I'll just redo cleanly:
    const board = emptyBoard();
    board[3][5] = BD(); // mover, will move to (3,6)
    board[3][5] = BD();
    // Neighbor to the left of destination: (3,5) is source, becomes empty
    // Use: mover at (3,3) → (3,4), neighbor at (3,3) = source, vacated
    // Better setup:
    const bx = emptyBoard();
    bx[3][3] = BD(); // moves right to (3,4)
    bx[3][4] = null; // destination
    bx[3][3] = BD();
    // Left neighbor of (3,4) is (3,3) which is the source — vacated after move.
    // So no piece to hop. Let me use a different config:
    // Mover at (4,4) → (3,4). Neighbor at (3,3) hops to (3,5).
    const bb = emptyBoard();
    bb[4][4] = BD(); // moves up to (3,4)
    bb[3][3] = BD(); // neighbor to the left of dest
    executeMove(bb, 4, 4, 3, 4);
    assertEmpty(bb, 3, 3);
    assertPieceAt(bb, 3, 5, 'blue', 'dog');
  });

  it('friendly piece on right hops to left', () => {
    const b = emptyBoard();
    b[4][4] = BD(); // moves up to (3,4)
    b[3][5] = BD(); // neighbor to the right of dest
    executeMove(b, 4, 4, 3, 4);
    assertEmpty(b, 3, 5);
    assertPieceAt(b, 3, 3, 'blue', 'dog');
  });
});

describe('Hopping — vertical move', () => {
  it('piece moves down, left neighbor hops right', () => {
    const b = emptyBoard();
    b[3][4] = BD(); // moves down to (4,4)
    b[4][3] = BD(); // left of dest
    executeMove(b, 3, 4, 4, 4);
    assertEmpty(b, 4, 3);
    assertPieceAt(b, 4, 5, 'blue', 'dog');
  });

  it('piece moves down, right neighbor hops left', () => {
    const b = emptyBoard();
    b[3][4] = BD(); // moves down to (4,4)
    b[4][5] = BD(); // right of dest
    executeMove(b, 3, 4, 4, 4);
    assertEmpty(b, 4, 5);
    assertPieceAt(b, 4, 3, 'blue', 'dog');
  });

  it('piece moves up, neighbor below hops above', () => {
    const b = emptyBoard();
    b[4][4] = BD(); // moves up to (3,4)
    b[4][4] = BD();
    // neighbor below destination = (4,4) is the source, vacated. Use different cell.
    const bx = emptyBoard();
    bx[5][4] = BD(); // moves up to (4,4)
    bx[5][4] = BD(); // neighbor below dest is (5,4) = source. Use:
    const bb = emptyBoard();
    bb[2][4] = BD(); // moves down to (3,4)
    bb[4][4] = BD(); // below dest
    executeMove(bb, 2, 4, 3, 4);
    assertEmpty(bb, 4, 4);
    assertPieceAt(bb, 2, 4, 'blue', 'dog');
  });
});

describe('Hopping — diagonal directions', () => {
  it('piece moves to center, NW neighbor hops to SE', () => {
    const b = emptyBoard();
    b[4][4] = BD(); // moves to (3,3)
    b[2][2] = BD(); // NW of (3,3)
    executeMove(b, 4, 4, 3, 3);
    assertEmpty(b, 2, 2);
    assertPieceAt(b, 4, 4, 'blue', 'dog');
  });

  it('piece moves to center, SE neighbor hops to NW', () => {
    const b = emptyBoard();
    b[2][2] = BD(); // moves to (3,3)
    b[4][4] = BD(); // SE of (3,3)
    executeMove(b, 2, 2, 3, 3);
    assertEmpty(b, 4, 4);
    assertPieceAt(b, 2, 2, 'blue', 'dog');
  });

  it('piece moves to center, NE neighbor hops to SW', () => {
    const b = emptyBoard();
    b[4][2] = BD(); // moves to (3,3)
    b[2][4] = BD(); // NE of (3,3)
    executeMove(b, 4, 2, 3, 3);
    assertEmpty(b, 2, 4);
    assertPieceAt(b, 4, 2, 'blue', 'dog'); // mover is here? No, mover moved to (3,3).
    // Actually mover moved FROM (4,2) TO (3,3). (4,2) is now empty.
    // NE neighbor (2,4) hops to SW = (4,2). (4,2) was the source, now empty. So it hops there.
    assertPieceAt(b, 4, 2, 'blue', 'dog');
  });

  it('piece moves to center, SW neighbor hops to NE', () => {
    const b = emptyBoard();
    b[2][4] = BD(); // moves to (3,3)
    b[4][2] = BD(); // SW of (3,3)
    executeMove(b, 2, 4, 3, 3);
    assertEmpty(b, 4, 2);
    assertPieceAt(b, 2, 4, 'blue', 'dog');
  });
});

describe('Hopping — multiple neighbors simultaneously', () => {
  it('all 4 cardinal neighbors hop simultaneously (rules PDF example)', () => {
    // Reproduce the example from the rules:
    // BD at (0,0) and (0,1) and (1,0), RD at (2,2).
    // BD at (0,0) moves to (1,1).
    // Expect: BD(0,1)→(2,1), BD(1,0)→(1,2), RD(2,2)→(0,0).
    const b = emptyBoard();
    b[0][0] = BD(); // mover → (1,1)
    b[0][1] = BD();
    b[1][0] = BD();
    b[2][2] = RD();
    executeMove(b, 0, 0, 1, 1);
    assertPieceAt(b, 1, 1, 'blue', 'dog', 'mover at center');
    assertPieceAt(b, 2, 1, 'blue', 'dog', 'top-center hopped to bottom-center');
    assertPieceAt(b, 1, 2, 'blue', 'dog', 'middle-left hopped to middle-right');
    assertPieceAt(b, 0, 0, 'red', 'dog', 'bottom-right RD hopped to top-left');
  });

  it('opposite neighbors block each other (targets occupied)', () => {
    const b = emptyBoard();
    b[4][4] = BD(); // moves to (3,4)
    b[2][4] = RD(); // above dest, would hop to (4,4) — but that's the source, which is empty!
    b[4][4] = BD(); // below dest, would hop to (2,4) — but RD is there
    // Actually (4,4) is source of mover, vacated after move. So:
    // (2,4) RD would hop to (4,4) — empty after move — OK
    // (4,4) BD would hop to (2,4) — occupied by RD — BLOCKED
    // But wait, (4,4) has the mover. After move, (4,4) is null. But then (4,4) is neighbor of dest (3,4)?
    // (4,4) is at offset (1,0) from dest (3,4). Yes, it's a neighbor.
    // But (4,4) is the source cell, now null. So no piece there. No hop from (4,4).
    // Let me redo:
    const bx = emptyBoard();
    bx[3][3] = BD(); // moves right to (3,4)
    bx[2][4] = RD(); // above dest
    bx[4][4] = RD(); // below dest
    // (2,4) wants to hop to (4,4) — occupied by RD. Blocked.
    // (4,4) wants to hop to (2,4) — occupied by RD. Blocked.
    executeMove(bx, 3, 3, 3, 4);
    assertPieceAt(bx, 2, 4, 'red', 'dog', 'top stays');
    assertPieceAt(bx, 4, 4, 'red', 'dog', 'bottom stays');
  });
});

// ----------------------------------------------------------
// Hopping — edge of board
// ----------------------------------------------------------
describe('Hopping — board edges', () => {
  it('piece at board edge does not hop off the board', () => {
    const b = emptyBoard();
    b[1][0] = BD(); // moves to (0,0)
    b[0][1] = RD(); // neighbor; would hop to (-1, -1) — off board
    executeMove(b, 1, 0, 0, 0);
    assertPieceAt(b, 0, 1, 'red', 'dog', 'stays — target off board');
  });

  it('hop target off board on right side', () => {
    const b = emptyBoard();
    b[3][6] = BD(); // moves to (3,7)
    b[2][7] = RD(); // would hop to (4,7). In bounds? Yes (row 4, col 7). Should hop.
    // Actually let me pick one that goes off:
    // (3,7) dest. neighbor at (2,7) direction (-1,0). target (4,7) — in bounds. Not off board.
    // neighbor at (3,6) is source, vacated.
    // Let me use: piece at (4,7) moves to (3,7). Neighbor at (3,6) would hop to (3,8) — off board.
    const bx = emptyBoard();
    bx[4][7] = BD(); // moves to (3,7)
    bx[3][6] = RD(); // direction (0,-1) from (3,7). Target: (3,8) — off board!
    executeMove(bx, 4, 7, 3, 7);
    assertPieceAt(bx, 3, 6, 'red', 'dog', 'stays — target off board right');
  });
});

// ----------------------------------------------------------
// Hopping — enemy defense
// ----------------------------------------------------------
describe('Hopping — defense (enemy piece held by ally behind it)', () => {
  it('defended enemy piece does not hop (horizontal, rules PDF example)', () => {
    // | RD | RD | BD← |  |
    // BD moves to rightmost occupied position.
    // The middle RD is defended by the left RD.
    const b = emptyBoard();
    b[3][4] = BD(); // moves left to (3,3)... wait, let me match the PDF.
    // PDF: RD at 0, RD at 1, BD moves to 2. RD at 1 would hop to 3 but defended by RD at 0.
    const bx = emptyBoard();
    bx[3][4] = BD(); // moves left to (3,2). No, let me set it up clearly.
    // Blue at (3,3) moves to (3,2). Neighbor at (3,1) is RD. Defender at (3,0)?
    // direction from dest (3,2) to neighbor (3,1): (0, -1). Defender at (3, 2+2*(-1)) = (3,0).
    const bb = emptyBoard();
    bb[3][3] = BD(); // moves to (3,2)
    bb[3][1] = RD(); // neighbor of dest
    bb[3][0] = RD(); // defender behind neighbor
    executeMove(bb, 3, 3, 3, 2);
    assertPieceAt(bb, 3, 1, 'red', 'dog', 'defended — stays');
    assertEmpty(bb, 3, 3, 'hop target would be here but piece is defended');
  });

  it('undefended enemy piece hops normally', () => {
    const b = emptyBoard();
    b[3][3] = BD(); // moves to (3,2)
    b[3][1] = RD(); // neighbor of dest, no defender behind it
    executeMove(b, 3, 3, 3, 2);
    assertEmpty(b, 3, 1, 'RD hopped away');
    assertPieceAt(b, 3, 3, 'red', 'dog', 'RD hopped here');
  });

  it('defense only works along the same axis (rules PDF example 2)', () => {
    // RD at (0,0), RD at (1,1), BD moves to (1,2).
    // RD at (1,1) direction (0,-1) from dest. Defender would be at (1,4)? No.
    // Let me match the PDF exactly:
    // | RD |    |    |    |
    // |    | RD | BD←|    |
    // RD at row above, different column. Not same axis. RD at (1,1) hops.
    const b = emptyBoard();
    b[0][0] = RD(); // not on same axis as the hop direction
    b[1][1] = RD(); // neighbor of dest
    b[1][3] = BD(); // moves left to (1,2)
    executeMove(b, 1, 3, 1, 2);
    // direction from (1,2) to (1,1) is (0,-1). Defender at (1, 2+2*(-1)) = (1,0). Empty.
    // So RD at (1,1) is NOT defended. It hops to (1,3).
    assertEmpty(b, 1, 1, 'RD hopped away');
    assertPieceAt(b, 1, 3, 'red', 'dog', 'RD hopped to right');
  });

  it('defense works on diagonal axis', () => {
    const b = emptyBoard();
    b[3][3] = BD(); // moves to (4,4)
    b[5][5] = RD(); // neighbor (diagonal SE)
    b[6][6] = RD(); // defender behind on same diagonal
    executeMove(b, 3, 3, 4, 4);
    assertPieceAt(b, 5, 5, 'red', 'dog', 'defended diagonally — stays');
  });

  it('defense does NOT apply to friendly pieces', () => {
    // Friendly pieces always hop (if target is free), regardless of allies behind them
    const b = emptyBoard();
    b[3][3] = BD(); // moves to (3,4)
    b[3][5] = BD(); // neighbor right of dest
    b[3][6] = BD(); // would be "defender" position — but defense only affects enemies
    executeMove(b, 3, 3, 3, 4);
    assertEmpty(b, 3, 5, 'friendly piece hops despite ally behind');
    assertPieceAt(b, 3, 3, 'blue', 'dog', 'hopped to left');
  });

  it('vertical defense: enemy defended from below', () => {
    const b = emptyBoard();
    b[2][4] = BD(); // moves down to (3,4)
    b[4][4] = RD(); // below dest
    b[5][4] = RD(); // defender behind it
    executeMove(b, 2, 4, 3, 4);
    assertPieceAt(b, 4, 4, 'red', 'dog', 'defended vertically — stays');
  });
});

// ----------------------------------------------------------
// Hopping — stunned chariots
// ----------------------------------------------------------
describe('Hopping — stunned chariots do not hop', () => {
  it('stunned chariot stays in place during hop resolution', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[3][3].stunned = true; // manually stun for test
    b[4][4] = RD(); // moves to (3,4), adjacent to chariot
    // chariot at (3,3) is neighbor of (3,4), direction (0,-1). Target (3,5).
    // But chariot is stunned, so it should NOT hop.
    // Need mover to be at (4,4) moving to (3,4). Chariot at (3,3).
    const bx = emptyBoard();
    bx[4][4] = RD(); // moves to (3,4)
    bx[3][3] = BC();
    bx[3][3].stunned = true;
    // Before executeMove, manually ensure stun is set
    const chariotRef = bx[3][3];
    // executeMove will call updateStun which may un-stun. We need surrounding enemies.
    // Add enemies to keep it stunned:
    bx[3][2] = RD(); // surround horizontally
    bx[3][4] = null; // dest is empty
    // After move: RD at (3,4). Chariot at (3,3) surrounded by RD(3,2) and RD(3,4)?
    // Yes, after the move RD is at (3,4). updateStun will keep chariot stunned.
    executeMove(bx, 4, 4, 3, 4);
    assertPieceAt(bx, 3, 3, 'blue', 'chariot', 'stunned chariot did not hop');
  });
});

// ----------------------------------------------------------
// Capturing — different axes
// ----------------------------------------------------------
describe('Capturing — horizontal axis', () => {
  it('dog surrounded left-right by enemies is captured', () => {
    const b = emptyBoard();
    b[3][2] = RD();
    b[3][4] = BD(); // will be surrounded
    b[3][5] = RD(); // moves to (3,5)? No, need to create the pattern via a move.
    // Setup: RD at (3,2), BD at (3,4). RD moves from (3,6) to (3,5).
    // After move, BD at (3,4) has RD at (3,3)? No.
    // Simpler: just test computeCaptures directly.
    const bx = emptyBoard();
    bx[3][2] = RD();
    bx[3][3] = BD();
    bx[3][4] = RD();
    const captured = computeCaptures(bx);
    assertEq(captured.length, 1, 'one piece captured');
    assertEq(captured[0][0], 3);
    assertEq(captured[0][1], 3);
  });
});

describe('Capturing — vertical axis', () => {
  it('dog surrounded top-bottom by enemies is captured', () => {
    const b = emptyBoard();
    b[2][3] = RD();
    b[3][3] = BD();
    b[4][3] = RD();
    const captured = computeCaptures(b);
    assertEq(captured.length, 1);
    assertEq(captured[0][0], 3);
    assertEq(captured[0][1], 3);
  });
});

describe('Capturing — diagonal axes', () => {
  it('dog surrounded on NW-SE diagonal is captured', () => {
    const b = emptyBoard();
    b[2][2] = RD();
    b[3][3] = BD();
    b[4][4] = RD();
    const captured = computeCaptures(b);
    assertEq(captured.length, 1);
    assertEq(captured[0][0], 3);
    assertEq(captured[0][1], 3);
  });

  it('dog surrounded on NE-SW diagonal is captured', () => {
    const b = emptyBoard();
    b[2][4] = RD();
    b[3][3] = BD();
    b[4][2] = RD();
    const captured = computeCaptures(b);
    assertEq(captured.length, 1);
    assertEq(captured[0][0], 3);
    assertEq(captured[0][1], 3);
  });
});

describe('Capturing — not captured (different axes, rules PDF example)', () => {
  it('enemies on adjacent but non-opposing sides do not capture', () => {
    // |    |    |    |
    // | RD | BD |    |
    // |    | RD |    |
    const b = emptyBoard();
    b[3][2] = RD();
    b[3][3] = BD();
    b[4][3] = RD();
    const captured = computeCaptures(b);
    assertEq(captured.length, 0, 'not on same axis — safe');
  });
});

describe('Capturing — simultaneous', () => {
  it('both pieces in a mutual capture are removed (rules PDF example)', () => {
    // | RD | BD | RD | BD |
    const b = emptyBoard();
    b[3][0] = RD();
    b[3][1] = BD();
    b[3][2] = RD();
    b[3][3] = BD();
    const captured = computeCaptures(b);
    assertEq(captured.length, 2, 'both center pieces captured');
    // BD at (3,1) surrounded by RD(3,0) and RD(3,2)
    // RD at (3,2) surrounded by BD(3,1) and BD(3,3)
    const positions = captured.map(([r, c]) => `${r},${c}`).sort();
    assert(positions.includes('3,1'), 'BD captured');
    assert(positions.includes('3,2'), 'RD captured');
  });
});

describe('Capturing — hops resolve before captures', () => {
  it('piece hopped away no longer counts for capture', () => {
    // Blue at (3,3) moves to (3,4).
    // RD at (3,5) — right neighbor, hops to (3,3).
    // RD at (3,7) — not adjacent, stays.
    // After hops: BD(3,4), RD(3,3). No surrounding pattern.
    const b = emptyBoard();
    b[3][3] = BD(); // moves right
    b[3][5] = RD(); // hops to (3,3)
    const captured = executeMove(b, 3, 3, 3, 4);
    assertEq(captured.length, 0, 'no capture — RD hopped away from capture axis');
    assertPieceAt(b, 3, 3, 'red', 'dog');
    assertPieceAt(b, 3, 4, 'blue', 'dog');
  });

  it('piece hopped INTO a surrounded position IS captured', () => {
    // Setup: after hop, a piece lands between two enemies.
    // BD moves to (3,3). RD at (2,3) hops to (4,3).
    // If BD at (4,3)? No, (4,3) would be occupied blocking the hop.
    // Setup: BD at (4,3) moves up to (3,3). RD at (2,3) hops to (4,3).
    // Need enemies at (5,3) for capture. Let's use:
    // BD mover at (4,3)→(3,3). RD at (2,3) hops to (4,3). BD at (5,3) stays.
    // After hops: RD at (4,3) surrounded by BD(3,3) and BD(5,3)? Yes — vertical axis.
    const b = emptyBoard();
    b[4][3] = BD(); // moves to (3,3)
    b[2][3] = RD(); // hops to (4,3)
    b[5][3] = BD(); // creates vertical capture
    const captured = executeMove(b, 4, 3, 3, 3);
    assertEq(captured.length, 1, 'RD hopped into capture');
    assertEmpty(b, 4, 3, 'RD was captured after hopping');
  });
});

// ----------------------------------------------------------
// Chariot stun
// ----------------------------------------------------------
describe('Chariot stun', () => {
  it('chariot surrounded horizontally is stunned', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[3][2] = RD();
    b[3][4] = RD();
    updateStun(b);
    assert(b[3][3].stunned, 'chariot should be stunned');
  });

  it('chariot surrounded vertically is stunned', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[2][3] = RD();
    b[4][3] = RD();
    updateStun(b);
    assert(b[3][3].stunned, 'chariot should be stunned');
  });

  it('chariot surrounded diagonally is stunned', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[2][2] = RD();
    b[4][4] = RD();
    updateStun(b);
    assert(b[3][3].stunned, 'chariot should be stunned');
  });

  it('chariot not surrounded is not stunned', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[3][2] = RD();
    b[4][3] = RD(); // different axes — no opposing pair
    updateStun(b);
    assert(!b[3][3].stunned, 'chariot should not be stunned');
  });

  it('stunned chariot does not count toward captures', () => {
    // | RD | BC(stunned) | RD | BD |
    // RD at (3,3) should be safe because BC is stunned.
    const b = emptyBoard();
    b[3][1] = RD();
    b[3][2] = BC();
    b[3][2].stunned = true;
    b[3][3] = RD();
    b[3][4] = BD();
    // Is RD at (3,3) surrounded? Left is BC (stunned, doesn't count). Right is BD (enemy).
    // So only one enemy side. Not captured.
    // But we also need to ensure stun is set properly with updateStun:
    // BC needs to be surrounded to actually be stunned. Add enemies:
    b[2][2] = RD(); // above
    b[4][2] = RD(); // below — now BC is stunned vertically by friendly pieces? No, enemies.
    // BC is blue. RD is enemy. (2,2) and (4,2) are both RD. Vertical axis. BC is stunned. Good.
    updateStun(b);
    assert(b[3][2].stunned, 'chariot is stunned');
    const captured = computeCaptures(b);
    // RD at (3,3): left is BC (stunned, excluded), right is BD (enemy). Not surrounded.
    const rdCaptured = captured.some(([r, c]) => r === 3 && c === 3);
    assert(!rdCaptured, 'RD not captured — stunned chariot does not count');
  });

  it('stunned chariot cannot be moved', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[3][2] = RD();
    b[3][4] = RD();
    updateStun(b);
    const moves = getValidMoves(b, 3, 3);
    assertEq(moves.length, 0, 'stunned chariot has no valid moves');
  });

  it('chariot becomes un-stunned when surrounding piece is removed', () => {
    const b = emptyBoard();
    b[3][3] = BC();
    b[3][2] = RD();
    b[3][4] = RD();
    updateStun(b);
    assert(b[3][3].stunned, 'initially stunned');
    b[3][2] = null; // remove one surrounding piece
    updateStun(b);
    assert(!b[3][3].stunned, 'no longer stunned');
  });
});

// ----------------------------------------------------------
// Illegal moves
// ----------------------------------------------------------
describe('Illegal moves', () => {
  it('cannot move into a position where the piece would be captured', () => {
    // RD at (3,2) and (3,4). Moving BD to (3,3) would be captured.
    const b = emptyBoard();
    b[3][2] = RD();
    b[3][4] = RD();
    b[2][3] = BD(); // could move down to (3,3)
    assert(!isMoveLegal(b, 2, 3, 3, 3), 'move into capture is illegal');
  });

  it('cannot move chariot into stun', () => {
    const b = emptyBoard();
    b[3][2] = RD();
    b[3][4] = RD();
    b[2][3] = BC(); // could move to (3,3)
    assert(!isMoveLegal(b, 2, 3, 3, 3), 'chariot move into stun is illegal');
  });

  it('CAN move a piece even if it hops an ally into danger', () => {
    // Blue dog at (3,3). Ally at (2,4). Enemies at (1,4) and... need setup where
    // hopping an ally creates a capture for that ally.
    // BD at (3,3) moves to (3,4). BD at (2,4) hops to (4,4).
    // If RD at (5,4) and RD at (3,4)? No, (3,4) is the mover now.
    // RD at (5,4) and something at (3,4) = mover (blue). Not enemy.
    // Let's use: BD at (3,3)→(3,4). BD at (3,5) hops to (3,3).
    // RD at (3,2) and RD at (3,4)? (3,4) is mover (blue).
    // Hard to construct naturally. Let me test conceptually with getValidMoves:
    const b = emptyBoard();
    b[3][3] = BD(); // mover
    b[3][5] = BD(); // will hop to (3,3) — between enemies?
    b[2][3] = RD();
    b[4][3] = RD(); // these surround (3,3) vertically
    // After move BD(3,3)→(3,4): BD(3,5) hops to (3,3). RD(2,3) and RD(4,3) surround (3,3).
    // BD at (3,3) is captured! But the mover at (3,4) is safe.
    // This should be LEGAL because only the mover's safety matters.
    assert(isMoveLegal(b, 3, 3, 3, 4), 'legal — mover is safe even if ally hops into danger');
  });

  it('cannot move to an occupied square', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    b[3][4] = RD();
    assert(!isMoveLegal(b, 3, 3, 3, 4), 'occupied square is illegal');
  });

  it('cannot move more than one square', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    assert(!isMoveLegal(b, 3, 3, 3, 5), 'two squares away is illegal');
    assert(!isMoveLegal(b, 3, 3, 5, 5), 'two squares diag is illegal');
  });

  it('cannot stay in place', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    assert(!isMoveLegal(b, 3, 3, 3, 3), 'staying in place is illegal');
  });
});

// ----------------------------------------------------------
// Win condition
// ----------------------------------------------------------
describe('Win condition', () => {
  it('blue wins when blue chariot reaches row 7', () => {
    const b = emptyBoard();
    b[7][3] = BC();
    assertEq(checkWin(b), 'blue');
  });

  it('red wins when red chariot reaches row 0', () => {
    const b = emptyBoard();
    b[0][5] = RC();
    assertEq(checkWin(b), 'red');
  });

  it('no win when chariots are not at far rank', () => {
    const b = emptyBoard();
    b[0][0] = BC(); // blue starts here — not far rank
    b[7][7] = RC(); // red starts here — not far rank
    assertEq(checkWin(b), null);
  });

  it('chariot on far rank at any column wins', () => {
    for (let c = 0; c < 8; c++) {
      const b = emptyBoard();
      b[7][c] = BC();
      assertEq(checkWin(b), 'blue', `blue should win at col ${c}`);
    }
    for (let c = 0; c < 8; c++) {
      const b = emptyBoard();
      b[0][c] = RC();
      assertEq(checkWin(b), 'red', `red should win at col ${c}`);
    }
  });
});

// ----------------------------------------------------------
// Full move integration: hop then capture
// ----------------------------------------------------------
describe('Integration — hop creates capture', () => {
  it('hop moves enemy between two friendly pieces, causing capture', () => {
    // From the strategy section: | RD | RD→ |   | BD |
    // RD at (3,1) moves right to (3,2). BD at (3,3) hops to (3,1).
    // Now BD at (3,1) is between RD at (3,0) and RD at (3,2)? Need RD at (3,0).
    const b = emptyBoard();
    b[3][0] = RD();
    b[3][1] = RD(); // moves right to (3,2)
    b[3][3] = BD(); // neighbor; hops to (3,1)
    const captured = executeMove(b, 3, 1, 3, 2);
    // After hop: BD now at (3,1), between RD(3,0) and RD(3,2).
    assertEq(captured.length, 1, 'BD captured after being hopped between enemies');
    assertEmpty(b, 3, 1, 'BD removed');
    assertPieceAt(b, 3, 0, 'red', 'dog');
    assertPieceAt(b, 3, 2, 'red', 'dog');
  });
});

describe('Integration — move that produces no hops or captures', () => {
  it('simple move with no neighbors', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    const captured = executeMove(b, 3, 3, 3, 4);
    assertEq(captured.length, 0);
    assertEmpty(b, 3, 3);
    assertPieceAt(b, 3, 4, 'blue', 'dog');
  });
});

describe('Integration — chariot win via move', () => {
  it('blue chariot moves to row 7 and wins', () => {
    const b = emptyBoard();
    b[6][3] = BC();
    executeMove(b, 6, 3, 7, 3);
    assertEq(checkWin(b), 'blue');
  });
});

describe('Integration — chariot win via hop', () => {
  it('chariot hopped to far rank counts as a win', () => {
    // Blue chariot at (5,3). Some piece moves to (6,3), hopping chariot to (7,3)? No —
    // the moved piece is at (6,3) and chariot at (5,3) is at direction (-1,0).
    // Target: (7,3). If empty, chariot hops to (7,3).
    const b = emptyBoard();
    b[5][3] = BC();
    b[7][3] = null; // ensure empty
    b[5][4] = RD(); // moves to (6,3)? Need it adjacent.
    // Mover must end at (6,3) for chariot at (5,3) to be neighbor.
    // RD at (6,4) moves to (6,3). Chariot at (5,3) is at (-1,0). Target (7,3). Empty. Hops!
    const bx = emptyBoard();
    bx[5][3] = BC();
    bx[6][4] = RD(); // moves to (6,3)
    executeMove(bx, 6, 4, 6, 3);
    assertPieceAt(bx, 7, 3, 'blue', 'chariot', 'chariot hopped to far rank');
    assertEq(checkWin(bx), 'blue', 'blue wins via hop');
  });
});

// ----------------------------------------------------------
// getValidMoves
// ----------------------------------------------------------
describe('getValidMoves', () => {
  it('piece in center of empty board has 8 moves', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    const moves = getValidMoves(b, 3, 3);
    assertEq(moves.length, 8);
  });

  it('piece in corner has 3 moves', () => {
    const b = emptyBoard();
    b[0][0] = BD();
    const moves = getValidMoves(b, 0, 0);
    assertEq(moves.length, 3);
  });

  it('piece on edge has 5 moves', () => {
    const b = emptyBoard();
    b[0][3] = BD();
    const moves = getValidMoves(b, 0, 3);
    assertEq(moves.length, 5);
  });

  it('piece surrounded by allies has no moves', () => {
    const b = emptyBoard();
    b[3][3] = BD();
    for (const [dr, dc] of DIRS) b[3 + dr][3 + dc] = BD();
    const moves = getValidMoves(b, 3, 3);
    assertEq(moves.length, 0);
  });

  it('illegal moves are excluded from valid moves', () => {
    // BD at (2,3) with RD at (3,2) and RD at (3,4). Moving to (3,3) is illegal.
    const b = emptyBoard();
    b[2][3] = BD();
    b[3][2] = RD();
    b[3][4] = RD();
    const moves = getValidMoves(b, 2, 3);
    const hasIllegal = moves.some(([r, c]) => r === 3 && c === 3);
    assert(!hasIllegal, '(3,3) should not be in valid moves');
  });
});

// ----------------------------------------------------------
// computeHops — exhaustive orientation check
// ----------------------------------------------------------
describe('computeHops — all 8 directions', () => {
  // For each of the 8 directions, place a neighbor there and verify it hops correctly.
  const center = [3, 4]; // use non-symmetric center to catch row/col bugs
  const directions = [
    { name: 'NW (-1,-1)', dr: -1, dc: -1 },
    { name: 'N  (-1, 0)', dr: -1, dc: 0 },
    { name: 'NE (-1,+1)', dr: -1, dc: 1 },
    { name: 'W  ( 0,-1)', dr: 0, dc: -1 },
    { name: 'E  ( 0,+1)', dr: 0, dc: 1 },
    { name: 'SW (+1,-1)', dr: 1, dc: -1 },
    { name: 'S  (+1, 0)', dr: 1, dc: 0 },
    { name: 'SE (+1,+1)', dr: 1, dc: 1 },
  ];

  for (const { name, dr, dc } of directions) {
    it(`friendly piece at ${name} hops to opposite side`, () => {
      const [cr, cc] = center;
      const nr = cr + dr, nc = cc + dc; // neighbor
      const tr = cr - dr, tc = cc - dc; // target
      const b = emptyBoard();
      b[cr][cc] = BD(); // mover already at center
      b[nr][nc] = BD(); // neighbor
      const hops = computeHops(b, cr, cc);
      const hop = hops.find(h => h.fromR === nr && h.fromC === nc);
      assert(hop, `expected hop from (${nr},${nc})`);
      assertEq(hop.toR, tr, `hop target row`);
      assertEq(hop.toC, tc, `hop target col`);
    });

    it(`enemy piece at ${name} hops to opposite side (undefended)`, () => {
      const [cr, cc] = center;
      const nr = cr + dr, nc = cc + dc;
      const tr = cr - dr, tc = cc - dc;
      const b = emptyBoard();
      b[cr][cc] = BD(); // mover
      b[nr][nc] = RD(); // enemy neighbor
      const hops = computeHops(b, cr, cc);
      const hop = hops.find(h => h.fromR === nr && h.fromC === nc);
      assert(hop, `expected enemy hop from (${nr},${nc})`);
      assertEq(hop.toR, tr);
      assertEq(hop.toC, tc);
    });

    it(`enemy piece at ${name} does NOT hop when defended`, () => {
      const [cr, cc] = center;
      const nr = cr + dr, nc = cc + dc;
      const defR = cr + 2 * dr, defC = cc + 2 * dc;
      if (!inBounds(defR, defC)) return; // skip if defender would be off board
      const b = emptyBoard();
      b[cr][cc] = BD();
      b[nr][nc] = RD();
      b[defR][defC] = RD(); // defender
      const hops = computeHops(b, cr, cc);
      const hop = hops.find(h => h.fromR === nr && h.fromC === nc);
      assert(!hop, `enemy at ${name} should be defended and not hop`);
    });

    it(`piece at ${name} does NOT hop when target is occupied`, () => {
      const [cr, cc] = center;
      const nr = cr + dr, nc = cc + dc;
      const tr = cr - dr, tc = cc - dc;
      const b = emptyBoard();
      b[cr][cc] = BD();
      b[nr][nc] = BD();
      b[tr][tc] = RD(); // target occupied
      const hops = computeHops(b, cr, cc);
      const hop = hops.find(h => h.fromR === nr && h.fromC === nc);
      assert(!hop, `piece at ${name} should not hop — target occupied`);
    });
  }
});

describe('computeHops — edge positions (target off board)', () => {
  it('neighbor at top edge: target would be off board, no hop', () => {
    const b = emptyBoard();
    b[1][3] = BD(); // mover at row 1
    b[0][3] = BD(); // neighbor above, target would be row 2 (in bounds). This WILL hop.
    // Need target off board: mover at (0,3). Neighbor at... can't be above, nothing above row 0.
    // Mover at (0,3). Neighbor at (0,2) — direction (0,-1). Target (0,4) — in bounds.
    // For off-board: Mover at (0,0). Neighbor at (0,1) — dir (0,1). Target (0,-1) — off board!
    const bx = emptyBoard();
    bx[0][0] = BD(); // mover
    bx[0][1] = BD(); // neighbor E. Target: (0,-1) — off board.
    const hops = computeHops(bx, 0, 0);
    const hop = hops.find(h => h.fromR === 0 && h.fromC === 1);
    assert(!hop, 'no hop — target off board');
  });

  it('neighbor at bottom-right corner: target would be off board', () => {
    const b = emptyBoard();
    b[7][7] = BD(); // mover
    b[6][6] = BD(); // neighbor NW. Target (8,8) — off board.
    // Wait, mover is at (7,7). Neighbor at (6,6) dir (-1,-1). Target (8,8). Off board.
    const hops = computeHops(b, 7, 7);
    const hop = hops.find(h => h.fromR === 6 && h.fromC === 6);
    assert(!hop, 'no hop — target off board (8,8)');
  });
});

// ----------------------------------------------------------
// Summary
// ----------------------------------------------------------
console.log(`\n${'='.repeat(40)}`);
console.log(`  \x1b[32m${passed} passed\x1b[0m, \x1b[${failed ? '31' : '32'}m${failed} failed\x1b[0m`);
console.log('='.repeat(40));
process.exit(failed > 0 ? 1 : 0);
