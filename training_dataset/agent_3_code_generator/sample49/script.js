// Constants
const SIGMA = 5.670374e-8; // Stefan-Boltzmann constant

// State
const state = {
    eps: 0.8,
    area: 1.0,
    ts: 800,
    tsur: 300
};

// Animation State
const particles = [];
let canvas, ctx;
let animationFrameId;

// DOM Elements
const ui = {
    inEps: document.getElementById('in-eps'),
    inArea: document.getElementById('in-area'),
    inTs: document.getElementById('in-ts'),
    inTsur: document.getElementById('in-tsur'),
    valEps: document.getElementById('val-eps'),
    valArea: document.getElementById('val-area'),
    valTs: document.getElementById('val-ts'),
    valTsur: document.getElementById('val-tsur'),
    resQ: document.getElementById('res-q'),
    resDir: document.getElementById('res-dir')
};

// Initialization
function init() {
    canvas = document.getElementById('simCanvas');
    ctx = canvas.getContext('2d');

    setupListeners();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Start loop
    loop();
}

function setupListeners() {
    const update = (key, elInput, elVal) => {
        elInput.addEventListener('input', (e) => {
            state[key] = parseFloat(e.target.value);
            elVal.textContent = state[key];
            if(key === 'ts' || key === 'tsur') elVal.textContent = Math.round(state[key]);
        });
    };

    update('eps', ui.inEps, ui.valEps);
    update('area', ui.inArea, ui.valArea);
    update('ts', ui.inTs, ui.valTs);
    update('tsur', ui.inTsur, ui.valTsur);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

// Physics Calculation
function calculatePhysics() {
    // q = eps * sigma * A * (Ts^4 - Tsur^4)
    const t4_s = Math.pow(state.ts, 4);
    const t4_sur = Math.pow(state.tsur, 4);
    const q = state.eps * SIGMA * state.area * (t4_s - t4_sur);
    
    return { q, t4_s, t4_sur };
}

function updateUI(q) {
    ui.resQ.textContent = Math.abs(q).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " W";
    ui.resQ.style.color = q > 0 ? '#ff6b6b' : (q < 0 ? '#54a0ff' : '#e0e0e0');
    
    if (Math.abs(q) < 0.1) {
        ui.resDir.textContent = "Thermal Equilibrium";
        ui.resDir.style.color = "#e0e0e0";
    } else if (q > 0) {
        ui.resDir.textContent = "Net Flow: Surface → Surroundings (Cooling)";
        ui.resDir.style.color = "#ff6b6b";
    } else {
        ui.resDir.textContent = "Net Flow: Surroundings → Surface (Heating)";
        ui.resDir.style.color = "#54a0ff";
    }
}

// Helper: Color Temperature Approximation
function getTempColor(kelvin) {
    // Simple interpolation for visualization
    // 200K (Blue/Dim) -> 1200K (Red/Orange/White)
    if (kelvin < 300) return `rgba(50, 50, 150, ${0.3 + (kelvin/1000)})`;
    if (kelvin < 600) return `rgba(100, 100, 255, 0.8)`;
    if (kelvin < 800) return `rgba(200, 50, 50, 0.9)`;
    if (kelvin < 1000) return `rgba(255, 100, 50, 1)`;
    return `rgba(255, 200, 150, 1)`; // Hot glowing
}

function getGlowColor(kelvin) {
    if (kelvin < 500) return "rgba(0, 100, 255, 0.2)";
    return "rgba(255, 100, 0, 0.4)";
}

// Animation Logic
function spawnParticles(t4_s, t4_sur) {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = 30 + (Math.sqrt(state.area) * 30); // Visual radius

    // Spawn Outgoing (Emission)
    // Probability scaled by Temp^4 and Emissivity
    // We take log or scale down significantly because T^4 is huge
    const emissionRate = (t4_s * state.eps) / 3e10; 
    const absorptionRate = (t4_sur * state.eps) / 3e10; // Kirchhoff's law: absorptivity = emissivity

    // Spawn Outgoing
    const numOut = Math.floor(emissionRate) + (Math.random() < (emissionRate % 1) ? 1 : 0);
    for(let i=0; i<numOut; i++) {
        const angle = Math.random() * Math.PI * 2;
        particles.push({
            type: 'out',
            x: cx + Math.cos(angle) * radius,
            y: cy + Math.sin(angle) * radius,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 100,
            color: getTempColor(state.ts)
        });
    }

    // Spawn Incoming (Absorption)
    // Spawn from edge of canvas moving inward
    const numIn = Math.floor(absorptionRate) + (Math.random() < (absorptionRate % 1) ? 1 : 0);
    for(let i=0; i<numIn; i++) {
        // Random point on edge
        let ex, ey;
        if(Math.random() > 0.5) {
            ex = Math.random() * canvas.width;
            ey = Math.random() > 0.5 ? 0 : canvas.height;
        } else {
            ex = Math.random() > 0.5 ? 0 : canvas.width;
            ey = Math.random() * canvas.height;
        }

        // Calculate velocity vector towards center
        const angle = Math.atan2(cy - ey, cx - ex);
        
        particles.push({
            type: 'in',
            x: ex,
            y: ey,
            vx: Math.cos(angle) * 3,
            vy: Math.sin(angle) * 3,
            life: 200, // Longer life to reach center
            color: getTempColor(state.tsur)
        });
    }
}

function draw() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    // Clear with a fade effect for trails (optional, but clean clear is better for physics sim)
    // Draw Background representing surroundings
    ctx.fillStyle = getTempColor(state.tsur); 
    // We darken the background color significantly so particles pop
    ctx.fillStyle = `rgba(10, 10, 15, 1)`; // Keep background dark
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle background glow based on T_sur
    const bgGrad = ctx.createRadialGradient(cx, cy, canvas.width/4, cx, cy, canvas.width);
    bgGrad.addColorStop(0, "rgba(0,0,0,0)");
    bgGrad.addColorStop(1, getGlowColor(state.tsur));
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0,0, canvas.width, canvas.height);

    // Draw Object
    const radius = 30 + (Math.sqrt(state.area) * 30);
    
    // Object Glow
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 2);
    glow.addColorStop(0, getTempColor(state.ts));
    glow.addColorStop(1, "rgba(0,0,0,0)");
    
    ctx.globalCompositeOperation = 'screen'; // Make light additive
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Solid Object Body
    ctx.fillStyle = "#000"; // Base
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Fill with Emissivity hint (lower emissivity = more reflective/shiny, but here we just show temp color opacity)
    ctx.fillStyle = getTempColor(state.ts);
    ctx.globalAlpha = state.eps; // Visualize emissivity as surface intensity
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Stroke
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Update & Draw Particles
    for(let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        // Distance to center
        const dist = Math.hypot(p.x - cx, p.y - cy);

        // Check collisions
        if (p.type === 'in' && dist < radius) {
            // Absorbed
            particles.splice(i, 1);
            continue;
        }
        if (p.type === 'out' && (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height)) {
            // Left surroundings
            particles.splice(i, 1);
            continue;
        }

        // Draw Particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.type === 'out' ? 3 : 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }

    // Limit particle count for performance
    if(particles.length > 500) particles.splice(0, particles.length - 500);
}

function loop() {
    const { q, t4_s, t4_sur } = calculatePhysics();
    updateUI(q);
    spawnParticles(t4_s, t4_sur);
    draw();
    animationFrameId = requestAnimationFrame(loop);
}

// Start
init();