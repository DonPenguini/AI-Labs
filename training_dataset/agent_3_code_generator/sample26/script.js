// --- Configuration & State ---
const state = {
    A0: 5.0,
    B0: 0.0,
    k1: 0.2,
    k2: 0.1,
    currentTime: 0,
    isRunning: true,
    totalParticles: 150, // Total dots in animation
    animationSpeed: 1,   // Multiplier for simulation time
    maxTime: 20          // Dynamic based on rates
};

// --- DOM Elements ---
const inputs = {
    A0: document.getElementById('A0'),
    B0: document.getElementById('B0'),
    k1: document.getElementById('k1'),
    k2: document.getElementById('k2')
};

const displays = {
    A0: document.getElementById('val-A0'),
    B0: document.getElementById('val-B0'),
    k1: document.getElementById('val-k1'),
    k2: document.getElementById('val-k2'),
    currA: document.getElementById('curr-A'),
    currB: document.getElementById('curr-B'),
    eqA: document.getElementById('eq-A'),
    time: document.getElementById('time-display')
};

const btnReset = document.getElementById('btn-reset');
const btnPause = document.getElementById('btn-pause');

// --- Canvas Setup ---
const simCanvas = document.getElementById('simCanvas');
const ctx = simCanvas.getContext('2d');
let particles = [];

// --- Chart Setup ---
const ctxChart = document.getElementById('chartCanvas').getContext('2d');
let kineticsChart;

function initChart() {
    kineticsChart = new Chart(ctxChart, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: '[A]',
                    data: [],
                    borderColor: '#3b82f6', // Blue
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: '[B]',
                    data: [],
                    borderColor: '#ef4444', // Red
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Time (s)' },
                    min: 0
                },
                y: {
                    title: { display: true, text: 'Concentration (mol/L)' },
                    min: 0,
                    suggestedMax: 5
                }
            },
            plugins: {
                annotation: {
                    annotations: {
                        line1: {
                            type: 'line',
                            yMin: 0,
                            yMax: 0,
                            borderColor: 'rgba(0,0,0,0.2)',
                            borderDash: [5, 5],
                            borderWidth: 1,
                            label: { enabled: true, content: 'Equilibrium' }
                        }
                    }
                }
            }
        }
    });
}

// --- Physics & Math ---

function calculateConcentrations(t) {
    const { A0, B0, k1, k2 } = state;
    const totalC = A0 + B0;
    
    // Equilibrium Concentration of A
    // k1*Aeq = k2*Beq  => k1*Aeq = k2*(Total - Aeq) => Aeq(k1+k2) = k2*Total
    const Aeq = (k2 / (k1 + k2)) * totalC;
    
    // Transient Equation
    // A(t) = Aeq + (A0 - Aeq) * exp(-(k1+k2)t)
    const rateSum = k1 + k2;
    const At = Aeq + (A0 - Aeq) * Math.exp(-rateSum * t);
    const Bt = totalC - At;

    return { At, Bt, Aeq };
}

// Calculate the full curve for the graph
function updateChartData() {
    const { k1, k2 } = state;
    
    // Determine a reasonable time range based on rate constants
    // Time constant tau = 1 / (k1 + k2). 5*tau reaches ~99% steady state.
    const tau = 1 / (k1 + k2);
    state.maxTime = tau * 5;
    
    // Generate data points
    const points = 100;
    const dt = state.maxTime / points;
    
    const dataA = [];
    const dataB = [];
    const labels = [];
    
    for(let i=0; i<=points; i++) {
        const t = i * dt;
        const conc = calculateConcentrations(t);
        labels.push(t); // For x-axis
        dataA.push({x: t, y: conc.At});
        dataB.push({x: t, y: conc.Bt});
    }

    kineticsChart.options.scales.x.max = state.maxTime;
    kineticsChart.data.labels = labels; // Chart.js needs labels for axis sometimes
    kineticsChart.data.datasets[0].data = dataA;
    kineticsChart.data.datasets[1].data = dataB;
    
    // Update Equilibrium Line visual
    const conc = calculateConcentrations(0); // get Aeq
    kineticsChart.options.plugins.annotation.annotations.line1.yMin = conc.Aeq;
    kineticsChart.options.plugins.annotation.annotations.line1.yMax = conc.Aeq;

    kineticsChart.update();
}

// --- Animation System ---

class Particle {
    constructor(type, width, height) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.type = type; // 'A' or 'B'
        this.radius = 4;
    }

    update(w, h) {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;

        // Keep inside
        this.x = Math.max(0, Math.min(w, this.x));
        this.y = Math.max(0, Math.min(h, this.y));
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.type === 'A' ? '#3b82f6' : '#ef4444';
        ctx.fill();
        ctx.closePath();
    }
}

function initParticles() {
    particles = [];
    const { width, height } = simCanvas;
    // Initial distribution based on A0/B0 ratio
    const totalConc = state.A0 + state.B0;
    const ratioA = totalConc > 0 ? state.A0 / totalConc : 0.5;
    
    for (let i = 0; i < state.totalParticles; i++) {
        const type = i < (state.totalParticles * ratioA) ? 'A' : 'B';
        particles.push(new Particle(type, width, height));
    }
}

function updateParticleTypes(concA, concB) {
    const totalConc = concA + concB;
    if (totalConc <= 0) return;

    const targetCountA = Math.round((concA / totalConc) * state.totalParticles);
    let currentCountA = particles.filter(p => p.type === 'A').length;

    // Adjust types to match target concentration
    // We change types randomly to simulate reaction events
    if (currentCountA < targetCountA) {
        // Need more A (Turn B -> A)
        let diff = targetCountA - currentCountA;
        for (let p of particles) {
            if (diff <= 0) break;
            if (p.type === 'B') {
                p.type = 'A';
                diff--;
            }
        }
    } else if (currentCountA > targetCountA) {
        // Need less A (Turn A -> B)
        let diff = currentCountA - targetCountA;
        for (let p of particles) {
            if (diff <= 0) break;
            if (p.type === 'A') {
                p.type = 'B';
                diff--;
            }
        }
    }
}

function resizeCanvas() {
    const rect = simCanvas.parentElement.getBoundingClientRect();
    simCanvas.width = rect.width;
    simCanvas.height = rect.height - 40; // subtract header/padding approx
}

// --- Main Loop ---

let lastFrameTime = 0;

function loop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (state.isRunning) {
        state.currentTime += dt * state.animationSpeed;
        
        // Clamp time for display if we want, but usually reactions go to infinity. 
        // We reset visual line indicator if it exceeds graph max? 
        // For this sim, let's loop or stop? Let's just run.
        if (state.currentTime > state.maxTime) {
            // Optional: Pause at end or Loop. Let's Pause.
            // state.isRunning = false; 
            // btnPause.innerText = "Restart";
        }
    }

    // 1. Calculate Chemistry
    const conc = calculateConcentrations(state.currentTime);

    // 2. Update DOM
    displays.time.innerText = state.currentTime.toFixed(2);
    displays.currA.innerText = conc.At.toFixed(2);
    displays.currB.innerText = conc.Bt.toFixed(2);
    displays.eqA.innerText = conc.Aeq.toFixed(2);

    // 3. Draw Particles
    ctx.clearRect(0, 0, simCanvas.width, simCanvas.height);
    
    // Sync particle types with calculated concentration
    updateParticleTypes(conc.At, conc.Bt);

    particles.forEach(p => {
        p.update(simCanvas.width, simCanvas.height);
        p.draw(ctx);
    });

    // 4. Draw Current Time Line on Chart
    // Chart.js makes it hard to draw a vertical line efficiently every frame without full redraw.
    // Instead, we will rely on the static chart updated on input change, and maybe 
    // just let the user see the values in the text box.
    // However, to make it interactive, we can use a plugin or just highlight the point.
    // For simplicity/performance, we update the title or a specific dataset point if needed.
    // Here we just let the chart show the full trajectory.

    requestAnimationFrame(loop);
}

// --- Event Listeners ---

function handleInputChange(e) {
    const id = e.target.id;
    const val = parseFloat(e.target.value);
    state[id] = val;
    displays[id].innerText = val.toFixed(2);
    
    // Reset simulation time to 0 on parameter change for clarity? 
    // Or dynamic update? Dynamic update of graph is best.
    // Resetting time feels more natural for "Initial Conditions".
    if (id === 'A0' || id === 'B0') {
        state.currentTime = 0;
        initParticles();
    }
    
    updateChartData();
}

Object.keys(inputs).forEach(key => {
    inputs[key].addEventListener('input', handleInputChange);
});

btnReset.addEventListener('click', () => {
    state.currentTime = 0;
    initParticles();
});

btnPause.addEventListener('click', () => {
    state.isRunning = !state.isRunning;
    btnPause.innerText = state.isRunning ? "Pause" : "Play";
});

window.addEventListener('resize', () => {
    resizeCanvas();
    initParticles();
});

// --- Initialization ---

window.onload = () => {
    resizeCanvas();
    initChart();
    initParticles();
    updateChartData();
    requestAnimationFrame(loop);
};