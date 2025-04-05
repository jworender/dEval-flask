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

// Bonus points notification
let bonusNotifications = [];

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
        this.creationTime = Date.now(); // Track when the circle was created
        this.isFadingOut = false; // Flag to track if the circle is fading out
        this.fadeOutProgress = 0; // Progress of fade out animation (0 to 1)
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
    for (let i = powerCircles.length - 1; i >= 0; i--) {
        const circle = powerCircles[i];
        
        // Check if red or blue orbs have exceeded their 30-second lifetime
        if ((circle.color === "red" || circle.color === "blue") && 
            !circle.isFadingOut && 
            Date.now() - circle.creationTime > 30000) { // 30 seconds in milliseconds
            
            // Start fade out animation
            circle.isFadingOut = true;
            circle.fadeOutProgress = 0;
            
            // Show notification
            showBonusPoints(circle.x * SQ + SQ / 2, circle.y * SQ + SQ / 2, "EXPIRED!");
        }
        
        // Handle fade out animation
        if (circle.isFadingOut) {
            circle.fadeOutProgress += 0.05; // Increment fade out progress
            circle.alpha = Math.max(0, 0.7 - circle.fadeOutProgress); // Reduce alpha based on progress
            
            // Create some particles for the fade out effect
            if (circle.fadeOutProgress % 0.2 < 0.05) { // Create particles at certain intervals
                const centerX = circle.x * SQ + SQ / 2;
                const centerY = circle.y * SQ + SQ / 2;
                const particle = new Particle(centerX, centerY);
                particle.color = `rgba(${circle.getColorRGB()}, ${Math.random() * 0.3 + 0.2})`;
                particles.push(particle);
            }
            
            // Remove the circle when it's fully faded out
            if (circle.alpha <= 0) {
                powerCircles.splice(i, 1);
                continue;
            }
        }
        
        circle.update();
        circle.draw();
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
            showBonusPoints(circle.x * SQ + SQ / 2, circle.y * SQ + SQ / 2, "SLOW DOWN! +10 POINTS");
            
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
            showBonusPoints(circle.x * SQ + SQ / 2, circle.y * SQ + SQ / 2, "SPEED UP! +10 POINTS");
            
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
            showBonusPoints(circle.x * SQ + SQ / 2, circle.y * SQ + SQ / 2, "+100 POINTS!");
            break;
            
        case "destroy":
            // Black circle: destroy the current piece and subtract 10 points
            
            // Subtract 10 points (but don't go below 0)
            score = Math.max(0, score - 10);
            
            // Update the score display
            scoreElement.innerHTML = "Score: " + score;
            
            // Show notification
            showBonusPoints(circle.x * SQ + SQ / 2, circle.y * SQ + SQ / 2, "DESTROYED! -10 POINTS");
            
            // Cancel any ongoing hard drop
            if (p.isHardDropping) {
                p.isHardDropping = false;
            }
            
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
            showBonusPoints(circle.x * SQ + SQ / 2, circle.y * SQ + SQ / 2, "COLUMN BLAST! +25 POINTS");
            
            // Cancel any ongoing hard drop
            if (p.isHardDropping) {
                p.isHardDropping = false;
            }
            
            // Destroy the current piece with an exploding particle effect
            destroyCurrentPiece();
            
            // Create the column effect
            createColumnEffect(circle.x);
            
            // Generate a new piece
            p = randomPiece();
            dropStart = Date.now(); // Reset drop timer for the new piece
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
        
        // Reset the animating flag after the effect is complete
        setTimeout(() => {
            isAnimating = false;
        }, 1000);
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
            return;
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
            continue;
        }
        
        // Draw the particle
        context.fillStyle = particle.color.replace(/[\d.]+\)$/, particle.alpha + ')');
        context.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
}

// Function to disintegrate blocks in the column
function disintegrateBlocks(blocks) {
    // Create particles for each block
    for (const block of blocks) {
        // Create particles at the center of the block
        const centerX = block.c * SQ + SQ / 2;
        const centerY = block.r * SQ + SQ / 2;
        
        // Create 10-15 particles per block
        const particleCount = 10 + Math.floor(Math.random() * 6);
        for (let i = 0; i < particleCount; i++) {
            const particle = new Particle(centerX, centerY);
            // Use the block's color for the particles
            const blockColor = board[block.r][block.c];
            particle.color = blockColor.replace(/rgb/i, 'rgba').replace(/\)/, ', ' + (Math.random() * 0.5 + 0.3) + ')');
            particles.push(particle);
        }
        
        // Clear the block
        board[block.r][block.c] = VACANT;
    }
    
    // Update the board
    drawBoard();
}

// Function to destroy the current piece with particles
function destroyCurrentPiece() {
    // Create particles for each square in the piece
    for (let r = 0; r < p.activeTetromino.length; r++) {
        for (let c = 0; c < p.activeTetromino.length; c++) {
            if (p.activeTetromino[r][c]) {
                // Only create particles for squares that are on the board
                if (p.y + r >= 0) {
                    const centerX = (p.x + c) * SQ + SQ / 2;
                    const centerY = (p.y + r) * SQ + SQ / 2;
                    
                    // Create 8-12 particles per square
                    const particleCount = 8 + Math.floor(Math.random() * 5);
                    for (let i = 0; i < particleCount; i++) {
                        const particle = new Particle(centerX, centerY);
                        // Use the piece's color for the particles
                        particle.color = p.color.replace(/rgb/i, 'rgba').replace(/\)/, ', ' + (Math.random() * 0.5 + 0.3) + ')');
                        particles.push(particle);
                    }
                }
            }
        }
    }
    
    // Undraw the piece
    p.unDraw();
}

// Function to update and draw all particles
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        
        // Remove dead particles
        if (particles[i].life <= 0 || particles[i].alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }
        
        particles[i].draw();
    }
}

// Function to show bonus points notification - make it globally accessible
window.showBonusPoints = function(x, y, text) {
    // If x and y are not provided, show in the center of the board
    if (x === undefined || y === undefined) {
        x = canvas.width / 2;
        y = canvas.height / 2;
    }
    
    bonusNotifications.push({
        x: x,
        y: y,
        text: text,
        life: 60, // 1 second at 60fps
        alpha: 1
    });
};

// Function to update and draw bonus notifications
function updateBonusNotifications() {
    for (let i = bonusNotifications.length - 1; i >= 0; i--) {
        const notification = bonusNotifications[i];
        
        // Update notification
        notification.y -= 1; // Move up
        notification.life--;
        notification.alpha = Math.max(0, notification.life / 60);
        
        // Remove dead notifications
        if (notification.life <= 0) {
            bonusNotifications.splice(i, 1);
            continue;
        }
        
        // Draw notification
        context.font = "bold 16px Arial";
        context.fillStyle = `rgba(255, 255, 255, ${notification.alpha})`;
        context.strokeStyle = `rgba(0, 0, 0, ${notification.alpha})`;
        context.lineWidth = 3;
        context.textAlign = "center";
        context.strokeText(notification.text, notification.x, notification.y);
        context.fillText(notification.text, notification.x, notification.y);
    }
}

// Override the randomPiece function to include power circles
const originalRandomPiece = randomPiece;
randomPiece = function() {
    let piece = originalRandomPiece();
    
    // Randomly decide whether to spawn power circles for this piece
    if (Math.random() < CIRCLE_SPAWN_CHANCE) {
        spawnPowerCircles();
    }
    
    return piece;
};

// Extend the game loop to include power-ups and effects
const originalGameLoop = gameLoop;
gameLoop = function() {
    // Call the original game loop first
    originalGameLoop();
    
    // Skip the rest if game over
    if (gameOver) return;
    
    // Draw power circles
    drawPowerCircles();
    
    // Check for collisions with power circles
    checkCircleCollisions();
    
    // Update and draw particles
    updateParticles();
    
    // Update and draw column effect
    updateColumnEffect();
    
    // Update and draw bonus notifications
    updateBonusNotifications();
};
