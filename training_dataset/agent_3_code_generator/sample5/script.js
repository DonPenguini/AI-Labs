/**
 * S05: SIR Epidemic Simulation
 * Domain: Biology / Epidemiology
 * Model: Deterministic Compartmental Model (ODE)
 */

// --- Configuration ---
const COLORS = {
    S: '#3498db', // Blue
    I: '#e74c3c', // Red
    R: '#7f8c8d'  // Gray
};

const SIM_OPTS = {
    particleCount: 400, // Number of visual dots (representative sample)
    graphMaxTime: 20,   // Seconds (width of graph)
    dt: 0.05            // Time step for ODE solver
};

// --- State Management ---
let state = {
    // Parameters
    N: 2000,
    beta: 1.5,
    gamma: 0.3,
    I0: 10,
    R0: 0,
    
    // Variables
    S: 0,
    I: 0,
    R: 0,
    t: 0,
    
    running: true,
    history: [],   // {t, S, I, R}
    particles: []  // {x, y, vx, vy, status}
};

// --- DOM Elements ---
const canvasPop = document.getElementById('popCanvas');
const ctxPop = canvasPop.getContext('2d');
const canvasGraph = document.getElementById('graphCanvas');
const ctxGraph = canvasGraph.getContext('2d');

const ui = {
    sliders: {
        N: document.getElementById('slider-N'),
        beta: document.getElementById('slider-beta'),
        gamma: document.getElementById('slider-gamma'),
        I0: document.getElementById('slider-I0')
    },
    vals: {
        N: document.getElementById('val-N'),
        beta: document.getElementById('val-beta'),
        gamma: document.getElementById('val-gamma'),
        I0: document.getElementById('val-I0')
    },
    out: {
        t: document.getElementById('out-t'),
        S: document.getElementById('out-S'),
        I: document.getElementById('out-I'),
        R: document.getElementById('out-R'),
        R0: document.getElementById('out-R0')
    },
    btn: {
        restart: document.getElementById('btn-restart'),
        pause: document.getElementById('btn-pause')
    }
};

// --- Physics / Math Engine ---

function initSimulation() {
    // Set Initial Conditions
    state.t = 0;
    state.I = state.I0;
    state.R = state.R0;
    state.S = state.N - state.I - state.R;
    state.history = [];
    
    initParticles();
    state.running = true;
    ui.btn.pause.textContent = "Pause";
    
    // Clear history to start graph fresh
    state.history.push({ t: 0, S: state.S, I: state.I, R: state.R });
}

function solveODE() {
    // Differential Equations
    // dS/dt = -beta * S * I / N
    // dI/dt = (beta * S * I / N) - (gamma * I)
    // dR/dt = gamma * I

    const { N, beta, gamma, S, I, R } = state;

    const dS = (-beta * S * I / N) * SIM_OPTS.dt;
    const dI = ((beta * S * I / N) - (gamma * I)) * SIM_OPTS.dt;
    const dR = (gamma * I) * SIM_OPTS.dt;

    // Euler Integration
    state.S += dS;
    state.I += dI;
    state.R += dR;
    state.t += SIM_OPTS.dt;

    // Constraints / Floating point cleanup
    if (state.S < 0) state.S = 0;
    if (state.I < 0) state.I = 0;
    if (state.R > state.N) state.R = state.N;

    // Store history
    state.history.push({
        t: state.t,
        S: state.S,
        I: state.I,
        R: state.R
    });

    // Prune history for scrolling effect if needed (optional)
    if (state.history.length > 500) {
        // We can shift() here if we want a scrolling window, 
        // but for SIR, seeing the whole curve is usually better.
        // We will scale the X-axis instead in drawGraph.
    }
}

// --- Particle Visualization (Representative Sample) ---

function initParticles() {
    state.particles = [];
    const w = canvasPop.width;
    const h = canvasPop.height;

    for (let i = 0; i < SIM_OPTS.particleCount; i++) {
        state.particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            status: 'S' // Default
        });
    }
    updateParticleStatuses();
}

function updateParticleStatuses() {
    // The ODE runs on exact numbers N. The visual particles are just a sample size (e.g. 400).
    // We update the statuses of the particles to statistically match the S/I/R ratios.
    
    const totalP = SIM_OPTS.particleCount;
    const countS = Math.floor((state.S / state.N) * totalP);
    const countI = Math.floor((state.I / state.N) * totalP);
    const countR = totalP - countS - countI; // Remainder

    let current = 0;
    
    // Assign S
    for(let i=0; i<countS; i++) state.particles[current++].status = 'S';
    // Assign I
    for(let i=0; i<countI; i++) state.particles[current++].status = 'I';
    // Assign R
    while(current < totalP) state.particles[current++].status = 'R';

    // Shuffle array slightly so colors don't band together artificially (optional, but looks better)
    // Actually, simple sorting by status makes it look like they cluster, which is confusing.
    // Ideally, we don't change the *identity* of the particle, just the color. 
    // But since this is a "Homogeneous Mixing" model (soup), spatial position doesn't matter for infection logic.
    // To make it look natural, we just re-assign colors.
    
    // Fisher-Yates shuffle to randomize WHO is infected visually
    for (let i = state.particles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tempStatus = state.particles[i].status;
        state.particles[i].status = state.particles[j].status;
        state.particles[j].status = tempStatus;
    }
}

function drawParticles() {
    ctxPop.clearRect(0, 0, canvasPop.width, canvasPop.height);
    
    for (let p of state.particles) {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce
        if (p.x < 0 || p.x > canvasPop.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvasPop.height) p.vy *= -1;

        // Draw
        ctxPop.fillStyle = COLORS[p.status];
        ctxPop.beginPath();
        ctxPop.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctxPop.fill();
    }
}

// --- Graph Visualization ---

function drawGraph() {
    const w = canvasGraph.width;
    const h = canvasGraph.height;
    ctxGraph.clearRect(0, 0, w, h);

    if (state.history.length === 0) return;

    // Scales
    // Max Time: Either fixed window (20s) or dynamic if simulation runs longer
    const maxT = Math.max(SIM_OPTS.graphMaxTime, state.t);
    const maxPop = state.N;

    const mapX = (t) => (t / maxT) * w;
    const mapY = (val) => h - (val / maxPop) * h;

    // Helper to draw a line
    function drawLine(key, color) {
        ctxGraph.strokeStyle = color;
        ctxGraph.lineWidth = 2;
        ctxGraph.beginPath();
        ctxGraph.moveTo(mapX(state.history[0].t), mapY(state.history[0][key]));
        
        // Downsample for performance if history is huge
        const step = Math.ceil(state.history.length / w); 
        
        for (let i = 0; i < state.history.length; i+=step) {
            const p = state.history[i];
            ctxGraph.lineTo(mapX(p.t), mapY(p[key]));
        }
        // Ensure last point is drawn
        const last = state.history[state.history.length-1];
        ctxGraph.lineTo(mapX(last.t), mapY(last[key]));
        ctxGraph.stroke();
    }

    drawLine('S', COLORS.S);
    drawLine('I', COLORS.I);
    drawLine('R', COLORS.R);
}

// --- Main Loop ---

let lastTime = 0;

function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;

    // Cap animation speed (visuals) but run math at fixed steps
    if (state.running) {
        // Run ODE math
        solveODE();
        
        // Stop automatically if I drops to near zero (epidemic over)
        if (state.I < 0.5 && state.t > 2) {
            state.running = false;
            ui.btn.pause.textContent = "Finished";
        }
    }

    drawParticles(); // This does movement
    
    // Only update particle colors occasionally or every frame?
    // Every frame is fine for 400 particles.
    if (state.running) updateParticleStatuses(); 

    drawGraph();
    updateUI();

    lastTime = timestamp;
    requestAnimationFrame(animate);
}

function updateUI() {
    ui.out.t.textContent = state.t.toFixed(1);
    ui.out.S.textContent = Math.round(state.S);
    ui.out.I.textContent = Math.round(state.I);
    ui.out.R.textContent = Math.round(state.R);
    
    const r0 = state.beta / state.gamma;
    ui.out.R0.textContent = r0.toFixed(2);
    ui.out.R0.style.color = r0 > 1 ? '#c0392b' : '#27ae60';
}

// --- Event Listeners ---

function updateParams() {
    state.N = parseInt(ui.sliders.N.value);
    state.beta = parseFloat(ui.sliders.beta.value);
    state.gamma = parseFloat(ui.sliders.gamma.value);
    state.I0 = parseInt(ui.sliders.I0.value);

    ui.vals.N.textContent = state.N;
    ui.vals.beta.textContent = state.beta.toFixed(1);
    ui.vals.gamma.textContent = state.gamma.toFixed(2);
    ui.vals.I0.textContent = state.I0;
}

// Attach listeners
Object.values(ui.sliders).forEach(s => s.addEventListener('input', updateParams));

ui.btn.restart.addEventListener('click', initSimulation);

ui.btn.pause.addEventListener('click', () => {
    state.running = !state.running;
    ui.btn.pause.textContent = state.running ? "Pause" : "Resume";
});

// Init
updateParams();
initSimulation();
requestAnimationFrame(animate);