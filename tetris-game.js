// Get DOM elements
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

// Game board constants
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

// Function to spawn power circles in
