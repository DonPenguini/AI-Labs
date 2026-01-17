// Constants and State
const state = {
    Vmax: 0.005,
    Km: 0.05,
    S: 0.5,
    v: 0
};

// DOM Elements
const inputs = {
    vmax: document.getElementById('vmax'),
    km: document.getElementById('km'),
    substrate: document.getElementById('substrate')
};

// Map HTML IDs to State Keys (The Fix)
const inputMap = {
    vmax: 'Vmax',
    km: 'Km',
    substrate: 'S'
};

const displays = {
    vmax: document.getElementById('val-vmax'),
    km: document.getElementById('val-km'),
    substrate: document.getElementById('val-substrate'),
    v: document.getElementById('output-v')
};

const graphCanvas = document.getElementById('kineticsGraph');
const graphCtx = graphCanvas.getContext('2d');
const molCanvas = document.getElementById('moleculeCanvas');
const molCtx = molCanvas.getContext('2d');

// --- Initialization ---
function init() {
    // Event Listeners for Sliders
    Object.keys(inputs).forEach(key => {
        inputs[key].addEventListener('input', (e) => {
            const stateKey = inputMap[key]; // Get the correct state key (e.g., 'substrate' -> 'S')
            state[stateKey] = parseFloat(e.target.value);
            
            // Update the text number next to the slider
            displays[key].innerText = state[stateKey];
            
            updateSimulation();
        });
    });

    // Tab Switching logic
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`view-${btn.dataset.tab}`).classList.add('active');
            resizeCanvases();
        });
    });

    window.addEventListener('resize', resizeCanvases);
    
    // Initial Run
    resizeCanvases();
    updateSimulation();
    animateMolecules();
}

function resizeCanvases() {
    const parent = document.querySelector('.visual-panel');
    if (!parent) return;
    
    // Make canvas fill the panel, but keep it visible
    const size = parent.clientWidth - 40;
    
    graphCanvas.width = size;
    graphCanvas.height = 300;
    
    molCanvas.width = size;
    molCanvas.height = 300;
    
    drawGraph();
}

// --- Physics / Math Logic ---

function calculateRate(Vmax, Km, S) {
    if (Km + S === 0) return 0;
    return (Vmax * S) / (Km + S);
}

function updateSimulation() {
    // 1. Calculate Output based on current State
    state.v = calculateRate(state.Vmax, state.Km, state.S);
    
    // 2. Update Result Display
    if(displays.v) {
        displays.v.innerText = state.v.toExponential(2);
    }
    
    // 3. Update Visuals
    drawGraph();
}

// --- Graph Visualization ---

function drawGraph() {
    if (!graphCtx) return;

    const width = graphCanvas.width;
    const height = graphCanvas.height;
    const padding = 50; // Increased padding for labels

    // Clear
    graphCtx.clearRect(0, 0, width, height);

    // Axis limits
    const maxS = 1.0; 
    const maxV = 0.012; 

    // Helper to map coordinates
    // We add padding to Left and Bottom
    const mapX = (s) => padding + (s / maxS) * (width - 2 * padding);
    const mapY = (v) => height - padding - (v / maxV) * (height - 2 * padding);

    // Draw Axes
    graphCtx.beginPath();
    graphCtx.strokeStyle = '#333';
    graphCtx.lineWidth = 2;
    graphCtx.moveTo(padding, padding); 
    graphCtx.lineTo(padding, height - padding); 
    graphCtx.lineTo(width - padding, height - padding); 
    graphCtx.stroke();

    // Axis Labels
    graphCtx.fillStyle = '#333';
    graphCtx.font = '12px sans-serif';
    graphCtx.textAlign = 'center';
    graphCtx.fillText('[S] Substrate (mol/L)', width / 2, height - 10);
    
    graphCtx.save();
    graphCtx.translate(15, height / 2);
    graphCtx.rotate(-Math.PI / 2);
    graphCtx.fillText('Reaction Rate (v)', 0, 0);
    graphCtx.restore();

    // Draw Vmax Line (Dashed limit line)
    const yVmax = mapY(state.Vmax);
    graphCtx.beginPath();
    graphCtx.setLineDash([5, 5]);
    graphCtx.strokeStyle = '#999';
    graphCtx.moveTo(padding, yVmax);
    graphCtx.lineTo(width - padding, yVmax);
    graphCtx.stroke();
    graphCtx.setLineDash([]);
    graphCtx.fillStyle = '#666';
    graphCtx.textAlign = 'right';
    graphCtx.fillText('Vmax', width - padding - 5, yVmax - 5);

    // Draw Km Line (Vertical Dashed)
    // Km is the [S] where v = Vmax / 2
    const xKm = mapX(state.Km);
    const yHalfVmax = mapY(state.Vmax / 2);
    
    // Draw lines indicating Km
    graphCtx.beginPath();
    graphCtx.setLineDash([2, 2]);
    graphCtx.strokeStyle = '#28a745'; // Green for Km
    // Horizontal line to curve
    graphCtx.moveTo(padding, yHalfVmax);
    graphCtx.lineTo(xKm, yHalfVmax);
    // Vertical line down
    graphCtx.lineTo(xKm, height - padding);
    graphCtx.stroke();
    graphCtx.setLineDash([]);
    
    graphCtx.fillStyle = '#28a745';
    graphCtx.textAlign = 'center';
    graphCtx.fillText('Km', xKm, height - padding + 15);


    // Draw Curve
    graphCtx.beginPath();
    graphCtx.strokeStyle = '#007bff';
    graphCtx.lineWidth = 3;
    
    // Draw the function curve
    for (let s = 0; s <= maxS; s += 0.01) {
        const v = calculateRate(state.Vmax, state.Km, s);
        const x = mapX(s);
        const y = mapY(v);
        if (s === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();

    // Draw Current Point (Red Dot)
    const currentX = mapX(state.S);
    const currentY = mapY(state.v);
    
    graphCtx.beginPath();
    graphCtx.fillStyle = '#dc3545';
    graphCtx.arc(currentX, currentY, 6, 0, Math.PI * 2);
    graphCtx.fill();
    graphCtx.fillStyle = 'black';
    graphCtx.fillText('Operating Point', currentX, currentY - 10);
}

// --- Molecular Visualization (Particle System) ---
const particles = [];
const numEnzymes = 8;
let lastFrameTime = 0;

// Initialize Enzyme particles
for(let i=0; i<numEnzymes; i++) {
    particles.push({
        type: 'enzyme',
        x: Math.random() * 300, 
        y: Math.random() * 300,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        busy: 0 // Timer > 0 means it contains substrate
    });
}

function animateMolecules(timestamp) {
    if (!molCtx) return; // Guard if canvas not ready

    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = timestamp - lastFrameTime;
    lastFrameTime = timestamp;

    const width = molCanvas.width;
    const height = molCanvas.height;
    molCtx.clearRect(0, 0, width, height);
    
    // Background
    molCtx.fillStyle = '#f8f9fa';
    molCtx.fillRect(0,0, width, height);

    // 1. Manage Substrate Count
    // Map [S] 0.0 -> 1.0 to roughly 0 -> 80 particles
    const targetSubstrate = Math.floor(state.S * 80);
    const currentSubstrate = particles.filter(p => p.type === 'substrate').length;

    if (currentSubstrate < targetSubstrate) {
        // Add
        particles.push({
            type: 'substrate',
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2
        });
    } else if (currentSubstrate > targetSubstrate) {
        // Remove (find first substrate and remove it)
        const idx = particles.findIndex(p => p.type === 'substrate');
        if (idx > -1) particles.splice(idx, 1);
    }

    // 2. Update Particles
    particles.forEach(p => {
        // Move (Enzymes and Free Substrate)
        if (p.type !== 'enzyme' || p.busy <= 0) {
            p.x += p.vx;
            p.y += p.vy;
        }

        // Bounce
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Draw & Interact
        if (p.type === 'enzyme') {
            // Processing Speed (Vmax determines how fast it "chews")
            // Higher Vmax = Faster = Lower busy time
            // Range Vmax 0.0001 to 0.01. 
            // Map to frames: 120 frames (slow) to 20 frames (fast)
            const processingFrames = 120 - (state.Vmax / 0.01) * 100;

            if (p.busy > 0) {
                // Processing...
                p.busy--;
                
                // Draw Enzyme (Grey/Busy)
                molCtx.beginPath();
                molCtx.arc(p.x, p.y, 12, 0, Math.PI*2);
                molCtx.fillStyle = '#6c757d'; 
                molCtx.fill();
                
                // Draw Substrate inside
                molCtx.beginPath();
                molCtx.arc(p.x, p.y, 5, 0, Math.PI*2);
                molCtx.fillStyle = '#fd7e14';
                molCtx.fill();

                // Done? Release Product
                if (p.busy <= 0) {
                    particles.push({
                        type: 'product',
                        x: p.x,
                        y: p.y,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3,
                        life: 50 // Frames to live
                    });
                }
            } else {
                // Free Enzyme
                molCtx.beginPath();
                molCtx.arc(p.x, p.y, 12, 0, Math.PI*2);
                molCtx.fillStyle = '#007bff'; 
                molCtx.fill();
                
                // Mouth
                molCtx.fillStyle = '#f8f9fa';
                molCtx.beginPath();
                molCtx.moveTo(p.x, p.y);
                molCtx.arc(p.x, p.y, 12, -0.2 * Math.PI, 0.2 * Math.PI);
                molCtx.fill();

                // Collision Detection with Substrate (Affinity/Km)
                // Lower Km = Higher Affinity = larger capture radius or higher probability
                // Here we simplify: Just distance check
                for (let j = 0; j < particles.length; j++) {
                    let s = particles[j];
                    if (s.type === 'substrate') {
                        let dx = p.x - s.x;
                        let dy = p.y - s.y;
                        let dist = Math.sqrt(dx*dx + dy*dy);
                        
                        // Collision radius based on Km? 
                        // Let's keep it simple: strict collision
                        if (dist < 15) {
                            // Captured!
                            particles.splice(j, 1);
                            p.busy = processingFrames;
                            break; 
                        }
                    }
                }
            }
        } 
        else if (p.type === 'substrate') {
            molCtx.beginPath();
            molCtx.arc(p.x, p.y, 4, 0, Math.PI*2);
            molCtx.fillStyle = '#fd7e14';
            molCtx.fill();
        } 
        else if (p.type === 'product') {
            molCtx.beginPath();
            molCtx.arc(p.x, p.y, 5, 0, Math.PI*2);
            molCtx.fillStyle = '#28a745';
            molCtx.fill();
            p.life--;
        }
    });

    // Remove dead products
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].type === 'product' && particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }

    requestAnimationFrame(animateMolecules);
}

// Start
init();