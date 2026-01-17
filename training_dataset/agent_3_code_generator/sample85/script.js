document.addEventListener('DOMContentLoaded', () => {
    // Canvas Setup
    const canvas = document.getElementById('particleCanvas');
    const ctx = canvas.getContext('2d');
    
    // UI Elements
    const dispTime = document.getElementById('disp-time');
    const dispTheo = document.getElementById('disp-theo');
    const dispMeasured = document.getElementById('disp-measured');
    
    const inputD = document.getElementById('input-d');
    const labelD = document.getElementById('val-d');
    const btnReset = document.getElementById('btn-reset');
    const btnPause = document.getElementById('btn-pause');

    // Calculator Elements
    const calcT = document.getElementById('calc-t');
    const calcRes = document.getElementById('calc-res');

    // Simulation State
    let width, height;
    let D = parseInt(inputD.value);
    let time = 0;
    let isPaused = false;
    let particles = [];
    const NUM_PARTICLES = 200;
    const PIXELS_PER_METER = 1; // Arbitrary scale for visualization

    // --- Particle Class ---
    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = 0; // Start at center
            // Random y for visual separation (cloud effect)
            this.y = (Math.random() - 0.5) * (height * 0.6); 
            this.color = `rgba(251, 191, 36, ${0.4 + Math.random() * 0.6})`;
        }

        update(dt) {
            // Random Walk Step: sqrt(2 * D * dt) * NormalDistribution
            // Standard Normal approx using Box-Muller or simple sum
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            
            // Step size
            const step = Math.sqrt(2 * D * dt) * z;
            
            this.x += step;
        }

        draw(ctx, centerX, centerY) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            // Draw circle
            ctx.arc(centerX + this.x, centerY + this.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- Core Functions ---

    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width;
        canvas.height = height;
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < NUM_PARTICLES; i++) {
            particles.push(new Particle());
        }
    }

    function resetSimulation() {
        time = 0;
        initParticles();
    }

    // --- Main Loop ---
    let lastFrameTime = performance.now();

    function loop(now) {
        const dtMs = now - lastFrameTime;
        lastFrameTime = now;
        
        // Limit dt to avoid huge jumps if tab inactive
        const dt = Math.min(dtMs / 1000, 0.1); 

        if (!isPaused) {
            time += dt;

            // 1. Clear Canvas
            ctx.clearRect(0, 0, width, height);

            // 2. Draw Center Line
            const centerX = width / 2;
            const centerY = height / 2;

            // 3. Update & Draw Particles
            let sumSqDisp = 0;

            particles.forEach(p => {
                p.update(dt);
                p.draw(ctx, centerX, centerY);
                sumSqDisp += (p.x * p.x);
            });

            // 4. Calculate Stats
            const measuredMSD = sumSqDisp / NUM_PARTICLES;
            const theoreticalMSD = 2 * D * time;

            // 5. Update UI
            dispTime.textContent = time.toFixed(2) + ' s';
            dispTheo.textContent = theoreticalMSD.toFixed(1);
            dispMeasured.textContent = measuredMSD.toFixed(1);
            
            // Draw Bell Curve Approximation (Optional visual flair)
            drawGaussian(ctx, centerX, centerY, theoreticalMSD);
        }

        requestAnimationFrame(loop);
    }

    function drawGaussian(ctx, cx, cy, variance) {
        if (variance < 1) return;
        
        ctx.beginPath();
        const sigma = Math.sqrt(variance);
        const scaleY = 5000 / sigma; // Scale height based on spread
        
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;

        for (let xPixel = -width/2; xPixel < width/2; xPixel+=5) {
            // Gaussian formula: exp(-x^2 / (2*sigma^2))
            const yVal = Math.exp(-(xPixel*xPixel) / (2 * variance));
            // Invert Y because canvas Y goes down
            ctx.lineTo(cx + xPixel, (cy + height/2) - (yVal * scaleY) - 10);
        }
        ctx.stroke();
    }

    // --- Input Handlers ---

    // Calculator Logic
    function updateCalculator() {
        const t = parseFloat(calcT.value) || 0;
        const currentD = parseFloat(inputD.value);
        const res = 2 * currentD * t;
        calcRes.textContent = res.toFixed(2);
    }

    inputD.addEventListener('input', (e) => {
        D = parseInt(e.target.value);
        labelD.textContent = D;
        updateCalculator();
    });

    calcT.addEventListener('input', updateCalculator);

    btnReset.addEventListener('click', resetSimulation);
    
    btnPause.addEventListener('click', () => {
        isPaused = !isPaused;
        btnPause.textContent = isPaused ? "Resume" : "Pause";
        if (!isPaused) lastFrameTime = performance.now();
    });

    window.addEventListener('resize', resize);

    // --- Init ---
    resize();
    labelD.textContent = D;
    updateCalculator();
    initParticles();
    requestAnimationFrame(loop);
});