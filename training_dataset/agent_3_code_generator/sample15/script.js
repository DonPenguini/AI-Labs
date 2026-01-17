// --- Configuration & State ---
const state = {
    Vin: 12,
    D: 0.4,
    fs: 100000,
    L: 150e-6,
    C: 100e-6,
    R: 10,
    
    // Calculated
    Vout: 0,
    I_L_avg: 0,
    dIL: 0,
    dVC: 0,
    
    // Animation
    t: 0,
    isSwitchOn: false
};

// DOM Elements
const inputs = {
    vin: document.getElementById('vin'),
    duty: document.getElementById('duty'),
    freq: document.getElementById('freq'),
    ind: document.getElementById('ind'),
    cap: document.getElementById('cap'),
    res: document.getElementById('res')
};

const labels = {
    vin: document.getElementById('val-vin'),
    duty: document.getElementById('val-duty'),
    freq: document.getElementById('val-freq'),
    ind: document.getElementById('val-ind'),
    cap: document.getElementById('val-cap'),
    res: document.getElementById('val-res')
};

const outputs = {
    vout: document.getElementById('out-vout'),
    dIL: document.getElementById('out-ripple-i'),
    dVC: document.getElementById('out-ripple-v'),
    warning: document.getElementById('ccm-warning'),
    swState: document.getElementById('switch-state')
};

const canvasCircuit = document.getElementById('circuitCanvas');
const canvasScope = document.getElementById('scopeCanvas');
const ctxCircuit = canvasCircuit.getContext('2d');
const ctxScope = canvasScope.getContext('2d');

// --- Initialization ---
function init() {
    // Listeners
    Object.keys(inputs).forEach(k => {
        inputs[k].addEventListener('input', updatePhysics);
    });
    
    window.addEventListener('resize', resizeCanvases);
    
    resizeCanvases();
    updatePhysics();
    animate();
}

function resizeCanvases() {
    const dpr = window.devicePixelRatio || 1;
    
    [canvasCircuit, canvasScope].forEach(cvs => {
        const rect = cvs.parentElement.getBoundingClientRect();
        // Adjust for header height inside container
        const avH = rect.height - 40; 
        cvs.width = rect.width * dpr;
        cvs.height = avH * dpr;
        
        const ctx = cvs.getContext('2d');
        ctx.scale(dpr, dpr);
        
        cvs.style.width = `${rect.width}px`;
        cvs.style.height = `${avH}px`;
        
        cvs.logicalWidth = rect.width;
        cvs.logicalHeight = avH;
    });
}

// --- Physics Engine ---
function updatePhysics() {
    // Read Inputs
    state.Vin = parseFloat(inputs.vin.value);
    state.D = parseFloat(inputs.duty.value);
    state.fs = parseFloat(inputs.freq.value) * 1000;
    state.L = parseFloat(inputs.ind.value) * 1e-6;
    state.C = parseFloat(inputs.cap.value) * 1e-6;
    state.R = parseFloat(inputs.res.value);
    
    // Update Labels
    labels.vin.innerText = state.Vin.toFixed(1) + " V";
    labels.duty.innerText = state.D.toFixed(2);
    labels.freq.innerText = (state.fs/1000).toFixed(0) + " kHz";
    labels.ind.innerText = (state.L*1e6).toFixed(0) + " μH";
    labels.cap.innerText = (state.C*1e6).toFixed(0) + " μF";
    labels.res.innerText = state.R.toFixed(1) + " Ω";
    
    // Calculate Outputs (Buck-Boost Inverting)
    // Vout = -Vin * (D / (1-D))
    const gain = state.D / (1 - state.D);
    state.Vout = -state.Vin * gain;
    
    // Inductor Ripple: dIL = (Vin * D) / (L * fs)
    state.dIL = (state.Vin * state.D) / (state.L * state.fs);
    
    // Capacitor Ripple: dVC = (|Iout| * D) / (C * fs)
    // Iout = Vout / R
    const Iout = Math.abs(state.Vout) / state.R;
    state.dVC = (Iout * state.D) / (state.C * state.fs);
    
    // Average Inductor Current: I_L = (I_out) / (1-D)
    state.I_L_avg = Iout / (1 - state.D);

    // Check CCM/DCM boundary
    // DCM if dIL > 2 * I_L_avg (approx)
    const isDCM = state.dIL > (2 * state.I_L_avg);
    if(isDCM) {
        outputs.warning.style.display = "block";
        outputs.warning.innerText = "Warning: Parameters entering DCM";
    } else {
        outputs.warning.style.display = "none";
    }

    // Update Output DOM
    outputs.vout.innerText = state.Vout.toFixed(2) + " V";
    outputs.dIL.innerText = state.dIL.toFixed(3) + " A";
    outputs.dVC.innerText = state.dVC.toFixed(3) + " V";
}

// --- Animation Loop ---
function animate() {
    // Time step
    state.t += 0.01; // Arbitrary animation speed
    
    // Calculate Switch State for Animation (Visual cycle only)
    const cyclePos = state.t % 1.0;
    state.isSwitchOn = cyclePos < state.D;
    
    // Update Badge
    if(state.isSwitchOn) {
        outputs.swState.innerText = "SWITCH: ON (Charging L)";
        outputs.swState.style.background = "#d4efdf";
        outputs.swState.style.color = "#27ae60";
    } else {
        outputs.swState.innerText = "SWITCH: OFF (Discharging L)";
        outputs.swState.style.background = "#fadbd8";
        outputs.swState.style.color = "#c0392b";
    }
    
    drawCircuit();
    drawScope();
    
    requestAnimationFrame(animate);
}

// --- Drawing: Circuit ---
function drawCircuit() {
    const ctx = ctxCircuit;
    const w = canvasCircuit.logicalWidth;
    const h = canvasCircuit.logicalHeight;
    
    ctx.clearRect(0,0,w,h);
    
    const pad = 40;
    const yLine = h / 2;
    const xStart = pad;
    const xEnd = w - pad;
    
    // Components X positions
    const xVin = xStart + 20;
    const xSw = xStart + (w-pad*2)*0.3;
    const xL = xSw; // Inductor is vertical in BB topology (after sw, to gnd)
    const xDiode = xStart + (w-pad*2)*0.6;
    const xCap = xStart + (w-pad*2)*0.8;
    const xR = xEnd - 20;
    
    // Heights
    const yTop = yLine - 60;
    const yBot = yLine + 60;
    
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#333";
    
    // --- Draw Wires ---
    ctx.beginPath();
    
    // Input Loop: Vin -> Sw -> Node
    ctx.moveTo(xVin, yTop);
    ctx.lineTo(xSw - 20, yTop); // To switch
    
    // Switch logic visual
    if(state.isSwitchOn) {
        ctx.lineTo(xSw + 20, yTop); 
    } else {
        ctx.moveTo(xSw - 20, yTop);
        ctx.lineTo(xSw + 15, yTop - 15); // Open
        ctx.moveTo(xSw + 20, yTop);
    }
    
    // Node after switch
    ctx.lineTo(xDiode - 20, yTop); // To Diode
    
    // Inductor Leg (Vertical at Switch Node in some drawings, 
    // but classic Buck-Boost: Vin -> Sw -> L -> Gnd is correct for energy storage phase)
    // Wait, standard schematic:
    // Vin -> Switch -> NodeA. 
    // NodeA -> Inductor -> Ground.
    // NodeA -> Diode -> OutputNode.
    // OutputNode -> Cap -> Ground.
    // OutputNode -> Load -> Ground.
    // NOTE: This produces INVERTED output. Diode must point AWAY from NodeA if using Back EMF, 
    // or correct polarity logic.
    // With Switch OFF, L pulls current from Ground, pushes to NodeA.
    // So Diode Anode is at Output, Cathode at NodeA? No.
    // Current flows: Gnd -> L -> NodeA -> Diode -> Output -> Gnd. 
    // This makes Output Negative. Diode Cathode at NodeA, Anode at Output.
    
    // Redrawing Schematic per Standard Inverting BB:
    // Top Rail broken by Switch.
    // Inductor connects Top Rail (after Sw) to Gnd.
    // Diode connects Top Rail (after Sw) to Output Rail. 
    // BUT Diode direction: Anode at Output, Cathode at Top Rail (blocks Vin).
    
    // Let's draw:
    // 1. Vin (Left)
    // 2. Switch (Series Top)
    // 3. Inductor (Shunt to Gnd)
    // 4. Diode (Series to Output)
    // 5. Cap/Load (Shunt)
    
    // Wire: Switch Out to Inductor Top
    ctx.moveTo(xSw + 20, yTop);
    ctx.lineTo(xL, yTop); 
    ctx.lineTo(xL, yTop + 20); // L start
    
    // Wire: Inductor Bot to Gnd
    ctx.moveTo(xL, yBot - 20);
    ctx.lineTo(xL, yBot);
    
    // Wire: Switch Out to Diode
    ctx.moveTo(xL, yTop);
    ctx.lineTo(xDiode - 10, yTop); // Diode start
    
    // Wire: Diode Out to Cap/Load
    ctx.moveTo(xDiode + 10, yTop);
    ctx.lineTo(xR, yTop);
    
    // Bottom Rail (Ground)
    ctx.moveTo(xVin, yBot);
    ctx.lineTo(xR, yBot);
    
    // Vertical legs for Vin, Cap, R
    ctx.moveTo(xVin, yTop); ctx.lineTo(xVin, yBot);
    ctx.moveTo(xCap, yTop); ctx.lineTo(xCap, yBot);
    ctx.moveTo(xR, yTop); ctx.lineTo(xR, yBot);
    
    ctx.stroke();
    
    // --- Components ---
    
    // Source
    drawSource(ctx, xVin, (yTop+yBot)/2);
    
    // Inductor
    drawInductor(ctx, xL, (yTop+yBot)/2, true); // true = vertical
    
    // Diode (Points Left? No, Current flows Right to Left during discharge to make neg output)
    // Switch OFF: L current flows UP. NodeA becomes negative? 
    // No, L resists change. Current was flowing DOWN. So L tries to keep flowing DOWN. 
    // So L pulls from NodeA and pushes to Gnd.
    // Wait. Vin -> Sw -> L(down) -> Gnd. Current Down.
    // Switch OFF. L current continues DOWN.
    // Loop: L(bot) -> Gnd -> Load -> Diode -> L(top).
    // So current flows out of Gnd, through Load (up), through Diode (left), into L(top).
    // This makes Top Rail Negative.
    // So Diode points LEFT.
    drawDiode(ctx, xDiode, yTop, true); // true = points left
    
    // Capacitor
    drawCapacitor(ctx, xCap, (yTop+yBot)/2);
    
    // Resistor
    drawResistor(ctx, xR, (yTop+yBot)/2);
    
    // --- Animation Flow (Electrons/Current) ---
    ctx.fillStyle = "#f1c40f"; // Yellow dots
    
    if(state.isSwitchOn) {
        // Loop 1: Vin -> Sw -> L -> Gnd -> Vin
        // Path: Vin(top) -> Sw -> L(top) -> L(bot) -> Gnd -> Vin(bot)
        drawFlow(ctx, [
            {x: xVin, y: yTop},
            {x: xSw, y: yTop},
            {x: xL, y: yTop},
            {x: xL, y: yBot},
            {x: xVin, y: yBot},
            {x: xVin, y: yTop}
        ], state.t * 50);
    } else {
        // Loop 2: L acts as source. Current flows DOWN.
        // Path: L(bot) -> Gnd -> Load(bot) -> Load(top) -> Diode -> L(top)
        drawFlow(ctx, [
            {x: xL, y: yBot},
            {x: xR, y: yBot}, // Gnd rail
            {x: xR, y: yTop}, // Up through load (Negative output logic)
            {x: xDiode, y: yTop}, // Left through diode
            {x: xL, y: yTop},
            {x: xL, y: yBot}
        ], state.t * 50);
    }
}

// --- Drawing: Scope ---
function drawScope() {
    const ctx = ctxScope;
    const w = canvasScope.logicalWidth;
    const h = canvasScope.logicalHeight;
    
    ctx.clearRect(0,0,w,h);
    
    // Grid
    ctx.strokeStyle = "#eee";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h/2); ctx.lineTo(w, h/2); // Zero line
    ctx.stroke();
    
    // We plot ~2 cycles
    const cycles = 2.5;
    const pts = w;
    
    // I_L (Inductor Current) - Red
    ctx.strokeStyle = "#e74c3c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for(let i=0; i<pts; i++) {
        const x = i;
        const timeRatio = (i / w) * cycles; // 0 to 2.5
        const localT = timeRatio % 1.0; // 0 to 1
        
        // Triangle Wave logic
        // Rise during D, Fall during 1-D
        // Center around 0 visually, but logically it's I_L_avg
        let val = 0;
        if(localT < state.D) {
            // Rising: -0.5 to 0.5
            val = -0.5 + (localT / state.D);
        } else {
            // Falling: 0.5 to -0.5
            val = 0.5 - ((localT - state.D) / (1 - state.D));
        }
        
        // Scale for view
        const amp = h * 0.15;
        const y = (h * 0.25) - (val * amp); // Top half of canvas
        
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    
    // V_out (Output Voltage) - Blue
    // It is negative DC with ripple
    ctx.strokeStyle = "#3498db";
    ctx.beginPath();
    
    for(let i=0; i<pts; i++) {
        const x = i;
        const timeRatio = (i / w) * cycles;
        const localT = timeRatio % 1.0;
        
        // Ripple logic (Simplified)
        // Charging Cap (Switch OFF, 1-D): Voltage Magnitude Increases (More Negative)
        // Discharging Cap (Switch ON, D): Voltage Magnitude Decreases (Less Negative)
        
        // Let's plot Magnitude for clarity, or actual negative value?
        // Actual negative value is below zero line.
        
        let rippleNorm = 0;
        if(localT < state.D) {
            // Switch ON: Cap discharges into R. V becomes less negative (closer to 0).
            // Linear approx for RC discharge
            rippleNorm = -0.5 + (localT / state.D);
        } else {
            // Switch OFF: Inductor charges Cap. V becomes more negative (further from 0).
            rippleNorm = 0.5 - ((localT - state.D) / (1 - state.D));
        }
        
        // Scale
        // Center line for Vout is at h * 0.75
        const yCenter = h * 0.75;
        const rippleAmp = h * 0.05; 
        
        // Note: Ripple shape might be inverted depending on definition, 
        // but this visualizes the fluctuation.
        const y = yCenter + (rippleNorm * rippleAmp);
        
        if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = "#e74c3c";
    ctx.fillText("Inductor Current (I_L)", 10, h*0.25 - 25);
    
    ctx.fillStyle = "#3498db";
    ctx.fillText(`Output Voltage (V_out approx ${state.Vout.toFixed(1)}V)`, 10, h*0.75 - 25);
}

// --- Helpers ---
function drawSource(ctx, x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI*2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.fillText("Vin", x, y+4);
    ctx.font = "10px sans-serif";
    ctx.fillText("+", x, y-18);
}

function drawInductor(ctx, x, y, vertical) {
    ctx.beginPath();
    const len = 40;
    const coils = 4;
    
    if(vertical) {
        const r = len / (coils*2);
        for(let i=0; i<coils; i++) {
            ctx.arc(x, y - len/2 + r + i*r*2, r, -Math.PI/2, Math.PI/2, true); // loops
        }
    }
    ctx.stroke();
    // Clear inner lines if complex, but simple loops work
}

function drawDiode(ctx, x, y, pointsLeft) {
    ctx.beginPath();
    const sz = 10;
    if(pointsLeft) {
        ctx.moveTo(x + sz, y - sz);
        ctx.lineTo(x + sz, y + sz);
        ctx.lineTo(x - sz, y);
        ctx.closePath();
        // Bar
        ctx.moveTo(x - sz, y - sz);
        ctx.lineTo(x - sz, y + sz);
    }
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();
}

function drawCapacitor(ctx, x, y) {
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 5); ctx.lineTo(x + 10, y - 5);
    ctx.moveTo(x - 10, y + 5); ctx.lineTo(x + 10, y + 5);
    ctx.stroke();
}

function drawResistor(ctx, x, y) {
    ctx.beginPath();
    ctx.rect(x-5, y-15, 10, 30);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.stroke();
}

function drawFlow(ctx, points, offset) {
    const totalDist = points.reduce((acc, pt, i) => {
        if(i===0) return 0;
        const dx = pt.x - points[i-1].x;
        const dy = pt.y - points[i-1].y;
        return acc + Math.sqrt(dx*dx + dy*dy);
    }, 0);
    
    const spacing = 20;
    
    // We walk the path
    for(let d = 0; d < totalDist; d+=spacing) {
        let actualD = (d + offset) % totalDist;
        
        // Find coordinate
        let currentD = 0;
        for(let i=1; i<points.length; i++) {
            const p1 = points[i-1];
            const p2 = points[i];
            const segLen = Math.hypot(p2.x-p1.x, p2.y-p1.y);
            
            if(actualD >= currentD && actualD <= currentD + segLen) {
                const segPos = (actualD - currentD) / segLen;
                const px = p1.x + (p2.x - p1.x) * segPos;
                const py = p1.y + (p2.y - p1.y) * segPos;
                
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, Math.PI*2);
                ctx.fill();
                break;
            }
            currentD += segLen;
        }
    }
}

// Start
init();