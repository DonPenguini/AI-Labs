// --- Configuration & State ---
const state = {
    Vin: 24,       // Volts
    D: 0.5,        // Duty Cycle (0-1)
    fs: 100000,    // Hz
    L: 100e-6,     // Henrys
    C: 47e-6,      // Farads
    R: 10,         // Ohms
    
    // Calculated Outputs
    Vout: 0,
    I_L_avg: 0,
    delta_IL: 0,
    delta_VC: 0,
    
    // Animation
    time: 0,            // Simulation time counter
    simSpeed: 0.005,    // Visual speed factor
    isSwitchOn: false
};

// --- DOM Elements ---
const inputs = {
    vin: document.getElementById('vin'),
    duty: document.getElementById('duty'),
    freq: document.getElementById('freq'),
    ind: document.getElementById('inductance'),
    cap: document.getElementById('capacitance'),
    load: document.getElementById('load')
};

const displays = {
    vin: document.getElementById('val-vin'),
    duty: document.getElementById('val-duty'),
    freq: document.getElementById('val-freq'),
    ind: document.getElementById('val-inductance'),
    cap: document.getElementById('val-capacitance'),
    load: document.getElementById('val-load')
};

const results = {
    vout: document.getElementById('out-vout'),
    rippleI: document.getElementById('out-ripple-i'),
    rippleV: document.getElementById('out-ripple-v'),
    ilAvg: document.getElementById('out-il-avg')
};

const switchStatus = document.getElementById('switch-status');

// Canvas Contexts
const circuitCanvas = document.getElementById('circuitCanvas');
const scopeCanvas = document.getElementById('scopeCanvas');
const ctxCircuit = circuitCanvas.getContext('2d');
const ctxScope = scopeCanvas.getContext('2d');

// --- Initialization ---
function init() {
    // Add Event Listeners
    Object.keys(inputs).forEach(key => {
        inputs[key].addEventListener('input', updateParams);
    });

    // Handle Resize
    window.addEventListener('resize', resizeCanvases);
    
    // Initial Setup
    resizeCanvases();
    updateParams();
    animate();
}

function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    
    [circuitCanvas, scopeCanvas].forEach(can => {
        const rect = can.parentElement.getBoundingClientRect();
        // Subtract header height from parent for scope canvas
        const h = can.id === 'circuitCanvas' ? 250 : rect.height - 40;
        
        can.width = rect.width * dpr;
        can.height = h * dpr;
        
        const ctx = can.getContext('2d');
        ctx.scale(dpr, dpr);
        
        // Store logical size
        can.logicalWidth = rect.width;
        can.logicalHeight = h;
    });
}

function updateParams() {
    // Read Inputs
    state.Vin = parseFloat(inputs.vin.value);
    state.D = parseFloat(inputs.duty.value);
    state.fs = parseFloat(inputs.freq.value) * 1000; // kHz to Hz
    state.L = parseFloat(inputs.ind.value) * 1e-6;   // uH to H
    state.C = parseFloat(inputs.cap.value) * 1e-6;   // uF to F
    state.R = parseFloat(inputs.load.value);

    // Update Display Text
    displays.vin.innerText = state.Vin.toFixed(0) + " V";
    displays.duty.innerText = state.D.toFixed(2);
    displays.freq.innerText = (state.fs/1000).toFixed(0) + " kHz";
    displays.ind.innerText = (state.L*1e6).toFixed(0) + " μH";
    displays.cap.innerText = (state.C*1e6).toFixed(0) + " μF";
    displays.load.innerText = state.R.toFixed(0) + " Ω";

    // Perform Physics Calculations (Steady State CCM)
    state.Vout = state.Vin * state.D;
    state.I_L_avg = state.Vout / state.R;
    
    // Inductor Ripple Current: dIL = (Vin - Vout) * D / (L * fs)
    state.delta_IL = ((state.Vin - state.Vout) * state.D) / (state.L * state.fs);
    
    // Capacitor Ripple Voltage: dVC = dIL / (8 * C * fs)
    state.delta_VC = state.delta_IL / (8 * state.C * state.fs);

    // Update Results Panel
    results.vout.innerText = state.Vout.toFixed(2) + " V";
    results.rippleI.innerText = state.delta_IL.toFixed(3) + " A";
    results.rippleV.innerText = (state.delta_VC * 1000).toFixed(1) + " mV";
    results.ilAvg.innerText = state.I_L_avg.toFixed(2) + " A";
}

// --- Animation Loop ---
function animate() {
    // Advance Time
    // We simulate "Visual Time" where 1 unit = 1 switching period
    state.time += state.simSpeed;
    
    // Determine Switch State based on fractional part of time
    const cyclePos = state.time % 1.0;
    state.isSwitchOn = cyclePos < state.D;

    // Update UI Status
    if (state.isSwitchOn) {
        switchStatus.innerText = "SWITCH: CLOSED (Charging)";
        switchStatus.style.background = "#d4efdf"; // Green tint
        switchStatus.style.color = "#145a32";
    } else {
        switchStatus.innerText = "SWITCH: OPEN (Freewheeling)";
        switchStatus.style.background = "#fadbd8"; // Red tint
        switchStatus.style.color = "#78281f";
    }

    drawCircuit();
    drawScope();

    requestAnimationFrame(animate);
}

// --- Drawing: Circuit Schematic ---
function drawCircuit() {
    const ctx = ctxCircuit;
    const w = circuitCanvas.logicalWidth;
    const h = circuitCanvas.logicalHeight;

    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Layout Constants
    const pad = 40;
    const yTop = 60;
    const yBot = h - 60;
    const xVin = pad + 20;
    const xSwitch = xVin + (w - 2*pad) * 0.25;
    const xDiode = xSwitch;
    const xInd = xVin + (w - 2*pad) * 0.55;
    const xCap = xVin + (w - 2*pad) * 0.75;
    const xLoad = w - pad - 20;

    // --- Wires ---
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#333";
    ctx.beginPath();
    
    // Top Rail: Vin -> Switch -> Inductor -> Node -> Load
    ctx.moveTo(xVin, yTop);
    ctx.lineTo(xSwitch - 30, yTop); // To switch left
    
    ctx.moveTo(xSwitch + 30, yTop); // From switch right
    ctx.lineTo(xInd - 30, yTop);    // To Inductor
    
    ctx.moveTo(xInd + 30, yTop);    // From Inductor
    ctx.lineTo(xLoad, yTop);        // To Load
    
    // Bottom Rail: Vin -> Diode -> Cap -> Load
    ctx.moveTo(xVin, yBot);
    ctx.lineTo(xLoad, yBot);

    // Vertical Connections
    // Vin Source
    ctx.moveTo(xVin, yTop);
    ctx.lineTo(xVin, yBot);
    
    // Diode Leg
    ctx.moveTo(xDiode, yTop);
    ctx.lineTo(xDiode, yBot);
    
    // Cap Leg
    ctx.moveTo(xCap, yTop);
    ctx.lineTo(xCap, yBot);
    
    // Load Leg
    ctx.moveTo(xLoad, yTop);
    ctx.lineTo(xLoad, yBot);
    
    ctx.stroke();

    // --- Components ---

    // 1. Source (Circle)
    ctx.fillStyle = "#fff";
    drawCircle(ctx, xVin, (yTop+yBot)/2, 20);
    ctx.fillStyle = "#333";
    ctx.textAlign = "center";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("Vin", xVin - 35, (yTop+yBot)/2);
    ctx.fillText("+", xVin, yTop + 25);

    // 2. Switch (MOSFET symbol approx)
    ctx.clearRect(xSwitch - 20, yTop - 20, 40, 40); // clear wire
    ctx.beginPath();
    ctx.strokeStyle = state.isSwitchOn ? "#2ecc71" : "#e74c3c"; // Green closed, Red open
    ctx.lineWidth = 4;
    
    if (state.isSwitchOn) {
        ctx.moveTo(xSwitch - 20, yTop);
        ctx.lineTo(xSwitch + 20, yTop);
    } else {
        ctx.moveTo(xSwitch - 20, yTop);
        ctx.lineTo(xSwitch - 10, yTop - 15); // Open arm
    }
    ctx.stroke();
    ctx.fillStyle = "#555";
    ctx.font = "12px sans-serif";
    ctx.fillText("SW", xSwitch, yTop - 25);

    // 3. Diode
    ctx.clearRect(xDiode - 10, (yTop+yBot)/2 - 15, 20, 30);
    drawDiode(ctx, xDiode, (yTop+yBot)/2, !state.isSwitchOn); // Highlight if conducting

    // 4. Inductor
    ctx.clearRect(xInd - 25, yTop - 10, 50, 20);
    drawInductor(ctx, xInd, yTop);
    ctx.fillStyle = "#555";
    ctx.fillText("L", xInd, yTop - 25);

    // 5. Capacitor
    ctx.clearRect(xCap - 10, (yTop+yBot)/2 - 10, 20, 20);
    drawCapacitor(ctx, xCap, (yTop+yBot)/2);
    ctx.fillText("C", xCap + 15, (yTop+yBot)/2);

    // 6. Resistor
    ctx.clearRect(xLoad - 10, (yTop+yBot)/2 - 25, 20, 50);
    drawResistor(ctx, xLoad, (yTop+yBot)/2);
    ctx.fillText("R", xLoad + 15, (yTop+yBot)/2);

    // --- Current Flow Animation ---
    // Draw moving dots
    const flowColor = "#f1c40f"; // Yellow
    const pathSpeed = 2; // px per frame approx

    // Determine Loop
    // ON: Vin -> SW -> L -> Load/Cap -> Return
    // OFF: Diode -> L -> Load/Cap -> Return

    // We generate dots along the active path
    ctx.fillStyle = flowColor;
    
    // We just draw dots at specific segments based on time
    // Segment 1: Inductor Current (always flows R to L visually)
    drawFlow(ctx, xSwitch + 30, yTop, xLoad, yTop, state.time * 200, true);
    
    // Segment 2: Input Current (only when ON)
    if (state.isSwitchOn) {
        drawFlow(ctx, xVin, yTop, xSwitch - 20, yTop, state.time * 200, true);
        drawFlow(ctx, xVin, yBot, xLoad, yBot, state.time * 200, true); // Return path
    }

    // Segment 3: Diode Current (only when OFF)
    if (!state.isSwitchOn) {
        // Up through diode
        drawFlow(ctx, xDiode, yBot, xDiode, yTop, state.time * 200, true);
    }
}

// --- Drawing: Oscilloscope ---
function drawScope() {
    const ctx = ctxScope;
    const w = scopeCanvas.logicalWidth;
    const h = scopeCanvas.logicalHeight;

    ctx.clearRect(0, 0, w, h);

    // Margins
    const mL = 50, mR = 20, mT = 20, mB = 30;
    const graphW = w - mL - mR;
    const graphH = h - mT - mB;

    // Draw Grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // 4 vertical divisions
    for(let i=0; i<=4; i++) {
        const x = mL + (graphW/4)*i;
        ctx.moveTo(x, mT);
        ctx.lineTo(x, h - mB);
    }
    // 4 horizontal divisions
    for(let i=0; i<=4; i++) {
        const y = mT + (graphH/4)*i;
        ctx.moveTo(mL, y);
        ctx.lineTo(w - mR, y);
    }
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#999";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText("High", mL - 5, mT + 10);
    ctx.fillText("0", mL - 5, h - mB);

    // --- Plot Data ---
    // We visualize ~3 cycles of the waveform
    // The visual window slides with time
    const cyclesToShow = 3;
    const now = state.time;
    const timeStart = now - cyclesToShow; 
    
    // Scales
    // Voltage: Autoscaled around Vout?
    // Current: Autoscaled around I_L?
    // For simplicity, we normalize plots to fit the canvas height
    // Top half: Current, Bottom half: Voltage ripple (AC coupled view)
    
    // Let's draw Current (Red)
    ctx.beginPath();
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    
    // Plot function for I_L
    // It's a triangle wave. 
    // Rise when t%1 < D, Fall when t%1 > D
    // We need to reconstruct the wave shape history
    
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
        const tVis = timeStart + (i/steps) * cyclesToShow;
        const cycleT = tVis % 1.0; // 0 to 1
        let valNorm = 0; // Normalized 0 to 1 for shape
        
        // Triangle wave approximation
        // Peak-to-peak is centered.
        // If 0 < cycleT < D: Rising from -0.5 to 0.5
        // If D < cycleT < 1: Falling from 0.5 to -0.5
        
        if (cycleT < 0) { /* handle negative mod */ } 

        // Precise Triangle Calculation
        // Rise slope: 1/D. Fall slope: 1/(1-D)
        // Let's assume normalized ripple amplitude 1
        
        if (cycleT < state.D) {
            // Rising: starts at -0.5, ends at 0.5 at D
            valNorm = -0.5 + (cycleT / state.D); 
        } else {
            // Falling: starts at 0.5, ends at -0.5 at 1
            valNorm = 0.5 - ((cycleT - state.D) / (1.0 - state.D));
        }

        const x = mL + (i/steps) * graphW;
        // Map valNorm (-0.5 to 0.5) to pixels
        // Let's use top 40% of canvas for Current
        const yCenter = mT + graphH * 0.25;
        const amp = graphH * 0.15; 
        const y = yCenter - (valNorm * amp);
        
        if (i===0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Label for Current
    ctx.fillStyle = "#e74c3c";
    ctx.fillText(`I_L (avg: ${state.I_L_avg.toFixed(1)}A)`, w - mR - 10, mT + 15);


    // Let's draw Vout (Blue)
    // Theoretically quadratic ripple. 
    // Integral of I_L (Triangle) -> Parabolic sections
    ctx.beginPath();
    ctx.strokeStyle = "#3498db";
    ctx.lineWidth = 2;

    for (let i = 0; i <= steps; i++) {
        const tVis = timeStart + (i/steps) * cyclesToShow;
        let cycleT = tVis % 1.0;
        if(cycleT < 0) cycleT += 1;

        // Integration of the triangle wave defined above
        // Rise phase (0 to D): int(-0.5 + t/D) dt = -0.5t + t^2/(2D)
        // We shift it so it looks continuous
        
        let vRipple = 0;
        
        if (cycleT < state.D) {
            // Parabola opening up
            // Normalized to be centered approx
            vRipple = (-0.5 * cycleT) + (cycleT * cycleT) / (2 * state.D);
        } else {
            // Fall phase (D to 1): Line is 0.5 - (t-D)/(1-D)
            // Int: 0.5(t-D) - (t-D)^2 / (2(1-D))
            // Must add offset from end of rise phase
            const endRise = (-0.5 * state.D) + (state.D * state.D) / (2 * state.D); // = -0.5D + 0.5D = 0 ?? No.
            // Wait, steady state integral over period is 0.
            
            // Simplified visualization:
            // Just simulate the physics: dV = I_c / C. I_c = I_L - I_avg (The triangle centered at 0)
            
            // Rise Part: Integral of (-0.5 + t/D) is -0.5t + t^2/2D. At t=D/2 (zero crossing), min voltage?
            // Actually, capacitor voltage lags inductor current by 90 deg.
            // Just use a sine wave approximation for visual simplicity or exact parabola?
            // Let's use sine approximation for smoothness in viz if parabolas get tricky to match boundaries.
            
            vRipple = Math.sin((cycleT / 1.0) * Math.PI * 2 - Math.PI/2); // shifted
        }
        
        // Use exact parabola for accuracy if possible, but boundaries are tricky in normalized loop.
        // Reverting to smoothed curve for "Ripple" viz.
        
        const x = mL + (i/steps) * graphW;
        // Bottom 40%
        const yCenter = mT + graphH * 0.75;
        const amp = graphH * 0.15;
        const y = yCenter - (vRipple * amp * 0.2); // Smaller amplitude visually
        
        if (i===0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = "#3498db";
    ctx.fillText(`Vout (Ripple: ${(state.delta_VC*1000).toFixed(0)}mV)`, w - mR - 10, mT + graphH/2 + 15);
}

// --- Helper Drawing Functions ---

function drawCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.stroke();
}

function drawResistor(ctx, x, y, size=30) {
    ctx.beginPath();
    const zig = 5;
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x - zig, y - 15);
    ctx.lineTo(x + zig, y - 10);
    ctx.lineTo(x - zig, y - 5);
    ctx.lineTo(x + zig, y);
    ctx.lineTo(x - zig, y + 5);
    ctx.lineTo(x + zig, y + 10);
    ctx.lineTo(x - zig, y + 15);
    ctx.lineTo(x, y + 20);
    ctx.stroke();
}

function drawInductor(ctx, x, y) {
    ctx.beginPath();
    const r = 6;
    const startX = x - 24;
    for(let i=0; i<4; i++) {
        ctx.arc(startX + 12*i + 6, y, 6, Math.PI, 0);
    }
    ctx.stroke();
}

function drawCapacitor(ctx, x, y) {
    ctx.beginPath();
    // Top Plate
    ctx.moveTo(x - 10, y - 5);
    ctx.lineTo(x + 10, y - 5);
    // Bottom Plate
    ctx.moveTo(x - 10, y + 5);
    ctx.lineTo(x + 10, y + 5);
    ctx.stroke();
}

function drawDiode(ctx, x, y, conducting) {
    ctx.beginPath();
    // Triangle
    ctx.moveTo(x - 10, y + 10); // Bottom left (Anode is bottom in this schematic?)
    // Schematic: Vin top, Gnd bottom. Diode points UP (Cathode at SW-L node).
    // So triangle points UP.
    
    // Triangle pointing UP
    ctx.moveTo(x - 8, y + 8);
    ctx.lineTo(x + 8, y + 8);
    ctx.lineTo(x, y - 8);
    ctx.closePath();
    
    ctx.fillStyle = conducting ? "#e74c3c" : "#fff"; // Red if conducting
    ctx.fill();
    ctx.stroke();
    
    // Bar (Cathode)
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 8);
    ctx.lineTo(x + 8, y - 8);
    ctx.stroke();
}

function drawFlow(ctx, x1, y1, x2, y2, offset, visible) {
    if (!visible) return;
    const dist = Math.hypot(x2-x1, y2-y1);
    const angle = Math.atan2(y2-y1, x2-x1);
    const spacing = 20;
    
    ctx.save();
    // Clip to line segment
    ctx.beginPath();
    ctx.rect(Math.min(x1,x2)-5, Math.min(y1,y2)-5, Math.abs(x2-x1)+10, Math.abs(y2-y1)+10);
    ctx.clip();
    
    for (let i = 0; i < dist + spacing; i+=spacing) {
        let d = (i + offset) % (dist + spacing);
        if (d > dist) continue; // gap
        
        const px = x1 + Math.cos(angle) * d;
        const py = y1 + Math.sin(angle) * d;
        
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.restore();
}

// Start
init();