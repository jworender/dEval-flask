// Get DOM elements
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');

// Game board constants
const ROW = 19; // Extended by 3 blocks as requested
const COL = 10;
const SQ = 24; // Size of one square (240px / 10 columns = 24px)
const VACANT = "#FFF"; // Color of an empty square

// Game state variables
let score = 0;
let level = 1;
let rowsCleared = 0;
let dropSpeed = 1000; // Initial drop speed in ms
let isAnimating = false; // Flag to pause game during animation
let gameOver = false;
let dropStart = Date.now();
let waitingForInitials = false;
let currentInitials = "";

// Leaderboard
const MAX_LEADERBOARD_ENTRIES = 10;
let leaderboard = [
    { initials: "JWO", score: 12700 },
    { initials: "JWO", score: 2590 },
    { initials: "JWO", score: 1940 },
    { initials: "JWO", score: 1790 },
    { initials: "JWO", score: 1010 },
    { initials: "JWO", score: 930 },
    { initials: "JWO", score: 460 },
    { initials: "JWO", score: 100 },
    { initials: "JWO", score: 20 },
    { initials: "---", score: 0 }
];

// Load leaderboard from localStorage if available
function loadLeaderboard() {
    const savedLeaderboard = localStorage.getItem('tetrisLeaderboard');
    if (savedLeaderboard) {
        leaderboard = JSON.parse(savedLeaderboard);
    }
    updateLeaderboardDisplay();
}

// Save leaderboard to localStorage
function saveLeaderboard() {
    localStorage.setItem('tetrisLeaderboard', JSON.stringify(leaderboard));
    updateLeaderboardDisplay();
}

// Update the leaderboard display
function updateLeaderboardDisplay() {
    const leaderboardElement = document.getElementById('leaderboard-entries');
    if (!leaderboardElement) return;
    
    // Clear existing entries
    leaderboardElement.innerHTML = '';
    
    // Add new entries
    for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        
        // Create a list item
        const listItem = document.createElement('li');
        listItem.className = 'leaderboard-entry';
        
        // Create a div for the rank
        const rankDiv = document.createElement('div');
        rankDiv.className = 'entry-rank';
        rankDiv.textContent = (i + 1) + '.';
        
        // Create a div for the initials
        const initialsDiv = document.createElement('div');
        initialsDiv.className = 'entry-initials';
        initialsDiv.textContent = entry.initials;
        
        // Create a div for the score
        const scoreDiv = document.createElement('div');
        scoreDiv.className = 'entry-score';
        scoreDiv.textContent = entry.score;
        
        // Add all divs to the list item
        listItem.appendChild(rankDiv);
        listItem.appendChild(initialsDiv);
        listItem.appendChild(scoreDiv);
        
        // Add the list item to the leaderboard
        leaderboardElement.appendChild(listItem);
    }
}

// Check if the score qualifies for the leaderboard
function checkLeaderboard() {
    // Find the position where the current score would fit
    let position = -1;
    for (let i = 0; i < leaderboard.length; i++) {
        if (score > leaderboard[i].score) {
            position = i;
            break;
        }
    }
    
    // If the score qualifies for the leaderboard
    if (position !== -1) {
        waitingForInitials = true;
        currentInitials = "";
        return true;
    }
    
    return false;
}

// Add a new entry to the leaderboard
function addLeaderboardEntry(initials, score) {
    // Find the position where the score fits
    let position = leaderboard.length;
    for (let i = 0; i < leaderboard.length; i++) {
        if (score > leaderboard[i].score) {
            position = i;
            break;
        }
    }
    
    // Insert the new entry
    leaderboard.splice(position, 0, { initials, score });
    
    // Trim the leaderboard to the maximum size
    if (leaderboard.length > MAX_LEADERBOARD_ENTRIES) {
        leaderboard = leaderboard.slice(0, MAX_LEADERBOARD_ENTRIES);
    }
    
    // Save the updated leaderboard
    saveLeaderboard();
}

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

// Define Tetromino shapes
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
    return piece;
}

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
        this.draw();
    }
}

// Rotate the piece
Piece.prototype.rotate = function() {
    let nextPattern = this.tetromino[(this.tetrominoN + 1) % this.tetromino.length];
    let kick = 0;

    if (this.collision(0, 0, nextPattern)) {
        if (this.x > COL / 2) {
            // It's the right wall
            kick = -1; // Move piece left
        } else {
            // It's the left wall
            kick = 1; // Move piece right
        }
    }

    if (!this.collision(kick, 0, nextPattern)) {
        this.unDraw();
        this.x += kick;
        this.tetrominoN = (this.tetrominoN + 1) % this.tetromino.length; // (0+1)%4 => 1
        this.activeTetromino = this.tetromino[this.tetrominoN];
        this.draw();
    }
}

// Hard drop the piece
Piece.prototype.hardDrop = function() {
    // Set a flag to prevent other actions during hard drop
    this.isHardDropping = true;
    
    // Create a function for the animated drop
    const animatedDrop = () => {
        // If the piece has been destroyed (e.g., by a black orb), stop the animation
        if (!this.isHardDropping) {
            return;
        }
        
        // If we can move down, do so
        if (!this.collision(0, 1, this.activeTetromino)) {
            this.unDraw();
            this.y++;
            this.draw();
            
            // Check for collisions with power circles after each step
            checkCircleCollisions();
            
            // If the piece has been destroyed by a power circle, stop the animation
            if (!this.isHardDropping) {
                return;
            }
            
            // Continue the animation with a small delay (30ms)
            setTimeout(animatedDrop, 30);
        } else {
            // We've hit bottom or another piece, lock it
            this.isHardDropping = false;
            this.lock();
        }
    };
    
    // Start the animation
    animatedDrop();
}

// Collision detection
Piece.prototype.collision = function(x, y, piece) {
    for (let r = 0; r < piece.length; r++) {
        for (let c = 0; c < piece.length; c++) {
            // If the square is empty, skip it
            if (!piece[r][c]) {
                continue;
            }
            // Coordinates of the piece after movement
            let newX = this.x + c + x;
            let newY = this.y + r + y;

            // Conditions
            if (newX < 0 || newX >= COL || newY >= ROW) {
                return true; // Collision with walls or bottom
            }
            // Skip newY < 0; board[-1] will crush our game
            if (newY < 0) {
                continue;
            }
            // Check if there is a locked piece already in place
            if (board[newY][newX] != VACANT) {
                return true; // Collision with another piece
            }
        }
    }
    return false;
}

// Lock the piece when it lands
Piece.prototype.lock = function() {
    for (let r = 0; r < this.activeTetromino.length; r++) {
        for (let c = 0; c < this.activeTetromino.length; c++) {
            // Skip the vacant squares
            if (!this.activeTetromino[r][c]) {
                continue;
            }
            // Pieces to lock on top = game over
            if (this.y + r < 0) {
                // Game over
                gameOver = true;
                break;
            }
            // Lock the piece
            board[this.y + r][this.x + c] = this.color;
        }
    }
    
    // Find and count full rows
    let fullRows = [];
    for (let r = 0; r < ROW; r++) {
        let isRowFull = true;
        
        for (let c = 0; c < COL; c++) {
            isRowFull = isRowFull && (board[r][c] != VACANT);
        }
        
        if (isRowFull) {
            fullRows.push(r);
        }
    }
    
    // If we have full rows, clear them and award points
    if (fullRows.length > 0) {
        // Calculate points based on number of rows cleared
        let pointsAwarded = 0;
        switch (fullRows.length) {
            case 1:
                pointsAwarded = 10; // 1 row = 10 points
                break;
            case 2:
                pointsAwarded = 20; // 2 rows = 20 points
                break;
            case 3:
                pointsAwarded = 40; // 3 rows = 40 points
                break;
            case 4:
                pointsAwarded = 80; // 4 rows = 80 points
                break;
        }
        
        // Add points to score
        score += pointsAwarded;
        
        // Show notification for multiple rows
        if (fullRows.length > 1) {
            showBonusPoints(canvas.width / 2, canvas.height / 2, 
                `${fullRows.length} ROWS! +${pointsAwarded} POINTS`);
        }
        
        // First, create particle explosions for all blocks in full rows
        for (let i = 0; i < fullRows.length; i++) {
            const r = fullRows[i];
            
            // Create particle explosions for each block in the row
            for (let c = 0; c < COL; c++) {
                if (board[r][c] !== VACANT) {
                    // Create particles at the center of the block
                    const centerX = c * SQ + SQ / 2;
                    const centerY = r * SQ + SQ / 2;
                    
                    // Create 8-12 particles per block
                    const particleCount = 8 + Math.floor(Math.random() * 5);
                    for (let j = 0; j < particleCount; j++) {
                        const particle = new Particle(centerX, centerY);
                        // Use the block's color for the particles
                        const blockColor = board[r][c];
                        particle.color = blockColor.replace(/rgb/i, 'rgba').replace(/\)/, ', ' + (Math.random() * 0.5 + 0.3) + ')');
                        particles.push(particle);
                    }
                }
            }
        }
        
        // Then, clear the rows (from bottom to top to avoid issues)
        fullRows.sort((a, b) => b - a); // Sort in descending order
        
        // Create a temporary copy of the board
        let newBoard = [];
        for (let r = 0; r < ROW; r++) {
            newBoard[r] = [];
            for (let c = 0; c < COL; c++) {
                newBoard[r][c] = board[r][c];
            }
        }
        
        // Clear the full rows and shift rows down
        let rowsShifted = 0;
        for (let r = ROW - 1; r >= 0; r--) {
            // Check if this row is in the fullRows array
            if (fullRows.includes(r)) {
                rowsShifted++;
                continue; // Skip this row as it's full
            }
            
            // Copy this row to the new position (shifted down by rowsShifted)
            if (r + rowsShifted < ROW) {
                for (let c = 0; c < COL; c++) {
                    newBoard[r + rowsShifted][c] = board[r][c];
                }
            }
        }
        
        // Fill the top rows with vacant cells
        for (let r = 0; r < rowsShifted; r++) {
            for (let c = 0; c < COL; c++) {
                newBoard[r][c] = VACANT;
            }
        }
        
        // Update the board
        board = newBoard;
        
        // Update level every 100 points
        level = Math.floor(score / 100) + 1;
        
        // Update the score display
        scoreElement.innerHTML = "Score: " + score;
        levelElement.innerHTML = "Level: " + level;
        
        // Update drop speed based on level
        dropSpeed = Math.max(100, 1000 - (level - 1) * 100);
    }
    
    // Update the board
    drawBoard();
    
    // Generate a new piece if not game over
    if (!gameOver) {
        p = randomPiece();
    }
}

// Initialize the game
let p = randomPiece();

// Control the piece
document.addEventListener("keydown", function(event) {
    // Don't handle key presses while waiting for initials
    if (waitingForInitials) return;
    
    if (gameOver) {
        // Any key press restarts the game when game over
        resetGame();
        return;
    }
    
    if (event.keyCode == 37) { // Left arrow
        p.moveLeft();
        dropStart = Date.now(); // Reset drop timer after manual move
    } else if (event.keyCode == 38) { // Up arrow (rotate)
        p.rotate();
        dropStart = Date.now();
    } else if (event.keyCode == 39) { // Right arrow
        p.moveRight();
        dropStart = Date.now();
    } else if (event.keyCode == 40) { // Down arrow (hard drop)
        p.hardDrop();
        // No need to reset dropStart since a new piece will be created after lock
    }
});

// Function to reset the game
function resetGame() {
    // Clear the board
    for (let r = 0; r < ROW; r++) {
        for (let c = 0; c < COL; c++) {
            board[r][c] = VACANT;
        }
    }
    
    // Reset game variables
    score = 0;
    level = 1;
    dropSpeed = 1000;
    gameOver = false;
    
    // Clear power circles and particles if they exist
    if (typeof powerCircles !== 'undefined') {
        powerCircles = [];
    }
    if (typeof particles !== 'undefined') {
        particles = [];
    }
    
    // Update displays
    scoreElement.innerHTML = "Score: " + score;
    levelElement.innerHTML = "Level: " + level;
    
    // Generate a new piece
    p = randomPiece();
    dropStart = Date.now();
    
    // Make sure the game loop continues
    requestAnimationFrame(gameLoop);
}

// Game loop
function gameLoop() {
    // Clear canvas for fresh draw
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (gameOver) {
        // Check if the score qualifies for the leaderboard
        if (!waitingForInitials && checkLeaderboard()) {
            // Show the high score modal
            const modal = document.getElementById('high-score-modal');
            const finalScoreSpan = document.getElementById('final-score');
            const initialsInput = document.getElementById('initials-input');
            
            // Set the final score
            finalScoreSpan.textContent = score;
            
            // Show the modal
            modal.style.display = 'flex';
            
            // Focus on the initials input
            initialsInput.focus();
            
            // Set up the submit button
            const submitButton = document.getElementById('submit-score');
            submitButton.onclick = function() {
                // Get the initials (convert to uppercase and limit to 3 characters)
                let initials = initialsInput.value.toUpperCase().substring(0, 3);
                
                // If less than 3 characters, pad with dashes
                while (initials.length < 3) {
                    initials += '-';
                }
                
                // Add the entry to the leaderboard
                addLeaderboardEntry(initials, score);
                
                // Hide the modal
                modal.style.display = 'none';
                
                // Reset the waiting flag
                waitingForInitials = false;
                
                // Reset the game
                resetGame();
            };
            
            // Set up the initials input to submit on Enter key
            initialsInput.onkeydown = function(event) {
                if (event.key === 'Enter') {
                    submitButton.click();
                }
            };
            
            return; // Stop the rest of the game loop
        }
        
        // Draw the board in the background
        drawBoard();
        // Show game over message
        context.fillStyle = "rgba(0, 0, 0, 0.8)";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#FFF";
        context.font = "30px Arial";
        context.textAlign = "center";
        context.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
        context.font = "20px Arial";
        context.fillText("Press any key to restart", canvas.width / 2, canvas.height / 2 + 40);
        return; // Stop the rest of the game loop
    }

    // Draw the static board first
    drawBoard();
    
    // Draw the current piece
    p.draw();

    // Check for automatic drop
    let now = Date.now();
    let delta = now - dropStart;
    if (delta > dropSpeed) { // Use dynamic drop speed based on level
        p.moveDown(); // This might trigger lock -> animation
        dropStart = now; // Reset timer AFTER the drop attempt interval check
    }

    // Always request the next frame
    requestAnimationFrame(gameLoop);
}

// Initialize the leaderboard
loadLeaderboard();

// Initialize level display
levelElement.innerHTML = "Level: " + level;

// Draw the initial piece to make sure it appears immediately
p.draw();

// Start the game loop
gameLoop();
