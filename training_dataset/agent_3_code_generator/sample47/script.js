// --- State & Config ---
const APP = {
    // Physical Parameters
    area: 10.0,
    dt: 60.0,
    layers: [
        { id: 1, L: 0.2, k: 230, name: "Aluminum" }, // High k
        { id: 2, L: 0.15, k: 0.04, name: "Insulation" }, // Very low k
        { id: 3, L: 0.3, k: 1.5, name: "Concrete" }    // Medium k
    ],
    
    // Animation State
    particles: [],
    lastTime: 0
};

// --- DOM Elements ---
const els = {
    areaIn: document.getElementById('input-area'),
    areaVal: document.getElementById('val-area'),
    dtIn: document.getElementById('input-dt'),
    dtVal: document.getElementById('val-dt'),
    layerContainer: document.getElementById('layers-container'),
    btnAdd: document.getElementById('btn-add'),
    btnRemove: document.getElementById('btn-remove'),
    outR: document.getElementById('out-R'),
    outQ: document.getElementById('out-Q'),
    outU: document.getElementById('out-U'),
    canvas: document.getElementById('mainCanvas')
};

const ctx = els.canvas.getContext('2d');

// --- Physics Engine ---
function calculate() {
    let R_total = 0;
    
    // 1. Calculate Resistance per layer
    APP.layers.forEach(l => {
        l.R = l.L / (l.k * APP.area);
        R_total += l.R;
    });

    // 2. Calculate Flux (Q)
    // Ohm's Law for Heat: Q = dT / R_total
    const Q = APP.dt / R_total;

    // 3. Calculate U
    const U = 1 / (R_total * APP.area);

    // 4. Calculate Interface Temperatures (for visualization)
    // T_drop_layer = Q * R_layer
    // But we work in relative terms (0.0 to 1.0) for drawing
    let currentRelTemp = 1.0; // Start at Hot (100%)
    
    APP.layers.forEach(l => {
        l.tempStart = currentRelTemp;
        const tempDropRatio = l.R / R_total;
        l.tempEnd = currentRelTemp - tempDropRatio;
        currentRelTemp = l.tempEnd;
    });

    return { R_total, Q, U };
}

// --- Interaction Handlers ---
function init() {
    renderLayerInputs();
    setupListeners();
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(loop);
}

function setupListeners() {
    // Global inputs
    els.areaIn.addEventListener('input', e => {
        APP.area = parseFloat(e.target.value);
        els.areaVal.innerText = APP.area;
    });
    
    els.dtIn.addEventListener('input', e => {
        APP.dt = parseFloat(e.target.value);
        els.dtVal.innerText = APP.dt;
    });

    // Layer buttons
    els.btnAdd.addEventListener('click', () => {
        if(APP.layers.length < 6) {
            APP.layers.push({ id: Date.now(), L: 0.1, k: 50, name: "Generic" });
            renderLayerInputs();
        }
    });

    els.btnRemove.addEventListener('click', () => {
        if(APP.layers.length > 1) {
            APP.layers.pop();
            renderLayerInputs();
        }
    });
}

function renderLayerInputs() {
    els.layerContainer.innerHTML = '';
    
    APP.layers.forEach((layer, idx) => {
        const div = document.createElement('div');
        div.className = 'layer-card';
        // Assign a color bar based on k roughly to help ID
        const hue = layer.k > 100 ? '#ff7675' : (layer.k < 1 ? '#fdcb6e' : '#636e72');
        div.style.borderLeftColor = hue;

        div.innerHTML = `
            <div class="layer-title">Layer ${idx + 1}</div>
            <div class="control-row">
                <label>Thickness ($L$): <span>${layer.L.toFixed(2)}</span>m</label>
                <input type="range" min="0.01" max="0.5" step="0.01" value="${layer.L}" 
                       data-idx="${idx}" data-prop="L">
            </div>
            <div class="control-row">
                <label>Conductivity ($k$): <span>${layer.k}</span> W/mK</label>
                <input type="range" min="0.05" max="300" step="0.05" value="${layer.k}" 
                       data-idx="${idx}" data-prop="k">
            </div>
        `;
        els.layerContainer.appendChild(div);
    });

    // Attach listeners to the newly created inputs
    const inputs = els.layerContainer.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const prop = e.target.dataset.prop;
            const val = parseFloat(e.target.value);
            
            APP.layers[idx][prop] = val;
            
            // Update the span text immediately
            const span = e.target.previousElementSibling.querySelector('span');
            span.innerText = prop === 'k' && val < 1 ? val.toFixed(3) : val.toFixed(2);
        });
    });
}

// --- Graphics & Animation ---

// Helper: Heat Map Color
// t is 0.0 (Cold/Blue) to 1.0 (Hot/Red)
function getHeatColor(t) {
    // Clamp
    t = Math.max(0, Math.min(1, t));
    // Simple interpolation between Blue(0,0,255) and Red(255,0,0)
    // Using a slightly nicer palette
    const r = Math.floor(t * 255);
    const b = Math.floor((1 - t) * 255);
    const g = 50; // slight grey boost
    return `rgb(${r}, ${g}, ${b})`;
}

function resize() {
    const parent = els.canvas.parentElement;
    els.canvas.width = parent.clientWidth;
    els.canvas.height = parent.clientHeight;
}

function updateParticles(Q, wallLeft, wallWidth, wallY, wallHeight) {
    // Determine particle count and speed based on Q
    // Q can range from ~1 to ~100,000. Log scale fits best visually.
    const activityLevel = Math.log10(Q + 1); // 0 to ~5
    
    // Target particle count
    const maxParticles = 150;
    const targetCount = Math.min(maxParticles, Math.floor(activityLevel * 25));
    
    // Speed (pixels per frame approx)
    const speed = 2 + (activityLevel * 1.5); 

    // Spawning
    if (APP.particles.length < targetCount) {
        APP.particles.push({
            x: wallLeft + Math.random() * wallWidth, // Spawn anywhere in wall for smooth look
            y: wallY + Math.random() * wallHeight,
            vx: speed
        });
    } else if (APP.particles.length > targetCount) {
        APP.particles.pop();
    }

    // Moving
    for(let i=0; i<APP.particles.length; i++) {
        let p = APP.particles[i];
        p.vx = speed; // Update speed if Q changed
        p.x += p.vx;
        
        // Wrap around
        if(p.x > wallLeft + wallWidth) {
            p.x = wallLeft;
            p.y = wallY + Math.random() * wallHeight;
        }
    }
}

function draw(physics) {
    const w = els.canvas.width;
    const h = els.canvas.height;
    
    ctx.clearRect(0,0,w,h);

    // Layout
    const marginX = 50;
    const wallHeight = h * 0.5;
    const wallY = (h - wallHeight) / 2;
    const drawWidth = w - (marginX * 2);
    
    const totalPhysicalL = APP.layers.reduce((sum, l) => sum + l.L, 0);
    const scale = drawWidth / totalPhysicalL; // Pixels per meter

    let curX = marginX;

    // --- 1. Draw Layers with Gradient (The "How layers affect it" part) ---
    APP.layers.forEach(l => {
        const layerW = l.L * scale;
        
        // Create Gradient based on Temp Drop
        // This visualizes the insulator vs conductor concept perfectly
        const grad = ctx.createLinearGradient(curX, 0, curX + layerW, 0);
        grad.addColorStop(0, getHeatColor(l.tempStart));
        grad.addColorStop(1, getHeatColor(l.tempEnd));
        
        ctx.fillStyle = grad;
        ctx.fillRect(curX, wallY, layerW, wallHeight);
        
        // Border
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(curX, wallY, layerW, wallHeight);

        // Text Label
        if (layerW > 50) {
            ctx.fillStyle = "white";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 4;
            ctx.font = "12px sans-serif";
            ctx.fillText(`k=${l.k}`, curX + 5, wallY + 20);
            ctx.shadowBlur = 0;
        }

        curX += layerW;
    });

    // --- 2. Draw Particles (Heat Flux) ---
    updateParticles(physics.Q, marginX, drawWidth, wallY, wallHeight);
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    APP.particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
        ctx.fill();
    });

    // --- 3. Draw Temperature Graph (Overlay) ---
    const graphTop = wallY - 40;
    const graphBottom = wallY + wallHeight + 40;
    const graphH = graphBottom - graphTop;

    ctx.beginPath();
    ctx.strokeStyle = "#2d3436";
    ctx.lineWidth = 3;

    curX = marginX;
    
    // Draw lines
    APP.layers.forEach((l, i) => {
        const layerW = l.L * scale;
        
        // Map relative temp (0-1) to Y position
        // 1.0 (Hot) is at graphTop
        // 0.0 (Cold) is at graphBottom
        const yStart = graphBottom - (l.tempStart * graphH);
        const yEnd = graphBottom - (l.tempEnd * graphH);

        if (i === 0) ctx.moveTo(curX, yStart);
        ctx.lineTo(curX + layerW, yEnd);
        
        curX += layerW;
    });
    ctx.stroke();

    // Draw Nodes
    curX = marginX;
    const drawNode = (x, t) => {
        const y = graphBottom - (t * graphH);
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI*2);
        ctx.fillStyle = getHeatColor(t);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
    };

    // Draw first node
    drawNode(marginX, APP.layers[0].tempStart);
    
    // Draw rest
    APP.layers.forEach(l => {
        curX += l.L * scale;
        drawNode(curX, l.tempEnd);
    });
}

// --- Main Loop ---
function loop() {
    const physics = calculate();
    
    // Update text stats
    els.outR.innerText = physics.R_total.toExponential(2);
    els.outQ.innerText = physics.Q.toFixed(1);
    els.outU.innerText = physics.U.toFixed(2);

    draw(physics);
    requestAnimationFrame(loop);
}

// Start
init();