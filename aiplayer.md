# Polis AI — Minimax Algorithm

Drop the functions below into `index.html` to replace the placeholder `chooseMoveRed`.
Remember to set aiPlayers to true for the red team.

---

## How it works

`chooseMove` is the entry point called by the game. It tries every legal move,
runs `minimax` on the resulting position, and picks the move with the highest score.

`minimax` alternates between maximising (your turn) and minimising (opponent's turn),
looking `DEPTH` half-moves ahead. Alpha-beta pruning cuts branches that can't affect
the result, keeping it fast enough for depth 3–4 in-browser.

`evaluate` scores a position from the perspective of one player:

| Component | Points |
|---|---|
| Each own piece on the board | +1 |
| Each enemy piece on the board | −1 |
| Own chariot advancement (rows toward far rank, squared, divided by 10) | +0 … +49/10 |
| Enemy chariot advancement (rows toward far rank, squared, divided by 10) | −0 … −49/10 |

Squaring the chariot advancement means the algorithm values the final few rows
much more heavily than the first few, pushing the chariot urgently once it's close.

---

## Code

```js
// --- Minimax AI ---

const DEPTH = 2;
function minimax(board, depth, alpha, beta, isMaximizing, player, enemy) {
  const winner = checkWin(board);
  if (winner === player) return Infinity;
  if (winner === enemy) return -Infinity;
  if (depth === 0) return evaluate(board, player);

  const currentTeam = isMaximizing ? player : enemy;
  if (!hasAnyMoves(board, currentTeam))
    return isMaximizing ? -Infinity : Infinity;

  let best = isMaximizing ? -Infinity : Infinity;

  search:
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (!p || p.team !== currentTeam) continue;
      for (const [toR, toC] of getValidMoves(board, r, c)) {
        const sim = cloneBoard(board);
        executeMoveSync(sim, r, c, toR, toC);
        const score = minimax(sim, depth - 1, alpha, beta, !isMaximizing, player, enemy);
        if (isMaximizing) {
          best = Math.max(best, score);
          alpha = Math.max(alpha, score);
        } else {
          best = Math.min(best, score);
          beta = Math.min(beta, score);
        }
        if (beta <= alpha) break search;
      }
    }

  return best;
}

// Score the board from `player`'s perspective.
function evaluate(board, player) {
  const enemy = player === 'blue' ? 'red' : 'blue';

  // Piece count
  let score = countPieces(board, player) - countPieces(board, enemy);

  // Chariot advancement (quadratic — rewards being close to the far rank)
  score += chariotAdvancement(board, player);
  score -= chariotAdvancement(board, enemy);

  return score;
}

// Returns how far `team`'s chariot has advanced toward its goal rank, squared.
// Blue advances from row 0 → 7; red advances from row 7 → 0.
function chariotAdvancement(board, team) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = board[r][c];
      if (p && p.team === team && p.type === 'chariot') {
        const advancement = team === 'blue' ? r : (ROWS - 1 - r);
        return (1 / 10) * advancement * advancement; // 0 at start, 49/10 at far rank
      }
    }
  return 0; // chariot not found (shouldn't happen mid-game)
}

function chooseMoveRed(boardState, player) {
  const enemy = player === 'blue' ? 'red' : 'blue';
  let bestMove = null;
  let bestScore = -Infinity;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const p = boardState[r][c];
      if (!p || p.team !== player) continue;
      for (const [toR, toC] of getValidMoves(boardState, r, c)) {
        const sim = cloneBoard(boardState);
        executeMoveSync(sim, r, c, toR, toC);
        const score = minimax(sim, DEPTH - 1, -Infinity, Infinity, false, player, enemy);
        if (score > bestScore) {
          bestScore = score;
          bestMove = { fromR: r, fromC: c, toR, toC };
        }
      }
    }

  return bestMove;
}
```

---

## Tuning

- **`DEPTH`** — `2` is a reasonable starting point. Each extra level multiplies the
  search tree by roughly the branching factor (~8 moves × 16 pieces), so depth 4–5
  will be noticeably slower in-browser.
- **Evaluation weights** — if the AI is too passive, increase the chariot advancement
  coefficient; if it sacrifices too many pieces, increase the piece count weight.
- **Move ordering** — sorting moves (e.g. captures first) before the loop improves
  alpha-beta pruning efficiency significantly at higher depths.