// --- Constants ---
const R = 8.314; // Ideal Gas Constant J/(mol*K)

// --- DOM Elements ---
const inputs = {
    n: document.getElementById('moles'),
    t: document.getElementById('temp'),
    v: document.getElementById('volume')
};

const displays = {
    n: document.getElementById('val-n'),
    t: document.getElementById('val-t'),
    v: document.getElementById('val-v'),
    pPa: document.getElementById('res-p-pa'),
    pAtm: document.getElementById('res-p-atm')
};

const canvas = document.getElementById('gasCanvas');
const ctx = canvas.getContext('2d');

// --- State ---
let state = {
    n: 10,
    T: 300,
    V: 1.0,
    P: 0,
    
    // Animation state
    particles: []
};

// --- Particle Class for Animation ---
class Particle {
    constructor(w, h, speedFactor) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * speedFactor;
        this.vy = (Math.random() - 0.5) * speedFactor;
        this.radius = 3;
        // Color based on temperature? (Cold=Blue, Hot=Red) handled in draw
    }

    update(w, h, speedFactor) {
        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < this.radius) {
            this.x = this.radius;
            this.vx *= -1;
        } else if (this.x > w - this.radius) {
            this.x = w - this.radius;
            this.vx *= -1;
        }

        // Bounce off floor
        if (this.y > h - this.radius) {
            this.y = h - this.radius;
            this.vy *= -1;
        } 
        
        // Bounce off Piston (Top)
        // Note: Piston y position is 0 in local container coords? 
        // We will pass the container height 'h' which varies with Volume.
        if (this.y < this.radius) {
            this.y = this.radius;
            this.vy *= -1;
        }
        
        // Dynamic speed adjustment based on temperature
        // We normalize direction and scale by new speedFactor
        const currentSpeed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        if(currentSpeed > 0) {
             this.vx = (this.vx / currentSpeed) * speedFactor;
             this.vy = (this.vy / currentSpeed) * speedFactor;
        }
    }
}

// --- Initialization ---
function init() {
    // Listeners
    inputs.n.addEventListener('input', updateParams);
    inputs.t.addEventListener('input', updateParams);
    inputs.v.addEventListener('input', updateParams);
    window.addEventListener('resize', resizeCanvas);

    // Initial setup
    resizeCanvas();
    updateParams();
    animate();
}

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
}

function updateParams() {
    // Read values
    state.n = parseFloat(inputs.n.value);
    state.T = parseFloat(inputs.t.value);
    state.V = parseFloat(inputs.v.value);

    // Update displays
    displays.n.textContent = state.n.toFixed(1) + " mol";
    displays.t.textContent = state.T.toFixed(0) + " K";
    displays.v.textContent = state.V.toFixed(2) + " m³";

    // Calculation: P = nRT / V
    // P is in Pascals (Pa)
    state.P = (state.n * R * state.T) / state.V;

    // Display Result
    // Use compact notation for large numbers
    const pPa = state.P;
    displays.pPa.textContent = new Intl.NumberFormat('en-US', { notation: "compact", maximumSignificantDigits: 4 }).format(pPa);
    
    // Convert to atm (1 atm = 101325 Pa)
    const pAtm = pPa / 101325;
    displays.pAtm.textContent = pAtm.toFixed(2);

    updateParticles();
}

function updateParticles() {
    // Number of visual particles proportional to moles (scaled)
    // Scale: 1 mol = 5 particles for visual clarity (min 5, max 500)
    const targetCount = Math.floor(state.n * 3);
    
    // If we have too few, add. If too many, remove.
    if (state.particles.length < targetCount) {
        for (let i = state.particles.length; i < targetCount; i++) {
            // Spawn inside current container dimensions
            // To be safe, spawn in center
            state.particles.push(new Particle(100, 100, 1)); 
        }
    } else if (state.particles.length > targetCount) {
        state.particles.splice(targetCount);
    }
}

// --- Animation Loop ---
function animate() {
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);

    // --- Draw Container ---
    // The visual volume changes height based on V input.
    // Map V range [0.1, 10] to [10% height, 90% height]
    const minH = h * 0.1;
    const maxH = h * 0.9;
    
    // Normalize V (0.1 to 10)
    const vNorm = (state.V - 0.1) / (10 - 0.1);
    const containerH = minH + vNorm * (maxH - minH);
    
    const containerW = w * 0.6; // 60% width
    const containerX = (w - containerW) / 2;
    const containerY = h - 20; // Bottom margin

    // Draw Walls (U shape)
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(containerX, containerY - maxH); // Top Left max ext
    ctx.lineTo(containerX, containerY);       // Bottom Left
    ctx.lineTo(containerX + containerW, containerY); // Bottom Right
    ctx.lineTo(containerX + containerW, containerY - maxH); // Top Right max ext
    ctx.stroke();

    // Fill Gas Area
    // The "Piston" is at (containerY - containerH)
    const gasTop = containerY - containerH;
    
    // Temp Color Tint
    // Cold (200K) -> Blueish, Hot (1200K) -> Reddish
    const tNorm = (state.T - 200) / 1000;
    const r = Math.floor(tNorm * 255);
    const b = Math.floor((1 - tNorm) * 255);
    ctx.fillStyle = `rgba(${r}, 100, ${b}, 0.1)`;
    ctx.fillRect(containerX, gasTop, containerW, containerH);

    // Draw Piston Head
    ctx.fillStyle = "#9e9e9e";
    ctx.fillRect(containerX + 2, gasTop - 15, containerW - 4, 15);
    // Piston Rod
    ctx.fillStyle = "#bdbdbd";
    ctx.fillRect(containerX + containerW/2 - 10, gasTop - 15, 20, -1000); // extends up

    // --- Animate Particles ---
    // Speed factor: proportional to sqrt(T)
    // T=200 -> sqrt(200)=14.1. T=1200 -> sqrt(1200)=34.6
    // Map to pixel speed roughly 2 to 10
    const speed = Math.sqrt(state.T) * 0.3;
    
    ctx.fillStyle = `rgb(${r}, 50, ${b})`;
    
    state.particles.forEach(p => {
        // Update logic needs local container dimensions
        p.update(containerW, containerH, speed);
        
        // Draw (translate to container space)
        ctx.beginPath();
        ctx.arc(containerX + p.x, gasTop + p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // --- Draw Arrows on Piston (Pressure) ---
    // Visual indicator of pressure pushing up
    // Number/Size of arrows based on P
    const pLog = Math.log10(state.P); // Range roughly 3 to 7
    const arrowCount = Math.max(1, Math.floor(pLog)); 
    
    ctx.fillStyle = "#e53935";
    const arrowSpacing = containerW / (arrowCount + 1);
    
    for(let i=1; i<=arrowCount; i++) {
        const ax = containerX + i*arrowSpacing;
        const ay = gasTop - 20;
        
        // Draw upward arrow
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 5, ay + 10);
        ctx.lineTo(ax + 5, ay + 10);
        ctx.fill();
    }

    requestAnimationFrame(animate);
}

// Start
init();