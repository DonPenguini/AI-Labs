document.addEventListener('DOMContentLoaded', () => {
    // Canvas Setup
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set actual canvas size to match display size for sharp rendering
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // DOM Elements
    const inputs = {
        Cf: document.getElementById('feedConc'),
        k: document.getElementById('rateConst'),
        tau: document.getElementById('resTime')
    };

    const displays = {
        Cf: document.getElementById('val-feedConc'),
        k: document.getElementById('val-rateConst'),
        tau: document.getElementById('val-resTime')
    };

    const outputs = {
        C: document.getElementById('out-C'),
        X: document.getElementById('out-X')
    };

    // State
    let state = {
        Cf: parseFloat(inputs.Cf.value),
        k: parseFloat(inputs.k.value),
        tau: parseFloat(inputs.tau.value),
        C: 0,
        X: 0
    };

    // Particles for animation
    const particles = [];
    const NUM_PARTICLES = 50;

    // --- Calculation Logic ---
    function calculate() {
        // C = Cf / (1 + k*tau)
        state.C = state.Cf / (1 + state.k * state.tau);
        
        // X = 1 - C/Cf
        // Handle divide by zero edge case if Cf is 0
        if (state.Cf === 0) {
            state.X = 0; 
        } else {
            state.X = 1 - (state.C / state.Cf);
        }

        updateUI();
    }

    function updateUI() {
        // Update number displays
        displays.Cf.textContent = state.Cf.toFixed(2);
        displays.k.textContent = state.k.toFixed(4); // k can be small
        displays.tau.textContent = state.tau.toFixed(1);

        // Update Results
        outputs.C.textContent = state.C.toFixed(3);
        outputs.X.textContent = (state.X * 100).toFixed(1);
    }

    // --- Event Listeners ---
    Object.keys(inputs).forEach(key => {
        inputs[key].addEventListener('input', (e) => {
            state[key] = parseFloat(e.target.value);
            calculate();
        });
    });

    // --- Animation Logic ---
    
    // Helper to get color based on concentration
    // Interpolate between light blue (low conc) and deep blue (high conc)
    function getColor(concentration) {
        // Max concentration in range is 5, normalize to 0-1
        const intensity = Math.min(concentration / 5.0, 1);
        // RGB for a nice blue: 52, 152, 219
        const r = 52, g = 152, b = 219;
        return `rgba(${r}, ${g}, ${b}, ${0.1 + intensity * 0.9})`;
    }

    class Particle {
        constructor() {
            this.reset();
        }

        reset() {
            // Start at the inlet pipe (left side)
            this.x = 0;
            this.y = canvas.height * 0.35 + Math.random() * 20;
            this.vx = 2 + Math.random();
            this.vy = 0;
            this.stage = 'inlet'; // inlet, tank, outlet
            this.radius = 2 + Math.random() * 2;
        }

        update() {
            const tankX = canvas.width * 0.3;
            const tankWidth = canvas.width * 0.4;
            const tankY = canvas.height * 0.2;
            const tankHeight = canvas.height * 0.6;
            const liquidLevel = tankY + tankHeight * 0.2; // Top of liquid

            if (this.stage === 'inlet') {
                this.x += this.vx;
                if (this.x > tankX + 20) {
                    this.stage = 'tank';
                    this.x = tankX + 20 + Math.random() * (tankWidth - 40);
                    this.y = liquidLevel + Math.random() * (tankHeight * 0.8 - 20);
                    // Random motion in tank (well mixed)
                    this.vx = (Math.random() - 0.5) * 2;
                    this.vy = (Math.random() - 0.5) * 2;
                }
            } else if (this.stage === 'tank') {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off walls
                if (this.x < tankX + 10 || this.x > tankX + tankWidth - 10) this.vx *= -1;
                if (this.y < liquidLevel + 5 || this.y > tankY + tankHeight - 5) this.vy *= -1;

                // Chance to exit
                if (Math.random() < 0.01) {
                    this.stage = 'outlet';
                    this.x = tankX + tankWidth;
                    this.y = canvas.height * 0.8; // Outlet pipe height
                    this.vx = 2 + Math.random();
                    this.vy = 0;
                }
            } else if (this.stage === 'outlet') {
                this.x += this.vx;
                if (this.x > canvas.width) {
                    this.reset();
                }
            }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            
            // Color depends on stage
            if (this.stage === 'inlet') {
                ctx.fillStyle = getColor(state.Cf);
            } else {
                // Tank and outlet have concentration C
                ctx.fillStyle = getColor(state.C);
            }
            ctx.fill();
        }
    }

    // Initialize particles
    for (let i = 0; i < NUM_PARTICLES; i++) {
        particles.push(new Particle());
    }

    function drawSystem() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;
        
        const tankX = w * 0.3;
        const tankY = h * 0.2;
        const tankWidth = w * 0.4;
        const tankHeight = h * 0.6;
        
        // --- Draw Pipes ---
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 4;

        // Inlet Pipe
        const pipeHeight = 30;
        const inletY = h * 0.35;
        
        // Inlet Fluid Background
        ctx.fillStyle = getColor(state.Cf);
        ctx.fillRect(0, inletY, tankX, pipeHeight);
        
        // Inlet Pipe Borders
        ctx.beginPath();
        ctx.moveTo(0, inletY);
        ctx.lineTo(tankX, inletY);
        ctx.moveTo(0, inletY + pipeHeight);
        ctx.lineTo(tankX, inletY + pipeHeight);
        ctx.stroke();

        // Outlet Pipe
        const outletY = h * 0.8;
        
        // Outlet Fluid Background
        ctx.fillStyle = getColor(state.C);
        ctx.fillRect(tankX + tankWidth, outletY, w - (tankX + tankWidth), pipeHeight);

        // Outlet Pipe Borders
        ctx.beginPath();
        ctx.moveTo(tankX + tankWidth, outletY);
        ctx.lineTo(w, outletY);
        ctx.moveTo(tankX + tankWidth, outletY + pipeHeight);
        ctx.lineTo(w, outletY + pipeHeight);
        ctx.stroke();

        // --- Draw Tank ---
        // Tank Content (Fluid)
        const liquidLevel = tankY + tankHeight * 0.2; // Not full to show stirring
        ctx.fillStyle = getColor(state.C);
        ctx.fillRect(tankX, liquidLevel, tankWidth, tankHeight * 0.8);

        // Tank Walls
        ctx.beginPath();
        ctx.moveTo(tankX, tankY);
        ctx.lineTo(tankX, tankY + tankHeight);
        ctx.lineTo(tankX + tankWidth, tankY + tankHeight);
        ctx.lineTo(tankX + tankWidth, tankY);
        ctx.stroke();

        // --- Impeller/Stirrer ---
        const stirrerX = tankX + tankWidth / 2;
        ctx.beginPath();
        ctx.moveTo(stirrerX, tankY - 20); // Motor
        ctx.lineTo(stirrerX, liquidLevel + tankHeight * 0.5); // Shaft
        ctx.stroke();

        // Blades
        const time = Date.now() * 0.005; // speed depends on nothing (constant visual)
        const bladeWidth = 40 * Math.sin(time); 
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(stirrerX - bladeWidth, liquidLevel + tankHeight * 0.5);
        ctx.lineTo(stirrerX + bladeWidth, liquidLevel + tankHeight * 0.5);
        ctx.stroke();
        ctx.lineWidth = 4; // Reset

        // Labels
        ctx.fillStyle = "#333";
        ctx.font = "14px Arial";
        ctx.fillText("Feed", 10, inletY - 10);
        ctx.fillText(`C = ${state.Cf.toFixed(2)}`, 10, inletY + 50);
        
        ctx.fillText("Product", w - 80, outletY - 10);
        ctx.fillText(`C = ${state.C.toFixed(2)}`, w - 80, outletY + 50);
        
        // --- Draw Particles ---
        particles.forEach(p => {
            p.update();
            p.draw();
        });

        requestAnimationFrame(drawSystem);
    }

    // Initial Calculation and Start Loop
    calculate();
    drawSystem();
});