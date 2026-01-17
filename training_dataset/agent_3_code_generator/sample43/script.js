// Physics Constants
const g = 9.81;

// State
let state = {
    v0: 25,          // m/s
    mu: 0.7,         // friction coeff
    currentX: 0,     // current distance (m)
    currentV: 0,     // current velocity (m/s)
    isBraking: false,
    startTime: 0,
    stopDistance: 0,
    scale: 10        // pixels per meter
};

// Car Visuals
const carDims = { length: 4.5, height: 1.4, wheelRadius: 0.35 };

// DOM Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const ui = {
    v0: document.getElementById('v0'),
    v0Disp: document.getElementById('v0-display'),
    kphDisp: document.getElementById('kph-display'),
    mu: document.getElementById('mu'),
    muDisp: document.getElementById('mu-display'),
    surface: document.getElementById('surface-label'),
    calcDist: document.getElementById('calc-distance'),
    hudSpeed: document.getElementById('speed-hud'),
    hudDist: document.getElementById('dist-hud'),
    btn: document.getElementById('brake-btn')
};

// Initialization
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    ui.v0.addEventListener('input', updateParams);
    ui.mu.addEventListener('input', updateParams);
    ui.btn.addEventListener('click', startBraking);
    
    updateParams();
    drawFrame(0); // Initial static draw
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    if(!state.isBraking) drawFrame(state.currentX);
}

function updateParams() {
    if (state.isBraking) return;

    // Read Inputs
    state.v0 = parseFloat(ui.v0.value);
    state.mu = parseFloat(ui.mu.value);

    // Update Text
    ui.v0Disp.innerText = state.v0;
    ui.kphDisp.innerText = (state.v0 * 3.6).toFixed(0);
    ui.muDisp.innerText = state.mu;
    
    // Surface Hint
    let surf = "Dry Asphalt";
    if(state.mu < 0.3) surf = "Ice / Snow";
    else if(state.mu < 0.6) surf = "Wet Road";
    else if(state.mu > 0.9) surf = "Racing Slick / Track";
    ui.surface.innerText = surf;

    // Calculate Theoretical Distance
    state.stopDistance = (state.v0 ** 2) / (2 * state.mu * g);
    ui.calcDist.innerText = state.stopDistance.toFixed(2);
    
    // Auto-Scale Canvas
    // Fit stopping distance + 20% margin
    const viewWidthMeters = Math.max(state.stopDistance * 1.2, 50); 
    state.scale = canvas.width / viewWidthMeters;

    // Reset visual positions
    state.currentX = 0;
    state.currentV = state.v0;
    
    drawFrame(0);
}

function startBraking() {
    if (state.isBraking) return;
    
    state.isBraking = true;
    state.startTime = performance.now();
    ui.btn.disabled = true;
    ui.v0.disabled = true;
    ui.mu.disabled = true;

    requestAnimationFrame(animate);
}

function animate(time) {
    const elapsedSec = (time - state.startTime) / 1000;
    const a = state.mu * g;
    
    // Physics Calc: v = v0 - at
    let newV = state.v0 - (a * elapsedSec);
    
    if (newV <= 0) {
        // Stopped
        state.currentV = 0;
        state.currentX = state.stopDistance;
        state.isBraking = false;
        ui.btn.disabled = false;
        ui.v0.disabled = false;
        ui.mu.disabled = false;
        ui.btn.innerText = "RESET / BRAKE AGAIN";
        drawFrame(state.currentX);
        return;
    }

    // Physics Calc: x = v0*t - 0.5*a*t^2
    state.currentX = (state.v0 * elapsedSec) - (0.5 * a * elapsedSec * elapsedSec);
    state.currentV = newV;

    drawFrame(state.currentX);
    requestAnimationFrame(animate);
}

// ---------------------------------------------------------
// DRAWING ENGINE
// ---------------------------------------------------------

function drawFrame(carX) {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dynamic Horizon
    const groundY = canvas.height * 0.65;
    
    // 1. Draw Road
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Road Markings (Stripes)
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.font = "12px monospace";
    ctx.fillStyle = "#d1d5db";
    
    // Calculate visible range
    // We render markers every 10m
    const step = 10;
    
    for(let m = 0; m <= state.stopDistance + 20; m+=step) {
        const px = m * state.scale;
        
        // Draw tick
        ctx.beginPath();
        ctx.moveTo(px, groundY);
        ctx.lineTo(px, groundY + 15);
        ctx.stroke();
        
        // Text
        ctx.fillText(m + "m", px + 4, groundY + 30);
    }
    
    // 2. Draw Stop Line (Target)
    const stopPx = state.stopDistance * state.scale;
    ctx.save();
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(stopPx, groundY - 50);
    ctx.lineTo(stopPx, groundY + 50);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.fillText("STOP", stopPx - 15, groundY - 60);
    ctx.restore();

    // 3. Draw Car
    drawCar(carX, groundY);

    // 4. Update HUD
    ui.hudSpeed.innerText = (state.currentV * 3.6).toFixed(0) + " km/h";
    ui.hudDist.innerText = carX.toFixed(1) + " m";
}

function drawCar(xMeters, groundY) {
    const x = xMeters * state.scale;
    const len = carDims.length * state.scale;
    const hgt = carDims.height * state.scale;
    const wheelR = carDims.wheelRadius * state.scale;
    
    // Suspension/Brake Dive Logic
    // If braking, tilt nose down. 
    // Max tilt angle ~ 3 degrees (0.05 rad)
    let tilt = 0;
    if(state.isBraking && state.currentV > 0.5) {
        // More friction = harder braking = more tilt
        tilt = Math.min(state.mu * 0.08, 0.1); 
    }

    ctx.save();
    
    // Translate to center of car bottom for rotation
    const centerX = x + len/2;
    ctx.translate(centerX, groundY - wheelR); 
    ctx.rotate(tilt); // Apply dive
    
    // Car Body (Relative to new center)
    ctx.fillStyle = "#3b82f6"; // Blue chassis
    // Draw body shape
    ctx.beginPath();
    ctx.roundRect(-len/2, -hgt, len, hgt - 5, 5);
    ctx.fill();
    
    // Roof / Windows
    ctx.fillStyle = "#bfdbfe";
    ctx.beginPath();
    ctx.roundRect(-len/4, -hgt - (hgt*0.6), len/2, hgt*0.6, 5);
    ctx.fill();

    ctx.restore(); // Undo tilt for wheels (wheels stay on ground!)

    // Draw Wheels (They need to rotate based on distance traveled)
    // Wheel Rotation Angle = Distance / Radius
    const wheelAngle = xMeters / carDims.wheelRadius;

    // Rear Wheel
    drawWheel(x + (len * 0.2), groundY - wheelR, wheelR, wheelAngle);
    // Front Wheel
    drawWheel(x + (len * 0.8), groundY - wheelR, wheelR, wheelAngle);
}

function drawWheel(cx, cy, r, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    // Tire
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#1f2937";
    ctx.fill();
    
    // Rim
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#9ca3af";
    ctx.fill();
    
    // Spokes (to see rotation)
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r*0.6, 0);
    ctx.lineTo(r*0.6, 0);
    ctx.moveTo(0, -r*0.6);
    ctx.lineTo(0, r*0.6);
    ctx.stroke();
    
    ctx.restore();
}

init();