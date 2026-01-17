// --- Configuration & State ---
const state = {
    U: 800,
    A: 50,
    dT1: 90, // Hot In - Cold Out
    dT2: 40  // Hot Out - Cold In
};

const dom = {
    inputs: {
        U: { slider: document.getElementById('u-slider'), num: document.getElementById('u-number') },
        A: { slider: document.getElementById('a-slider'), num: document.getElementById('a-number') },
        dT1: { slider: document.getElementById('dt1-slider'), num: document.getElementById('dt1-number') },
        dT2: { slider: document.getElementById('dt2-slider'), num: document.getElementById('dt2-number') }
    },
    results: {
        lmtd: document.getElementById('res-lmtd'),
        q: document.getElementById('res-q')
    },
    canvas: document.getElementById('simCanvas')
};

const ctx = dom.canvas.getContext('2d');
let animationFrameId;
let flowOffset = 0;

// --- Initialization ---

function init() {
    // Attach event listeners
    Object.keys(dom.inputs).forEach(key => {
        const { slider, num } = dom.inputs[key];
        
        slider.addEventListener('input', (e) => {
            num.value = e.target.value;
            state[key] = parseFloat(e.target.value);
            updatePhysics();
        });

        num.addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val)) return;
            // Clamp within min/max of slider
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (val < min) val = min;
            if (val > max) val = max;
            
            slider.value = val;
            state[key] = val;
            updatePhysics();
        });
    });

    // Handle Resize
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Start Loop
    updatePhysics();
    animate();
}

// --- Physics Calculation ---

function updatePhysics() {
    // Calculate LMTD
    let lmtd;
    if (Math.abs(state.dT1 - state.dT2) < 0.1) {
        lmtd = state.dT1; // Limit as dT1 -> dT2
    } else {
        lmtd = (state.dT1 - state.dT2) / Math.log(state.dT1 / state.dT2);
    }

    // Calculate Heat Duty Q (Watts)
    const q = state.U * state.A * lmtd;

    // Update DOM
    dom.results.lmtd.textContent = lmtd.toFixed(2) + " K";
    dom.results.q.textContent = (q / 1000).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + " kW";
}

// --- Drawing & Animation ---

function resizeCanvas() {
    const parent = dom.canvas.parentElement;
    dom.canvas.width = parent.clientWidth;
    dom.canvas.height = parent.clientHeight;
}

function animate() {
    // Clear
    ctx.clearRect(0, 0, dom.canvas.width, dom.canvas.height);

    // Update animation state
    flowOffset = (flowOffset + 1.5) % 20; // Speed of flow

    drawDiagram();
    drawGraph();

    animationFrameId = requestAnimationFrame(animate);
}

function drawDiagram() {
    const w = dom.canvas.width;
    const h = dom.canvas.height;
    
    // Layout Constants
    const diagramTop = 40;
    const pipeLength = w - 100; // Margins
    const startX = 50;
    const outerH = 80;
    const innerH = 40;
    const centerY = diagramTop + outerH / 2;

    // 1. Outer Pipe (Cold Fluid) - Shell
    ctx.fillStyle = '#eef6fc';
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 2;
    // Top half
    ctx.fillRect(startX, centerY - outerH/2, pipeLength, (outerH - innerH)/2);
    ctx.strokeRect(startX, centerY - outerH/2, pipeLength, (outerH - innerH)/2);
    // Bottom half
    ctx.fillRect(startX, centerY + innerH/2, pipeLength, (outerH - innerH)/2);
    ctx.strokeRect(startX, centerY + innerH/2, pipeLength, (outerH - innerH)/2);

    // 2. Inner Pipe (Hot Fluid) - Tube
    ctx.fillStyle = '#fff0f0';
    ctx.strokeStyle = '#ff4757';
    ctx.fillRect(startX, centerY - innerH/2, pipeLength, innerH);
    ctx.strokeRect(startX, centerY - innerH/2, pipeLength, innerH);

    // 3. Flow Animation (Dashed Lines)
    
    // Cold Fluid (Flows Left <--)
    ctx.beginPath();
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -flowOffset; // Move Left
    
    // Top channel
    const coldYTop = centerY - outerH/2 + (outerH-innerH)/4;
    ctx.moveTo(pipeLength + startX, coldYTop);
    ctx.lineTo(startX, coldYTop);
    // Bottom channel
    const coldYBot = centerY + innerH/2 + (outerH-innerH)/4;
    ctx.moveTo(pipeLength + startX, coldYBot);
    ctx.lineTo(startX, coldYBot);
    ctx.stroke();

    // Hot Fluid (Flows Right -->)
    ctx.beginPath();
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 2;
    ctx.lineDashOffset = flowOffset; // Move Right
    ctx.moveTo(startX, centerY);
    ctx.lineTo(startX + pipeLength, centerY);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset dash

    // 4. Heat Transfer Indicators (Wavy lines from Hot to Cold)
    // We draw small arrows animating outwards from center pipe
    const time = Date.now() / 500;
    ctx.strokeStyle = 'orange';
    ctx.lineWidth = 1.5;
    
    for(let i=0; i<6; i++) {
        let x = startX + (pipeLength/7) * (i+1);
        let waveY = Math.sin(x/20 + time*5) * 2;
        
        // Upward arrow (Hot -> Cold Top)
        drawArrow(ctx, x, centerY - innerH/2 + 2, x, centerY - innerH/2 - 15, 4);
        
        // Downward arrow (Hot -> Cold Bottom)
        drawArrow(ctx, x, centerY + innerH/2 - 2, x, centerY + innerH/2 + 15, 4);
    }

    // Labels
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.fillText("Hot Fluid \u2192", startX + 10, centerY + 4);
    ctx.fillText("Cold \u2190", startX + pipeLength - 50, centerY - outerH/2 + 15);
}

function drawGraph() {
    const w = dom.canvas.width;
    const h = dom.canvas.height;
    
    const startX = 50;
    const pipeLength = w - 100;
    const graphTop = 180;
    const graphH = h - graphTop - 40;
    const graphBot = graphTop + graphH;

    // Draw Axes
    ctx.beginPath();
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1;
    // Y-Axis
    ctx.moveTo(startX, graphTop);
    ctx.lineTo(startX, graphBot);
    // X-Axis
    ctx.lineTo(startX + pipeLength, graphBot);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText("Temperature (T)", startX - 40, graphTop + graphH/2);
    ctx.fillText("Position (Length)", startX + pipeLength/2 - 30, graphBot + 30);

    // --- Dynamic Temperature Profile Calculation ---
    // We simulate realistic temps to make the graph look correct visually
    // Logic: 
    // Left (x=0): Hot_In, Cold_Out. Diff = dT1
    // Right (x=L): Hot_Out, Cold_In. Diff = dT2
    
    // Arbitrary anchor point: Cold Inlet at Right = 20 deg (visual units)
    // Scaling: We need to fit everything in graphH (approx 150px)
    // Let's assume max possible temp visual range is 120 units.
    
    // We need to define a visual drop for the hot fluid to give the lines slope.
    // Let's assume Hot drops by roughly 30-50 units visually to show the process.
    const visualHotDrop = 50; 
    
    // Math for Y positions (0 is top in canvas, so higher temp = smaller Y)
    // We map 0-200 temperature scale to graph pixel range
    
    const tempScale = 0.8; // pixels per degree
    const baseTempY = graphBot - 20; // Y position of "0 degrees"
    
    // T_cold_in (Right) = 20
    const Tc_in_val = 20;
    const Tc_in_y = baseTempY - (Tc_in_val * tempScale);
    
    // T_hot_out (Right) = Tc_in + dT2
    const Th_out_val = Tc_in_val + state.dT2;
    const Th_out_y = baseTempY - (Th_out_val * tempScale);
    
    // T_hot_in (Left) = Th_out + visualHotDrop
    // (We add visual drop to show slope)
    const Th_in_val = Th_out_val + visualHotDrop; 
    const Th_in_y = baseTempY - (Th_in_val * tempScale);
    
    // T_cold_out (Left) = Th_in - dT1
    const Tc_out_val = Th_in_val - state.dT1;
    const Tc_out_y = baseTempY - (Tc_out_val * tempScale);
    
    // Safety check: Ensure graph doesn't go out of bounds (simple clamp for visual safety)
    // If dT1 is huge, Tc_out might go below zero (visual negative). 
    // The graph handles negative Y technically, but let's shift if needed.
    // (Omitted for simplicity, assuming reasonable inputs)

    // Draw Hot Line (Red)
    ctx.beginPath();
    ctx.strokeStyle = '#ff4757';
    ctx.lineWidth = 3;
    ctx.moveTo(startX, Th_in_y);
    ctx.lineTo(startX + pipeLength, Th_out_y);
    ctx.stroke();
    
    // Draw Cold Line (Blue)
    ctx.beginPath();
    ctx.strokeStyle = '#1e90ff';
    ctx.lineWidth = 3;
    ctx.moveTo(startX, Tc_out_y);
    ctx.lineTo(startX + pipeLength, Tc_in_y);
    ctx.stroke();

    // Draw Measurements (dT1 and dT2)
    drawDimension(startX, Th_in_y, Tc_out_y, "ΔT1", true); // Left
    drawDimension(startX + pipeLength, Th_out_y, Tc_in_y, "ΔT2", false); // Right
    
    // Draw dots at endpoints
    drawDot(startX, Th_in_y, '#ff4757');
    drawDot(startX + pipeLength, Th_out_y, '#ff4757');
    drawDot(startX, Tc_out_y, '#1e90ff');
    drawDot(startX + pipeLength, Tc_in_y, '#1e90ff');
}

function drawDimension(x, y1, y2, label, isLeft) {
    // y1 is hot (higher temp, lower Y value usually, but inputs vary)
    // Ensure we draw from min to max
    const top = Math.min(y1, y2);
    const bot = Math.max(y1, y2);
    
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Main vertical line
    const offset = isLeft ? -15 : 15;
    ctx.moveTo(x + offset, top);
    ctx.lineTo(x + offset, bot);
    
    // Ticks
    ctx.moveTo(x + offset - 4, top);
    ctx.lineTo(x + offset + 4, top);
    ctx.moveTo(x + offset - 4, bot);
    ctx.lineTo(x + offset + 4, bot);
    
    // Connect to points (dashed)
    ctx.setLineDash([2, 2]);
    ctx.moveTo(x, top);
    ctx.lineTo(x + offset, top);
    ctx.moveTo(x, bot);
    ctx.lineTo(x + offset, bot);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrows
    // (Simple triangle)
    
    // Label
    ctx.fillStyle = '#333';
    ctx.textAlign = isLeft ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(label, x + (isLeft ? -20 : 20), (top + bot) / 2);
}

function drawArrow(ctx, fromX, fromY, toX, toY, headLen) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
}

function drawDot(x, y, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, 4, 0, Math.PI*2);
    ctx.fill();
}

// Start
init();