// Configuration & State
const state = {
    f: 440,      // Source frequency (Hz)
    c: 340,      // Speed of sound (m/s)
    vs: 50,      // Source speed (m/s)
    f_obs: 0     // Observed frequency
};

// Canvas Setup
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
let animationId;

// Physics Constants for Visualization
const PIXELS_PER_METER = 0.5; // Scale: 1 meter = 0.5 pixels
const VISUAL_TIME_SCALE = 0.02; // Slow down physics for visual clarity

// Simulation Entities
let waves = [];
let source = { x: 0, y: 0 };
let observer = { x: 0, y: 0 };
let lastEmissionTime = 0;

// DOM Elements
const els = {
    f: document.getElementById('f_slider'),
    c: document.getElementById('c_slider'),
    vs: document.getElementById('vs_slider'),
    f_val: document.getElementById('f_val'),
    c_val: document.getElementById('c_val'),
    vs_val: document.getElementById('vs_val'),
    out: document.getElementById('f_obs_display')
};

// Initialization
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initial positions
    observer.x = canvas.width * 0.8; // Observer sits at 80% width
    observer.y = canvas.height / 2;
    source.x = canvas.width * 0.2;   // Source starts at 20% width
    source.y = canvas.height / 2;

    // Add Listeners
    setupListeners();
    
    // Start Loop
    calculate();
    animate();
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    
    // Reset positions on resize
    observer.x = canvas.width * 0.8;
    observer.y = canvas.height / 2;
}

function setupListeners() {
    // Helper to update state and UI
    const updateHandler = (key, elId, valId) => (e) => {
        state[key] = parseFloat(e.target.value);
        document.getElementById(valId).textContent = state[key];
        calculate();
    };

    els.f.addEventListener('input', updateHandler('f', 'f_slider', 'f_val'));
    els.c.addEventListener('input', updateHandler('c', 'c_slider', 'c_val'));
    els.vs.addEventListener('input', updateHandler('vs', 'vs_slider', 'vs_val'));
}

// ---------------------------------------------------------
// Physics & Calculation Engine
// ---------------------------------------------------------

function calculate() {
    // Formula: f_obs = f * (c / (c - vs))
    // Note: vs is input as positive towards observer.
    
    // Validation constraint check: |vs| < c
    if (Math.abs(state.vs) >= state.c) {
        els.out.textContent = "Error (|vs| >= c)";
        return;
    }

    // Calculate
    const val = state.f * (state.c / (state.c - state.vs));
    state.f_obs = val;

    // Display formatted
    els.out.textContent = val.toFixed(2);
}

// ---------------------------------------------------------
// Animation Loop
// ---------------------------------------------------------

function animate(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 1. Update Source Position
    // We move the source based on vs. 
    // To keep it in view, if it goes too far right, wrap to left.
    // Movement logic: pixel_speed = real_speed * scale * dt
    // We assume a constant roughly 60fps for simple delta here, or use timestamp
    
    // Move Source
    source.x += state.vs * PIXELS_PER_METER * VISUAL_TIME_SCALE;

    // Wrap Logic: If source passes observer significantly or goes off screen
    if (source.x > canvas.width + 100) {
        source.x = -50; 
    } else if (source.x < -100) {
        source.x = canvas.width + 50;
    }

    // 2. Manage Waves
    // Emission rate: For visualization, we can't draw 20,000 circles.
    // We map Freq (10-20k) to a visual pulse interval (e.g., 500ms - 50ms)
    // Higher F = Faster visual pulses, but clamped.
    
    // Map frequency 10..20000 to period 800..50 (arbitrary visual units)
    // Logarithmic mapping feels better for frequency
    const minPeriod = 5;  // High freq
    const maxPeriod = 60; // Low freq
    // Simple linear interpolation for emission threshold
    // t = max - ( (f - minF)/(maxF - minF) ) * (max - min)
    const normF = (state.f - 10) / (20000 - 10);
    const emissionThreshold = maxPeriod - (normF * (maxPeriod - minPeriod));

    lastEmissionTime++;
    if (lastEmissionTime > emissionThreshold) {
        // Emit wave
        waves.push({
            x: source.x,
            y: source.y,
            r: 0,
            opacity: 1
        });
        lastEmissionTime = 0;
    }

    // Update and Draw Waves
    for (let i = waves.length - 1; i >= 0; i--) {
        let w = waves[i];
        
        // Expand wave: radius increases by speed of sound (c)
        w.r += state.c * PIXELS_PER_METER * VISUAL_TIME_SCALE;
        
        // Fade out as it gets huge
        if (w.r > canvas.width) {
            w.opacity -= 0.01;
        }

        // Remove dead waves
        if (w.opacity <= 0) {
            waves.splice(i, 1);
            continue;
        }

        // Draw Wave
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(52, 152, 219, ${w.opacity})`; // Blueish
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // 3. Draw Entities
    
    // Draw Observer (Stationary)
    ctx.beginPath();
    ctx.arc(observer.x, observer.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#2ecc71'; // Green
    ctx.fill();
    // Observer Label
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText("Observer", observer.x - 20, observer.y + 25);

    // Draw Source (Moving)
    ctx.beginPath();
    ctx.arc(source.x, source.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#e74c3c'; // Red
    ctx.fill();
    
    // Velocity Vector Indicator for Source
    if (Math.abs(state.vs) > 1) {
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        const dir = state.vs > 0 ? 1 : -1;
        const arrowLen = 30;
        ctx.lineTo(source.x + (arrowLen * dir), source.y);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(source.x + (arrowLen * dir), source.y);
        ctx.lineTo(source.x + ((arrowLen - 5) * dir), source.y - 5);
        ctx.lineTo(source.x + ((arrowLen - 5) * dir), source.y + 5);
        ctx.fillStyle = '#fff';
        ctx.fill();
    }

    animationId = requestAnimationFrame(animate);
}

// Start
init();