# Crossbow Castle Defense

A medieval-themed top-down castle defense game. Guard your castle gate from waves of enemies using a crossbow. Defend against footsoldiers, armored knights, and swift archers while collecting power-ups to strengthen your defenses.

## Features

- **Medieval Setting** - Defend your castle from an approaching stone path
- **Wave-based Gameplay** - Fight increasing waves of varied enemies
- **Power-ups** - Collect treasures to boost your weapon:
  - 🔴 Rapid Fire - Speed up your crossbow
  - 🔵 Spread Shot - Fire multiple bolts at once
  - 🟡 Damage Boost - Increase bolt damage
  - 🟢 Healing - Restore castle health
- **Three Enemy Types** - Footsoldiers, Knights, and Archers with different stats
- **Dynamic Difficulty** - Enemy composition changes as waves progress
- **Persistent High Score** - Your best score is saved locally

## How to Play

1. **Move** - Use WASD or Arrow Keys
2. **Aim** - Move your mouse to aim the crossbow
3. **Shoot** - Click or hold mouse button to fire
4. **Collect** - Walk over power-ups to collect them
5. **Survive** - Defend the gate until all enemies are defeated
6. **Restart** - Press R to restart or click to continue after game over

## Run Locally

```bash
# From repository root
python3 -m http.server 8000
# Then open http://localhost:8000
```

Or open `index.html` directly in your browser.

## Game Stats

- **Win Condition** - Survive 100 waves
- **Lose Condition** - Castle health reaches 0
- **Scoring** - Earn points for each enemy defeated (scales with enemy type)
