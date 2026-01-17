document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');
    
    // Inputs
    const inputs = {
        Cd: document.getElementById('discharge_coeff'),
        A: document.getElementById('area'),
        DeltaP: document.getElementById('pressure_drop'),
        rho: document.getElementById('density')
    };

    // Value Displays
    const displays = {
        Cd: document.getElementById('val_discharge_coeff'),
        A: document.getElementById('val_area'),
        DeltaP: document.getElementById('val_pressure_drop'),
        rho: document.getElementById('val_density'),
        Q: document.getElementById('output_flow')
    };

    // State
    let params = {
        Cd: 0.61,
        A: 0.01,
        DeltaP: 50000,
        rho: 1000
    };

    let computedQ = 0;
    
    // Particle System
    const particles = [];
    const numParticles = 150;

    // --- Resize Handling ---
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- Physics Calculation ---
    function calculateFlow() {
        // Parse inputs
        params.Cd = parseFloat(inputs.Cd.value);
        params.A = parseFloat(inputs.A.value);
        params.DeltaP = parseFloat(inputs.DeltaP.value);
        params.rho = parseFloat(inputs.rho.value);

        // Update UI Text
        displays.Cd.innerText = params.Cd.toFixed(2);
        displays.A.innerText = params.A.toFixed(3);
        displays.DeltaP.innerText = params.DeltaP.toFixed(0);
        displays.rho.innerText = params.rho.toFixed(0);

        // Calculate Q = Cd * A * sqrt(2 * DeltaP / rho)
        const term = (2 * params.DeltaP) / params.rho;
        if (term < 0) {
            computedQ = 0;
        } else {
            computedQ = params.Cd * params.A * Math.sqrt(term);
        }

        displays.Q.innerText = computedQ.toFixed(4) + " m³/s";
    }

    // --- Animation System ---
    class Particle {
        constructor() {
            this.reset();
            // Scatter initial x randomly
            this.x = Math.random() * canvas.width;
        }

        reset() {
            this.x = 0;
            // Random Y within pipe height (vertically centered)
            // Pipe visual height is roughly 60% of canvas height
            const pipeHeight = canvas.height * 0.6;
            const topMargin = (canvas.height - pipeHeight) / 2;
            this.y = topMargin + Math.random() * pipeHeight;
            this.size = Math.random() * 3 + 2;
            this.speedBase = Math.random() * 0.5 + 0.5;
        }

        update(orificeOpeningY, orificeX) {
            // Determine velocity based on Calculated Q
            // Scale Q for visual speed (arbitrary factor for visual appeal)
            let velocityFactor = computedQ * 20; 
            
            // Constrain visual speed to keep it viewable
            if (velocityFactor < 0.5) velocityFactor = 0.5;
            if (velocityFactor > 15) velocityFactor = 15;

            // Physics Logic:
            // Velocity increases as it passes through the orifice (Constriction)
            // V1 = Q/A1 (Pipe), V2 = Q/A2 (Orifice)
            // For visual simplicity, we speed up particles near the center (Orifice)
            
            let currentSpeed = this.speedBase * velocityFactor;

            // Approaching Orifice Logic
            // If particle is near the orifice X and outside the opening Y, block it or funnel it
            const pipeCenterY = canvas.height / 2;
            const halfOpening = orificeOpeningY / 2;
            
            const distToOrifice = orificeX - this.x;

            if (Math.abs(distToOrifice) < 50) {
                // Acceleration zone near orifice (Vena Contracta effect)
                currentSpeed *= 2.5;

                // Simple funneling effect visually
                if (this.y < pipeCenterY - halfOpening) this.y += 2;
                if (this.y > pipeCenterY + halfOpening) this.y -= 2;
            }

            this.x += currentSpeed;

            if (this.x > canvas.width) {
                this.reset();
            }
        }

        draw(ctx, pressureColor) {
            ctx.fillStyle = pressureColor;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Initialize Particles
    for (let i = 0; i < numParticles; i++) {
        particles.push(new Particle());
    }

    function drawPipe(orificeOpeningHeight, orificeX) {
        const pipeHeight = canvas.height * 0.6;
        const topY = (canvas.height - pipeHeight) / 2;
        const bottomY = topY + pipeHeight;
        
        ctx.fillStyle = "#bbb"; // Pipe wall color
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 3;

        // Top Wall
        ctx.fillRect(0, topY - 10, canvas.width, 10);
        // Bottom Wall
        ctx.fillRect(0, bottomY, canvas.width, 10);

        // Orifice Plate (Top)
        const plateWidth = 20;
        const pipeCenterY = canvas.height / 2;
        const plateHeight = (pipeHeight - orificeOpeningHeight) / 2;

        ctx.fillStyle = "#333";
        // Top Plate
        ctx.fillRect(orificeX - plateWidth/2, topY, plateWidth, plateHeight);
        // Bottom Plate
        ctx.fillRect(orificeX - plateWidth/2, bottomY - plateHeight, plateWidth, plateHeight);
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Calculate Visual Parameters
        // Map Area A (0.001 - 0.1) to visual pixel height (10px to PipeHeight)
        const pipeHeight = canvas.height * 0.6;
        const maxA = 0.1; 
        const minA = 0.001;
        
        // Normalize A
        let normalizedA = (params.A - minA) / (maxA - minA);
        // Clamp for visual sanity
        if(normalizedA < 0.1) normalizedA = 0.1;
        
        const orificeOpeningHeight = normalizedA * pipeHeight;
        const orificeX = canvas.width / 2;

        // 2. Draw Background/Pipe
        drawPipe(orificeOpeningHeight, orificeX);

        // 3. Draw Fluid (Particles)
        // Color interpolation based on Pressure
        // High Pressure (Left) = Red, Low Pressure (Right) = Blue
        // Note: DeltaP is Drop. P1 = High, P2 = P1 - DeltaP.
        // Visually we just map High DeltaP to a "Redder" input side.
        
        const highPressureColor = `rgba(231, 76, 60, 0.7)`; // Red
        const lowPressureColor = `rgba(52, 152, 219, 0.7)`; // Blue

        particles.forEach(p => {
            p.update(orificeOpeningHeight, orificeX);
            
            // Color logic: Before Orifice = High Pressure, After = Low Pressure
            let color = (p.x < orificeX) ? highPressureColor : lowPressureColor;
            p.draw(ctx, color);
        });

        requestAnimationFrame(animate);
    }

    // --- Event Listeners ---
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', calculateFlow);
    });

    // Start
    calculateFlow();
    animate();
});