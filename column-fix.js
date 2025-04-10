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
