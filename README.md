# Tetris Game with Power-ups

A JavaScript implementation of the classic Tetris game with added power-ups, particle effects, and a leaderboard system.

## Features

### Game Layout
- Game board on the left
- Instructions panel in the middle
- Leaderboard on the right

### Core Game Mechanics
- All standard Tetris pieces (I, J, L, O, S, T, Z)
- Piece movement (left, right, down)
- Piece rotation
- Line clearing and scoring
- Level progression based on score
- Game over detection

### Power-ups System
- **Blue orbs**: Slow down the game speed temporarily (+10 points)
- **Red orbs**: Speed up the game temporarily (+10 points)
- **Yellow orbs**: Award bonus points (+100 points)
- **Black orbs**: Destroy the current piece (-10 points)
- **Purple orbs**: Create a column blast effect that clears blocks in a vertical line (+25 points)

### Progressive Scoring System
- 1 row cleared: 10 points
- 2 rows cleared: 20 points
- 3 rows cleared: 40 points
- 4 rows cleared: 80 points
- Visual notification when multiple rows are cleared simultaneously

### Visual Effects
- Particle explosion animations when rows are eliminated
- Particle effects for power-up activations
- Pulsing animation for power-up orbs
- Fade-in/fade-out animations for notifications
- Column blast effect with glowing particles

### Game Over & Restart
- Press any key to restart the game after game over
- High score system with leaderboard functionality
- Prompt for initials when achieving a high score

### Leaderboard System
- Tracks top 10 high scores with player initials
- Scores are saved to localStorage for persistence
- New high scores trigger a modal for entering initials
- Automatically updates the leaderboard display

## How to Play

1. Open `tetris-game.html` in a web browser
2. Use the arrow keys to control the falling pieces:
   - Left Arrow: Move piece left
   - Right Arrow: Move piece right
   - Down Arrow: Quickly drop piece to the bottom
   - Up Arrow: Rotate piece
3. Try to clear as many lines as possible to score points
4. Collect power-up orbs for special effects
5. The game ends when the blocks stack up to the top

## Files

- `tetris-game.html`: Contains the HTML structure and CSS styling
- `tetris-core.js`: Implements the core Tetris game mechanics, scoring system, and leaderboard functionality
- `tetris-powerups.js`: Adds power-ups and special effects

## Implementation Details

The game is built using vanilla JavaScript, HTML, and CSS. It uses the HTML5 Canvas API for rendering the game board and animations. The leaderboard data is stored in the browser's localStorage to persist between sessions.
