document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const hSlider = document.getElementById('h-slider');
    const ASlider = document.getElementById('A-slider');
    const TsSlider = document.getElementById('Ts-slider');
    const TinfSlider = document.getElementById('Tinf-slider');

    // Displays
    const hVal = document.getElementById('h-val');
    const AVal = document.getElementById('A-val');
    const TsVal = document.getElementById('Ts-val');
    const TinfVal = document.getElementById('Tinf-val');
    const qResult = document.getElementById('q-result');
    
    // Visual Elements
    const plate = document.getElementById('surface-plate');
    const environment = document.getElementById('ambient-env');
    const canvas = document.getElementById('convectionCanvas');
    const ctx = canvas.getContext('2d');

    // Constants for visuals
    const MIN_TEMP = 200;
    const MAX_TEMP = 800;

    // State
    let params = {
        h: parseFloat(hSlider.value),
        A: parseFloat(ASlider.value),
        Ts: parseFloat(TsSlider.value),
        Tinf: parseFloat(TinfSlider.value)
    };

    // Particles array
    let particles = [];

    // --- Core Logic ---

    function calculateHeatRate() {
        // Equation: q = h * A * (Ts - Tinf)
        const q = params.h * params.A * (params.Ts - params.Tinf);
        return q;
    }

    // --- Helper Functions ---

    // Map temperature to color (Blue -> Red -> White/Yellow hot)
    function getTempColor(temp) {
        const ratio = (temp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
        
        // Ambient background color logic (lighter)
        if (temp === params.Tinf) {
            // Blueish (cold) to reddish (hot), but very light
            const r = Math.floor(200 + 55 * ratio); 
            const b = Math.floor(255 - 50 * ratio);
            const g = Math.floor(240 - 40 * ratio);
            return `rgb(${r}, ${g}, ${b})`;
        }

        // Surface color logic (vibrant)
        // Simple heatmap: Blue (cold) -> Red (hot) -> Yellow (very hot)
        let r, g, b;
        if (ratio < 0.5) {
            // Blue to Greenish/Red
            r = Math.floor(2 * ratio * 255);
            g = Math.floor(2 * ratio * 100);
            b = Math.floor(255 * (1 - 2 * ratio));
        } else {
            // Red to Yellow
            r = 255;
            g = Math.floor(2 * (ratio - 0.5) * 255);
            b = 0;
        }
        return `rgb(${r}, ${g}, ${b})`;
    }

    function updateDisplayValues() {
        hVal.textContent = params.h;
        AVal.textContent = params.A;
        TsVal.textContent = params.Ts;
        TinfVal.textContent = params.Tinf;

        const q = calculateHeatRate();
        qResult.textContent = q.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function updateVisuals() {
        // 1. Update Plate Color
        plate.style.backgroundColor = getTempColor(params.Ts);

        // 2. Update Ambient Background
        environment.style.backgroundColor = getTempColor(params.Tinf);

        // 3. Update Plate Width based on Area (Square root scaling for visual sanity)
        // Max A is 100, Min is 0.01. Let's map 0-100 to 10%-90% width
        const areaRatio = Math.sqrt(params.A) / Math.sqrt(100); 
        const newWidth = Math.max(50, Math.min(800, 100 + (areaRatio * 600))); 
        plate.style.width = `${newWidth}px`;
    }

    function handleInput(e) {
        const target = e.target;
        const val = parseFloat(target.value);

        if (target.id === 'h-slider') params.h = val;
        if (target.id === 'A-slider') params.A = val;
        if (target.id === 'Ts-slider') params.Ts = val;
        if (target.id === 'Tinf-slider') params.Tinf = val;

        updateDisplayValues();
        updateVisuals();
    }

    // --- Animation System ---

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            // Determine dimensions of the plate
            const plateRect = plate.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();

            // Spawn relative to plate position within canvas
            const plateX = plateRect.left - canvasRect.left;
            const plateY = plateRect.top - canvasRect.top;
            const plateW = plateRect.width;

            // Random position along the plate width
            this.x = plateX + Math.random() * plateW;
            this.y = plateY; // Start at top of plate
            
            // Velocity
            // Speed depends on Heat Transfer Coeff (h) and Temp Difference
            const deltaT = params.Ts - params.Tinf;
            const speedFactor = (params.h / 500) * 2 + (Math.abs(deltaT) / 600) * 3;
            
            // Direction depends on heat flow (Hot surface -> Up, Cold surface -> Down usually, 
            // but for simplicity we visualize "convection currents" rising generally, 
            // or sinking if surface is colder than ambient)
            
            this.vy = -(1 + Math.random() * 2 + speedFactor); 
            if (deltaT < 0) this.vy = (1 + Math.random() * 2 + speedFactor) * 0.5; // Sink slower

            this.vx = (Math.random() - 0.5) * 1; // Slight jitter
            
            this.life = 1.0;
            this.decay = 0.01 + Math.random() * 0.02;
            this.size = 2 + Math.random() * 3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life -= this.decay;

            // Wavy motion
            this.x += Math.sin(this.y * 0.05) * 0.5;

            if (this.life <= 0 || this.y < 0 || this.y > canvas.height) {
                this.reset();
            }
        }

        draw() {
            const deltaT = params.Ts - params.Tinf;
            
            // Color interpolation: Start at Surface Temp color, fade to Ambient Temp color
            // For simplicity, Red for heating air, Blue for cooling air
            let r, g, b;
            
            if (deltaT > 0) {
                // Heating the air: Red/Orange
                r = 255; 
                g = Math.floor(150 * (1 - this.life)); 
                b = 100;
            } else {
                // Cooling the air: Blue/Cyan
                r = 100;
                g = Math.floor(150 * (1 - this.life));
                b = 255;
            }

            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.life * 0.6})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function initParticles() {
        resizeCanvas();
        particles = [];
        // Number of particles proportional to Area and h (visual density)
        // Limiting to reasonable numbers for performance
        const count = 50 + Math.floor((params.h / 5) + (params.A * 2));
        const safeCount = Math.min(count, 300); // Max 300 particles

        for (let i = 0; i < safeCount; i++) {
            particles.push(new Particle());
            // Pre-warm the simulation so particles aren't all at the bottom
            particles[i].y = Math.random() * canvas.height;
        }
    }

    function resizeCanvas() {
        canvas.width = environment.clientWidth;
        canvas.height = environment.clientHeight;
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Adjust particle count dynamically if slider changed significantly
        // (Simple check: if array length differs largely from target)
        const targetCount = Math.min(300, 50 + Math.floor((params.h / 5) + (params.A * 2)));
        if (particles.length < targetCount) particles.push(new Particle());
        if (particles.length > targetCount) particles.pop();

        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(animate);
    }

    // --- Initialization ---
    
    // Listeners
    hSlider.addEventListener('input', handleInput);
    ASlider.addEventListener('input', handleInput);
    TsSlider.addEventListener('input', handleInput);
    TinfSlider.addEventListener('input', handleInput);
    window.addEventListener('resize', () => {
        resizeCanvas();
        // Resetting particles helps fix position issues on resize
        particles.forEach(p => p.reset()); 
    });

    // Start
    updateDisplayValues();
    updateVisuals();
    initParticles();
    animate();
});