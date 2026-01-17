/**
 * S25 First Order Reaction Simulation
 * Physics: C(t) = C0 * exp(-k * t)
 */

// Configuration State
const state = {
    c0: 2.5,          // Initial Concentration (mol/L)
    k: 0.1,           // Rate constant (1/s)
    currentTime: 0,   // Current simulation time (s)
    isRunning: false,
    animationId: null,
    maxTime: 60       // Dynamic max time for graph scaling (5 * tau)
};

// DOM Elements
const ui = {
    c0Slider: document.getElementById('c0-slider'),
    c0Val: document.getElementById('c0-val'),
    kSlider: document.getElementById('k-slider'),
    kVal: document.getElementById('k-val'),
    timeDisplay: document.getElementById('time-display'),
    concDisplay: document.getElementById('conc-display'),
    liquid: document.getElementById('liquid-visual'),
    canvas: document.getElementById('reactionChart'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    btnReset: document.getElementById('btn-reset')
};

// Canvas Context
const ctx = ui.canvas.getContext('2d');

/**
 * Initialize Simulation
 */
function init() {
    // Set Canvas Resolution
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Event Listeners
    ui.c0Slider.addEventListener('input', (e) => updateParams('c0', parseFloat(e.target.value)));
    ui.kSlider.addEventListener('input', (e) => updateParams('k', parseFloat(e.target.value)));
    
    ui.btnStart.addEventListener('click', startSimulation);
    ui.btnPause.addEventListener('click', pauseSimulation);
    ui.btnReset.addEventListener('click', resetSimulation);

    // Initial render
    updateParams('c0', state.c0);
    updateParams('k', state.k);
    resetSimulation();
}

/**
 * Update parameters from UI
 */
function updateParams(key, value) {
    state[key] = value;
    
    // Update text displays
    if (key === 'c0') ui.c0Val.innerText = value.toFixed(2);
    if (key === 'k') ui.kVal.innerText = value.toFixed(2);

    // Recalculate interesting time domain (5 time constants)
    // tau = 1/k. 99% reaction complete by 5*tau.
    state.maxTime = Math.max(10, 5 * (1 / state.k));

    // If simulation is idle (t=0), update displays immediately without running
    if (state.currentTime === 0 && !state.isRunning) {
        updateVisuals();
        drawChart();
    } 
    // If running, the loop handles it. If paused, we redraw chart to show new path prediction
    else if (!state.isRunning) {
        drawChart();
    }
}

function resizeCanvas() {
    // scale for retina displays
    const dpr = window.devicePixelRatio || 1;
    const rect = ui.canvas.parentElement.getBoundingClientRect();
    ui.canvas.width = rect.width * dpr;
    ui.canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    // Store logical size for drawing
    state.canvasWidth = rect.width;
    state.canvasHeight = rect.height;
    drawChart();
}

/**
 * Core Physics Equation
 */
function calculateConcentration(t) {
    return state.c0 * Math.exp(-state.k * t);
}

/**
 * Simulation Loop
 */
let lastFrameTime = 0;

function loop(timestamp) {
    if (!state.isRunning) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = (timestamp - lastFrameTime) / 1000; // seconds
    lastFrameTime = timestamp;

    // Advance time
    // We speed up simulation time slightly for better UX if k is very small, 
    // but for this specific "1/s" unit range, real-time or 1x speed is usually fine.
    // Let's use a dynamic speed factor based on k to ensure the user sees progress.
    // If k is 0.01, reaction takes 500s. We don't want to wait 500s.
    // Let's scale time so 5*tau takes about 10 real seconds.
    const simulationDuration = 5 / state.k; 
    const realDuration = 10; // we want animation to finish in ~10 seconds
    const timeScale = simulationDuration / realDuration;

    state.currentTime += deltaTime * timeScale;

    // Check bounds
    if (state.currentTime > state.maxTime) {
        state.currentTime = state.maxTime;
        pauseSimulation();
    }

    updateVisuals();
    drawChart();

    state.animationId = requestAnimationFrame(loop);
}

function startSimulation() {
    if (state.isRunning) return;
    state.isRunning = true;
    lastFrameTime = 0;
    state.animationId = requestAnimationFrame(loop);
}

function pauseSimulation() {
    state.isRunning = false;
    cancelAnimationFrame(state.animationId);
    lastFrameTime = 0;
}

function resetSimulation() {
    pauseSimulation();
    state.currentTime = 0;
    updateVisuals();
    drawChart();
}

/**
 * Visual Updates
 */
function updateVisuals() {
    const currentC = calculateConcentration(state.currentTime);

    // 1. Update Text
    ui.timeDisplay.innerText = state.currentTime.toFixed(2) + " s";
    ui.concDisplay.innerText = currentC.toFixed(3) + " mol/L";

    // 2. Update Reactor Liquid
    // Opacity based on ratio of Current C to Max Possible C (5.0 defined in JSON range, or just C0?)
    // Using C/C0 makes the visual relative to start, which is more intuitive for "decay".
    // 0 concentration = 0.1 opacity (faint trace), C0 = 1.0 opacity
    const opacity = (currentC / state.c0) * 0.9 + 0.1; 
    
    // We update the Alpha channel of the RGBA color defined in CSS
    ui.liquid.style.backgroundColor = `rgba(59, 130, 246, ${opacity})`;
}

/**
 * Canvas Chart Drawing
 */
function drawChart() {
    const { canvasWidth: w, canvasHeight: h, maxTime, c0, k, currentTime } = state;
    
    // Clear
    ctx.clearRect(0, 0, w, h);

    // Padding
    const pad = { top: 20, right: 20, bottom: 40, left: 50 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Helper to map Data to Pixels
    const mapX = (t) => pad.left + (t / maxTime) * plotW;
    // Y axis goes from 0 to 5 (max range in JSON) or slightly above C0? 
    // Let's scale Y to C0 * 1.1 for better view
    const maxY = Math.max(c0 * 1.1, 0.001); 
    const mapY = (c) => pad.top + plotH - (c / maxY) * plotH;

    // 1. Draw Axes
    ctx.beginPath();
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    // Y-Axis
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    // X-Axis
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // 2. Draw Labels
    ctx.fillStyle = "#444";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    
    // X-labels
    for(let i=0; i<=5; i++) {
        const val = (maxTime * i / 5);
        const x = mapX(val);
        ctx.fillText(val.toFixed(1), x, pad.top + plotH + 20);
    }
    // X-Axis Title
    ctx.fillText("Time (s)", pad.left + plotW/2, pad.top + plotH + 35);

    // Y-labels
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for(let i=0; i<=5; i++) {
        const val = (maxY * i / 5);
        const y = mapY(val);
        ctx.fillText(val.toFixed(2), pad.left - 10, y);
    }
    // Y-Axis Title
    ctx.save();
    ctx.translate(15, pad.top + plotH/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = "center";
    ctx.fillText("Concentration (mol/L)", 0, 0);
    ctx.restore();

    // 3. Draw Theoretical Curve (Static Background Line)
    ctx.beginPath();
    ctx.strokeStyle = "#cbd5e1"; // Light grey
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]); // Dashed
    for(let px = 0; px <= plotW; px+=2) {
        const t = (px / plotW) * maxTime;
        const c = c0 * Math.exp(-k * t);
        const py = mapY(c);
        if(px===0) ctx.moveTo(pad.left + px, py);
        else ctx.lineTo(pad.left + px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 4. Draw Active Path (Solid Blue up to current time)
    ctx.beginPath();
    ctx.strokeStyle = "#3b82f6"; // Primary blue
    ctx.lineWidth = 3;
    
    // We draw from t=0 to t=currentTime
    // Steps for smoothness
    const steps = 100;
    const timeStep = currentTime / steps;
    
    if (currentTime > 0) {
        ctx.moveTo(mapX(0), mapY(c0));
        for(let i = 1; i <= steps; i++) {
            const t = i * timeStep;
            const c = c0 * Math.exp(-k * t);
            ctx.lineTo(mapX(t), mapY(c));
        }
        ctx.stroke();
    }

    // 5. Draw Current Point Marker
    const curC = calculateConcentration(currentTime);
    const cx = mapX(currentTime);
    const cy = mapY(curC);

    ctx.beginPath();
    ctx.fillStyle = "#ef4444"; // Red dot
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Run
init();