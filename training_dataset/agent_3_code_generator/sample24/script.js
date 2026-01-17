document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    const canvas = document.getElementById('gasCanvas');
    const ctx = canvas.getContext('2d');
    
    // Inputs
    const inputs = {
        n: document.getElementById('amount'),
        cv: document.getElementById('cv'),
        t1: document.getElementById('t1'),
        t2: document.getElementById('t2')
    };

    // Displays
    const displays = {
        n: document.getElementById('val-n'),
        cv: document.getElementById('val-cv'),
        t1: document.getElementById('val-t1'),
        t2: document.getElementById('val-t2'),
        currentTemp: document.getElementById('current-temp'),
        resultDs: document.getElementById('result-ds'),
        progressBar: document.getElementById('temp-progress')
    };

    let simulationState = {
        n: parseFloat(inputs.n.value),
        cv: parseFloat(inputs.cv.value),
        t1: parseFloat(inputs.t1.value),
        t2: parseFloat(inputs.t2.value),
        currentTemp: parseFloat(inputs.t1.value),
        isAnimating: false,
        animationProgress: 0 // 0 to 1
    };

    let particles = [];
    let animationFrameId;

    // --- Particle System ---
    class Particle {
        constructor(width, height) {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5);
            this.vy = (Math.random() - 0.5);
            this.radius = 3;
            // Normalize initial vector
            const mag = Math.sqrt(this.vx**2 + this.vy**2);
            this.vx /= mag; 
            this.vy /= mag;
        }

        update(temp, width, height) {
            // Speed is proportional to sqrt(T)
            // Base speed multiplier for visualization
            const speed = Math.sqrt(temp) * 0.15; 
            
            this.x += this.vx * speed;
            this.y += this.vy * speed;

            // Wall collision
            if (this.x - this.radius < 0) {
                this.x = this.radius;
                this.vx *= -1;
            } else if (this.x + this.radius > width) {
                this.x = width - this.radius;
                this.vx *= -1;
            }

            if (this.y - this.radius < 0) {
                this.y = this.radius;
                this.vy *= -1;
            } else if (this.y + this.radius > height) {
                this.y = height - this.radius;
                this.vy *= -1;
            }
        }

        draw(ctx, temp) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            // Color based on temperature (Blue -> Red)
            // Normalize temp between 200 and 1200 for color mapping
            const tRatio = Math.min(Math.max((temp - 200) / 1000, 0), 1);
            const r = Math.floor(tRatio * 255);
            const b = Math.floor((1 - tRatio) * 255);
            
            ctx.fillStyle = `rgb(${r}, 50, ${b})`;
            ctx.fill();
            ctx.closePath();
        }
    }

    function initParticles() {
        const width = canvas.width;
        const height = canvas.height;
        particles = [];
        // Scale particle count: 1 mol = 50 particles for visualization
        const count = Math.max(10, Math.floor(simulationState.n * 50));
        
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(width, height));
        }
    }

    // --- Physics & Calc ---
    function calculateDeltaS() {
        // DeltaS = n * Cv * ln(T2/T1)
        // However, during animation, we calculate Delta S from T1 to CurrentTemp
        const tStart = simulationState.t1;
        const tCurrent = simulationState.currentTemp;
        
        if (tCurrent <= 0 || tStart <= 0) return 0;

        const ds = simulationState.n * simulationState.cv * Math.log(tCurrent / tStart);
        return ds;
    }

    // --- Render Loop ---
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }

    function draw() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Trail effect
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.update(simulationState.currentTemp, canvas.width, canvas.height);
            p.draw(ctx, simulationState.currentTemp);
        });

        // Update Text
        displays.currentTemp.textContent = simulationState.currentTemp.toFixed(0);
        
        const ds = calculateDeltaS();
        displays.resultDs.textContent = `${ds.toFixed(2)} J/K`;

        animationFrameId = requestAnimationFrame(draw);
    }

    // --- Interaction ---
    function updateInputs() {
        simulationState.n = parseFloat(inputs.n.value);
        simulationState.cv = parseFloat(inputs.cv.value);
        simulationState.t1 = parseFloat(inputs.t1.value);
        simulationState.t2 = parseFloat(inputs.t2.value);

        displays.n.textContent = simulationState.n;
        displays.cv.textContent = simulationState.cv;
        displays.t1.textContent = simulationState.t1;
        displays.t2.textContent = simulationState.t2;

        if (!simulationState.isAnimating) {
            // If not animating, reset to T1
            simulationState.currentTemp = simulationState.t1;
            displays.progressBar.style.width = '0%';
            
            // Re-init particles if amount changes
            const idealCount = Math.max(10, Math.floor(simulationState.n * 50));
            if (Math.abs(particles.length - idealCount) > 5) {
                initParticles();
            }
        }
    }

    function animateTemperatureTransition() {
        if (simulationState.isAnimating) return;
        
        simulationState.isAnimating = true;
        const startT = simulationState.t1;
        const endT = simulationState.t2;
        const duration = 2000; // 2 seconds
        const startTime = performance.now();

        function step(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Linear interpolation
            simulationState.currentTemp = startT + (endT - startT) * progress;
            displays.progressBar.style.width = `${progress * 100}%`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                simulationState.isAnimating = false;
            }
        }
        requestAnimationFrame(step);
    }

    function resetSimulation() {
        simulationState.isAnimating = false;
        simulationState.currentTemp = simulationState.t1;
        displays.progressBar.style.width = '0%';
        updateInputs(); // resets displays
        initParticles();
    }

    // --- Event Listeners ---
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', () => {
            // Stop any ongoing animation if user touches controls
            simulationState.isAnimating = false; 
            updateInputs();
        });
    });

    document.getElementById('btn-animate').addEventListener('click', animateTemperatureTransition);
    
    document.getElementById('btn-reset').addEventListener('click', () => {
        // Reset Inputs to defaults
        inputs.n.value = 1.0;
        inputs.cv.value = 25;
        inputs.t1.value = 300;
        inputs.t2.value = 600;
        resetSimulation();
    });

    window.addEventListener('resize', () => {
        resizeCanvas();
        initParticles();
    });

    // --- Initialization ---
    resizeCanvas();
    updateInputs();
    initParticles();
    draw();
});