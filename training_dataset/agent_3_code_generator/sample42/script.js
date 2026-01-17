// Constants
const g = 9.81; // m/s^2

// DOM Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const inputs = {
    m: document.getElementById('mass'),
    A: document.getElementById('area'),
    Cd: document.getElementById('cd'),
    rho: document.getElementById('rho')
};

const displays = {
    m: document.getElementById('val-m'),
    A: document.getElementById('val-A'),
    Cd: document.getElementById('val-cd'),
    rho: document.getElementById('val-rho'),
    currV: document.getElementById('curr-v'),
    termV: document.getElementById('term-v'),
    status: document.getElementById('status-text')
};

const resetBtn = document.getElementById('reset-btn');

// Simulation State
let state = {
    m: 70,      // kg
    A: 0.5,     // m^2
    Cd: 0.5,    // dimensionless
    rho: 1.22,  // kg/m^3
    
    // Dynamic variables
    v: 0,           // current velocity (m/s)
    yPos: 0,        // vertical position (for scrolling background)
    terminalV: 0,   // calculated terminal velocity
    
    clouds: []      // for visual effect
};

// --- Initialization ---

function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Event Listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updateParams);
    });
    
    resetBtn.addEventListener('click', resetSimulation);
    
    // Generate some random clouds
    for(let i=0; i<8; i++) {
        state.clouds.push(createCloud());
    }

    updateParams(); // Calculate initial values
    animate();
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function createCloud() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        w: 50 + Math.random() * 100,
        speed: 0.2 + Math.random() * 0.5 // Parallax speed factor
    };
}

function updateParams() {
    state.m = parseFloat(inputs.m.value);
    state.A = parseFloat(inputs.A.value);
    state.Cd = parseFloat(inputs.Cd.value);
    state.rho = parseFloat(inputs.rho.value);

    // Update Text Displays
    displays.m.textContent = state.m + " kg";
    displays.A.textContent = state.A.toFixed(2) + " m²";
    displays.Cd.textContent = state.Cd.toFixed(1);
    displays.rho.textContent = state.rho.toFixed(2) + " kg/m³";

    // Recalculate Theoretical Terminal Velocity
    // v_term = sqrt( (2*m*g) / (rho * Cd * A) )
    const numerator = 2 * state.m * g;
    const denominator = state.rho * state.Cd * state.A;
    state.terminalV = Math.sqrt(numerator / denominator);
    
    displays.termV.textContent = state.terminalV.toFixed(1) + " m/s";
}

function resetSimulation() {
    state.v = 0;
    updateParams();
}

// --- Physics Engine ---

function updatePhysics(dt) {
    // Forces
    const F_gravity = state.m * g;
    const F_drag = 0.5 * state.rho * state.Cd * state.A * (state.v * state.v);
    
    // Net Force & Acceleration
    // We assume falling down, so Gravity is driving force, Drag is opposing
    const F_net = F_gravity - F_drag;
    const a = F_net / state.m;
    
    // Euler Integration
    state.v += a * dt;
    
    // Update visual position (scrolling)
    // We scale the pixel movement so it doesn't look too crazy at high speeds
    const pixelScale = 5; 
    state.yPos += state.v * dt * pixelScale;

    // Update Status Text
    const ratio = state.v / state.terminalV;
    if (ratio > 0.99) {
        displays.status.textContent = "Status: Terminal Velocity Reached";
        displays.status.style.color = "#27ae60"; // Green
    } else {
        displays.status.textContent = "Status: Accelerating...";
        displays.status.style.color = "#e67e22"; // Orange
    }
    
    displays.currV.textContent = state.v.toFixed(1) + " m/s";
}

// --- Rendering ---

function draw() {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // 1. Draw Background (Scrolling Clouds)
    // To simulate falling, clouds move UP
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    state.clouds.forEach(cloud => {
        // Move cloud up based on velocity
        // cloud.y -= state.v * 0.1 * cloud.speed;
        // Actually, let's base it on simulation yPos to match flow
        let drawY = (cloud.y - state.yPos * cloud.speed) % h;
        if (drawY < -50) drawY += h + 100; // Wrap around
        
        // Simple cloud shape (oval)
        ctx.beginPath();
        ctx.ellipse(cloud.x, drawY, cloud.w, cloud.w * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    // 2. Draw Falling Object (Centered)
    // Radius scales with Area (Area = pi * r^2 -> r = sqrt(Area/pi))
    // We scale it up for visibility (e.g., * 40 pixels)
    const visualRadius = Math.sqrt(state.A / Math.PI) * 50; 
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    
    // Draw Ball
    ctx.fillStyle = "#e74c3c"; // Red ball
    ctx.beginPath();
    ctx.arc(cx, cy, visualRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.arc(cx - visualRadius*0.3, cy - visualRadius*0.3, visualRadius*0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Draw Force Vectors
    // Gravity (Down) - Constant visual length relative to mass? 
    // Or scale both so they fit? 
    // Let's scale vectors so that at Terminal Velocity, they are roughly 100px long.
    // Scale Factor = 100 / (mg)
    const scaleFactor = 100 / (state.m * g); 
    
    const lenG = (state.m * g) * scaleFactor;
    const lenD = (0.5 * state.rho * state.Cd * state.A * state.v * state.v) * scaleFactor;

    // Gravity Arrow (Red)
    drawArrow(ctx, cx, cy + visualRadius, cx, cy + visualRadius + lenG, "#c0392b", "Weight (mg)");
    
    // Drag Arrow (Blue)
    drawArrow(ctx, cx, cy - visualRadius, cx, cy - visualRadius - lenD, "#2980b9", "Drag (Fd)");

    // 4. Speed Lines (Motion Blur effect)
    if (state.v > 1) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 2;
        const numLines = Math.min(20, Math.floor(state.v / 2));
        for(let i=0; i<numLines; i++) {
            const lx = cx + (Math.random() - 0.5) * visualRadius * 3;
            const ly = Math.random() * h;
            const len = 20 + state.v; // Faster = longer lines
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx, ly - len);
            ctx.stroke();
        }
    }
}

function drawArrow(ctx, x1, y1, x2, y2, color, label) {
    const headlen = 10; // length of head in pixels
    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);
    
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    
    // Line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Head
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.fill();

    // Label
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#333";
    const labelOffset = (y2 > y1) ? 15 : -5;
    ctx.textAlign = "center";
    ctx.fillText(label, x2, y2 + labelOffset);
}

// --- Animation Loop ---
let lastTime = 0;

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000; // Delta time in seconds
    lastTime = timestamp;

    // Limit dt to prevent huge jumps if tab inactive
    const safeDt = Math.min(dt, 0.1);

    updatePhysics(safeDt);
    draw();
    
    requestAnimationFrame(animate);
}

// Start
init();