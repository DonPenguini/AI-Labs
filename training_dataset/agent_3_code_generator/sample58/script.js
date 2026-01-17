document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const mwSlider = document.getElementById('Mw-slider');
    const mwVal = document.getElementById('Mw-val');
    const magnitudeDesc = document.getElementById('magnitude-desc');
    const m0Result = document.getElementById('M0-result');
    const m0Sci = document.getElementById('M0-sci');
    const energyEquiv = document.getElementById('energy-equiv');
    const canvas = document.getElementById('quakeCanvas');
    const ctx = canvas.getContext('2d');
    const historyList = document.querySelectorAll('#historical-list li');

    // --- State ---
    let Mw = parseFloat(mwSlider.value);
    
    // Wave animation properties
    let time = 0;
    let waveRings = []; 

    // --- Logic ---

    // Calculate Seismic Moment M0
    function calculateM0(mag) {
        // M0 = 10^(1.5 * Mw + 9.1)
        const exponent = (1.5 * mag) + 9.1;
        return Math.pow(10, exponent);
    }

    // Get qualitative description
    function getDescription(mag) {
        if (mag < 2.0) return "Micro - Rarely felt";
        if (mag < 4.0) return "Minor - Often felt";
        if (mag < 5.0) return "Light - Minor damage";
        if (mag < 6.0) return "Moderate - Slight damage";
        if (mag < 7.0) return "Strong - Damage in populated areas";
        if (mag < 8.0) return "Major - Serious damage";
        return "Great - Total destruction";
    }

    // Rough Energy Analogies (Joules approximation)
    // Energy E ≈ M0 / 20000 (roughly, or logE = 5.24 + 1.44Mw)
    // Here we use analogies based on Moment.
    function getEnergyAnalogy(mag) {
        if (mag < 2) return "Hand Grenade";
        if (mag < 3) return "Large Construction Blast";
        if (mag < 4) return "Small Atomic Bomb (Low Yield)";
        if (mag < 5) return "Hiroshima Atomic Bomb";
        if (mag < 6) return "Standard Thunderstorm Energy";
        if (mag < 7) return "Largest Nuclear Test (Tsar Bomba)";
        if (mag < 8) return "Mount St. Helens Eruption";
        if (mag < 9) return "Krakatoa Eruption";
        return "Total Annual US Energy Consumption";
    }

    function updateDisplay() {
        Mw = parseFloat(mwSlider.value);
        
        // 1. Update Controls text
        mwVal.textContent = Mw.toFixed(1);
        magnitudeDesc.textContent = getDescription(Mw);

        // 2. Calculate M0
        const m0 = calculateM0(Mw);

        // 3. Update Result Displays
        // Full number for smaller values, Sci notation for huge ones
        if (m0 < 1e5) {
            m0Result.textContent = Math.round(m0).toLocaleString();
        } else {
            // Just show "Large Number" or Sci notation primarily
            m0Result.textContent = m0.toExponential(2);
        }
        
        // Detailed Scientific Notation
        const exponent = Math.floor(Math.log10(m0));
        const mantissa = (m0 / Math.pow(10, exponent)).toFixed(2);
        m0Sci.innerHTML = `(${mantissa} &times; 10<sup>${exponent}</sup> N·m)`;

        // 4. Update Energy Analogy
        energyEquiv.textContent = getEnergyAnalogy(Mw);

        // 5. Highlight History
        historyList.forEach(li => {
            const histMag = parseFloat(li.dataset.mag);
            // Highlight if within +/- 0.2 range
            if (Math.abs(histMag - Mw) <= 0.2) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }
        });
    }

    // --- Visualization ---
    
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Visual Scaling Strategy:
        // Seismic Moment scales exponentially (10^1.5 ≈ 32x energy per magnitude step).
        // Area scales roughly by 10 per magnitude step?
        // Let's visualize "Relative Rupture Radius".
        // Radius R scales approx 10^(0.5 * Mw).
        // We normalize so Mag 5 fits nicely in the center.
        
        // Base scale: Mag 5 = 40px radius
        const scaleFactor = 40 / Math.pow(10, 0.5 * 5); 
        const r = Math.pow(10, 0.5 * Mw) * scaleFactor;

        // 1. Draw Reference Circles (Static context)
        // Mag 4
        ctx.beginPath();
        ctx.strokeStyle = "rgba(52, 152, 219, 0.3)";
        ctx.setLineDash([5, 5]);
        const r4 = Math.pow(10, 0.5 * 4) * scaleFactor;
        ctx.arc(cx, cy, r4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Mag 7 (might be huge)
        const r7 = Math.pow(10, 0.5 * 7) * scaleFactor;
        if(r7 < Math.max(canvas.width, canvas.height)) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(52, 152, 219, 0.3)";
            ctx.lineWidth = 1;
            ctx.arc(cx, cy, r7, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 2. Draw Current Magnitude Circle (The "Quake")
        // Use a gradient for impact
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        gradient.addColorStop(0, "rgba(231, 76, 60, 0.8)"); // Center red
        gradient.addColorStop(0.7, "rgba(192, 57, 43, 0.4)");
        gradient.addColorStop(1, "rgba(192, 57, 43, 0.0)"); // Fade out
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 3. Draw "Seismic Waves" (Animation)
        // Add a new ring occasionally
        if (time % 60 === 0) { // Every ~1 sec
            waveRings.push({ r: 0, opacity: 1.0 });
        }
        
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 2;

        for (let i = 0; i < waveRings.length; i++) {
            const ring = waveRings[i];
            
            // Expansion speed depends on magnitude (larger quakes feel slower/heavier)
            ring.r += 1 + (Mw * 0.2); 
            ring.opacity -= 0.01;

            if (ring.opacity <= 0) {
                waveRings.splice(i, 1);
                i--;
            } else {
                ctx.beginPath();
                ctx.globalAlpha = ring.opacity;
                ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
        
        // Center Epicenter Marker
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI*2);
        ctx.fill();

        time++;
        requestAnimationFrame(draw);
    }

    // --- Init ---
    mwSlider.addEventListener('input', updateDisplay);
    window.addEventListener('resize', resizeCanvas);

    resizeCanvas();
    updateDisplay();
    draw();
});