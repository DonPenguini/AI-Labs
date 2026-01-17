// --- Constants ---
const kB = 1.380649e-23; // Boltzmann constant (J/K)
const q = 1.602176634e-19; // Electron charge (C)

// --- DOM Elements ---
const inputs = {
    v: document.getElementById('voltage'),
    t: document.getElementById('temp'),
    n: document.getElementById('ideality'),
    is_log: document.getElementById('is_log')
};

const displays = {
    v: document.getElementById('val-v'),
    t: document.getElementById('val-t'),
    n: document.getElementById('val-n'),
    is: document.getElementById('val-is'),
    vt: document.getElementById('out-vt'),
    i: document.getElementById('out-current'),
    bias: document.getElementById('bias-status')
};

const graphCanvas = document.getElementById('graphCanvas');
const circuitCanvas = document.getElementById('circuitCanvas');
const ctxGraph = graphCanvas.getContext('2d');
const ctxCircuit = circuitCanvas.getContext('2d');

// --- State ---
let state = {
    V: 0.7,
    T: 300,
    n: 1.5,
    Is: 1e-12, // 1 pA
    
    // Calculated
    Vt: 0.0258,
    I: 0
};

// Animation state
let electronOffset = 0;

// --- Initialization ---
function init() {
    // Add event listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updateState);
    });

    // Resize handling
    window.addEventListener('resize', () => {
        resizeCanvas(graphCanvas);
        resizeCanvas(circuitCanvas);
        drawGraph();
    });

    // Initial setup
    resizeCanvas(graphCanvas);
    resizeCanvas(circuitCanvas);
    updateState();
    animateCircuit();
}

function resizeCanvas(canvas) {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = canvas.id === 'circuitCanvas' ? 150 : 300;
}

// --- Physics & Logic ---
function updateState() {
    // Read inputs
    state.V = parseFloat(inputs.v.value);
    state.T = parseFloat(inputs.t.value);
    state.n = parseFloat(inputs.n.value);
    
    // Convert log scale slider back to linear value
    const logIs = parseFloat(inputs.is_log.value);
    state.Is = Math.pow(10, logIs);

    // Calculate Thermal Voltage: Vt = kB * T / q
    state.Vt = (kB * state.T) / q;

    // Calculate Current: I = Is * ( exp(V / (n*Vt)) - 1 )
    state.I = state.Is * (Math.exp(state.V / (state.n * state.Vt)) - 1);

    updateUI();
    drawGraph();
}

function updateUI() {
    // Update Slider Labels
    displays.v.textContent = `${state.V.toFixed(2)} V`;
    displays.t.textContent = `${state.T.toFixed(0)} K`;
    displays.n.textContent = state.n.toFixed(2);
    displays.is.textContent = formatScientific(state.Is, 'A');

    // Update Results
    displays.vt.textContent = `${(state.Vt * 1000).toFixed(2)} mV`;
    displays.i.textContent = formatScientific(state.I, 'A');

    // Update Bias Status
    if (state.V > 0) {
        displays.bias.textContent = "Forward Bias";
        displays.bias.style.background = "#e8f5e9"; // Light green
        displays.bias.style.color = "#2e7d32";
    } else if (state.V < 0) {
        displays.bias.textContent = "Reverse Bias";
        displays.bias.style.background = "#ffebee"; // Light red
        displays.bias.style.color = "#c62828";
    } else {
        displays.bias.textContent = "Zero Bias";
        displays.bias.style.background = "#eee";
        displays.bias.style.color = "#333";
    }
}

function formatScientific(val, unit) {
    if (Math.abs(val) < 1e-15) return `0.00 ${unit}`; // Near zero
    
    // Engineering notation logic
    const exp = Math.floor(Math.log10(Math.abs(val)));
    
    if (exp >= -3) return `${(val * 1e3).toFixed(2)} mA`;
    if (exp >= -6) return `${(val * 1e6).toFixed(2)} µA`;
    if (exp >= -9) return `${(val * 1e9).toFixed(2)} nA`;
    if (exp >= -12) return `${(val * 1e12).toFixed(2)} pA`;
    return `${(val * 1e15).toFixed(2)} fA`;
}

// --- Graph Visualization ---
function drawGraph() {
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    const ctx = ctxGraph;

    ctx.clearRect(0, 0, w, h);

    // Define Axes limits
    // X: -0.5V to 1.0V
    const minV = -0.5;
    const maxV = 1.0;
    const rangeV = maxV - minV;
    
    // Y: Dynamic scale based on current settings. 
    // We compute I at maxV (1.0V) to determine vertical scale
    // But clamp it if it's too huge, or too small
    const maxI_theoretical = state.Is * (Math.exp(maxV / (state.n * state.Vt)) - 1);
    
    // We want the current operating point to be visible. 
    // If operating point I is small, zoom in. If large, zoom out.
    // Let's set Y-max to be max(Current at 1.0V, some minimum visual range)
    // Actually, exponential curves are hard to view. 
    // Strategy: Fix Y-axis to slightly above the current Operating Point if forward biased, 
    // or a standard range if reverse biased.
    
    let maxY = 0;
    if (state.V > 0.1) {
        // In conduction region, scale to see the current point + 20% headroom
        // But if we slide V down, the graph shouldn't jump wildly.
        // Let's calculate I at V=1.0 for the current parameters and use that as fixed scale for stability?
        // No, current changes by orders of magnitude. 
        // Let's use log-like scaling or just clamp to current value * 2
        maxY = Math.max(state.I * 1.5, 1e-6); 
    } else {
        // Reverse/Low bias, show small scale (e.g. 1uA range)
        maxY = 1e-6; 
    }
    
    // Coordinate Mapping
    const mapX = (v) => ((v - minV) / rangeV) * (w - 60) + 40; // 40px padding left
    const mapY = (i) => h - 30 - (i / maxY) * (h - 60); // 30px padding bottom

    // Draw Axes
    ctx.beginPath();
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    
    // X Axis (at y=0 current)
    const yZero = mapY(0);
    ctx.moveTo(40, yZero);
    ctx.lineTo(w, yZero);
    
    // Y Axis (at x=0 volts)
    const xZero = mapX(0);
    ctx.moveTo(xZero, 0);
    ctx.lineTo(xZero, h - 30);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = "#666";
    ctx.font = "12px Arial";
    ctx.fillText("Voltage (V)", w - 60, yZero - 5);
    ctx.fillText("Current", 5, 15);
    
    // Tick marks logic simplified
    ctx.textAlign = "center";
    for(let v = -0.4; v <= 1.0; v+=0.2) {
        ctx.fillText(v.toFixed(1), mapX(v), yZero + 15);
    }

    // Draw Curve
    ctx.beginPath();
    ctx.strokeStyle = "#3f51b5";
    ctx.lineWidth = 2;

    let started = false;
    for (let x = 0; x < w; x+=2) {
        // Reverse map pixel to Voltage
        const vPct = (x - 40) / (w - 60);
        const vVal = minV + vPct * rangeV;
        
        if (vVal < minV || vVal > maxV) continue;

        const iVal = state.Is * (Math.exp(vVal / (state.n * state.Vt)) - 1);
        
        const yPos = mapY(iVal);
        
        // Clamp drawing to canvas bounds
        if (yPos < 0 || yPos > h) continue;

        if (!started) {
            ctx.moveTo(x, yPos);
            started = true;
        } else {
            ctx.lineTo(x, yPos);
        }
    }
    ctx.stroke();

    // Draw Operating Point
    const px = mapX(state.V);
    const py = mapY(state.I);
    
    // Dot
    ctx.beginPath();
    ctx.fillStyle = "#ff4081";
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Text Label
    ctx.fillStyle = "#333";
    ctx.textAlign = "left";
    ctx.fillText(`(${state.V.toFixed(2)}V, ${formatScientific(state.I, 'A')})`, px + 10, py - 10);
}

// --- Circuit Animation ---
function animateCircuit() {
    const w = circuitCanvas.width;
    const h = circuitCanvas.height;
    const ctx = ctxCircuit;

    ctx.clearRect(0, 0, w, h);

    // Circuit Layout Coordinates
    const yMid = h / 2;
    const xLeft = 50;
    const xRight = w - 50;
    const diodeX = (xLeft + xRight) / 2;

    // --- Draw Wires ---
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(xLeft, yMid); // Left Source
    ctx.lineTo(diodeX - 20, yMid); // To Diode
    ctx.moveTo(diodeX + 20, yMid); // From Diode
    ctx.lineTo(xRight, yMid); // To Load/Right
    ctx.stroke();

    // --- Draw Voltage Source (Battery style) ---
    // Using a circle source symbol for simplicity or standard battery
    // Let's do a circle V source on the left
    ctx.beginPath();
    ctx.arc(xLeft, yMid, 15, 0, Math.PI*2);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fill();
    
    // Polarity based on V
    ctx.fillStyle = "#000";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (state.V >= 0) {
        ctx.fillText("+", xLeft, yMid - 6);
        ctx.fillText("-", xLeft, yMid + 6);
    } else {
        ctx.fillText("-", xLeft, yMid - 6);
        ctx.fillText("+", xLeft, yMid + 6);
    }
    ctx.fillText("V", xLeft, yMid - 25);


    // --- Draw Diode Symbol ---
    ctx.beginPath();
    ctx.fillStyle = "#333";
    // Triangle pointing right
    ctx.moveTo(diodeX - 10, yMid - 15);
    ctx.lineTo(diodeX - 10, yMid + 15);
    ctx.lineTo(diodeX + 10, yMid);
    ctx.fill();
    // Vertical Bar
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.moveTo(diodeX + 10, yMid - 15);
    ctx.lineTo(diodeX + 10, yMid + 15);
    ctx.stroke();


    // --- Animate Electrons ---
    // Real electron flow is opposite to Conventional Current.
    // Current I > 0 flows Left -> Right. Electrons flow Right -> Left.
    // Speed proportional to Current magnitude.
    
    // Calculate speed factor
    // Logarithmic visual scaling because current changes exponentially
    let speed = 0;
    if (Math.abs(state.I) > 1e-12) {
        const magnitude = Math.log10(Math.abs(state.I));
        // Map magnitude -12 (pA) to -3 (mA) to speed 0.5 to 10
        speed = (magnitude + 13) * 0.8;
        if (speed < 0) speed = 0;
    }

    // Direction
    // If V > 0, I > 0 (Left->Right). Electrons go Right->Left (Negative speed)
    // If V < 0, I < 0 (Right->Left). Electrons go Left->Right (Positive speed)
    
    let direction = state.V >= 0 ? -1 : 1;
    
    // If Reverse bias leakage is tiny, visual movement should be barely standard
    // Ideally, leakage is so small nothing moves.
    if (state.V < 0) speed = 0.2; // Show very slow drift for leakage

    electronOffset += speed * direction;

    // Draw Electrons (Yellow dots)
    const dotSpacing = 30;
    const totalLength = xRight - xLeft;
    
    ctx.fillStyle = "#FFD700"; // Gold
    
    // We only draw dots on the wire segments
    const wireSegments = [
        {start: xLeft + 15, end: diodeX - 20},
        {start: diodeX + 20, end: xRight}
    ];

    wireSegments.forEach(seg => {
        // Clip to segment
        ctx.save();
        ctx.beginPath();
        ctx.rect(seg.start, yMid - 10, seg.end - seg.start, 20);
        ctx.clip();

        for (let i = -50; i < w + 50; i += dotSpacing) {
            let x = (i + electronOffset) % (w);
            // Wrap logic for infinite scroll effect
            if (x < 0) x += w;
            
            // Only draw if within this segment visually
            // (The clip handles the cutting, we just draw the dots)
            ctx.beginPath();
            ctx.arc(x, yMid, 3, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    });

    requestAnimationFrame(animateCircuit);
}

// Start
init();