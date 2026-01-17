/**
 * S03 RC Low-Pass Step Response Simulation
 * Handles physics calculations, logarithmic slider mapping, and canvas rendering.
 */

// --- Configuration ---
const CONFIG = {
    // Logarithmic ranges for sliders (0-100 input mapped to these exponentials)
    R_MIN_POW: 1,   // 10^1 = 10 Ohm
    R_MAX_POW: 7,   // 10^7 = 10 MOhm
    C_MIN_POW: -9,  // 10^-9 = 1 nF
    C_MAX_POW: -1,  // 10^-1 = 0.1 F
    
    // Animation
    timeScale: 50,  // pixels per second (variable, will adjust dynamically)
    maxHistory: 600 // pixels
};

// --- State ---
let state = {
    Vin: 5.0,
    R: 1000,
    C: 0.0001,
    t: 0,
    running: true,
    history: [] // Array of {t, vc, ic}
};

// --- DOM Elements ---
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const els = {
    vin: { slider: document.getElementById('slider-vin'), display: document.getElementById('val-vin') },
    r:   { slider: document.getElementById('slider-r'),   display: document.getElementById('val-r') },
    c:   { slider: document.getElementById('slider-c'),   display: document.getElementById('val-c') },
    out: {
        time: document.getElementById('out-time'),
        tau:  document.getElementById('out-tau'),
        vc:   document.getElementById('out-vc'),
        ic:   document.getElementById('out-ic')
    },
    btn: {
        reset: document.getElementById('btn-reset'),
        pause: document.getElementById('btn-pause')
    }
};

// --- Helper Functions ---

// Convert slider value (0-100) to Logarithmic value
function logScale(value, minPow, maxPow) {
    const min = minPow;
    const max = maxPow;
    const power = min + (value / 100) * (max - min);
    return Math.pow(10, power);
}

// Format numbers nicely (e.g., 0.000001 -> 1.00 u)
function formatEng(num, unit) {
    if (num === 0) return "0 " + unit;
    const prefixes = [
        { val: 1e6, sym: 'M' },
        { val: 1e3, sym: 'k' },
        { val: 1,   sym: '' },
        { val: 1e-3, sym: 'm' },
        { val: 1e-6, sym: '&mu;' },
        { val: 1e-9, sym: 'n' }
    ];
    
    for (let p of prefixes) {
        if (Math.abs(num) >= p.val) {
            return (num / p.val).toFixed(2) + " " + p.sym + unit;
        }
    }
    return num.toExponential(2) + " " + unit;
}

// --- Physics Engine ---

function updatePhysics(dt) {
    if (!state.running) return;

    state.t += dt;

    const tau = state.R * state.C; // Time constant
    
    // Equations provided:
    // vc(t) = Vin * (1 - exp(-t/tau))
    // ic(t) = (Vin/R) * exp(-t/tau)
    
    const vc = state.Vin * (1 - Math.exp(-state.t / tau));
    const ic = (state.Vin / state.R) * Math.exp(-state.t / tau);

    // Update history for graphing
    state.history.push({ t: state.t, vc: vc, ic: ic });
    
    // Prune history to keep performance high
    if (state.history.length > 1000) state.history.shift();

    updateUI(vc, ic, tau);
}

function updateUI(vc, ic, tau) {
    els.out.time.innerText = state.t.toFixed(3);
    els.out.tau.innerText = formatEng(tau, 's');
    els.out.vc.innerText = vc.toFixed(2);
    els.out.ic.innerText = formatEng(ic, 'A');
}

// --- Rendering ---

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Circuit Schematic (Top Half)
    drawSchematic();

    // 2. Draw Graph (Bottom Half)
    drawGraph();

    requestAnimationFrame(renderLoop);
}

function drawSchematic() {
    const cx = canvas.width / 2;
    const cy = 100; // Center Y for schematic
    const w = 200;  // Width of circuit box
    const h = 80;   // Height of circuit box

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.lineJoin = 'round';

    // Wires
    ctx.beginPath();
    ctx.moveTo(cx - w/2, cy + h/2); // Bottom left
    ctx.lineTo(cx - w/2, cy - h/2); // Top left (Source)
    ctx.lineTo(cx, cy - h/2);       // Top middle (Resistor start)
    
    // Resistor Symbol (Zigzag)
    const rStart = cx - 30;
    const rEnd = cx + 30;
    ctx.moveTo(cx - w/2, cy - h/2);
    ctx.lineTo(rStart, cy - h/2);
    
    // Simple resistor box for clarity or zigzag
    ctx.lineTo(rStart + 5, cy - h/2 - 10);
    ctx.lineTo(rStart + 15, cy - h/2 + 10);
    ctx.lineTo(rStart + 25, cy - h/2 - 10);
    ctx.lineTo(rStart + 35, cy - h/2 + 10);
    ctx.lineTo(rStart + 45, cy - h/2 - 10);
    ctx.lineTo(rStart + 55, cy - h/2 + 10);
    ctx.lineTo(rEnd, cy - h/2);
    
    ctx.lineTo(cx + w/2, cy - h/2); // Top right
    ctx.lineTo(cx + w/2, cy + h/2); // Bottom right (Capacitor)
    ctx.lineTo(cx - w/2, cy + h/2); // Bottom wire loop
    ctx.stroke();

    // Capacitor Symbol
    const capX = cx + w/2;
    const capY = cy; // Middle of right vertical wire
    
    // Clear wire behind capacitor
    ctx.clearRect(capX - 10, cy - 15, 20, 30);
    
    // Draw Plates
    ctx.beginPath();
    ctx.moveTo(capX - 15, cy - 5);
    ctx.lineTo(capX + 15, cy - 5); // Top plate
    ctx.moveTo(capX - 15, cy + 5);
    ctx.lineTo(capX + 15, cy + 5); // Bottom plate
    ctx.stroke();

    // Dynamic Charge Visualization on Capacitor
    // Fill "virtual" area inside capacitor based on % of max voltage
    const chargePercent = (state.history.length > 0) 
        ? state.history[state.history.length-1].vc / state.Vin 
        : 0;
    
    if (chargePercent > 0.01) {
        ctx.fillStyle = `rgba(231, 76, 60, ${chargePercent})`; // Red glow
        ctx.fillRect(capX - 15, cy - 5, 30, 2); // Top plate glow
        ctx.fillStyle = `rgba(52, 152, 219, ${chargePercent})`; // Blue glow (ground/neg)
        ctx.fillRect(capX - 15, cy + 5, 30, 2); // Bottom plate glow
    }

    // Labels
    ctx.fillStyle = '#aaa';
    ctx.font = '14px sans-serif';
    ctx.fillText(`Vin: ${state.Vin}V`, cx - w/2 - 40, cy);
    ctx.fillText("R", cx - 5, cy - h/2 - 15);
    ctx.fillText("C", cx + w/2 + 10, cy);
}

function drawGraph() {
    const margin = 40;
    const graphH = 150;
    const graphY = 220; // Top of graph area
    const w = canvas.width - margin * 2;
    const bottomY = graphY + graphH;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(margin, graphY, w, graphH);

    // Grid lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=4; i++) {
        let y = graphY + (graphH * i / 4);
        ctx.moveTo(margin, y);
        ctx.lineTo(margin + w, y);
    }
    ctx.stroke();

    if (state.history.length < 2) return;

    // Define X scale: Show last 5 * Tau or minimum 2 seconds
    const tau = state.R * state.C;
    const displayWindow = Math.max(5 * tau, 0.1); // Time window in seconds
    const endTime = state.t;
    const startTime = Math.max(0, endTime - displayWindow);

    // Y Scales
    const maxY_V = Math.max(state.Vin, 0.1); // Voltage max
    const maxY_I = Math.max(state.Vin/state.R, 1e-9); // Current max

    // Helper to map coordinates
    const mapX = (t) => margin + ((t - startTime) / displayWindow) * w;
    const mapY_V = (v) => bottomY - (v / maxY_V) * graphH;
    const mapY_I = (i) => bottomY - (i / maxY_I) * graphH;

    // Draw Voltage (Red)
    ctx.beginPath();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    let started = false;
    for (let p of state.history) {
        if (p.t < startTime) continue;
        const x = mapX(p.t);
        const y = mapY_V(p.vc);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
    }
    ctx.stroke();

    // Draw Current (Yellow)
    ctx.beginPath();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    started = false;
    for (let p of state.history) {
        if (p.t < startTime) continue;
        const x = mapX(p.t);
        const y = mapY_I(p.ic);
        if (!started) { ctx.moveTo(x, y); started = true; }
        else { ctx.lineTo(x, y); }
    }
    ctx.stroke();
    
    // Labels for Y-axis
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(`${maxY_V.toFixed(1)}V`, margin - 30, graphY + 10);
    ctx.fillText(`${formatEng(maxY_I, 'A')}`, margin - 35, graphY + 25);
    ctx.fillStyle = '#e74c3c';
    ctx.fillText("Voltage", margin + 10, graphY + 20);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText("Current", margin + 60, graphY + 20);
}

// --- Interaction Loop ---

let lastTime = 0;

function renderLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    updatePhysics(dt);
    draw();
}

// --- Event Listeners ---

function updateInputs() {
    state.Vin = parseFloat(els.vin.slider.value);
    
    // Logarithmic conversion for R and C
    state.R = logScale(parseFloat(els.r.slider.value), CONFIG.R_MIN_POW, CONFIG.R_MAX_POW);
    state.C = logScale(parseFloat(els.c.slider.value), CONFIG.C_MIN_POW, CONFIG.C_MAX_POW);

    // Update displays
    els.vin.display.textContent = state.Vin.toFixed(1);
    els.r.display.textContent = formatEng(state.R, "\u03A9");
    els.c.display.textContent = formatEng(state.C, "F");
}

// Attach listeners
[els.vin.slider, els.r.slider, els.c.slider].forEach(input => {
    input.addEventListener('input', updateInputs);
});

els.btn.reset.addEventListener('click', () => {
    state.t = 0;
    state.history = [];
    state.running = true;
    els.btn.pause.innerText = "Pause";
});

els.btn.pause.addEventListener('click', () => {
    state.running = !state.running;
    els.btn.pause.innerText = state.running ? "Pause" : "Resume";
});

// Init
updateInputs();
requestAnimationFrame(renderLoop);