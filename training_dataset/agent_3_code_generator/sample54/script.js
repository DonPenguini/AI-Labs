document.addEventListener('DOMContentLoaded', () => {
    // --- Inputs & Elements ---
    const sliders = {
        f: document.getElementById('f-slider'),
        L: document.getElementById('L-slider'),
        D: document.getElementById('D-slider'),
        v: document.getElementById('v-slider')
    };

    const displays = {
        f: document.getElementById('f-val'),
        L: document.getElementById('L-val'),
        D: document.getElementById('D-val'),
        v: document.getElementById('v-val'),
        hf: document.getElementById('hf-result')
    };

    const canvas = document.getElementById('flowCanvas');
    const ctx = canvas.getContext('2d');

    const g = 9.81;
    const numParticles = 300; // Increased particle count for better fluid look

    // --- State ---
    let params = {
        f: parseFloat(sliders.f.value),
        L: parseFloat(sliders.L.value),
        D: parseFloat(sliders.D.value),
        v: parseFloat(sliders.v.value)
    };

    let particles = [];
    let pipeYTop = 0;
    let pipeYBot = 0;

    // --- Physics Calculation ---
    function calculateHeadLoss() {
        // Darcy-Weisbach Equation
        const hf = params.f * (params.L / params.D) * (Math.pow(params.v, 2) / (2 * g));
        return hf;
    }

    function updateValues() {
        // Update State
        params.f = parseFloat(sliders.f.value);
        params.L = parseFloat(sliders.L.value);
        params.D = parseFloat(sliders.D.value);
        params.v = parseFloat(sliders.v.value);

        // Update UI
        displays.f.textContent = params.f.toFixed(3);
        displays.L.textContent = params.L.toFixed(0);
        displays.D.textContent = params.D.toFixed(2);
        displays.v.textContent = params.v.toFixed(2);

        const hf = calculateHeadLoss();
        displays.hf.textContent = hf.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // --- Animation Logic ---

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            this.x = Math.random() * canvas.width;
            
            // Spawn strictly inside the pipe area
            const height = pipeYBot - pipeYTop;
            // Add slight padding so they don't spawn *inside* the wall
            const padding = height * 0.05; 
            this.y = pipeYTop + padding + Math.random() * (height - padding * 2);
            
            this.size = Math.random() * 2 + 1;
            this.color = `rgba(0, 191, 255, ${Math.random() * 0.5 + 0.3})`;
            this.vx = 0;
            this.vy = 0;
        }

        update() {
            // 1. Calculate Pipe Geometry
            const centerY = (pipeYTop + pipeYBot) / 2;
            const radius = (pipeYBot - pipeYTop) / 2;
            const distFromCenter = Math.abs(this.y - centerY);
            
            // 2. Velocity Profile (Parabolic Flow)
            // v = v_max * (1 - r^2/R^2)
            // Center moves fast, edges move slow
            const relativeR = distFromCenter / radius;
            const profileFactor = 1 - Math.pow(relativeR, 2); // 1 at center, 0 at wall
            
            // Map real velocity to visual pixels per frame
            // Base speed + scaled speed
            const visualBaseSpeed = params.v * 2; 
            // Avoid particles stopping completely at wall (keep 10% min speed)
            this.vx = visualBaseSpeed * (0.1 + 0.9 * profileFactor);

            // 3. Friction & Turbulence Effects
            // Friction Factor f determines how chaotic the flow is
            // Map f (0.005 - 0.1) to turbulence intensity
            const turbulenceFactor = (params.f - 0.005) * 50; // Scaling factor
            
            // Random jitter perpendicular to flow
            // Jitter increases near walls (drag) and with higher f
            const wallProximity = relativeR; // 0 at center, 1 at wall
            const jitterX = (Math.random() - 0.5) * turbulenceFactor * params.v * wallProximity; 
            const jitterY = (Math.random() - 0.5) * turbulenceFactor * params.v;

            this.x += this.vx + jitterX;
            this.y += jitterY;

            // 4. Wall Collision
            if (this.y <= pipeYTop + 2 || this.y >= pipeYBot - 2) {
                // "Bounce" or reset to laminar flow if they hit rough wall
                this.y = Math.max(pipeYTop + 5, Math.min(pipeYBot - 5, this.y));
                // Hitting a rough wall slows you down more
                this.x -= 1; 
            }

            // Loop
            if (this.x > canvas.width) {
                this.x = -10;
                // Re-randomize Y slightly on wrap
                const height = pipeYBot - pipeYTop;
                this.y = pipeYTop + (height * 0.1) + Math.random() * (height * 0.8);
            }
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function calculatePipeDimensions() {
        // Scale Diameter D (0.01 - 2) to Screen Pixels (20px - 90% height)
        const maxH = canvas.height * 0.8;
        const minH = 30;
        const ratio = params.D / 2; 
        const pipeH = minH + ratio * (maxH - minH);
        
        pipeYTop = (canvas.height - pipeH) / 2;
        pipeYBot = pipeYTop + pipeH;
    }

    function drawWalls() {
        // Draw Main Pipe Body (dark void)
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(0, pipeYTop, canvas.width, pipeYBot - pipeYTop);

        // Draw Walls with Roughness
        ctx.fillStyle = "#555"; // Wall color
        
        // Roughness Amplitude based on f
        const roughnessAmp = (params.f / 0.1) * 10; 

        // Top Wall
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, pipeYTop);
        for(let x = 0; x <= canvas.width; x+=5) {
            // Jagged line generator
            const noise = (Math.random() - 0.5) * roughnessAmp;
            ctx.lineTo(x, pipeYTop + noise);
        }
        ctx.lineTo(canvas.width, 0);
        ctx.fill();

        // Bottom Wall
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        ctx.lineTo(0, pipeYBot);
        for(let x = 0; x <= canvas.width; x+=5) {
            const noise = (Math.random() - 0.5) * roughnessAmp;
            ctx.lineTo(x, pipeYBot + noise);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.fill();
    }

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        calculatePipeDimensions();
    }

    function initParticles() {
        resizeCanvas();
        particles = [];
        for(let i=0; i<numParticles; i++) {
            particles.push(new Particle());
        }
    }

    function animate() {
        // Redraw Background
        ctx.fillStyle = "#222"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        calculatePipeDimensions();
        
        // Draw Walls (Static layer, but roughness jitters if we redraw every frame? 
        // No, let's keep randomness in the loop for "visual noise" effect of flowing water against rough surface)
        drawWalls();

        // Draw Particles
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });

        // Overlay Arrow
        drawVelocityVector();

        requestAnimationFrame(animate);
    }

    function drawVelocityVector() {
        // Draw a simple vector arrow in center to show V magnitude
        const len = params.v * 20; 
        const centerY = canvas.height / 2;
        const centerX = canvas.width / 2;
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX - len/2, centerY);
        ctx.lineTo(centerX + len/2, centerY);
        // Arrowhead
        ctx.lineTo(centerX + len/2 - 10, centerY - 5);
        ctx.moveTo(centerX + len/2, centerY);
        ctx.lineTo(centerX + len/2 - 10, centerY + 5);
        ctx.stroke();
    }

    // --- Events ---
    Object.values(sliders).forEach(s => s.addEventListener('input', updateValues));
    window.addEventListener('resize', () => {
        resizeCanvas();
        particles.forEach(p => p.reset());
    });

    // --- Start ---
    initParticles();
    updateValues();
    animate();
});