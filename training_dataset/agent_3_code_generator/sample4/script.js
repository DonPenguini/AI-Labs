/**
 * S04: Logistic Growth Simulation
 * Domain: Biology / Ecology
 * Description: Interactive simulation of population dynamics approaching carrying capacity.
 */

// --- Configuration ---
const CANVAS_SIZE = 400; // Petri dish canvas size
const GRAPH_WIDTH = 400;
const GRAPH_HEIGHT = 200;
const MAX_PARTICLES = 1500; // Cap visual particles for performance

// --- State Management ---
const state = {
    K: 1000,      // Carrying Capacity
    r: 0.8,       // Growth Rate
    P0: 50,       // Initial Population
    t: 0,         // Time
    running: true,
    history: [],  // Data history for graphing
    particles: [] // Visual particles {x, y, v}
};

// --- DOM Elements ---
const dom = {
    canvas: document.getElementById('petriCanvas'),
    graph: document.getElementById('graphCanvas'),
    
    // Sliders
    sliderK: document.getElementById('slider-K'),
    sliderR: document.getElementById('slider-r'),
    sliderP0: document.getElementById('slider-P0'),
    
    // Values
    valK: document.getElementById('val-K'),
    valR: document.getElementById('val-r'),
    valP0: document.getElementById('val-P0'),
    
    // Outputs
    outT: document.getElementById('out-t'),
    outP: document.getElementById('out-P'),
    outDP: document.getElementById('out-dPdt'),
    
    // Buttons
    btnReset: document.getElementById('btn-reset'),
    btnPause: document.getElementById('btn-pause')
};

const ctx = dom.canvas.getContext('2d');
const graphCtx = dom.graph.getContext('2d');

// --- Physics / Math Engine ---

function calculatePopulation(t) {
    // Closed form solution: P(t) = K / (1 + ((K - P0)/P0) * exp(-rt))
    const numerator = state.K;
    const A = (state.K - state.P0) / state.P0;
    const denominator = 1 + A * Math.exp(-state.r * t);
    return numerator / denominator;
}

function calculateRate(P) {
    // dP/dt = rP(1 - P/K)
    return state.r * P * (1 - P / state.K);
}

// --- Particle System (Visuals) ---

function initParticles() {
    state.particles = [];
    // Only spawn particles up to current P (or MAX_PARTICLES)
    updateParticleCount(state.P0);
}

function updateParticleCount(currentP) {
    const targetCount = Math.min(Math.floor(currentP), MAX_PARTICLES);
    const center = CANVAS_SIZE / 2;
    const radius = (CANVAS_SIZE / 2) - 10; // Stay inside dish

    // Add particles if needed
    while (state.particles.length < targetCount) {
        // Random position within circle
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius; // Uniform distribution in circle
        
        state.particles.push({
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
            vx: (Math.random() - 0.5) * 0.5, // Tiny jitter movement
            vy: (Math.random() - 0.5) * 0.5
        });
    }

    // Remove particles if population dropped (e.g. user lowered K/P0)
    if (state.particles.length > targetCount) {
        state.particles.length = targetCount;
    }
}

function drawPetriDish() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    // Particles
    ctx.fillStyle = '#27ae60';
    for (let p of state.particles) {
        // Jitter
        p.x += (Math.random() - 0.5);
        p.y += (Math.random() - 0.5);

        // Draw Dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// --- Graphing ---

function drawGraph() {
    graphCtx.clearRect(0, 0, GRAPH_WIDTH, GRAPH_HEIGHT);

    // Draw Axes
    graphCtx.strokeStyle = '#ccc';
    graphCtx.beginPath();
    graphCtx.moveTo(40, 10);
    graphCtx.lineTo(40, GRAPH_HEIGHT - 20); // Y axis
    graphCtx.lineTo(GRAPH_WIDTH - 10, GRAPH_HEIGHT - 20); // X axis
    graphCtx.stroke();

    // Draw K Line (Dashed)
    const kY = (GRAPH_HEIGHT - 20) - (state.K / 2000) * (GRAPH_HEIGHT - 40); 
    // Scaling: Max K is 2000 on slider, so we map 0-2000 to graph height
    
    if (kY > 0) {
        graphCtx.setLineDash([5, 5]);
        graphCtx.strokeStyle = '#e74c3c';
        graphCtx.beginPath();
        graphCtx.moveTo(40, kY);
        graphCtx.lineTo(GRAPH_WIDTH - 10, kY);
        graphCtx.stroke();
        graphCtx.setLineDash([]);
        
        // Label K
        graphCtx.fillStyle = '#e74c3c';
        graphCtx.font = '10px sans-serif';
        graphCtx.fillText('K', 25, kY + 3);
    }

    if (state.history.length < 2) return;

    // Plot Curve
    graphCtx.strokeStyle = '#27ae60';
    graphCtx.lineWidth = 2;
    graphCtx.beginPath();

    const maxTime = Math.max(10, state.history[state.history.length-1].t);
    
    // Map function
    const mapX = (t) => 40 + (t / maxTime) * (GRAPH_WIDTH - 60);
    const mapY = (p) => (GRAPH_HEIGHT - 20) - (p / 2000) * (GRAPH_HEIGHT - 40);

    let first = true;
    for (let point of state.history) {
        const x = mapX(point.t);
        const y = mapY(point.p);
        
        if (first) {
            graphCtx.moveTo(x, y);
            first = false;
        } else {
            graphCtx.lineTo(x, y);
        }
    }
    graphCtx.stroke();
}

// --- Main Loop ---

let lastTime = 0;
function animate(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (state.running) {
        state.t += dt; // Real-time
        
        const currentP = calculatePopulation(state.t);
        const rate = calculateRate(currentP);

        // Update Data
        state.history.push({ t: state.t, p: currentP });
        
        // Update Particles (every few frames to save performance if needed, but per-frame is smoother)
        updateParticleCount(currentP);

        // DOM Updates
        dom.outT.textContent = state.t.toFixed(2);
        dom.outP.textContent = Math.floor(currentP);
        dom.outDP.textContent = rate.toFixed(2);
    }

    drawPetriDish();
    drawGraph();

    requestAnimationFrame(animate);
}

// --- Event Listeners ---

function updateInputs() {
    state.K = parseFloat(dom.sliderK.value);
    state.r = parseFloat(dom.sliderR.value);
    
    // Changing P0 usually requires a reset to make sense mathematically on the graph
    // But for interactivity, we can just update the variable. 
    // Note: If t > 0, changing P0 shifts the whole curve.
    state.P0 = parseFloat(dom.sliderP0.value);

    // Update Labels
    dom.valK.textContent = state.K;
    dom.valR.textContent = state.r;
    dom.valP0.textContent = state.P0;
}

[dom.sliderK, dom.sliderR, dom.sliderP0].forEach(el => {
    el.addEventListener('input', () => {
        updateInputs();
        // Recalculate whole history based on new params to keep graph consistent?
        // Or just let it evolve? Let's reset history on param change for clarity.
        state.t = 0;
        state.history = [];
        initParticles();
    });
});

dom.btnReset.addEventListener('click', () => {
    state.t = 0;
    state.history = [];
    initParticles();
    state.running = true;
    dom.btnPause.textContent = "Pause";
});

dom.btnPause.addEventListener('click', () => {
    state.running = !state.running;
    dom.btnPause.textContent = state.running ? "Pause" : "Resume";
});

// Init
updateInputs();
initParticles();
requestAnimationFrame(animate);