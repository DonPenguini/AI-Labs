/**
 * S02 Pendulum Small Angle Simulation
 * Domain: Physics
 * Description: Linearized simple harmonic pendulum simulation
 */

// --- Constants & State ---
const CONSTANTS = {
    g: 9.81, // m/s^2
};

const STATE = {
    L: 1.5,       // Length (m)
    theta0: 0.2,  // Initial Angle (rad)
    t: 0,         // Time (s)
    isRunning: true,
    scale: 100,   // Pixels per meter for drawing
    origin: { x: 300, y: 50 } // Canvas origin coordinates
};

// --- DOM Elements ---
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const inputs = {
    length: document.getElementById('lengthSlider'),
    angle: document.getElementById('angleSlider'),
    reset: document.getElementById('resetBtn'),
    pause: document.getElementById('pauseBtn')
};

const displays = {
    length: document.getElementById('lengthVal'),
    angle: document.getElementById('angleVal'),
    time: document.getElementById('timeDisplay'),
    omega: document.getElementById('omegaDisplay'),
    theta: document.getElementById('thetaDisplay'),
    thetaDot: document.getElementById('thetaDotDisplay')
};

// --- Physics Engine ---

/**
 * Calculates current physics state based on time t
 * Uses closed-form solutions:
 * omega = sqrt(g/L)
 * theta(t) = theta0 * cos(omega * t)
 * thetadot(t) = -theta0 * omega * sin(omega * t)
 */
function calculatePhysics(time) {
    const omega = Math.sqrt(CONSTANTS.g / STATE.L);
    const theta = STATE.theta0 * Math.cos(omega * time);
    const thetaDot = -STATE.theta0 * omega * Math.sin(omega * time);

    return { omega, theta, thetaDot };
}

// --- Rendering ---

function drawPendulum(theta) {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate Bob Position
    // x = L * sin(theta)
    // y = L * cos(theta)
    const bobX = STATE.origin.x + (STATE.L * STATE.scale * Math.sin(theta));
    const bobY = STATE.origin.y + (STATE.L * STATE.scale * Math.cos(theta));

    // Draw Pivot
    ctx.beginPath();
    ctx.arc(STATE.origin.x, STATE.origin.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();

    // Draw Rod
    ctx.beginPath();
    ctx.moveTo(STATE.origin.x, STATE.origin.y);
    ctx.lineTo(bobX, bobY);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Bob
    ctx.beginPath();
    ctx.arc(bobX, bobY, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#3498db'; // Blue bob
    ctx.fill();
    ctx.stroke();

    // Draw Reference Line (Vertical)
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(STATE.origin.x, STATE.origin.y);
    ctx.lineTo(STATE.origin.x, STATE.origin.y + (3.2 * STATE.scale)); // Draw slightly past max length
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
}

function updateUI(physicsValues) {
    displays.length.textContent = STATE.L.toFixed(2);
    displays.angle.textContent = STATE.theta0.toFixed(2);
    
    displays.time.textContent = STATE.t.toFixed(2) + " s";
    displays.omega.textContent = physicsValues.omega.toFixed(3) + " rad/s";
    displays.theta.textContent = physicsValues.theta.toFixed(3) + " rad";
    displays.thetaDot.textContent = physicsValues.thetaDot.toFixed(3) + " rad/s";
}

// --- Animation Loop ---

let lastFrameTime = 0;

function animate(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const deltaTime = (timestamp - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = timestamp;

    if (STATE.isRunning) {
        STATE.t += deltaTime;
    }

    // Physics Calculation
    const physics = calculatePhysics(STATE.t);

    // Render
    drawPendulum(physics.theta);
    updateUI(physics);

    requestAnimationFrame(animate);
}

// --- Event Listeners ---

inputs.length.addEventListener('input', (e) => {
    STATE.L = parseFloat(e.target.value);
    // Note: We don't reset t here to allow dynamic changing, 
    // though strictly closed-form implies fixed parameters.
    // Changing L effectively changes frequency instantly.
});

inputs.angle.addEventListener('input', (e) => {
    STATE.theta0 = parseFloat(e.target.value);
    STATE.t = 0; // Reset time when initial condition changes to avoid phase jumps
});

inputs.reset.addEventListener('click', () => {
    STATE.t = 0;
});

inputs.pause.addEventListener('click', () => {
    STATE.isRunning = !STATE.isRunning;
});

// --- Initialization ---

// Start Animation
requestAnimationFrame(animate);