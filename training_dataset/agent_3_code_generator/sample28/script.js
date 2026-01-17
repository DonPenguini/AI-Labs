// --- Configuration & State ---
const state = {
    vmax: 0.005,
    km: 0.05,
    s: 0.5,
    i: 0.0,
    ki: 0.1
};

// --- DOM Elements ---
const inputs = {
    vmax: document.getElementById('vmax'),
    km: document.getElementById('km'),
    s: document.getElementById('s-conc'),
    i: document.getElementById('i-conc'),
    ki: document.getElementById('ki')
};

const labels = {
    vmax: document.getElementById('val-vmax'),
    km: document.getElementById('val-km'),
    s: document.getElementById('val-s'),
    i: document.getElementById('val-i'),
    ki: document.getElementById('val-ki')
};

const outputRate = document.getElementById('output-rate');

// --- Initialization ---
function init() {
    // Set initial input values based on state range
    inputs.vmax.value = state.vmax;
    inputs.km.value = state.km;
    inputs.s.value = state.s;
    inputs.i.value = state.i;
    inputs.ki.value = state.ki;

    // Add listeners
    Object.keys(inputs).forEach(key => {
        inputs[key].addEventListener('input', (e) => {
            state[key] = parseFloat(e.target.value);
            update();
        });
    });

    // Start Loops
    update();
    requestAnimationFrame(animateParticles);
}

// --- Calculation Logic ---
function calculateRate(s, i, vmax, km, ki) {
    // Apparent Km = Km * (1 + I/Ki)
    const kmApp = km * (1 + (i / ki));
    return (vmax * s) / (kmApp + s);
}

// --- Main Update Function ---
function update() {
    // Update Labels
    labels.vmax.innerText = state.vmax.toFixed(4);
    labels.km.innerText = state.km.toFixed(3);
    labels.s.innerText = state.s.toFixed(2);
    labels.i.innerText = state.i.toFixed(2);
    labels.ki.innerText = state.ki.toFixed(4);

    // Calculate current Rate
    const v = calculateRate(state.s, state.i, state.vmax, state.km, state.ki);
    outputRate.innerText = v.toExponential(3);

    // Redraw Graph
    drawGraph();
}

// --- Graphing Logic ---
const graphCanvas = document.getElementById('graphCanvas');
const gCtx = graphCanvas.getContext('2d');

function drawGraph() {
    // Resize for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = graphCanvas.getBoundingClientRect();
    graphCanvas.width = rect.width * dpr;
    graphCanvas.height = rect.height * dpr;
    gCtx.scale(dpr, dpr);
    
    const w = rect.width;
    const h = rect.height;
    const padding = 40;

    gCtx.clearRect(0, 0, w, h);

    // Axes
    gCtx.beginPath();
    gCtx.strokeStyle = '#ccc';
    gCtx.lineWidth = 1;
    // Y-axis
    gCtx.moveTo(padding, 10);
    gCtx.lineTo(padding, h - padding);
    // X-axis
    gCtx.lineTo(w - 10, h - padding);
    gCtx.stroke();

    // Axis Labels
    gCtx.fillStyle = '#666';
    gCtx.font = '12px Arial';
    gCtx.fillText('[S]', w - 30, h - 10);
    gCtx.fillText('v', 10, 20);

    // Max ranges for plotting
    const maxS = 1.0; 
    const maxV = state.vmax * 1.2; // Add some headroom

    // Helper to map coordinates
    const mapX = (sVal) => padding + (sVal / maxS) * (w - padding - 20);
    const mapY = (vVal) => (h - padding) - (vVal / maxV) * (h - padding - 20);

    // 1. Draw Uninhibited Curve (Reference)
    gCtx.beginPath();
    gCtx.strokeStyle = '#aaa';
    gCtx.setLineDash([5, 5]);
    gCtx.lineWidth = 2;
    for (let s = 0; s <= maxS; s += 0.01) {
        const vRef = (state.vmax * s) / (state.km + s);
        const x = mapX(s);
        const y = mapY(vRef);
        if (s === 0) gCtx.moveTo(x, y);
        else gCtx.lineTo(x, y);
    }
    gCtx.stroke();

    // 2. Draw Inhibited Curve (Active)
    gCtx.beginPath();
    gCtx.strokeStyle = '#3498db';
    gCtx.setLineDash([]); // Solid line
    gCtx.lineWidth = 3;
    for (let s = 0; s <= maxS; s += 0.01) {
        const vAct = calculateRate(s, state.i, state.vmax, state.km, state.ki);
        const x = mapX(s);
        const y = mapY(vAct);
        if (s === 0) gCtx.moveTo(x, y);
        else gCtx.lineTo(x, y);
    }
    gCtx.stroke();

    // 3. Draw Current Point
    const currentV = calculateRate(state.s, state.i, state.vmax, state.km, state.ki);
    const cx = mapX(state.s);
    const cy = mapY(currentV);

    gCtx.beginPath();
    gCtx.fillStyle = '#e67e22';
    gCtx.arc(cx, cy, 6, 0, Math.PI * 2);
    gCtx.fill();
    gCtx.stroke(); // border
}

// --- Particle Simulation Logic ---
const simCanvas = document.getElementById('simCanvas');
const sCtx = simCanvas.getContext('2d');
let particles = [];
let enzymes = [];

// Constants for simulation
const NUM_ENZYMES = 6;
const PARTICLE_SPEED = 1;

class Enzyme {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.angle = Math.random() * Math.PI * 2;
        this.state = 'free'; // free, complex_s, complex_i
        this.timer = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Body
        ctx.beginPath();
        if (this.state === 'complex_i') ctx.fillStyle = '#c0392b'; // Blocked (Dark Red)
        else if (this.state === 'complex_s') ctx.fillStyle = '#2ecc71'; // Processing (Green)
        else ctx.fillStyle = '#3498db'; // Free (Blue)
        
        // Pacman shape
        ctx.arc(0, 0, this.radius, 0.2 * Math.PI, 1.8 * Math.PI);
        ctx.lineTo(0, 0);
        ctx.fill();

        ctx.restore();
    }

    update() {
        // Random wander
        this.angle += (Math.random() - 0.5) * 0.2;
        this.x += Math.cos(this.angle) * 0.5;
        this.y += Math.sin(this.angle) * 0.5;

        // Bounce walls
        if (this.x < 0) this.x = simCanvas.width;
        if (this.x > simCanvas.width) this.x = 0;
        if (this.y < 0) this.y = simCanvas.height;
        if (this.y > simCanvas.height) this.y = 0;

        // Handle states
        if (this.state === 'complex_s') {
            this.timer--;
            if (this.timer <= 0) {
                this.state = 'free';
                createProduct(this.x, this.y);
            }
        } else if (this.state === 'complex_i') {
            this.timer--;
            if (this.timer <= 0) this.state = 'free';
        }
    }
}

class Particle {
    constructor(type) {
        this.type = type; // 's' (substrate), 'i' (inhibitor), 'p' (product)
        this.x = Math.random() * simCanvas.width;
        this.y = Math.random() * simCanvas.height;
        this.vx = (Math.random() - 0.5) * PARTICLE_SPEED;
        this.vy = (Math.random() - 0.5) * PARTICLE_SPEED;
        this.life = 100; // only for product
    }

    draw(ctx) {
        ctx.beginPath();
        if (this.type === 's') {
            ctx.fillStyle = '#2ecc71';
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
        } else if (this.type === 'i') {
            ctx.fillStyle = '#e74c3c';
            // Triangle
            ctx.moveTo(this.x, this.y - 4);
            ctx.lineTo(this.x + 4, this.y + 4);
            ctx.lineTo(this.x - 4, this.y + 4);
        } else if (this.type === 'p') {
            ctx.fillStyle = `rgba(241, 196, 15, ${this.life/50})`;
            // Star/Sparkle approximation
            ctx.arc(this.x, this.y, 5, 0, Math.PI*2);
        }
        ctx.fill();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        // Wrap around
        if (this.x < 0) this.x = simCanvas.width;
        if (this.x > simCanvas.width) this.x = 0;
        if (this.y < 0) this.y = simCanvas.height;
        if (this.y > simCanvas.height) this.y = 0;

        if (this.type === 'p') {
            this.life--;
        }
    }
}

function createProduct(x, y) {
    const p = new Particle('p');
    p.x = x; p.y = y;
    particles.push(p);
}

// Initialize Enzymes
function initSim() {
    const rect = simCanvas.getBoundingClientRect();
    simCanvas.width = rect.width;
    simCanvas.height = rect.height;
    
    enzymes = [];
    for(let i=0; i<NUM_ENZYMES; i++) {
        enzymes.push(new Enzyme(Math.random()*rect.width, Math.random()*rect.height));
    }
}

function animateParticles() {
    const rect = simCanvas.getBoundingClientRect();
    if(simCanvas.width !== rect.width || simCanvas.height !== rect.height){
        simCanvas.width = rect.width;
        simCanvas.height = rect.height;
    }
    sCtx.clearRect(0, 0, simCanvas.width, simCanvas.height);

    // 1. Manage Particle Counts based on Sliders
    // Scale slider 0-1 to 0-50 particles
    const targetS = Math.floor(state.s * 80); 
    const targetI = Math.floor(state.i * 80);

    const currentS = particles.filter(p => p.type === 's').length;
    const currentI = particles.filter(p => p.type === 'i').length;

    // Adjust S
    if (currentS < targetS) particles.push(new Particle('s'));
    else if (currentS > targetS) {
        const idx = particles.findIndex(p => p.type === 's');
        if(idx > -1) particles.splice(idx, 1);
    }

    // Adjust I
    if (currentI < targetI) particles.push(new Particle('i'));
    else if (currentI > targetI) {
        const idx = particles.findIndex(p => p.type === 'i');
        if(idx > -1) particles.splice(idx, 1);
    }

    // 2. Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        p.draw(sCtx);
        if (p.type === 'p' && p.life <= 0) particles.splice(i, 1);
    }

    // 3. Update Enzymes & Collision Logic
    enzymes.forEach(e => {
        e.update();
        e.draw(sCtx);

        if (e.state === 'free') {
            // Check collisions
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.sqrt(dx*dx + dy*dy);

                if (dist < e.radius + 5) {
                    // Collision!
                    if (p.type === 's') {
                        // Bind Substrate
                        e.state = 'complex_s';
                        // Processing time inversely proportional to Vmax (High Vmax = fast processing)
                        // Simplified map: 0.001 -> 100 frames, 0.01 -> 10 frames
                        e.timer = Math.max(10, 1 / (state.vmax * 2000)); 
                        particles.splice(i, 1);
                        break;
                    } else if (p.type === 'i') {
                        // Bind Inhibitor
                        e.state = 'complex_i';
                        // Block time proportional to 1/Ki (Low Ki = strong binding = long time)
                        // Simplified map: Ki 0.5 -> 20 frames, Ki 0.0001 -> 200 frames
                        e.timer = Math.min(300, 10 / state.ki); 
                        particles.splice(i, 1);
                        break;
                    }
                }
            }
        }
    });

    requestAnimationFrame(animateParticles);
}

// Bootstrap
window.addEventListener('load', () => {
    init();
    initSim();
});

window.addEventListener('resize', initSim);