// Constants
const R = 8.314; // J/(mol*K)

// DOM Elements
const inputs = {
    n: document.getElementById('amount'),
    T: document.getElementById('temperature'),
    v1: document.getElementById('v1'),
    v2: document.getElementById('v2')
};

const displays = {
    n: document.getElementById('amount-val'),
    T: document.getElementById('temp-val'),
    v1: document.getElementById('v1-val'),
    v2: document.getElementById('v2-val'),
    w: document.getElementById('work-output')
};

const piston = document.getElementById('piston');
const particlesContainer = document.getElementById('particles');
const canvas = document.getElementById('pv-graph');
const ctx = canvas.getContext('2d');
const animateBtn = document.getElementById('animate-btn');

// State
let state = {
    n: parseFloat(inputs.n.value),
    T: parseFloat(inputs.T.value),
    v1: parseFloat(inputs.v1.value),
    v2: parseFloat(inputs.v2.value),
    currentV: parseFloat(inputs.v1.value)
};

let isAnimating = false;
let particles = [];

function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
    drawGraph();
}
window.addEventListener('resize', resizeCanvas);

// --- Particles Logic ---
function initParticles() {
    particles = [];
    for(let i=0; i<30; i++) {
        particles.push({
            x: Math.random() * 100, 
            y: Math.random() * 100, 
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5
        });
    }
}

function updateParticles() {
    const speedFactor = (state.T / 300) * 0.8;
    
    particles.forEach(p => {
        p.x += p.vx * speedFactor;
        p.y += p.vy * speedFactor;

        // Bounce horizontally
        if (p.x <= 0 || p.x >= 100) p.vx *= -1;
        
        // Bounce vertically
        // Since the particle container RESIZES with volume, 
        // 0% is always the piston face and 100% is always the bottom.
        if (p.y <= 0 || p.y >= 100) p.vy *= -1;
    });

    // Render
    particlesContainer.innerHTML = '';
    particles.forEach(p => {
        const div = document.createElement('div');
        div.className = 'particle';
        div.style.left = `${p.x}%`;
        div.style.top = `${p.y}%`;
        const hue = Math.max(0, 240 - (state.T - 250) * (240/450)); 
        div.style.backgroundColor = `hsl(${hue}, 70%, 50%)`;
        particlesContainer.appendChild(div);
    });
}

// --- Physics & Visualization Logic ---

function calculateWork() {
    if (state.v1 <= 0) return 0;
    const work = state.n * R * state.T * Math.log(state.v2 / state.v1);
    return work;
}

function updatePiston(vol) {
    const maxV = 5.0;
    // Calculate percentage height of the GAS
    const percentage = (vol / maxV) * 100;
    const clampedPct = Math.max(0, Math.min(100, percentage));
    
    // 1. Move the Piston
    // The piston 'top' corresponds to the empty space above the gas.
    piston.style.top = `${100 - clampedPct}%`;
    
    // 2. Resize the Gas Container
    // This physically traps the particles between bottom (100%) and piston (0% of this div)
    particlesContainer.style.height = `${clampedPct}%`;
    
    // Update Gas color/opacity
    const hue = Math.max(0, 240 - (state.T - 250) * (240/450));
    particlesContainer.style.backgroundColor = `hsla(${hue}, 70%, 90%, 0.3)`;
}

function drawGraph() {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = 40;
    const graphW = width - 2 * padding;
    const graphH = height - 2 * padding;

    // Fixed Scales for stability
    const yMax = (10 * R * 700) / 0.5; // Max plausible P
    const xMax = 5.5;

    function mapX(v) { return padding + (v / xMax) * graphW; }
    function mapY(p) { return (height - padding) - (p / yMax) * graphH; }

    // Axes
    ctx.beginPath();
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText("Pressure (P)", padding + 10, padding + 10);
    ctx.fillText("Volume (V)", width - padding - 60, height - padding - 10);

    // Isotherm Curve
    ctx.beginPath();
    ctx.strokeStyle = '#007BFF';
    ctx.lineWidth = 2;
    
    let startV = 0.1;
    for (let v = startV; v <= 5.0; v += 0.05) {
        const p = (state.n * R * state.T) / v;
        const x = mapX(v);
        const y = mapY(p);
        if (v === startV) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Area Fill
    const endFillV = isAnimating ? state.currentV : state.v2;
    const lower = Math.min(state.v1, endFillV);
    const upper = Math.max(state.v1, endFillV);
    
    if (upper > lower) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 123, 255, 0.3)';
        for (let v = lower; v <= upper; v += 0.05) {
            const p = (state.n * R * state.T) / v;
            ctx.lineTo(mapX(v), mapY(p));
        }
        ctx.lineTo(mapX(upper), mapY(0)); 
        ctx.lineTo(mapX(lower), mapY(0));
        const pStart = (state.n * R * state.T) / lower;
        ctx.lineTo(mapX(lower), mapY(pStart));
        ctx.fill();
    }
    
    function drawPoint(v, label, color) {
        const p = (state.n * R * state.T) / v;
        const x = mapX(v);
        const y = mapY(p);
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x, y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.fillText(label, x + 5, y - 5);
    }

    drawPoint(state.v1, 'V1', '#28a745');
    if (isAnimating) drawPoint(state.currentV, '', '#dc3545'); 
    else drawPoint(state.v2, 'V2', '#dc3545');
}

// --- Interaction ---
function updateDisplay() {
    displays.n.textContent = state.n;
    displays.T.textContent = state.T;
    displays.v1.textContent = state.v1;
    displays.v2.textContent = state.v2;
    
    const work = calculateWork();
    displays.w.textContent = work.toFixed(2);
    
    if (!isAnimating) {
        // Show V2 state when idle
        updatePiston(state.v2);
    }
    drawGraph();
}

function handleInput(e) {
    const id = e.target.id;
    const val = parseFloat(e.target.value);
    
    state[id === 'amount' ? 'n' : id === 'temperature' ? 'T' : id] = val;
    
    if (isAnimating) {
        isAnimating = false;
        cancelAnimationFrame(animationReq);
        animateBtn.disabled = false;
        animateBtn.textContent = "Play Expansion Animation";
    }
    updateDisplay();
}

Object.values(inputs).forEach(input => {
    input.addEventListener('input', handleInput);
});

// Animation Loop
let animationReq;
animateBtn.addEventListener('click', () => {
    if (isAnimating) return;
    
    isAnimating = true;
    animateBtn.disabled = true;
    animateBtn.textContent = "Simulating...";
    
    state.currentV = state.v1;
    const targetV = state.v2;
    const duration = 2000; 
    const startTime = performance.now();
    
    function step(time) {
        if (!isAnimating) return;
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out
        const ease = 1 - Math.pow(1 - progress, 3);
        state.currentV = state.v1 + (targetV - state.v1) * ease;
        
        updatePiston(state.currentV);
        drawGraph();
        
        if (progress < 1) {
            animationReq = requestAnimationFrame(step);
        } else {
            isAnimating = false;
            animateBtn.disabled = false;
            animateBtn.textContent = "Play Expansion Animation";
        }
    }
    animationReq = requestAnimationFrame(step);
});

initParticles();
setInterval(updateParticles, 50);
resizeCanvas();
updateDisplay();