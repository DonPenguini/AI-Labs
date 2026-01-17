/**
 * S66 Time Dilation Simulation
 */

// --- Constants ---
const C = 299792458; // Speed of light in m/s (exact)
const ANIMATION_FPS = 60;

// --- State ---
const state = {
    v: 0,           // Velocity (m/s)
    tau_target: 10, // Target proper time (s)
    
    // Animation state
    elapsed_tau: 0, // Running proper time (simulated seconds)
    elapsed_t: 0,   // Running coordinate time (simulated seconds)
    
    // Computed values
    beta: 0,
    gamma: 1,
    coordinate_time_total: 10,
    
    // Canvas context
    canvas: null,
    ctx: null,
    width: 0,
    height: 0,
    stars: [], // Background stars
};

// --- DOM Elements ---
const els = {
    vSlider: document.getElementById('velocity-slider'),
    tSlider: document.getElementById('time-slider'),
    vVal: document.getElementById('velocity-val'),
    betaVal: document.getElementById('beta-val'),
    timeVal: document.getElementById('time-val'),
    gammaResult: document.getElementById('gamma-result'),
    coordTimeResult: document.getElementById('coord-time-result'),
    canvas: document.getElementById('simCanvas')
};

// --- Initialization ---
function init() {
    // Canvas Setup
    state.canvas = els.canvas;
    state.ctx = state.canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize Stars
    generateStars(100);

    // Event Listeners
    els.vSlider.addEventListener('input', updateParams);
    els.tSlider.addEventListener('input', updateParams);

    // Initial Calculation
    updateParams();

    // Start Loop
    requestAnimationFrame(animate);
}

function resizeCanvas() {
    const parent = state.canvas.parentElement;
    state.canvas.width = parent.clientWidth;
    state.canvas.height = parent.clientHeight;
    state.width = state.canvas.width;
    state.height = state.canvas.height;
    generateStars(100); // Regenerate stars on resize
}

function generateStars(count) {
    state.stars = [];
    for (let i = 0; i < count; i++) {
        state.stars.push({
            x: Math.random() * state.width,
            y: Math.random() * state.height,
            size: Math.random() * 2,
            opacity: Math.random()
        });
    }
}

// --- Physics & Updates ---
function updateParams() {
    // Read inputs
    state.v = parseFloat(els.vSlider.value);
    state.tau_target = parseFloat(els.tSlider.value);

    // Update UI text
    els.vVal.textContent = state.v.toLocaleString();
    els.timeVal.textContent = state.tau_target;

    // Calculate Physics
    state.beta = state.v / C;
    
    // Clamp beta slightly below 1 to avoid Infinity
    if (state.beta >= 1) state.beta = 0.9999;
    
    els.betaVal.textContent = state.beta.toFixed(3);

    // Gamma
    state.gamma = 1 / Math.sqrt(1 - (state.beta * state.beta));
    
    // Coordinate Time (Total)
    state.coordinate_time_total = state.gamma * state.tau_target;

    // Update Results UI
    els.gammaResult.textContent = state.gamma.toFixed(3);
    els.coordTimeResult.textContent = state.coordinate_time_total.toFixed(2) + " s";
}

// --- Drawing Helpers ---

function drawClock(ctx, x, y, radius, timeValue, label, color) {
    // Clock Face
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Ticks
    for (let i = 0; i < 12; i++) {
        const angle = (i * 30) * Math.PI / 180;
        const tickLen = i % 3 === 0 ? 10 : 5;
        const tx1 = x + Math.cos(angle) * (radius - tickLen);
        const ty1 = y + Math.sin(angle) * (radius - tickLen);
        const tx2 = x + Math.cos(angle) * (radius - 2);
        const ty2 = y + Math.sin(angle) * (radius - 2);
        
        ctx.beginPath();
        ctx.moveTo(tx1, ty1);
        ctx.lineTo(tx2, ty2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Hand (seconds) - Mapping time to rotation
    const angle = (timeValue % 60) * 6 * Math.PI / 180 - Math.PI / 2;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * (radius - 10), y + Math.sin(angle) * (radius - 10));
    ctx.strokeStyle = '#ef4444'; // Red hand
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center pivot
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Digital readout below
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(timeValue.toFixed(2) + " s", x, y + radius + 30);
}

function drawRocket(ctx, x, y, width, height) {
    ctx.save();
    ctx.translate(x, y);
    
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, width/2, height/2, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    
    // Engine flame (flickering)
    if (state.v > 0) {
        const flameLen = (Math.random() * 10 + 20) * (state.beta + 0.2);
        ctx.beginPath();
        ctx.moveTo(-width/2 + 5, -5);
        ctx.lineTo(-width/2 - flameLen, 0);
        ctx.lineTo(-width/2 + 5, 5);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
    }

    // Window
    ctx.beginPath();
    ctx.arc(10, -5, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#3b82f6';
    ctx.fill();

    ctx.restore();
}

// --- Animation Loop ---
let lastTime = 0;

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000; // Delta time in seconds
    lastTime = timestamp;

    const ctx = state.ctx;
    const w = state.width;
    const h = state.height;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    // Draw Stars (Parallax effect based on velocity)
    const starSpeed = 50 + (state.beta * 500); 
    
    state.stars.forEach(star => {
        star.x -= starSpeed * dt * (star.size / 2);
        if (star.x < 0) star.x = w;

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, 2 * Math.PI);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
        ctx.fill();
    });

    // --- Time Evolution Logic ---
    const simSpeed = 1.0; // 1 simulation second per real second
    
    // Reset if we exceed the target proper time for looping effect
    if (state.elapsed_tau > state.tau_target) {
        state.elapsed_tau = 0;
        state.elapsed_t = 0;
    }

    // Increment proper time
    const dTau = dt * simSpeed;
    state.elapsed_tau += dTau;
    
    // Increment coordinate time (t = gamma * tau)
    state.elapsed_t += dTau * state.gamma;


    // --- Draw Clocks ---
    const clockY = h / 2 + 80;
    
    // 1. Stationary Clock (Observer on Earth) - Left
    // This clock ticks FASTER (t > tau)
    drawClock(ctx, w * 0.25, clockY, 50, state.elapsed_t, "Stationary", "#3b82f6");

    // 2. Moving Clock (On Rocket) - Right
    // This clock ticks "Normally" (Proper time) relative to itself
    drawClock(ctx, w * 0.75, clockY, 50, state.elapsed_tau, "Moving", "#ef4444");


    // --- Draw Scene ---
    // Stationary Observer (Earth icon)
    ctx.font = '40px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🌍', w * 0.25, h/2 - 50);

    // Moving Rocket
    // Moves across screen 
    const progress = state.elapsed_tau / state.tau_target;
    const rocketX = (w * 0.1) + ((w * 0.8) * progress);
    
    drawRocket(ctx, rocketX, h/2 - 60, 60, 30);

    requestAnimationFrame(animate);
}

// Start
window.onload = init;