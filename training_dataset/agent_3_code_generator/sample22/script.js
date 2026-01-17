document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputs = {
        P1: document.getElementById('p1-slider'),
        V1: document.getElementById('v1-slider'),
        T1: document.getElementById('t1-slider'),
        gamma: document.getElementById('gamma-slider'),
        V2: document.getElementById('v2-slider')
    };

    const displays = {
        P1: document.getElementById('p1-val'),
        V1: document.getElementById('v1-val'),
        T1: document.getElementById('t1-val'),
        gamma: document.getElementById('gamma-val'),
        V2: document.getElementById('v2-val'),
        P2: document.getElementById('p2-output'),
        T2: document.getElementById('t2-output')
    };

    const pistonCanvas = document.getElementById('pistonCanvas');
    const graphCanvas = document.getElementById('graphCanvas');
    const pCtx = pistonCanvas.getContext('2d');
    const gCtx = graphCanvas.getContext('2d');

    // Visual Constants
    const CYLINDER_PADDING_TOP = 20;
    const CYLINDER_PADDING_BOTTOM = 20;

    // Simulation State
    let state = {
        P1: 100000,
        V1: 5.0,
        T1: 300,
        gamma: 1.4,
        V2: 2.5,
        P2: 0,
        T2: 0
    };

    // Particles for animation
    const particles = [];
    const NUM_PARTICLES = 60;
    
    // Canvas sizing
    function resizeCanvases() {
        pistonCanvas.width = pistonCanvas.parentElement.clientWidth;
        pistonCanvas.height = 300;
        graphCanvas.width = graphCanvas.parentElement.clientWidth;
        graphCanvas.height = 300;
    }
    window.addEventListener('resize', resizeCanvases);
    resizeCanvases();

    // Particle Class
    class Particle {
        constructor() {
            this.radius = 3;
            this.reset();
        }

        reset() {
            // Spawn randomly within safe vertical bounds
            const safeHeight = pistonCanvas.height - CYLINDER_PADDING_TOP - CYLINDER_PADDING_BOTTOM;
            this.y = CYLINDER_PADDING_TOP + this.radius + Math.random() * (safeHeight - 2 * this.radius);
            
            // Spawn randomly horizontally (initial guess, clamped later)
            this.x = Math.random() * (pistonCanvas.width * 0.5);
            
            this.vx = (Math.random() - 0.5);
            this.vy = (Math.random() - 0.5);
        }

        update(temp, limitX) {
            // Speed factor based on Temperature
            const speed = 0.5 + Math.sqrt(temp) * 0.15; 

            this.x += this.vx * speed;
            this.y += this.vy * speed;

            // --- Vertical Wall Collisions (Top & Bottom) ---
            // Top Wall (y = 20)
            if (this.y < CYLINDER_PADDING_TOP + this.radius) {
                this.y = CYLINDER_PADDING_TOP + this.radius;
                this.vy *= -1;
            }
            // Bottom Wall (y = height - 20)
            if (this.y > (pistonCanvas.height - CYLINDER_PADDING_BOTTOM) - this.radius) {
                this.y = (pistonCanvas.height - CYLINDER_PADDING_BOTTOM) - this.radius;
                this.vy *= -1;
            }
            
            // --- Horizontal Wall Collisions (Left & Piston) ---
            // Piston Head Collision (Right side limit)
            if (this.x > limitX - this.radius) {
                this.x = limitX - this.radius;
                this.vx *= -1;
            }

            // Cylinder Back Collision (Left side at x=0)
            if (this.x < 0 + this.radius) {
                this.x = this.radius;
                this.vx *= -1;
            }
        }

        draw(ctx, temp) {
            // Color interpolation: Blue (cold) -> Red (hot)
            const tNorm = Math.min(Math.max((temp - 200) / 1000, 0), 1);
            const r = Math.floor(tNorm * 255);
            const b = Math.floor((1 - tNorm) * 255);
            
            ctx.beginPath();
            ctx.fillStyle = `rgb(${r}, 0, ${b})`;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Initialize particles
    for(let i=0; i<NUM_PARTICLES; i++) {
        particles.push(new Particle());
    }

    // Format Helpers
    const fmt = (num, decimals = 2) => num.toFixed(decimals);

    // Update Logic
    function updatePhysics() {
        // Read Inputs
        state.P1 = parseFloat(inputs.P1.value);
        state.V1 = parseFloat(inputs.V1.value);
        state.T1 = parseFloat(inputs.T1.value);
        state.gamma = parseFloat(inputs.gamma.value);
        state.V2 = parseFloat(inputs.V2.value);

        // Update Displays
        displays.P1.innerText = state.P1 >= 1e6 ? `${fmt(state.P1/1e6)} MPa` : `${fmt(state.P1/1000)} kPa`;
        displays.V1.innerText = `${state.V1} m³`;
        displays.T1.innerText = `${state.T1} K`;
        displays.gamma.innerText = state.gamma;
        displays.V2.innerText = `${state.V2} m³`;

        // Calculate Outputs
        // P2 = P1 * (V1/V2)^gamma
        state.P2 = state.P1 * Math.pow((state.V1 / state.V2), state.gamma);
        
        // T2 = T1 * (V1/V2)^(gamma-1)
        state.T2 = state.T1 * Math.pow((state.V1 / state.V2), state.gamma - 1);

        // Output formatting
        displays.P2.innerText = state.P2 >= 1e6 ? fmt(state.P2/1e6) + " M" : (state.P2 >= 1000 ? fmt(state.P2/1000) + " k" : fmt(state.P2));
        displays.T2.innerText = fmt(state.T2);
    }

    // Drawing Logic
    function drawPistonSystem() {
        const ctx = pCtx;
        const w = pistonCanvas.width;
        const h = pistonCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Define cylinder dimensions
        // We map max Volume (10.5) to about 90% of canvas width
        const maxDisplayV = 10.5;
        const scaleX = (w * 0.9) / maxDisplayV;
        
        const pistonX = state.V2 * scaleX;
        const initialX = state.V1 * scaleX;

        // Draw Cylinder Walls (Top and Bottom)
        ctx.fillStyle = '#f9f9f9'; // Interior background
        ctx.fillRect(0, CYLINDER_PADDING_TOP, w, h - (CYLINDER_PADDING_TOP + CYLINDER_PADDING_BOTTOM));
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        
        // Draw Top Wall
        ctx.beginPath();
        ctx.moveTo(0, CYLINDER_PADDING_TOP);
        ctx.lineTo(w, CYLINDER_PADDING_TOP);
        ctx.stroke();

        // Draw Bottom Wall
        ctx.beginPath();
        ctx.moveTo(0, h - CYLINDER_PADDING_BOTTOM);
        ctx.lineTo(w, h - CYLINDER_PADDING_BOTTOM);
        ctx.stroke();

        // Draw Back Wall (Left)
        ctx.beginPath();
        ctx.moveTo(0, CYLINDER_PADDING_TOP);
        ctx.lineTo(0, h - CYLINDER_PADDING_BOTTOM);
        ctx.stroke();

        // Draw Reference Line for V1 (Ghost Piston)
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.moveTo(initialX, CYLINDER_PADDING_TOP);
        ctx.lineTo(initialX, h - CYLINDER_PADDING_BOTTOM);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Draw Label for V1
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.fillText("V1", initialX + 5, h - 5);

        // Draw Moving Piston Head
        ctx.fillStyle = '#555';
        ctx.fillRect(pistonX, CYLINDER_PADDING_TOP, 20, h - (CYLINDER_PADDING_TOP + CYLINDER_PADDING_BOTTOM));
        
        // Draw Connecting Rod
        ctx.fillStyle = '#888';
        ctx.fillRect(pistonX + 20, (h/2) - 10, w - pistonX, 20);

        // Draw Particles
        particles.forEach(p => {
            p.update(state.T2, pistonX); // Pass correct right-side boundary
            p.draw(ctx, state.T2);
        });

        // Overlay Text
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(`V: ${state.V2.toFixed(2)} m³`, 10, 40);
        ctx.fillText(`T: ${state.T2.toFixed(0)} K`, 10, 60);
    }

    function drawPVGraph() {
        const ctx = gCtx;
        const w = graphCanvas.width;
        const h = graphCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Margins
        const padLeft = 50;
        const padBottom = 30;
        const graphW = w - padLeft - 20;
        const graphH = h - padBottom - 20;

        // Draw Axes
        ctx.beginPath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        // Y Axis
        ctx.moveTo(padLeft, 10);
        ctx.lineTo(padLeft, h - padBottom);
        // X Axis
        ctx.lineTo(w - 10, h - padBottom);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("Volume (m³)", w / 2 + padLeft/2, h - 5);
        ctx.save();
        ctx.translate(15, h/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText("Pressure (Pa)", 0, 0);
        ctx.restore();

        // Calculate Scale
        const C = state.P1 * Math.pow(state.V1, state.gamma);
        const maxP = Math.max(state.P1, state.P2);
        
        // Scale factors
        const scaleY = graphH / (maxP * 1.2); 
        const scaleX = graphW / 10.5;

        // Plot Curve
        ctx.beginPath();
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        
        let startV = 0.1;
        let endV = 10;
        let step = 0.1;
        
        let first = true;
        for (let v = startV; v <= endV; v += step) {
            let p = C / Math.pow(v, state.gamma);
            let x = padLeft + v * scaleX;
            let y = (h - padBottom) - (p * scaleY);
            
            if (y < 0) y = -5;
            
            if (first) {
                ctx.moveTo(x, y);
                first = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw Points
        function drawPoint(v, p, color, label) {
            let x = padLeft + v * scaleX;
            let y = (h - padBottom) - (p * scaleY);
            
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.font = '10px sans-serif';
            ctx.fillText(label, x + 8, y - 8);
        }

        drawPoint(state.V1, state.P1, '#999', '1');
        drawPoint(state.V2, state.P2, '#ff0000', '2');
    }

    // Animation Loop
    function loop() {
        updatePhysics();
        drawPistonSystem();
        drawPVGraph();
        requestAnimationFrame(loop);
    }

    // Event Listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', () => {
            // physics updated in loop
        });
    });

    // Start
    loop();
});