/**
 * S06: Mass-Spring-Damper Simulation
 * Domain: Physics (Mechanics)
 * Method: Closed-form underdamped solution
 */

// --- Configuration ---
const CONFIG = {
    pixelsPerMeter: 100, // 1m = 100px
    originY: 100,        // Y position of the ceiling anchor
    originX: 150,        // X position center
    eqPos: 150,          // Equilibrium length (pixels from originY)
    maxHistory: 500,     // Graph width in points
};

// --- State ---
let state = {
    // Parameters
    m: 5.0,
    k: 50,
    c: 2.0,
    
    // Initial Conditions (used for equation)
    x0: 0.8,
    v0: 0.0,
    
    // Runtime
    t: 0,
    currentX: 0,
    currentV: 0,
    omegaD: 0,
    isOverdamped: false,
    running: true,
    history: [] // {t, x}
};

// --- DOM Elements ---
const cvsMech = document.getElementById('mechCanvas');
const ctxMech = cvsMech.getContext('2d');
const cvsGraph = document.getElementById('graphCanvas');
const ctxGraph = cvsGraph.getContext('2d');

const inputs = {
    m: document.getElementById('slider-m'),
    k: document.getElementById('slider-k'),
    c: document.getElementById('slider-c'),
    x0: document.getElementById('slider-x0'),
    v0: document.getElementById('slider-v0'),
};

const displays = {
    m: document.getElementById('val-m'),
    k: document.getElementById('val-k'),
    c: document.getElementById('val-c'),
    x0: document.getElementById('val-x0'),
    v0: document.getElementById('val-v0'),
    warning: document.getElementById('damping-warning'),
    t: document.getElementById('out-t'),
    x: document.getElementById('out-x'),
    v: document.getElementById('out-v'),
    wd: document.getElementById('out-wd'),
};

const btns = {
    reset: document.getElementById('btn-reset'),
    pause: document.getElementById('btn-pause')
};

// --- Physics Engine ---

function calculatePhysics(t) {
    // Constants derived from state
    // omega_n = sqrt(k/m)
    // zeta = c / (2 * sqrt(km))
    // alpha = c / (2m)
    
    const alpha = state.c / (2 * state.m);
    const discriminant = (state.k / state.m) - (alpha * alpha);
    
    // Check constraint
    if (discriminant <= 0) {
        state.isOverdamped = true;
        displays.warning.style.display = 'block';
        state.omegaD = 0;
        // Fallback for visual stability (prevent NaN), though physics is wrong for Overdamped here
        return { x: 0, v: 0 }; 
    } else {
        state.isOverdamped = false;
        displays.warning.style.display = 'none';
        state.omegaD = Math.sqrt(discriminant);
    }
    
    const wd = state.omegaD;
    
    // x(t) = exp(-alpha*t) * (x0*cos(wd*t) + (v0 + alpha*x0)/wd * sin(wd*t))
    const decay = Math.exp(-alpha * t);
    const A = state.x0;
    const B = (state.v0 + alpha * state.x0) / wd;
    
    const pos = decay * (A * Math.cos(wd * t) + B * Math.sin(wd * t));
    
    // v(t) - derivative of above
    // v(t) = -alpha * x(t) + decay * ( -A*wd*sin(wd*t) + B*wd*cos(wd*t) )
    const vel = -alpha * pos + decay * (-A * wd * Math.sin(wd * t) + B * wd * Math.cos(wd * t));

    return { x: pos, v: vel };
}

// --- Drawing Functions ---

function drawSpring(ctx, x1, y1, x2, y2, coils, width) {
    ctx.beginPath();
    ctx.strokeStyle = '#7f8c8d';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    
    const dy = (y2 - y1) / coils;
    const r = width / 2;
    
    ctx.moveTo(x1, y1);
    for (let i = 1; i <= coils; i++) {
        const y = y1 + dy * i;
        const prevY = y1 + dy * (i - 1);
        
        // Zigzag
        ctx.lineTo(x1 - r, prevY + dy * 0.25);
        ctx.lineTo(x1 + r, prevY + dy * 0.75);
        ctx.lineTo(x1, y);
    }
    ctx.stroke();
}

function drawDamper(ctx, x, y1, y2, width) {
    const housingW = width * 0.8;
    const housingH = (y2 - y1) * 0.4; // Dynamically size pot
    const pistonY = y2 - housingH/2; // Approximate piston location inside
    
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(149, 165, 166, 0.2)';

    // Draw Top Rod (attached to ceiling)
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y1 + (y2 - y1) - housingH); // Plunger rod
    ctx.stroke();
    
    // Draw Plunger Head
    ctx.beginPath();
    ctx.moveTo(x - housingW/2 + 2, y1 + (y2-y1) - housingH);
    ctx.lineTo(x + housingW/2 - 2, y1 + (y2-y1) - housingH);
    ctx.stroke();

    // Draw Housing (Pot attached to mass)
    const potTop = y2 - housingH;
    ctx.beginPath();
    ctx.rect(x - housingW/2, potTop, housingW, housingH); 
    ctx.stroke();
    ctx.fill();
    
    // Connection to mass
    ctx.beginPath();
    ctx.moveTo(x, y2 - housingH + housingH); // Bottom of pot
    ctx.lineTo(x, y2);
    ctx.stroke();
}

function drawSystem() {
    ctxMech.clearRect(0, 0, cvsMech.width, cvsMech.height);
    
    const ceilingY = CONFIG.originY;
    const centerX = CONFIG.originX;
    
    // Current pixel Y position of mass center
    // eqPos is equilibrium. currentX is displacement.
    const massY = ceilingY + CONFIG.eqPos + (state.currentX * CONFIG.pixelsPerMeter);
    
    const massW = 80;
    const massH = 50;
    
    // Draw Ceiling
    ctxMech.fillStyle = '#2c3e50';
    ctxMech.fillRect(centerX - 100, ceilingY - 10, 200, 10);
    
    // Draw Spring (Left side)
    drawSpring(ctxMech, centerX - 30, ceilingY, centerX - 30, massY - massH/2, 10, 20);
    
    // Draw Damper (Right side)
    drawDamper(ctxMech, centerX + 30, ceilingY, massY - massH/2, 25);
    
    // Draw Mass
    ctxMech.fillStyle = '#34495e';
    ctxMech.beginPath();
    ctxMech.roundRect(centerX - massW/2, massY - massH/2, massW, massH, 5);
    ctxMech.fill();
    ctxMech.strokeStyle = '#2c3e50';
    ctxMech.stroke();
    
    // Label Mass
    ctxMech.fillStyle = '#fff';
    ctxMech.font = '12px Arial';
    ctxMech.textAlign = 'center';
    ctxMech.textBaseline = 'middle';
    ctxMech.fillText("m", centerX, massY);
    
    // Equilibrium Line
    ctxMech.setLineDash([5, 5]);
    ctxMech.strokeStyle = '#ccc';
    ctxMech.beginPath();
    ctxMech.moveTo(centerX - 100, ceilingY + CONFIG.eqPos);
    ctxMech.lineTo(centerX + 100, ceilingY + CONFIG.eqPos);
    ctxMech.stroke();
    ctxMech.setLineDash([]);
    ctxMech.fillStyle = '#ccc';
    ctxMech.fillText("x=0", centerX + 120, ceilingY + CONFIG.eqPos);
}

function drawGraph() {
    const w = cvsGraph.width;
    const h = cvsGraph.height;
    ctxGraph.clearRect(0, 0, w, h);
    
    // Background Grid
    ctxGraph.strokeStyle = '#eee';
    ctxGraph.lineWidth = 1;
    ctxGraph.beginPath();
    ctxGraph.moveTo(0, h/2);
    ctxGraph.lineTo(w, h/2);
    ctxGraph.stroke();
    
    if (state.history.length < 2) return;
    
    // Plot
    ctxGraph.beginPath();
    ctxGraph.strokeStyle = '#e74c3c';
    ctxGraph.lineWidth = 2;
    
    const timeWindow = 5; // Display 5 seconds window
    const now = state.t;
    const minTime = Math.max(0, now - timeWindow);
    
    // Y Scale: +/- 1.2m
    const scaleY = (h/2) / 1.2; 
    
    let first = true;
    
    for (let point of state.history) {
        if (point.t < minTime) continue;
        
        // Map Time to X
        const x = ((point.t - minTime) / timeWindow) * w;
        // Map Disp to Y (invert because canvas Y is down)
        const y = (h/2) - (point.x * scaleY);
        
        if (first) {
            ctxGraph.moveTo(x, y);
            first = false;
        } else {
            ctxGraph.lineTo(x, y);
        }
    }
    ctxGraph.stroke();
    
    // Draw Current Indicator
    if (state.history.length > 0) {
        const last = state.history[state.history.length-1];
        const lx = ((last.t - minTime) / timeWindow) * w;
        const ly = (h/2) - (last.x * scaleY);
        
        ctxGraph.fillStyle = '#e74c3c';
        ctxGraph.beginPath();
        ctxGraph.arc(lx, ly, 4, 0, Math.PI*2);
        ctxGraph.fill();
    }
}

// --- Animation Loop ---

let lastTime = 0;

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (state.running && !state.isOverdamped) {
        state.t += dt;
        
        const res = calculatePhysics(state.t);
        state.currentX = res.x;
        state.currentV = res.v;
        
        // Store history
        state.history.push({ t: state.t, x: state.currentX });
        if (state.history.length > 1000) state.history.shift(); // Memory management
        
        updateUIValues();
    }

    drawSystem();
    drawGraph();
    
    requestAnimationFrame(animate);
}

function updateUIValues() {
    displays.t.textContent = state.t.toFixed(2);
    displays.x.textContent = state.currentX.toFixed(3);
    displays.v.textContent = state.currentV.toFixed(3);
    displays.wd.textContent = state.omegaD.toFixed(2);
}

// --- Event Listeners ---

function updateParams(fromSlider = false) {
    // If updating params while running, we treat the CURRENT position/velocity
    // as the NEW initial conditions for t=0 to prevent jumping.
    // Unless it's a reset.
    
    const newM = parseFloat(inputs.m.value);
    const newK = parseFloat(inputs.k.value);
    const newC = parseFloat(inputs.c.value);
    
    // Check if parameters changed significantly
    if (state.running && fromSlider) {
        // "Hot swap": Preserve continuity
        state.x0 = state.currentX;
        state.v0 = state.currentV;
        state.t = 0; // Reset time to solve IVP from 'now'
        state.history = []; // Clear graph for clean slate visual
    } else if (!state.running && fromSlider) {
        // If paused, just update the "Initial" values from sliders
        state.x0 = parseFloat(inputs.x0.value);
        state.v0 = parseFloat(inputs.v0.value);
    }
    
    state.m = newM;
    state.k = newK;
    state.c = newC;

    // Update Slider Displays
    displays.m.textContent = state.m;
    displays.k.textContent = state.k;
    displays.c.textContent = state.c;
    displays.x0.textContent = parseFloat(inputs.x0.value);
    displays.v0.textContent = parseFloat(inputs.v0.value);
    
    // Pre-calc to check damping warning immediately
    calculatePhysics(0); 
}

// Attach listeners
Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', () => updateParams(true));
});

btns.reset.addEventListener('click', () => {
    // Hard reset to slider values
    state.t = 0;
    state.x0 = parseFloat(inputs.x0.value);
    state.v0 = parseFloat(inputs.v0.value);
    state.history = [];
    state.running = true;
    btns.pause.textContent = "Pause";
    updateParams(false);
});

btns.pause.addEventListener('click', () => {
    state.running = !state.running;
    btns.pause.textContent = state.running ? "Pause" : "Resume";
});

// Init
updateParams(false);
requestAnimationFrame(animate);