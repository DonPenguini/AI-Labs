// --- Configuration & State ---
const state = {
    // Parameters
    I: 0,       // Amps (positive = discharge)
    OCV: 3.7,   // Volts
    R0: 0.01,   // Ohms
    R1: 0.05,   // Ohms
    C1: 2000,   // Farads
    
    // Dynamic Variables
    Vrc: 0,     // Voltage across RC pair
    Vt: 3.7,    // Terminal Voltage
    time: 0
};

// History for Graphing
const maxPoints = 300;
const history = {
    t: new Array(maxPoints).fill(0),
    Vt: new Array(maxPoints).fill(3.7),
    I: new Array(maxPoints).fill(0),
    Vrc: new Array(maxPoints).fill(0)
};

// Canvas Contexts
const graphCanvas = document.getElementById('graphCanvas');
const graphCtx = graphCanvas.getContext('2d');
const circCanvas = document.getElementById('circuitCanvas');
const circCtx = circCanvas.getContext('2d');

// --- Physics Engine ---
let lastTime = performance.now();
const dt = 0.05; // Simulation timestep (seconds) per frame

function updatePhysics() {
    // Standard 1-RC Battery Model Equation
    // dVrc/dt = (I/C1) - (Vrc / (R1 * C1))
    
    // 1. Calculate derivatives
    // Note: I is positive for discharge. 
    // If I > 0, Vrc increases (polarization builds up).
    const tau = state.R1 * state.C1;
    const dVrc_dt = (state.I / state.C1) - (state.Vrc / tau);
    
    // 2. Euler Integration
    state.Vrc += dVrc_dt * dt;
    state.time += dt;

    // 3. Terminal Voltage Equation
    // Vt = OCV - I*R0 - Vrc
    state.Vt = state.OCV - (state.I * state.R0) - state.Vrc;

    // 4. Update History Buffers (Rolling)
    history.t.shift();
    history.t.push(state.time);
    
    history.Vt.shift();
    history.Vt.push(state.Vt);
    
    history.I.shift();
    history.I.push(state.I);

    history.Vrc.shift();
    history.Vrc.push(state.Vrc);
}

// --- Pulse Trigger Logic ---
let pulseActive = false;
let prePulseCurrent = 0;
function triggerPulse() {
    if(pulseActive) return;
    
    const pulseCurrent = 50; // Amp pulse
    prePulseCurrent = parseFloat(document.getElementById('in-I').value);
    
    // Set UI and State
    updateInput('in-I', pulseCurrent);
    pulseActive = true;

    // Reset after 10 seconds (simulated time, but we use real timeout for UX)
    setTimeout(() => {
        updateInput('in-I', prePulseCurrent);
        pulseActive = false;
    }, 2000); // 2 seconds real time representing a short burst
}

function updateInput(id, val) {
    const el = document.getElementById(id);
    el.value = val;
    el.dispatchEvent(new Event('input'));
}

// --- Visualization ---

function resizeCanvases() {
    graphCanvas.width = graphCanvas.parentElement.clientWidth;
    graphCanvas.height = graphCanvas.parentElement.clientHeight;
    circCanvas.width = circCanvas.parentElement.clientWidth;
    circCanvas.height = circCanvas.parentElement.clientHeight;
}

function drawGraph() {
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    graphCtx.clearRect(0, 0, w, h);

    // Draw Grid
    graphCtx.strokeStyle = "#333";
    graphCtx.lineWidth = 1;
    graphCtx.beginPath();
    for(let i=0; i<5; i++) {
        let y = (h/5)*i;
        graphCtx.moveTo(0, y);
        graphCtx.lineTo(w, y);
    }
    graphCtx.stroke();

    // Scales
    const maxV = 5.0; // Max Voltage for Y-axis
    const minV = 2.0; 
    const rangeV = maxV - minV;
    
    // Helper to map Y
    const mapY = (val) => h - ((val - minV) / rangeV) * h;
    const mapX = (i) => (i / (maxPoints - 1)) * w;

    // Draw Voltage (Vt) - Green
    graphCtx.strokeStyle = "#4caf50";
    graphCtx.lineWidth = 3;
    graphCtx.beginPath();
    for(let i=0; i<maxPoints; i++) {
        const x = mapX(i);
        const y = mapY(history.Vt[i]);
        if(i===0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();

    // Draw OCV Reference - Dashed Grey
    const yOCV = mapY(state.OCV);
    graphCtx.strokeStyle = "#666";
    graphCtx.setLineDash([5, 5]);
    graphCtx.beginPath();
    graphCtx.moveTo(0, yOCV);
    graphCtx.lineTo(w, yOCV);
    graphCtx.stroke();
    graphCtx.setLineDash([]);

    // Draw Current (I) - Blue (Secondary Axis, scaled abstractly)
    // Map I (-100 to 100) to middle strip of screen
    graphCtx.strokeStyle = "rgba(79, 161, 243, 0.4)";
    graphCtx.lineWidth = 2;
    graphCtx.beginPath();
    for(let i=0; i<maxPoints; i++) {
        const x = mapX(i);
        // Normalize I to +/- 50 pixels from center height
        const y = (h/2) - (history.I[i] / 100) * (h/4); 
        if(i===0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
}

function drawCircuit() {
    const w = circCanvas.width;
    const h = circCanvas.height;
    circCtx.clearRect(0, 0, w, h);

    const cx = w/2;
    const cy = h/2;
    const colorLine = "#e0e0e0";
    const colorElectron = "#f44336"; // Red for charge flow
    
    circCtx.strokeStyle = colorLine;
    circCtx.lineWidth = 3;
    circCtx.lineJoin = "round";

    // --- Draw Components ---
    // 1. OCV Source (Left)
    const battX = cx - 150;
    circCtx.beginPath();
    // Top terminal
    circCtx.moveTo(battX, cy - 40);
    circCtx.lineTo(battX, cy - 10);
    // Battery symbol
    circCtx.moveTo(battX - 15, cy - 10); circCtx.lineTo(battX + 15, cy - 10); // Long plate
    circCtx.moveTo(battX - 8, cy + 10); circCtx.lineTo(battX + 8, cy + 10);   // Short plate
    // Bottom terminal
    circCtx.moveTo(battX, cy + 10);
    circCtx.lineTo(battX, cy + 40);
    circCtx.stroke();
    circCtx.fillStyle = "#fff";
    circCtx.fillText("OCV", battX - 30, cy);

    // 2. R0 (Series Resistor)
    const r0X = cx - 50;
    circCtx.beginPath();
    circCtx.moveTo(battX, cy - 40); // From battery top
    circCtx.lineTo(r0X - 20, cy - 40);
    // Zigzag
    let zigX = r0X - 20;
    for(let i=0; i<4; i++) {
        circCtx.lineTo(zigX + 5, cy - 40 - 10);
        circCtx.lineTo(zigX + 10, cy - 40 + 10);
        zigX += 10;
    }
    circCtx.lineTo(r0X + 20, cy - 40);
    circCtx.stroke();
    circCtx.fillText("R0", r0X - 5, cy - 60);

    // 3. RC Pair (Right)
    const rcX = cx + 80;
    const topWireY = cy - 40;
    const botWireY = cy + 40;
    
    // Connect R0 to RC node
    circCtx.beginPath();
    circCtx.moveTo(r0X + 20, topWireY);
    circCtx.lineTo(rcX, topWireY);
    circCtx.stroke();

    // R1 (Vertical Zigzag)
    const r1X = rcX - 20;
    circCtx.beginPath();
    circCtx.moveTo(r1X, topWireY);
    circCtx.lineTo(r1X, topWireY + 10);
    // Zigzag vertical
    let zigY = topWireY + 10;
    const zigH = (botWireY - topWireY - 20);
    circCtx.lineTo(r1X - 5, zigY + zigH*0.25);
    circCtx.lineTo(r1X + 5, zigY + zigH*0.5);
    circCtx.lineTo(r1X - 5, zigY + zigH*0.75);
    circCtx.lineTo(r1X, zigY + zigH);
    circCtx.lineTo(r1X, botWireY);
    circCtx.stroke();
    circCtx.fillText("R1", r1X - 25, cy);

    // C1 (Capacitor Symbol)
    const c1X = rcX + 20;
    circCtx.beginPath();
    circCtx.moveTo(c1X, topWireY);
    circCtx.lineTo(c1X, cy - 5);
    // Plates
    circCtx.moveTo(c1X - 10, cy - 5); circCtx.lineTo(c1X + 10, cy - 5);
    circCtx.moveTo(c1X - 10, cy + 5); circCtx.lineTo(c1X + 10, cy + 5);
    circCtx.moveTo(c1X, cy + 5);
    circCtx.lineTo(c1X, botWireY);
    circCtx.stroke();
    circCtx.fillText("C1", c1X + 15, cy);

    // Return path
    circCtx.beginPath();
    circCtx.moveTo(rcX, botWireY);
    circCtx.lineTo(battX, botWireY);
    circCtx.stroke();

    // --- Animation: Current Flow ---
    if (Math.abs(state.I) > 1) {
        circCtx.fillStyle = state.I > 0 ? "#f44336" : "#4fa1f3"; // Red discharge, Blue charge
        const speed = state.I * 0.1;
        const timeOffset = (Date.now() / 1000) * speed * 5;
        
        // Draw dots along the top wire path
        // Simplified path for particles: Battery -> R0 -> RC -> Battery
        const pathY = topWireY - 5; // offset slightly above wire
        
        for (let i = 0; i < 10; i++) {
            let px = (timeOffset + i * 40) % 300; // loop length
            if (px < 0) px += 300;
            
            // Map px to physical coordinates
            // 0 to 150: Top wire (Left to Right)
            // 150 to 220: Down through load (abstracted)
            // ... simplifying just to show flow direction on top wire
            
            let xPos = battX + px;
            if(xPos < rcX + 50) {
               circCtx.beginPath();
               circCtx.arc(xPos, topWireY, 3, 0, Math.PI*2);
               circCtx.fill();
            }
        }
    }

    // --- Visualization: C1 Charge Level ---
    // Visualize Vrc as color intensity on C1
    const maxVrc = state.I * state.R1 * 2; // Approximate scaling
    const intensity = Math.min(1, Math.abs(state.Vrc) / 0.5); // Arbitrary scale for visual
    circCtx.fillStyle = `rgba(255, 165, 0, ${intensity})`; // Orange glow
    circCtx.fillRect(c1X - 10, cy - 5, 20, 10);

}

// --- Main Loop ---
function loop() {
    updatePhysics();
    
    // UI Updates
    document.getElementById('disp-Vt').innerText = state.Vt.toFixed(2) + " V";
    document.getElementById('disp-Vrc').innerText = state.Vrc.toFixed(3) + " V";
    document.getElementById('disp-Tau').innerText = (state.R1 * state.C1).toFixed(1) + " s";

    drawGraph();
    drawCircuit();
    
    requestAnimationFrame(loop);
}

// --- Initialization ---
function init() {
    // Attach Listeners
    ['I', 'OCV', 'R0', 'R1', 'C1'].forEach(key => {
        const el = document.getElementById('in-' + key);
        const disp = document.getElementById('val-' + key);
        
        el.addEventListener('input', (e) => {
            state[key] = parseFloat(e.target.value);
            disp.innerText = state[key];
        });
    });

    document.getElementById('pulse-btn').addEventListener('click', triggerPulse);

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    
    loop();
}

init();