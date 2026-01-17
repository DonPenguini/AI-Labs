// DOM Elements
const inputs = {
    rho0: document.getElementById('rho0'),
    H: document.getElementById('scaleHeight'),
    h: document.getElementById('altitude')
};

const displays = {
    rho0: document.getElementById('val-rho0'),
    H: document.getElementById('val-H'),
    h: document.getElementById('val-h'),
    result: document.getElementById('result-rho'),
    ratioBar: document.getElementById('ratio-bar'),
    ratioText: document.getElementById('ratio-text')
};

const skyCanvas = document.getElementById('skyCanvas');
const graphCanvas = document.getElementById('graphCanvas');
const skyCtx = skyCanvas.getContext('2d');
const graphCtx = graphCanvas.getContext('2d');

// State
let params = {
    rho0: 1.225,
    H: 8500,
    h: 0
};

// Particle System for Sky View
const particles = [];
const NUM_PARTICLES = 150; // Base number to simulate visual density

class Particle {
    constructor(canvasWidth, canvasHeight) {
        this.w = canvasWidth;
        this.h = canvasHeight;
        this.reset();
        // Start at random y
        this.y = Math.random() * this.h;
    }

    reset() {
        this.x = Math.random() * this.w;
        this.y = 0; // Reset to top or random
        this.vx = (Math.random() - 0.5) * 0.5; // Slight drift
        this.vy = (Math.random() * 0.5) + 0.1; // Falling slowly or jittering
        this.radius = Math.random() * 1.5 + 0.5;
        this.alpha = Math.random() * 0.5 + 0.2;
    }

    update() {
        this.x += this.vx;
        this.y += (Math.random() - 0.5) * 0.5; // Brownian-ish vertical jitter

        // Wrap around horizontally
        if (this.x > this.w) this.x = 0;
        if (this.x < 0) this.x = this.w;
        if (this.y > this.h) this.y = 0;
        if (this.y < 0) this.y = this.h;
    }

    draw(ctx, maxAlt, scaleHeight, seaLevelRho) {
        // We only draw the particle if probability allows based on density at this height
        // Map particle Y (pixels) to Altitude (meters)
        // Canvas Bottom = 0m, Top = maxAlt
        const altitudeAtY = maxAlt * (1 - (this.y / this.h));
        
        // Calculate density factor at this altitude
        const densityFactor = Math.exp(-altitudeAtY / scaleHeight);

        // Visual trick: render particle transparency based on density
        // Higher density = more visible particles
        
        // Threshold check to simulate fewer particles higher up
        // We use a random check against density to decide whether to draw
        // giving a stochastic appearance of thinning air
        if (Math.random() > densityFactor * 1.2) return; 

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.fill();
    }
}

// Initialization
function init() {
    // Event Listeners
    inputs.rho0.addEventListener('input', update);
    inputs.H.addEventListener('input', update);
    inputs.h.addEventListener('input', update);

    window.addEventListener('resize', resizeCanvases);

    // Initial Resize
    resizeCanvases();
    
    // Create particles
    for(let i=0; i<NUM_PARTICLES; i++) {
        particles.push(new Particle(skyCanvas.width, skyCanvas.height));
    }

    // Start Loop
    update();
    animate();
}

function resizeCanvases() {
    const containers = document.querySelectorAll('.canvas-stack, .canvas-wrapper');
    
    // Sky Canvas
    skyCanvas.width = containers[0].clientWidth;
    skyCanvas.height = containers[0].clientHeight;
    
    // Graph Canvas
    graphCanvas.width = containers[1].clientWidth;
    graphCanvas.height = containers[1].clientHeight;

    // Reset particles on resize
    particles.forEach(p => {
        p.w = skyCanvas.width;
        p.h = skyCanvas.height;
    });
}

function update() {
    // Get values
    params.rho0 = parseFloat(inputs.rho0.value);
    params.H = parseFloat(inputs.H.value);
    params.h = parseFloat(inputs.h.value);

    // Update Displays
    displays.rho0.textContent = params.rho0.toFixed(3);
    displays.H.textContent = params.H;
    displays.h.textContent = params.h;

    // Calculate Result
    // rho = rho0 * exp(-h/H)
    const rho = params.rho0 * Math.exp(-params.h / params.H);
    
    displays.result.textContent = rho.toFixed(4);

    // Update Ratio Bar
    const ratio = (rho / params.rho0) * 100;
    displays.ratioBar.style.width = `${Math.min(ratio, 100)}%`;
    displays.ratioText.textContent = `${ratio.toFixed(1)}% of Sea Level Density`;
}

function drawSky() {
    const ctx = skyCtx;
    const w = skyCanvas.width;
    const h = skyCanvas.height;

    // 1. Draw Background Gradient (Atmosphere Color)
    // Bottom: Light Blue, Top: Black/Space
    const grad = ctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, "#87CEEB"); // Sky Blue at bottom (0m)
    grad.addColorStop(0.6, "#4682B4"); // Steel Blue
    grad.addColorStop(1, "#000011"); // Space at top (25000m)
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Draw Particles (Air Density Visual)
    const maxSimAlt = 25000; // The top of the canvas represents 25km
    
    particles.forEach(p => {
        p.update();
        p.draw(ctx, maxSimAlt, params.H, params.rho0);
    });

    // 3. Draw "Probe" / Balloon at current altitude h
    // Map params.h to pixel Y
    // Y = 0 is Top, Y = h is Bottom.
    // 0m = h px. 25000m = 0 px.
    const probeY = h - (params.h / maxSimAlt) * h;
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    
    // Balloon Line
    ctx.beginPath();
    ctx.moveTo(w/2, probeY + 20);
    ctx.lineTo(w/2, probeY + 60);
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // Balloon Body
    ctx.beginPath();
    ctx.arc(w/2, probeY, 20, 0, Math.PI*2);
    ctx.fillStyle = "#e74c3c";
    ctx.fill();
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Highlight spot
    ctx.beginPath();
    ctx.arc(w/2 - 5, probeY - 5, 5, 0, Math.PI*2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();

    ctx.shadowBlur = 0;

    // Label
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(`${params.h} m`, w/2 + 25, probeY + 5);
}

function drawGraph() {
    const ctx = graphCtx;
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    
    // Clear
    ctx.clearRect(0, 0, w, h);

    // Setup Axes
    // X-axis: Density (0 to 1.5)
    // Y-axis: Altitude (0 to 25000)
    
    const margin = {top: 20, right: 20, bottom: 40, left: 50};
    const plotW = w - margin.left - margin.right;
    const plotH = h - margin.top - margin.bottom;
    
    const maxRho = 1.5;
    const maxAlt = 25000;

    // Draw Grid & Axes
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Y Axis (Altitude)
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, h - margin.bottom);
    
    // X Axis (Density)
    ctx.moveTo(margin.left, h - margin.bottom);
    ctx.lineTo(w - margin.right, h - margin.bottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#2c3e50";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Density (kg/m³)", margin.left + plotW/2, h - 10);
    
    ctx.save();
    ctx.translate(15, margin.top + plotH/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText("Altitude (m)", 0, 0);
    ctx.restore();

    // Ticks
    // X Ticks
    for(let i=0; i<=5; i++) {
        let val = (maxRho / 5) * i;
        let x = margin.left + (val / maxRho) * plotW;
        ctx.fillText(val.toFixed(1), x, h - margin.bottom + 15);
    }
    // Y Ticks
    ctx.textAlign = "right";
    for(let i=0; i<=5; i++) {
        let val = (maxAlt / 5) * i;
        let y = h - margin.bottom - (val / maxAlt) * plotH;
        ctx.fillText(val, margin.left - 10, y + 4);
    }

    // Plot Curve
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#3498db";

    for(let yPx = 0; yPx <= plotH; yPx+=2) {
        // Pixel Y to Altitude
        let alt = (yPx / plotH) * maxAlt;
        
        // Calculate Density
        let rho = params.rho0 * Math.exp(-alt / params.H);
        
        // Map to Pixel X
        let xPx = (rho / maxRho) * plotW;
        
        // Invert Y for canvas (0 is top)
        let canvasY = h - margin.bottom - yPx;
        let canvasX = margin.left + xPx;

        if (yPx === 0) ctx.moveTo(canvasX, canvasY);
        else ctx.lineTo(canvasX, canvasY);
    }
    ctx.stroke();

    // Plot Current Point
    let currentRho = params.rho0 * Math.exp(-params.h / params.H);
    let ptX = margin.left + (currentRho / maxRho) * plotW;
    let ptY = h - margin.bottom - (params.h / maxAlt) * plotH;

    ctx.beginPath();
    ctx.arc(ptX, ptY, 6, 0, Math.PI*2);
    ctx.fillStyle = "#e74c3c";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Dashed lines to axes
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "#999";
    ctx.lineWidth = 1;
    // Horizontal
    ctx.moveTo(margin.left, ptY);
    ctx.lineTo(ptX, ptY);
    // Vertical
    ctx.moveTo(ptX, ptY);
    ctx.lineTo(ptX, h - margin.bottom);
    ctx.stroke();
    ctx.setLineDash([]);
}

function animate() {
    drawSky();
    drawGraph();
    requestAnimationFrame(animate);
}

// Start
init();