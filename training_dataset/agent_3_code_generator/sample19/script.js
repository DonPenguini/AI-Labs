// Constants
const C0 = 3e8; // Speed of light in m/s

// DOM Elements
const inputLength = document.getElementById('length');
const inputPerm = document.getElementById('permittivity');
const btnSend = document.getElementById('send-pulse-btn');

const displayLength = document.getElementById('val-length');
const displayPerm = document.getElementById('val-perm');
const labelLenBottom = document.getElementById('len-label');

const resVp = document.getElementById('res-vp');
const resTd = document.getElementById('res-td');
const speedRatioDisplay = document.getElementById('speed-ratio');
const timerDisplay = document.getElementById('timer-display');

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// State
let state = {
    l: 100,      // meters
    er: 2.2,     // dimensionless
    vp: 0,       // m/s
    td: 0,       // seconds
    
    // Animation State
    isAnimating: false,
    pulsePos: 0,    // 0 to 1 (normalized position on line)
    startTime: 0,   // simulation clock
    animSpeed: 0.01 // increment per frame
};

// Initialization
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    inputLength.addEventListener('input', updateParams);
    inputPerm.addEventListener('input', updateParams);
    
    btnSend.addEventListener('click', startPulse);
    
    updateParams();
    drawScene();
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    // Subtract header and footer heights roughly
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight - 80; 
    drawScene();
}

function updateParams() {
    // Read Inputs
    state.l = parseFloat(inputLength.value);
    state.er = parseFloat(inputPerm.value);
    
    // Update Text Displays
    displayLength.textContent = `${state.l} m`;
    displayPerm.textContent = state.er.toFixed(1);
    labelLenBottom.textContent = state.l;
    
    // Physics Calculations
    // 1. Phase Velocity: vp = c0 / sqrt(er)
    state.vp = C0 / Math.sqrt(state.er);
    
    // 2. Time Delay: td = l / vp
    state.td = state.l / state.vp;
    
    // Update Results UI
    resVp.textContent = formatScientific(state.vp) + " m/s";
    resTd.textContent = formatTime(state.td);
    
    // Speed Ratio %
    const ratio = (state.vp / C0) * 100;
    speedRatioDisplay.textContent = ratio.toFixed(1);
    
    // If not animating, redraw to show updated static line
    if (!state.isAnimating) {
        drawScene();
    }
}

function startPulse() {
    state.isAnimating = true;
    state.pulsePos = 0;
    state.startTime = performance.now();
    animate();
}

function animate(currentTime) {
    if (!state.isAnimating) return;
    
    // Calculate progress
    // We want the visual duration to be reasonable (e.g., 2 seconds) regardless of actual physics time
    // But we want to reflect "speed" differences visually?
    // Option A: Fixed visual duration, just show physics timer counting up correctly.
    // Option B: Variable visual duration. High delay = slower pulse.
    
    // Let's go with Option A for UX (don't want to wait 10s for long cables), 
    // but we scale the timer display to match the physics.
    
    const visualDuration = 1500; // 1.5 seconds for full travel
    const elapsed = currentTime - state.startTime;
    
    if (!state.startTime) state.startTime = currentTime; // Handle first frame
    
    // Progress 0 to 1
    const progress = (currentTime - state.startTime) / visualDuration;
    
    state.pulsePos = progress;
    
    // Update Timer Display based on real physics time
    const currentPhysicsTime = progress * state.td;
    timerDisplay.textContent = formatTime(currentPhysicsTime);
    
    if (progress >= 1) {
        state.pulsePos = 1;
        state.isAnimating = false;
        timerDisplay.textContent = formatTime(state.td); // Ensure final value is exact
        drawScene();
        return;
    }
    
    drawScene();
    requestAnimationFrame(animate);
}

// Drawing Logic
function drawScene() {
    const w = canvas.width;
    const h = canvas.height;
    const cy = h / 2;
    const lineMargin = 50;
    const lineStart = lineMargin;
    const lineEnd = w - lineMargin;
    const lineLengthPx = lineEnd - lineStart;
    
    ctx.clearRect(0, 0, w, h);
    
    // 1. Draw Transmission Line
    // Outer Shield (Coax style)
    ctx.fillStyle = "#ddd";
    ctx.fillRect(lineStart, cy - 20, lineLengthPx, 40);
    
    // Dielectric Color (changes with Er)
    // Er=1 (Air) -> White/Blueish. Er=10 -> Darker/Solid.
    const opacity = (state.er - 1) / 9 * 0.5 + 0.1;
    ctx.fillStyle = `rgba(52, 152, 219, ${opacity})`;
    ctx.fillRect(lineStart, cy - 15, lineLengthPx, 30);
    
    // Center Conductor
    ctx.fillStyle = "#555";
    ctx.fillRect(lineStart, cy - 4, lineLengthPx, 8);
    
    // Terminals
    drawTerminal(lineStart, cy, "Source");
    drawTerminal(lineEnd, cy, "Load");
    
    // 2. Draw Pulse
    // Gaussian-like shape or just a simple rect travelling
    if (state.isAnimating || state.pulsePos > 0) {
        const px = lineStart + state.pulsePos * lineLengthPx;
        
        ctx.save();
        ctx.beginPath();
        // Draw a pulse shape above the line representing voltage
        const pulseWidth = 40;
        const pulseHeight = 30;
        
        ctx.moveTo(px - pulseWidth/2, cy - 10);
        ctx.quadraticCurveTo(px, cy - 10 - pulseHeight, px + pulseWidth/2, cy - 10);
        ctx.lineTo(px + pulseWidth/2, cy + 10);
        ctx.quadraticCurveTo(px, cy + 10 + pulseHeight, px - pulseWidth/2, cy + 10);
        ctx.closePath();
        
        ctx.fillStyle = "#e67e22";
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.restore();
        
        // Draw vertical marker
        ctx.beginPath();
        ctx.strokeStyle = "#e67e22";
        ctx.setLineDash([5, 5]);
        ctx.moveTo(px, cy - 40);
        ctx.lineTo(px, cy + 40);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

function drawTerminal(x, y, label) {
    ctx.fillStyle = "#34495e";
    ctx.fillRect(x - 5, y - 25, 10, 50);
    
    ctx.fillStyle = "#333";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    // Text already handled by HTML labels, but drawing dots helps visual anchor
}

// Helpers
function formatScientific(num) {
    return num.toExponential(2);
}

function formatTime(seconds) {
    // Determine unit
    if (seconds < 1e-6) {
        return (seconds * 1e9).toFixed(2) + " ns";
    } else if (seconds < 1e-3) {
        return (seconds * 1e6).toFixed(2) + " μs";
    } else {
        return (seconds * 1e3).toFixed(2) + " ms";
    }
}

// Start
init();