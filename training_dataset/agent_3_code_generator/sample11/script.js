// --- Constants & Setup ---
const circuitCanvas = document.getElementById('circuitCanvas');
const graphCanvas = document.getElementById('graphCanvas');
const ctxCircuit = circuitCanvas.getContext('2d');
const ctxGraph = graphCanvas.getContext('2d');

// Input Elements
const inV = document.getElementById('voltage');
const inR = document.getElementById('resistance');
const inL = document.getElementById('inductance');

// Display Elements
const valV = document.getElementById('val-v');
const valR = document.getElementById('val-r');
const valL = document.getElementById('val-l');
const statTau = document.getElementById('stat-tau');
const statImax = document.getElementById('stat-imax');
const btnReset = document.getElementById('reset-anim');

// Simulation State
let V = 10;     // Volts
let R = 10;     // Ohms
let L = 0.5;    // Henrys (Input is mH)
let tau = 0.05; // Seconds
let Imax = 1.0; // Amps

// Animation State
let timeOffset = 0; // For circuit electron flow
let graphTime = 0;  // For graph plotting animation
let isAnimating = true;

// --- Initialization ---
function init() {
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    
    // Listeners
    inV.addEventListener('input', updateParams);
    inR.addEventListener('input', updateParams);
    inL.addEventListener('input', updateParams);
    btnReset.addEventListener('click', () => {
        graphTime = 0;
    });

    updateParams();
    animate();
}

function resizeCanvases() {
    // Set actual canvas pixel size based on CSS size for sharpness
    const dpr = window.devicePixelRatio || 1;
    
    [circuitCanvas, graphCanvas].forEach(can => {
        const rect = can.getBoundingClientRect();
        can.width = rect.width * dpr;
        can.height = rect.height * dpr;
        const ctx = can.getContext('2d');
        ctx.scale(dpr, dpr);
    });
}

function updateParams() {
    // Read Values
    V = parseFloat(inV.value);
    R = parseFloat(inR.value);
    L = parseFloat(inL.value) / 1000; // Convert mH to H

    // Calculate Physics
    tau = L / R;
    Imax = V / R;

    // Update UI
    valV.textContent = `${V} V`;
    valR.textContent = `${R} \u03A9`;
    valL.textContent = `${(L*1000).toFixed(0)} mH`;
    
    statTau.textContent = (tau * 1000).toFixed(2); // in ms
    statImax.textContent = Imax.toFixed(2);

    // Reset graph animation slightly to show change effect
    // graphTime = 0; // Optional: uncomment if you want full redraw on every slide
}

// --- Animation Loop ---
function animate() {
    const dpr = window.devicePixelRatio || 1;
    const cWidth = circuitCanvas.width / dpr;
    const cHeight = circuitCanvas.height / dpr;
    const gWidth = graphCanvas.width / dpr;
    const gHeight = graphCanvas.height / dpr;

    // Clear Canvases
    ctxCircuit.clearRect(0, 0, cWidth, cHeight);
    ctxGraph.clearRect(0, 0, gWidth, gHeight);

    // 1. Draw Circuit
    drawCircuit(ctxCircuit, cWidth, cHeight);

    // 2. Draw Graph
    drawGraph(ctxGraph, gWidth, gHeight);

    // Increment Animation Counters
    // Speed of electron flow proportional to current magnitude (visual approximation)
    // We use Imax for steady state flow visualization
    timeOffset -= (Imax * 2 + 0.5); 
    
    // Graph tracer progression
    // We want the tracer to traverse 5*tau in about 2-3 seconds real time
    const timeToComplete = 2000; // ms
    const totalSimTime = 5 * tau;
    const dt = totalSimTime / (timeToComplete / 16); // 16ms per frame approx
    
    if (graphTime < 5 * tau) {
        graphTime += dt;
    } else {
        graphTime = 5 * tau; // Clamp at end
    }

    requestAnimationFrame(animate);
}

// --- Drawing Functions ---

function drawCircuit(ctx, w, h) {
    const pad = 40;
    const rectW = w - pad * 2;
    const rectH = h - pad * 2;
    const startX = pad;
    const startY = pad;

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";

    // Define circuit path points
    const tl = {x: startX, y: startY};
    const bl = {x: startX, y: startY + rectH};
    const tr = {x: startX + rectW, y: startY};
    const br = {x: startX + rectW, y: startY + rectH};

    // Draw Wires (Broken for components)
    ctx.beginPath();
    
    // Left vertical (Source V)
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tl.x, bl.y);

    // Bottom horizontal
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);

    // Right vertical (Inductor L)
    ctx.moveTo(br.x, br.y);
    ctx.lineTo(br.x, br.y - rectH/2 + 20); // break for inductor
    ctx.moveTo(tr.x, tr.y + rectH/2 - 20);
    ctx.lineTo(tr.x, tr.y);

    // Top horizontal (Resistor R)
    ctx.moveTo(tr.x, tr.y);
    ctx.lineTo(tl.x + rectW/2 + 30, tl.y); // break for resistor
    ctx.moveTo(tl.x + rectW/2 - 30, tl.y);
    ctx.lineTo(tl.x, tl.y);
    
    ctx.stroke();

    // Draw Source (Battery)
    drawBattery(ctx, tl.x, tl.y + rectH/2, 20);

    // Draw Resistor (Top Center)
    drawResistor(ctx, tl.x + rectW/2, tl.y, 60);
    ctx.fillStyle = "#e74c3c";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("R", tl.x + rectW/2 - 5, tl.y - 15);

    // Draw Inductor (Right Center)
    drawInductor(ctx, tr.x, tr.y + rectH/2, 40);
    ctx.fillStyle = "#2980b9";
    ctx.fillText("L", tr.x + 15, tr.y + rectH/2 + 5);

    // Animate "Current" (Electrons/Charge carriers)
    // We simulate dots moving along the path
    // Path perimeter approx
    const perimeter = 2 * (rectW + rectH);
    
    ctx.save();
    // Only clip to the wire path roughly to hide dots at corners effectively
    ctx.beginPath();
    ctx.rect(pad-5, pad-5, rectW+10, rectH+10);
    ctx.clip();

    ctx.fillStyle = "#f1c40f"; // Yellow dots
    const dotSpacing = 30;
    
    for (let i = 0; i < perimeter; i += dotSpacing) {
        let dist = (i + timeOffset) % perimeter;
        if (dist < 0) dist += perimeter;
        
        // Map distance to coordinate
        let pos = getPathPos(dist, tl, tr, br, bl, rectW, rectH);
        
        // Calculate current intensity at specific time for graph consistency?
        // No, circuit view usually shows steady state direction or max flow.
        // Let's scale opacity by I_max to show intensity
        ctx.globalAlpha = Math.min(1, Imax / 2 + 0.2); 
        
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

function getPathPos(d, tl, tr, br, bl, w, h) {
    // Clockwise direction starting top-left
    if (d < w) return {x: tl.x + d, y: tl.y}; // Top
    d -= w;
    if (d < h) return {x: tr.x, y: tr.y + d}; // Right
    d -= h;
    if (d < w) return {x: br.x - d, y: br.y}; // Bottom
    d -= w;
    return {x: bl.x, y: bl.y - d}; // Left
}

function drawBattery(ctx, x, y, size) {
    ctx.beginPath();
    // Long bar
    ctx.moveTo(x - 10, y - size/2);
    ctx.lineTo(x + 10, y - size/2);
    // Short bar
    ctx.moveTo(x - 6, y + size/2);
    ctx.lineTo(x + 6, y + size/2);
    
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 2; // reset
    
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#333";
    ctx.fillText("+", x - 15, y - size/2 + 4);
    ctx.fillText("V", x - 25, y + 4);
}

function drawResistor(ctx, x, y, len) {
    // Zigzag
    const zigSize = 5;
    const segs = 6;
    const step = len / segs;
    const startX = x - len/2;
    
    ctx.beginPath();
    ctx.moveTo(startX, y);
    for(let i=0; i<segs; i++) {
        let ty = (i%2 === 0) ? y - zigSize : y + zigSize;
        ctx.lineTo(startX + (i+0.5)*step, ty);
    }
    ctx.lineTo(x + len/2, y);
    ctx.stroke();
}

function drawInductor(ctx, x, y, len) {
    // Coils
    const coils = 4;
    const r = len / (coils * 2);
    const startY = y - len/2;
    
    ctx.beginPath();
    for(let i=0; i<coils; i++) {
        // Draw semi-circles
        ctx.arc(x, startY + r + (i*r*2), r, 1.5*Math.PI, 0.5*Math.PI, false);
    }
    ctx.stroke();
}

function drawGraph(ctx, w, h) {
    const padL = 50;
    const padB = 30;
    const padT = 20;
    const padR = 20;
    
    const drawW = w - padL - padR;
    const drawH = h - padT - padB;

    // --- Axes ---
    ctx.beginPath();
    ctx.strokeStyle = "#aaa";
    ctx.lineWidth = 1;
    // Y-axis
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, h - padB);
    // X-axis
    ctx.lineTo(w - padR, h - padB);
    ctx.stroke();

    // --- Labels ---
    ctx.fillStyle = "#555";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Time (t)", w/2 + padL/2, h - 5);
    
    ctx.save();
    ctx.translate(15, h/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText("Current (A)", 0, 0);
    ctx.restore();

    // --- Plotting Logic ---
    // Max X display: 5 * tau
    // Max Y display: Imax * 1.2
    
    const maxT = 5 * tau; 
    const maxI = Imax * 1.2;

    // Helper to map coordinates
    const mapX = (t) => padL + (t / maxT) * drawW;
    const mapY = (cur) => (h - padB) - (cur / maxI) * drawH;

    // Draw Grid / Ticks
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    // Y Ticks
    for(let i=0; i<=5; i++) {
        let val = (maxI / 5) * i;
        let y = mapY(val);
        ctx.fillText(val.toFixed(2), padL - 5, y);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.moveTo(padL, y);
        ctx.lineTo(w-padR, y);
        ctx.stroke();
    }
    
    // X Ticks (time in ms)
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for(let i=0; i<=5; i++) {
        let tVal = (maxT / 5) * i;
        let x = mapX(tVal);
        ctx.fillText((tVal*1000).toFixed(1), x, h - padB + 5);
    }

    // --- Draw Curve i(t) ---
    ctx.beginPath();
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 3;
    
    // We draw from t=0 to current animation time 'graphTime'
    // To make the curve look smooth, we use small steps
    const steps = 100;
    
    ctx.moveTo(mapX(0), mapY(0));
    
    for(let i=1; i<=steps; i++) {
        let t = (graphTime / steps) * i;
        // i(t) = (V/R) * (1 - e^(-Rt/L))
        let cur = (V/R) * (1 - Math.exp((-R * t)/L));
        
        ctx.lineTo(mapX(t), mapY(cur));
    }
    ctx.stroke();

    // --- Draw Current Point Marker ---
    if (graphTime > 0) {
        let cur = (V/R) * (1 - Math.exp((-R * graphTime)/L));
        let px = mapX(graphTime);
        let py = mapY(cur);
        
        ctx.beginPath();
        ctx.fillStyle = "#e74c3c";
        ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.arc(px, py, 2, 0, Math.PI*2);
        ctx.fill();
        
        // Show coordinate text
        ctx.fillStyle = "#333";
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "left";
        ctx.fillText(`i=${cur.toFixed(2)}A`, px + 10, py);
    }

    // --- Draw Asymptote (Imax) ---
    let yMax = mapY(Imax);
    ctx.beginPath();
    ctx.strokeStyle = "#2980b9";
    ctx.setLineDash([5, 5]);
    ctx.moveTo(padL, yMax);
    ctx.lineTo(w - padR, yMax);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#2980b9";
    ctx.fillText("V/R", w - padR - 20, yMax - 10);

    // --- Draw Tau Marker (63.2%) ---
    // i(tau) = 0.632 * Imax
    if (graphTime >= tau) {
        let iTau = 0.632 * Imax;
        let xTau = mapX(tau);
        let yTau = mapY(iTau);
        
        ctx.beginPath();
        ctx.fillStyle = "#27ae60";
        ctx.arc(xTau, yTau, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.font = "10px sans-serif";
        ctx.fillText("τ", xTau, h - padB - 10);
        
        // Drop line
        ctx.beginPath();
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 1;
        ctx.moveTo(xTau, yTau);
        ctx.lineTo(xTau, h - padB);
        ctx.stroke();
    }
}

// Start
init();