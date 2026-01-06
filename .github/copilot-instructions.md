# Copilot instructions for Game---Xbow

This is a small, static browser game (top-down castle defense) implemented with a single-page canvas app.
Follow these project-specific rules when making code changes or generating new code.

- **Big picture:** client-only static site. The game loop, input handling, rendering, and game state live in `src/game.js`. `index.html` mounts a `<canvas id="game">` and includes `src/game.js` as a module. Styling lives in `style.css`. No build system or server-side components.

- **Run / debug:** open `index.html` directly in a browser, or serve the repo root and open `http://localhost:8000`. Example command from repo root:

  python3 -m http.server 8000

- **Key files and patterns:**
  - `index.html` — game entry, includes `src/game.js` as `type="module"`.
  - `src/game.js` — single-file game implementation. Main loop uses `requestAnimationFrame` and `performance.now()`; game states are strings: `menu`, `playing`, `gameover`.
  - `style.css` — small global styles and a fixed HUD overlay.
  - `README.md` — run instructions. Keep it in sync if run steps change.

- **State & data flow:** input (keyboard/mouse events) updates global `keys` and `mouse` objects → `update(dt)` advances game objects (player, arrows, enemies, pickups, particles) → `draw()` renders via canvas. Score and high-score are persisted to `localStorage` using key `xbow_highscore_v1`.

- **Conventions to preserve:**
  - Single-file game logic: prefer adding new classes or small helper modules in `src/` and import them; avoid splitting core game loop across many files without clear separation.
  - Use back-to-front array iteration when mutating arrays during updates (the code already uses `for (let i=arr.length-1;i>=0;i--)` and `splice`). Follow that pattern to avoid index bugs.
  - Use `requestAnimationFrame` timing and clamp `dt` (the code uses `Math.min(0.05, ...)`) to keep updates stable.
  - For audio, the app suspends AudioContext until a user gesture. Use `resumeAudioOnGesture()` before calling `playSound` if adding audio behaviors.

- **Project-specific knobs to know (examples):**
  - Wave & spawn tuning lives in `startWave()`, `spawnEnemy()`, and `WAVE_MAX`.
  - Weapon/pickup behavior: the `weapon` object (`name`, `damage`, `cooldown`, `spread`) and pickup `kind`s `['fire','spread','damage','heal']` — change here to add new pickups or weapons.
  - Castle and gate: `castle` object controls gate position/health; collisions with enemies reduce `castle.health`.

- **Safe changes checklist:**
  - Preserve the requestAnimationFrame loop and `update(dt)` contract (accepts seconds, bounded by 0.05).
  - When mutating arrays during loops, iterate backward or mark removals to avoid skipping items.
  - Keep input handling centralized on `keys` and `mouse` globals unless you intentionally refactor input abstraction.

- **No-op / low-impact PRs:** small visual tweaks in `style.css`, HUD text changes in `draw()`, or tuning numeric constants in `src/game.js` are appropriate small PRs.

- **When adding tests or automation:** there is currently no JS test harness or package.json. If tests are needed, add a minimal npm setup with clear instructions in `README.md`. Otherwise, prefer manual browser testing and simple unit extraction into importable functions.

If anything here is unclear or you'd like more examples (for instance, how to add a new enemy type or weapon), tell me which area and I'll extend the instructions and add inline code examples.
