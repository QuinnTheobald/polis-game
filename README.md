<h1> Polis - a game of strategy and maneuver </h1>

**Polis** came about while I was working on a steampunk novel. In-world the characters were playing a strategy board game called *polis*, based on the Ancient Greek game of the same name. 
Going down an obsessive rabbit hole, I paused writing for a few days to build out a comprehensive ruleset for the game, playtest it, and iterate. I present to you the web application version
of the board game *polis* as seen in the as-yet-unfinished novel *Gears of Crete*.

Start by checking out the <a href="https://github.com/QuinnTheobald/polis-game/blob/master/polis_rules.pdf" target="_blank">ruleset pdf</a>.

Then <a href="https://quinntheobald.github.io/polis-game/" target="_blank">click here to play</a>.

The rules of polis were designed and tested by me, Quinn Theobald. The application code was written by me with the help of Claude Code. Special thanks to my dad for helping me playtest for hours using small chips on a chessboard. The game is inspired by the ancient Greek board game *polis*, of which no ruleset has survived.

<h2> AI Players </h2>
To build and deploy AI players in the game, do the following:
* Set the aiPlayers variable to turn on AI for one or both sides.
<code> const aiPlayers = { blue: false, red: false }; </code>
* Edit the <code> chooseMove </code> functions for one or both teams with an updated algorithm. The default algorithm selects random moves.
* Useful functions when writing an algorithm to play Polis:

**Enumerating moves**                                                     
  - getValidMoves(board, r, c) — returns all legal [toR, toC] destinations for  
  the piece at (r, c)                                                           
  - isMoveLegal(board, fromR, fromC, toR, toC) — checks a single move for       
  legality

  **Simulating outcomes**
  - cloneBoard(board) — deep-clones the board so you can simulate without
  affecting game state
  - executeMoveSync(board, fromR, fromC, toR, toC) — applies a full move (hops +
   captures + stun) to a board in place; returns the list of captured pieces
  [[r, c], ...]

  **Evaluating positions**
  - checkWin(board) — returns 'blue', 'red', or null
  - hasAnyMoves(board, player) — returns false if the player is stalemated
  - countPieces(board, team) — total piece count for a team
  - computeCaptures(board) — returns what would be captured on the current board
   without applying them
  - computeHops(board, toR, toC) — returns the hops that would result from a
  piece having just moved to (toR, toC)

  **Inspecting board state**
  - checkStunAt(board, r, c) — returns true if the chariot at (r, c) is
  currently surrounded
  - inBounds(r, c) — bounds check