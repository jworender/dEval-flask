const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');

// --- Particle System ---
let particles = [];
const PARTICLE_GRAVITY = 0.08;
const PARTICLE_FADE_RATE = 0.015;

// --- Power-up Circle System ---
let powerCircles = [];
const CIRCLE_COLORS = ["blue", "red", "yellow", "black", "purple"];
const CIRCLE_EFFECTS = {
    "blue": "slow",
    "red": "fast",
    "yellow": "points",
    "black": "destroy",
    "purple": "column"
};
// Track active column effect
let activeColumnEffect = null;
let columnParticles = [];

const CIRCLE_SPAWN_CHANCE = 0.3; // 30% chance to spawn circles with a new piece
const MAX_CIRCLES = 3; // Maximum number of circles at once

class PowerCircle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = 10;
        this.maxRadius = 15;
        this.minRadius = 8;
        this.pulseSpeed = 0.1;
        this.pulseDirection = 1; // 1 for growing, -1 for shrinking
        this.alpha = 0.7;
        this.effect = CIRCLE_EFFECTS[color];
    }

    update() {
        // Pulsing effect
        this.radius += this.pulseSpeed * this.pulseDirection;
        if (this.radius >= this.maxRadius) {
            this.radius = this.maxRadius;
            this.pulseDirection = -1;
        } else if (this.radius <= this.minRadius) {
            this.radius = this.minRadius;
            this.pulseDirection = 1;
        }
    }

    draw() {
        context.beginPath();
        context.arc(this.x * SQ + SQ / 2, this.y * SQ + SQ / 2, this.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(${this.getColorRGB()}, ${this.alpha})`;
        context.fill();
        
        // Add a glow effect
        context.shadowColor = this.color;
        context.shadowBlur = 10;
        context.strokeStyle = this.color;
        context.lineWidth = 2;
        context.stroke();
        context.shadowBlur = 0;
    }
    
    getColorRGB() {
        switch(this.color) {
            case "blue": return "0, 0, 255";
            case "red": return "255, 0, 0";
            case "yellow": return "255, 255, 0";
            case "black": return "0, 0, 0";
            case "purple": return "128, 0, 255";
            default: return "255, 255, 255";
        }
    }
    
    explode() {
        // Create explosion particles
        const centerX = this.x * SQ + SQ / 2;
        const centerY = this.y * SQ + SQ / 2;
        const particlesCount = 20;
        
        for (let i = 0; i < particlesCount; i++) {
            const particle = new Particle(centerX, centerY, this.color);
            // Override the default grey color with the circle's color
            particle.color = `rgba(${this.getColorRGB()}, ${Math.random() * 0.5 + 0.5})`;
            particles.push(particle);
        }
    }
}

class Particle {
    constructor(x, y, color = 'grey') { // Default to grey dust
        this.x = x;
        this.y = y;
        this.size = Math.random() * 2.5 + 1;
        this.vx = (Math.random() - 0.5) * 3; // Horizontal velocity
        this.vy = (Math.random() - 0.5) * 3 - Math.random() * 1.5; // Vertical velocity (slight upward bias)
        this.life = 40 + Math.random() * 40; // Lifespan in frames
        this.initialLife = this.life;
        // Use grey for dust effect, ignore passed color for now
        this.color = `rgba(128, 128, 128, ${Math.random() * 0.5 + 0.3})`; // Semi-transparent grey
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += PARTICLE_GRAVITY;
        this.life--;
        // Fade out faster towards the end
        this.alpha = Math.max(0, (this.life / this.initialLife) * 1.5 - 0.5);
    }

    draw() {
        // Update color alpha based on particle alpha
        const rgbaMatch = this.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (rgbaMatch) {
            context.fillStyle = `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${this.alpha})`;
        } else {
             context.fillStyle = this.color; // Fallback
        }
        context.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
    }
}
// --- End Particle System ---


const ROW = 20;
const COL = 10;
const SQ = canvas.width / COL; // Size of one square
const VACANT = "#FFF"; // Color of an empty square

// Draw a square
function drawSquare(x, y, color) {
    context.fillStyle = color;
    context.fillRect(x * SQ, y * SQ, SQ, SQ);

    // Set explicit line width for consistent grid lines
    context.lineWidth = 1; // Ensure thin grid lines
    context.strokeStyle = "#ccc"; // Light grey border for squares
    context.strokeRect(x * SQ, y * SQ, SQ, SQ);
}

// Create the board
let board = [];
for (let r = 0; r < ROW; r++) {
    board[r] = [];
    for (let c = 0; c < COL; c++) {
        board[r][c] = VACANT;
    }
}

// Draw the board
function drawBoard() {
    for (let r = 0; r < ROW; r++) {
        for (let c = 0; c < COL; c++) {
            drawSquare(c, r, board[r][c]);
        }
    }
}

drawBoard();

// Define Tetromino shapes (need to be defined before PIECES array)
const Z = [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]]
];

const S = [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]]
];

const T = [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]]
];

const O = [
    [[1, 1], [1, 1]]
];

const L = [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]]
];

const I = [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]
];

const J = [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]]
];

// The pieces and their colors
const PIECES = [
    [Z, "red"],
    [S, "green"],
    [T, "yellow"],
    [O, "blue"],
    [L, "purple"],
    [I, "cyan"],
    [J, "orange"]
];

// Generate random pieces
function randomPiece() {
    let r = Math.floor(Math.random() * PIECES.length); // 0 -> 6
    let piece = new Piece(PIECES[r][0], PIECES[r][1]);
    
    // Clear any existing power circles when a new piece is created
    powerCircles = [];
    
    // Randomly decide whether to spawn power circles for this piece
    if (Math.random() < CIRCLE_SPAWN_CHANCE) {
        spawnPowerCircles();
    }
    
    return piece;
}

// Function to spawn power circles in empty spaces
function spawnPowerCircles() {
    // Only spawn circles if we're below the maximum
    if (powerCircles.length >= MAX_CIRCLES) return;
    
    // Create a map of occupied spaces
    let occupiedSpaces = {};
    for (let r = 0; r < ROW; r++) {
        for (let c = 0; c < COL; c++) {
            if (board[r][c] !== VACANT) {
                occupiedSpaces[`${c},${r}`] = true;
            }
        }
    }
    
    // Try to spawn 1-3 circles
    const numCirclesToSpawn = Math.floor(Math.random() * 3) + 1;
    let attempts = 0;
    const maxAttempts = 50; // Prevent infinite loops
    
    while (powerCircles.length < numCirclesToSpawn && attempts < maxAttempts) {
        attempts++;
        
        // Generate random position
        const x = Math.floor(Math.random() * COL);
        const y = Math.floor(Math.random() * (ROW - 4)) + 4; // Keep circles in lower 3/4 of board
        
        // Check if position is vacant
        if (!occupiedSpaces[`${x},${y}`]) {
            // Choose a random color with weighted probability
            // Yellow circles have 1/4 the probability of red or blue
            // Black circles have 1/5 the probability of red or blue
            // Purple circles (column effect) are the rarest
            let colorIndex;
            const rand = Math.random();
            if (rand < 0.05) { // 5% chance for purple (column effect)
                colorIndex = 4; // Purple
            } else if (rand < 0.15) { // 10% chance for yellow
                colorIndex = 2; // Yellow
            } else if (rand < 0.23) { // 8% chance for black
                colorIndex = 3; // Black
            } else if (rand < 0.615) { // 38.5% chance for blue
                colorIndex = 0; // Blue
            } else { // 38.5% chance for red
                colorIndex = 1; // Red
            }
            const color = CIRCLE_COLORS[colorIndex];
            
            // Create and add the circle
            powerCircles.push(new PowerCircle(x, y, color));
            
            // Mark this space as occupied
            occupiedSpaces[`${x},${y}`] = true;
        }
    }
}

// Function to draw all power circles
function drawPowerCircles() {
    for (let i = 0; i < powerCircles.length; i++) {
        powerCircles[i].update();
        powerCircles[i].draw();
    }
}

// Function to check if the piece intersects with any power circles
function checkCircleCollisions() {
    if (powerCircles.length === 0) return;
    
    // Get the coordinates of all squares in the current piece
    let pieceSquares = [];
    for (let r = 0; r < p.activeTetromino.length; r++) {
        for (let c = 0; c < p.activeTetromino.length; c++) {
            if (p.activeTetromino[r][c]) {
                pieceSquares.push({x: p.x + c, y: p.y + r});
            }
        }
    }
    
    // Check each circle for collision with any square in the piece
    for (let i = powerCircles.length - 1; i >= 0; i--) {
        const circle = powerCircles[i];
        
        for (const square of pieceSquares) {
            // Skip if the square is above the board
            if (square.y < 0) continue;
            
            // Check if the square overlaps with the circle
            if (square.x === circle.x && square.y === circle.y) {
                // Apply the effect
                applyCircleEffect(circle);
                
                // Create explosion effect
                circle.explode();
                
                // Remove the circle
                powerCircles.splice(i, 1);
                break;
            }
        }
    }
}

// Function to apply the effect of a power circle
function applyCircleEffect(circle) {
    switch(circle.effect) {
        case "slow":
            // Blue circle: half speed + 10 points
            dropSpeed *= 2; // Double the time between drops = half speed
            
            // Add 10 points
            score += 10;
            
            // Update the score display
            scoreElement.innerHTML = "Score: " + score;
            
            // Show notification
            showBonusPoints(0, "SLOW DOWN! +10 POINTS");
            
            // Reset speed after 5 seconds
            setTimeout(() => {
                // Only reset if we're not in game over state
                if (!gameOver) {
                    // Recalculate the normal speed based on level
                    dropSpeed = Math.max(100, 1000 - (level - 1) * 100);
                }
            }, 5000);
            break;
            
        case "fast":
            // Red circle: double speed + 10 points
            dropSpeed = Math.max(50, dropSpeed / 2); // Half the time between drops = double speed
            
            // Add 10 points
            score += 10;
            
            // Update the score display
            scoreElement.innerHTML = "Score: " + score;
            
            // Show notification
            showBonusPoints(0, "SPEED UP! +10 POINTS");
            
            // Reset speed after 5 seconds
            setTimeout(() => {
                // Only reset if we're not in game over state
                if (!gameOver) {
                    // Recalculate the normal speed based on level
                    dropSpeed = Math.max(100, 1000 - (level - 1) * 100);
                }
            }, 5000);
            break;
            
        case "points":
            // Yellow circle: 100 extra points (reduced from 500)
            score += 100;
            
            // Update the score display
            scoreElement.innerHTML = "Score: " + score;
            
            // Show notification
            showBonusPoints(0, "+100 POINTS!");
            break;
            
        case "destroy":
            // Black circle: destroy the current piece and subtract 10 points
            
            // Subtract 10 points (but don't go below 0)
            score = Math.max(0, score - 10);
            
            // Update the score display
            scoreElement.innerHTML = "Score: " + score;
            
            // Show notification
            showBonusPoints(0, "DESTROYED! -10 POINTS");
            
            // Create explosion particles for the entire piece
            destroyCurrentPiece();
            
            // Generate a new piece
            p = randomPiece();
            dropStart = Date.now(); // Reset drop timer for the new piece
            break;
            
        case "column":
            // Purple circle: create a vertical column of light that disintegrates blocks
            
            // Add 25 points
            score += 25;
            
            // Update the score display
            scoreElement.innerHTML = "Score: " + score;
            
            // Show notification
            showBonusPoints(0, "COLUMN BLAST! +25 POINTS");
            
            // Create the column effect
            createColumnEffect(circle.x);
            break;
    }
}

// Function to create the column of light effect
function createColumnEffect(columnX) {
    // Set the animating flag to true so the game pauses during the effect
    isAnimating = true;
    
    // Store the column position
    activeColumnEffect = {
        x: columnX,
        stage: 0, // 0: growing, 1: stable, 2: fading
        width: 0,
        maxWidth: SQ,
        alpha: 0,
        maxAlpha: 0.8,
        duration: 0,
        maxDuration: 30 // frames to stay at full intensity
    };
    
    // Create initial particles for the column
    createColumnParticles(columnX);
    
    // Find blocks in the column to disintegrate
    let blocksToDisintegrate = [];
    for (let r = 0; r < ROW; r++) {
        if (board[r][columnX] !== VACANT) {
            blocksToDisintegrate.push({r, c: columnX});
        }
    }
    
    // Disintegrate the blocks after a short delay
    setTimeout(() => {
        disintegrateBlocks(blocksToDisintegrate);
    }, 500);
}

// Function to create particles for the column effect
function createColumnParticles(columnX) {
    // Clear any existing column particles
    columnParticles = [];
    
    // Create particles along the column
    for (let r = 0; r < ROW; r++) {
        // Create more particles at the top and bottom for a "source" effect
        const particleDensity = (r < 3 || r > ROW - 4) ? 3 : 1;
        
        for (let i = 0; i < particleDensity; i++) {
            // Random position within the column
            const x = columnX * SQ + Math.random() * SQ;
            const y = r * SQ + Math.random() * SQ;
            
            // Create a particle with special properties for the column effect
            const particle = {
                x: x,
                y: y,
                size: Math.random() * 3 + 1,
                vx: (Math.random() - 0.5) * 1, // Slight horizontal movement
                vy: (Math.random() - 0.5) * 3, // Vertical movement
                color: `rgba(128, 0, 255, ${Math.random() * 0.7 + 0.3})`,
                life: 30 + Math.random() * 60,
                initialLife: 30 + Math.random() * 60,
                alpha: Math.random() * 0.7 + 0.3
            };
            
            columnParticles.push(particle);
        }
    }
}

// Function to update and draw the column effect
function updateColumnEffect() {
    if (!activeColumnEffect) return;
    
    // Draw the column of light
    const col = activeColumnEffect;
    
    // Update the column state
    if (col.stage === 0) { // Growing
        col.width = Math.min(col.maxWidth, col.width + col.maxWidth / 10);
        col.alpha = Math.min(col.maxAlpha, col.alpha + col.maxAlpha / 10);
        
        if (col.width >= col.maxWidth && col.alpha >= col.maxAlpha) {
            col.stage = 1; // Move to stable stage
        }
    } else if (col.stage === 1) { // Stable
        col.duration++;
        if (col.duration >= col.maxDuration) {
            col.stage = 2; // Move to fading stage
        }
    } else if (col.stage === 2) { // Fading
        col.alpha = Math.max(0, col.alpha - col.maxAlpha / 20);
        
        if (col.alpha <= 0) {
            activeColumnEffect = null; // Remove the effect
        }
    }
    
    // Draw the column if it's active
    if (activeColumnEffect) {
        // Create a gradient for the column
        const gradient = context.createLinearGradient(
            col.x * SQ + SQ/2 - col.width/2, 0,
            col.x * SQ + SQ/2 + col.width/2, 0
        );
        gradient.addColorStop(0, `rgba(128, 0, 255, 0)`);
        gradient.addColorStop(0.5, `rgba(128, 0, 255, ${col.alpha})`);
        gradient.addColorStop(1, `rgba(128, 0, 255, 0)`);
        
        // Draw the column
        context.fillStyle = gradient;
        context.fillRect(col.x * SQ + SQ/2 - col.width/2, 0, col.width, canvas.height);
        
        // Add a glow effect
        context.shadowColor = 'rgba(128, 0, 255, 0.8)';
        context.shadowBlur = 15;
        context.strokeStyle = 'rgba(200, 100, 255, 0.5)';
        context.lineWidth = 2;
        context.strokeRect(col.x * SQ + SQ/2 - col.width/2, 0, col.width, canvas.height);
        context.shadowBlur = 0;
    }
    
    // Update and draw column particles
    for (let i = columnParticles.length - 1; i >= 0; i--) {
        const particle = columnParticles[i];
        
        // Update particle position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        
        // Update alpha based on life
        particle.alpha = Math.max(0, (particle.life / particle.initialLife) * 1.5 - 0.5);
        
        // Remove dead particles
        if (particle.life <= 0 || particle.alpha <= 0) {
            columnParticles.splice(i, 1);
            
            // Add new particles to maintain the effect while active
            if (activeColumnEffect && activeColumnEffect.stage < 2 && Math.random() < 0.3) {
                const r = Math.floor(Math.random() * ROW);
                const x = activeColumnEffect.x * SQ + Math.random() * SQ;
                const y = r * SQ + Math.random() * SQ;
                
                columnParticles.push({
                    x: x,
                    y: y,
                    size: Math.random() * 3 + 1,
                    vx: (Math.random() - 0.5) * 1,
                    vy: (Math.random() - 0.5) * 3,
                    color: `rgba(128, 0, 255, ${Math.random() * 0.7 + 0.3})`,
                    life: 30 + Math.random() * 60,
                    initialLife: 30 + Math.random() * 60,
                    alpha: Math.random() * 0.7 + 0.3
                });
            }
            continue;
        }
        
        // Draw the particle
        context.fillStyle = particle.color.replace(/[\d\.]+\)$/, `${particle.alpha})`);
        context.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
        );
    }
    
    // Check if the effect is complete
    if (!activeColumnEffect && columnParticles.length === 0) {
        isAnimating = false;
        
        // Always generate a new piece when the column effect is complete
        p = randomPiece();
        dropStart = Date.now();
        
        console.log("Column effect complete, new piece generated");
    }
}

// Function to disintegrate blocks in the column
function disintegrateBlocks(blocks) {
    if (blocks.length === 0) return;
    
    // Create particles for each block
    for (const block of blocks) {
        const centerX = block.c * SQ + SQ / 2;
        const centerY = block.r * SQ + SQ / 2;
        
        // Create particles for the disintegration effect
        for (let i = 0; i < 10; i++) {
            const particle = new Particle(centerX, centerY);
            
            // Use purple/white particles for the disintegration
            const brightness = Math.floor(Math.random() * 155) + 100; // 100-255
            particle.color = `rgba(${brightness}, ${Math.floor(brightness/2)}, 255, ${Math.random() * 0.7 + 0.3})`;
            
            // Add to the main particles array
            particles.push(particle);
        }
        
        // Clear the block on the board
        board[block.r][block.c] = VACANT;
    }
    
    // Add points based on the number of blocks disintegrated
    const pointsEarned = blocks.length * 15;
    if (pointsEarned > 0) {
        score += pointsEarned;
        scoreElement.innerHTML = "Score: " + score;
        showBonusPoints(0, `+${pointsEarned} POINTS!`);
    }
    
    // Redraw the board
    drawBoard();
}

// Function to destroy the current piece with explosion effect
function destroyCurrentPiece() {
    // Set the animating flag to true so the game pauses during the explosion
    isAnimating = true;
    
    // Create explosion particles for each square in the piece
    for (let r = 0; r < p.activeTetromino.length; r++) {
        for (let c = 0; c < p.activeTetromino.length; c++) {
            if (p.activeTetromino[r][c]) {
                // Only create particles for filled squares
                const x = (p.x + c) * SQ + SQ / 2;
                const y = (p.y + r) * SQ + SQ / 2;
                
                // Create more particles for a bigger explosion
                for (let i = 0; i < 8; i++) {
                    const particle = new Particle(x, y);
                    // Use dark gray/black particles for destruction
                    particle.color = `rgba(30, 30, 30, ${Math.random() * 0.7 + 0.3})`;
                    // Add some red particles for a more dramatic explosion
                    if (i % 3 === 0) {
                        particle.color = `rgba(200, 0, 0, ${Math.random() * 0.7 + 0.3})`;
                    }
                    particles.push(particle);
                }
            }
        }
    }
    
    // Undraw the current piece
    p.unDraw();
    
    // Note: The game loop will automatically create a new piece when the animation is complete
}

let p = randomPiece();

// The Piece object
function Piece(tetromino, color) {
    this.tetromino = tetromino;
    this.color = color;

    this.tetrominoN = 0; // Start from the first pattern
    this.activeTetromino = this.tetromino[this.tetrominoN];

    // Control the pieces
    this.x = 3; // Start position slightly to the center
    this.y = -2; // Start above the visible board
}

// Fill function
Piece.prototype.fill = function(color) {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            // Draw only occupied squares
            if (this.activeTetromino[r][c]) {
                drawSquare(this.x + c, this.y + r, color);
            }
        }
    }
}

// Draw a piece to the board
Piece.prototype.draw = function() {
    this.fill(this.color);
}

// Undraw a piece
Piece.prototype.unDraw = function() {
    this.fill(VACANT);
}

// Move Down the piece
Piece.prototype.moveDown = function() {
    // Don't allow movement during animation
    if (isAnimating) return;
    
    if (!this.collision(0, 1, this.activeTetromino)) {
        this.unDraw();
        this.y++;
        this.draw();
    } else {
        // Collision detected below, so lock at CURRENT position
        this.lock();
        // Check if game over occurred during lock()
        // if (!gameOver) { // Logic moved to gameLoop
        //      p = randomPiece();
        // }
    }
}

// Move Right the piece
Piece.prototype.moveRight = function() {
    if (!this.collision(1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x++;
        this.draw();
    }
}

// Move Left the piece
Piece.prototype.moveLeft = function() {
    if (!this.collision(-1, 0, this.activeTetromino)) {
        this.unDraw();
        this.x--;
        this.draw
