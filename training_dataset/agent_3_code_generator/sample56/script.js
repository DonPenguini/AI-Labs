document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const sliders = {
        n: document.getElementById('n-slider'),
        R: document.getElementById('R-slider'),
        S: document.getElementById('S-slider'),
        A: document.getElementById('A-slider')
    };

    const displays = {
        n: document.getElementById('n-val'),
        R: document.getElementById('R-val'),
        S: document.getElementById('S-val'),
        A: document.getElementById('A-val'),
        V: document.getElementById('V-result'),
        Q: document.getElementById('Q-result'),
        hint: document.getElementById('material-hint')
    };

    const canvas = document.getElementById('channelCanvas');
    const ctx = canvas.getContext('2d');

    // --- State ---
    let params = {
        n: parseFloat(sliders.n.value),
        R: parseFloat(sliders.R.value),
        S: parseFloat(sliders.S.value),
        A: parseFloat(sliders.A.value)
    };

    let calculated = {
        V: 0,
        Q: 0
    };

    // Particles system
    let particles = [];
    const maxParticles = 300;
    // Pre-calculated terrain noise
    let bedNoise = [];

    // --- Material Hints ---
    function updateMaterialHint(n) {
        let text = "";
        if (n < 0.015) text = "Glass / Smooth Concrete";
        else if (n < 0.025) text = "Earth / Corrugated Metal";
        else if (n < 0.035) text = "Natural Channel (Clean)";
        else if (n < 0.060) text = "Natural (Stones & Weeds)";
        else text = "Heavy Brush / Timber";
        displays.hint.textContent = text;
    }

    // --- Physics ---
    function calculate() {
        // V = (1/n) * R^(2/3) * S^(1/2)
        const n = params.n;
        const R = params.R;
        const S = params.S;
        const A = params.A;

        const V = (1.0 / n) * Math.pow(R, 2/3) * Math.pow(S, 1/2);
        const Q = V * A;

        calculated.V = V;
        calculated.Q = Q;

        // UI Updates
        displays.V.textContent = V.toFixed(2);
        displays.Q.textContent = Q.toFixed(2);
        
        // Update input displays
        displays.n.textContent = n.toFixed(3);
        displays.R.textContent = R.toFixed(2);
        displays.S.textContent = S.toFixed(5);
        displays.A.textContent = A.toFixed(1);

        updateMaterialHint(n);
    }

    // --- Animation Setup ---
    
    class Particle {
        constructor(cw, ch) {
            this.reset(cw, ch);
        }

        reset(cw, ch) {
            this.x = Math.random() * cw;
            this.y = Math.random() * ch; // Initial scatter
            this.size = Math.random() * 2 + 2;
            this.speedMod = Math.random() * 0.2 + 0.9; // Slight variation
            this.active = true;
        }

        update(V, cw, ch, depthPx) {
            // Visual speed scaling: 1 m/s = 20 px/frame (capped for sanity)
            let visualSpeed = V * 10;
            if(visualSpeed > 50) visualSpeed = 50; // Cap visual speed
            if(visualSpeed < 0.5 && V > 0) visualSpeed = 0.5; // Min speed if moving

            this.x += visualSpeed * this.speedMod;

            // Wrap around
            if (this.x > cw) {
                this.x = -10;
                this.y = Math.random() * depthPx; // Respawn at random depth
            }
        }

        draw(ctx) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function generateBedNoise(width) {
        // Generate static noise for the ground based on width
        bedNoise = [];
        for (let i = 0; i <= width; i+=5) {
            bedNoise.push(Math.random());
        }
    }

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        generateBedNoise(canvas.width);
        // Reset particles
        particles = [];
        for (let i = 0; i < maxParticles; i++) {
            particles.push(new Particle(canvas.width, canvas.height));
        }
    }

    // --- Main Loop ---
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;

        // 1. Calculate Geometry for Visuals
        // We visualize a side slice.
        // Slope S: 0.0001 to 0.1.
        // 0.1 is very steep. We need to exaggerate slope visually but clamp it so it doesn't break rendering.
        // Visual Rotation Angle:
        let visualSlopeAngle = Math.atan(params.S);
        // Exaggerate small slopes for visibility, clamp large ones
        if (params.S < 0.01) visualSlopeAngle *= 20; 
        else if (params.S < 0.05) visualSlopeAngle *= 5;
        
        const rotationCenterX = w / 2;
        const rotationCenterY = h / 2;

        ctx.save();
        
        // Translate and Rotate Context to show slope
        ctx.translate(rotationCenterX, rotationCenterY);
        ctx.rotate(visualSlopeAngle);
        ctx.translate(-rotationCenterX, -rotationCenterY);

        // 2. Determine Water Depth visually
        // R ranges 0.01 to 5.
        // Map R to pixels. Max depth = 60% of canvas.
        const maxDepthPx = h * 0.7;
        const minDepthPx = 20;
        // Simple linear mapping for visualization
        const depthRatio = Math.min(1, params.R / 5.0);
        const waterDepthPx = minDepthPx + (depthRatio * (maxDepthPx - minDepthPx));
        
        // Bed Y position
        const bedY = h * 0.8;
        const waterSurfaceY = bedY - waterDepthPx;

        // 3. Draw Water Body
        ctx.fillStyle = "rgba(52, 152, 219, 0.6)";
        ctx.fillRect(-100, waterSurfaceY, w + 200, waterDepthPx); // Oversized width for rotation safety

        // 4. Draw Particles (Flow)
        // Clip particles to water area
        ctx.save();
        ctx.beginPath();
        ctx.rect(-100, waterSurfaceY, w + 200, waterDepthPx);
        ctx.clip();
        
        // Offset particles coordinate system to water surface
        ctx.translate(0, waterSurfaceY); 
        
        particles.forEach(p => {
            // Only update/draw based on current V and depth
            p.update(calculated.V, w, h, waterDepthPx);
            p.draw(ctx);
        });
        ctx.restore(); // End clip

        // 5. Draw Bed (Roughness)
        ctx.fillStyle = "#795548"; // Brown
        ctx.beginPath();
        ctx.moveTo(-100, h); // Bottom Left
        ctx.lineTo(-100, bedY); // Top Left (start of bed)

        // Draw rough surface
        // n ranges 0.01 to 0.2
        const roughnessScale = (params.n - 0.01) * 300; // Amplitude scaling
        
        for (let x = 0; x <= w + 100; x += 5) {
            // Map x to noise array index
            const noiseIdx = Math.floor((x % w) / 5) % bedNoise.length;
            const noise = bedNoise[noiseIdx];
            const yOffset = (noise - 0.5) * roughnessScale;
            ctx.lineTo(x - 50, bedY + yOffset);
        }

        ctx.lineTo(w + 100, h); // Bottom Right
        ctx.fill();

        ctx.restore(); // End Rotation

        // 6. Slope Indicator (Overlay - Fixed orientation)
        // Draw a small triangle to show slope angle if slope is significant
        /*
        ctx.fillStyle = "black";
        ctx.font = "12px sans-serif";
        ctx.fillText(`Slope: ${(params.S * 100).toFixed(2)}%`, 10, 20);
        */

        requestAnimationFrame(animate);
    }

    // --- Input Handling ---
    function handleInput() {
        params.n = parseFloat(sliders.n.value);
        params.R = parseFloat(sliders.R.value);
        params.S = parseFloat(sliders.S.value);
        params.A = parseFloat(sliders.A.value);
        
        calculate();
    }

    Object.values(sliders).forEach(s => s.addEventListener('input', handleInput));
    window.addEventListener('resize', resizeCanvas);

    // --- Initialization ---
    resizeCanvas();
    calculate();
    animate();
});