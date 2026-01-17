/**
 * S65 Doppler Light Simulation
 * Simulates Relativistic Longitudinal Doppler Effect
 */

// --- Constants & Globals ---
const C_REAL = 3e8; // Speed of light in m/s
const CANVAS_C = 4; // Simulation speed of light (pixels per frame)

// State
let v_real = 0;     // Current velocity in m/s
let f_source = 0;   // Current frequency in Hz
let beta = 0;       // v/c
let f_obs = 0;      // Observed frequency

// Animation State
let sourceX = 100;      // Starting X position of source
const OBSERVER_X = 50;  // X position of observer
let waves = [];         // Array to store emitted wavefronts
let lastEmissionTime = 0;
let animationId;

// DOM Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const speedInput = document.getElementById('speedInput');
const freqInput = document.getElementById('freqInput');
const speedValDisplay = document.getElementById('speedValue');
const betaValDisplay = document.getElementById('betaValue');
const freqValDisplay = document.getElementById('freqValue');
const obsFreqValDisplay = document.getElementById('obsFreqValue');
const shiftTypeDisplay = document.getElementById('shiftType');
const resetBtn = document.getElementById('resetBtn');

// --- Initialization ---

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 500;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Core Physics Calculation ---

function updateCalculations() {
    // 1. Get Inputs
    v_real = parseFloat(speedInput.value);
    
    // Logarithmic slider handling for frequency to cover large range
    // Slider value is exponent x (10^x)
    const exponent = parseFloat(freqInput.value);
    f_source = Math.pow(10, exponent);

    // 2. Calculate Beta
    beta = v_real / C_REAL;

    // 3. Calculate Observed Frequency
    // Relativistic Doppler Formula for source moving away:
    // f_obs = f * sqrt((1 - beta) / (1 + beta))
    const dopplerFactor = Math.sqrt((1 - beta) / (1 + beta));
    f_obs = f_source * dopplerFactor;

    // 4. Update UI Text
    speedValDisplay.textContent = v_real.toExponential(2);
    betaValDisplay.textContent = beta.toFixed(3);

    if (v_real < -1000) { // Moving towards (allow small buffer for 0)
        shiftTypeDisplay.textContent = "Blueshift";
        shiftTypeDisplay.style.color = "#2196F3"; // Blue color
    } else if (v_real > 1000) { // Moving away
        shiftTypeDisplay.textContent = "Redshift";
        shiftTypeDisplay.style.color = "#ff4444"; // Red color
    } else {
        shiftTypeDisplay.textContent = "None";
        shiftTypeDisplay.style.color = "#ccc";
    }
    
    freqValDisplay.textContent = f_source.toExponential(2);
    obsFreqValDisplay.textContent = f_obs.toExponential(2);
}

// --- Visual Mapping Helper ---

// Returns a color based on the ratio of f_obs / f_source
// 1.0 = Green (No shift), <1.0 = Redder, >1.0 = Bluer
function getDopplerColor(ratio) {
    // Standard Green (120)
    let hue = 120;
    
    if (ratio > 1.0) {
        // Blueshift: Ratio > 1. Map to Blue/Violet (approx 260)
        // We scale it so a 2x frequency shift hits max blue
        hue = 120 + (ratio - 1) * 140; 
        if (hue > 260) hue = 260; // Cap at Violet
    } else {
        // Redshift: Ratio < 1. Map to Red (0)
        hue = 120 * Math.pow(ratio, 3);
    }
    
    return `hsl(${hue}, 100%, 50%)`;
}

// --- Animation Loop ---

function animate(timestamp) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Observer
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(OBSERVER_X, canvas.height / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText("Observer", OBSERVER_X - 25, canvas.height / 2 + 25);

    // 2. Update Source Position
    // Map real beta to simulation pixels
    // v_sim = beta * c_sim
    const v_sim = beta * CANVAS_C;
    sourceX += v_sim;

    // Loop source if it goes off screen
    if (sourceX > canvas.width + 100) {
        sourceX = OBSERVER_X + 50; // Reset near observer
        waves = []; // Clear waves to avoid visual confusion on reset
    }

    // 3. Emit Waves
    // We visually emit waves at a rate proportional to f_source
    // But for visual clarity, we cap the rate so the screen isn't just white noise.
    // We define a base period in frames.
    
    // Visual spacing (wavelength) = c / f. 
    // Higher f = smaller period.
    // We normalize f_source range (1e14 - 1e16 approx for visible) to a visual emission interval.
    // Since range is 1e6 to 1e20, we just use a fixed base emission rate for the "concept",
    // relying on the velocity to show the Doppler effect (wavelength stretching).
    
    const emissionPeriod = 20; // Frames between emissions (base)
    // Note: In this specific simulation, we don't change emission rate based on f_source
    // slider because the dynamic range is too huge to visualize. 
    // We visualize the *shift* caused by velocity. The f_source slider updates the math values.

    if (timestamp - lastEmissionTime > emissionPeriod * 16) { // approx ms conversion
        waves.push({
            x: sourceX,           // Center of the wave is where source WAS
            y: canvas.height / 2,
            r: 0,
            id: Date.now()
        });
        lastEmissionTime = timestamp;
    }

    // 4. Draw and Update Waves
    // Calculate current doppler ratio for coloring
    const ratio = Math.sqrt((1 - beta) / (1 + beta));
    const waveColor = getDopplerColor(ratio);

    for (let i = waves.length - 1; i >= 0; i--) {
        let w = waves[i];
        
        // Expand wave
        w.r += CANVAS_C;

        // Draw
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r, 0, Math.PI * 2);
        
        // Visual Logic: 
        // Waves propagating LEFT towards observer are redshifted.
        // We draw the whole circle with the shifted color for simplicity, 
        // or we could gradient it. Let's use the shifted color for the whole wave 
        // to clearly indicate the "Received" frequency state relative to that velocity.
        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.max(0, 1 - w.r / (canvas.width * 1.2)); // Fade out
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Remove old waves
        if (w.r > canvas.width * 1.5) {
            waves.splice(i, 1);
        }
    }

    // 5. Draw Source
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(sourceX, canvas.height / 2, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Velocity Vector
    if (beta > 0) {
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(sourceX, canvas.height / 2);
        ctx.lineTo(sourceX + (beta * 50) + 10, canvas.height / 2); // Scale arrow
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(sourceX + (beta * 50) + 10, canvas.height / 2);
        ctx.lineTo(sourceX + (beta * 50), canvas.height / 2 - 3);
        ctx.lineTo(sourceX + (beta * 50), canvas.height / 2 + 3);
        ctx.fill();
    }

    animationId = requestAnimationFrame(animate);
}

// --- Event Listeners ---

speedInput.addEventListener('input', updateCalculations);
freqInput.addEventListener('input', updateCalculations);

resetBtn.addEventListener('click', () => {
    sourceX = OBSERVER_X + 50;
    waves = [];
});

// --- Start ---
updateCalculations();
requestAnimationFrame(animate);