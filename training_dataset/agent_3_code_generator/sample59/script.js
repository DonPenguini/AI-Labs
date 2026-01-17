document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('starCanvas');
    const ctx = canvas.getContext('2d');

    const inputs = {
        m1: document.getElementById('m1'),
        m2: document.getElementById('m2')
    };

    const displays = {
        m1: document.getElementById('val_m1'),
        m2: document.getElementById('val_m2'),
        ratio: document.getElementById('output_ratio'),
        text: document.getElementById('comparison_text')
    };

    // --- State ---
    let m1 = 0;
    let m2 = 5;
    let fluxRatio = 1;
    
    // Background stars for aesthetic
    let bgStars = [];

    // --- Initialization ---
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        initBgStars();
    }
    window.addEventListener('resize', resizeCanvas);
    
    function initBgStars() {
        bgStars = [];
        for(let i=0; i<100; i++) {
            bgStars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5,
                opacity: Math.random()
            });
        }
    }
    resizeCanvas();

    // --- Logic ---
    function update() {
        m1 = parseFloat(inputs.m1.value);
        m2 = parseFloat(inputs.m2.value);

        displays.m1.textContent = m1.toFixed(1);
        displays.m2.textContent = m2.toFixed(1);

        // Formula: F2/F1 = 10^(-0.4 * (m2 - m1))
        const deltaM = m2 - m1;
        fluxRatio = Math.pow(10, -0.4 * deltaM);

        // Display Formatting
        // If number is huge or tiny, use scientific notation
        if (fluxRatio > 1000 || fluxRatio < 0.001) {
            displays.ratio.textContent = fluxRatio.toExponential(3);
        } else {
            displays.ratio.textContent = fluxRatio.toFixed(3);
        }

        // Comparison Text
        if (fluxRatio > 1) {
            displays.text.textContent = `Object 2 is ${(fluxRatio).toFixed(2)}x BRIGHTER than Object 1`;
            displays.text.style.color = "#4dabf7"; // Blue
        } else if (fluxRatio < 1) {
            displays.text.textContent = `Object 2 is ${(1/fluxRatio).toFixed(2)}x DIMMER than Object 1`;
            displays.text.style.color = "#ff7675"; // Red/Dim
        } else {
            displays.text.textContent = "Both objects have equal brightness.";
            displays.text.style.color = "#fff";
        }
    }

    // --- Rendering Helpers ---
    
    // Draw a star with a glow effect
    function drawStar(x, y, baseRadius, color, brightnessFactor) {
        // Brightness Factor determines opacity and "glow" radius
        // However, brightness varies by orders of magnitude (1 to 1,000,000+)
        // We must compress this for visual display using a Log scale.
        
        // Logarithmic visual mapping
        // We want 1.0 to look "normal". 
        // 100x brightness shouldn't cover the whole screen, but be significantly larger/whiter.
        
        let visualScale = Math.log10(brightnessFactor + 1); // +1 prevents log(0)
        if(visualScale < 0.2) visualScale = 0.2; // Min visibility
        
        // Radius
        const r = baseRadius * (0.5 + 0.5 * visualScale);
        
        // Glow
        const gradient = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.4, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.globalAlpha = Math.min(1, 0.3 + 0.2 * visualScale); // Cap opacity
        
        ctx.beginPath();
        ctx.arc(x, y, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Diffraction Spikes (Cross) for style
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        const spikeLen = r * 4;
        
        ctx.beginPath();
        ctx.moveTo(x - spikeLen, y);
        ctx.lineTo(x + spikeLen, y);
        ctx.moveTo(x, y - spikeLen);
        ctx.lineTo(x, y + spikeLen);
        ctx.stroke();

        ctx.globalAlpha = 1; // Reset
    }

    // --- Animation Loop ---
    let tick = 0;
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. Draw Background Stars
        ctx.fillStyle = "#fff";
        bgStars.forEach(star => {
            // Twinkle
            let alpha = star.opacity + Math.sin(tick * 0.05 + star.x) * 0.2;
            if (alpha < 0) alpha = 0;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI*2);
            ctx.fill();
        });
        ctx.globalAlpha = 1;

        // 2. Draw Main Stars
        const centerY = canvas.height / 2;
        const spacing = canvas.width / 4;
        
        // Star 1 (Reference)
        // We fix Star 1 visual brightness to a constant "1.0" visual baseline
        // unless we want to show relative shift. 
        // Let's keep Star 1 fixed visually to provide a stable reference point.
        drawStar(spacing, centerY, 15, "#ffffff", 10); // 10 is arbitrary visual baseline
        
        // Star 2 (Comparison)
        // Flux Ratio is F2 / F1. 
        // Visual Input = 10 (baseline) * fluxRatio
        // Since range is huge, we clamp the visual input so the screen doesn't turn white.
        let visualBrightness = 10 * fluxRatio;
        
        // Clamp for visual sanity (it can go to 10^10)
        // We rely on the text for the exact number, visuals are qualitative.
        if (visualBrightness > 1000) visualBrightness = 1000; 

        drawStar(spacing * 3, centerY, 15, "#ffd43b", visualBrightness);

        // Labels on Canvas
        ctx.fillStyle = "#aaa";
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Reference (m1)", spacing, centerY + 80);
        ctx.fillText("Comparison (m2)", spacing * 3, centerY + 80);

        tick++;
        requestAnimationFrame(animate);
    }

    // Listeners
    inputs.m1.addEventListener('input', update);
    inputs.m2.addEventListener('input', update);

    // Start
    update();
    animate();
});