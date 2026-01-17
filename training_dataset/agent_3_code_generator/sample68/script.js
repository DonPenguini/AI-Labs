// Constants
const HBAR = 1.0545718e-34; // Reduced Planck constant (J*s)
const MASS_ELECTRON = 9.10938356e-31; // Mass of electron (kg)
const EV_CONVERSION = 1.60218e-19; // Joules per eV

// DOM Elements
const canvas = document.getElementById('quantumCanvas');
const ctx = canvas.getContext('2d');

const inputN = document.getElementById('quantum-n');
const inputL = document.getElementById('length-l');
const inputM = document.getElementById('mass-m');

const valN = document.getElementById('val-n');
const valL = document.getElementById('val-l');
const valM = document.getElementById('val-m');

const dispEv = document.getElementById('energy-ev');
const dispJoules = document.getElementById('energy-joules');

// State Variables
let n = 1;
let L_nm = 1.0; // Length in nanometers
let m_rel = 1.0; // Mass relative to electron mass
let time = 0;

// Resize Canvas
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 400; // Fixed height
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Physics Calculations ---

function calculateEnergy(n, L_nm, m_rel) {
    // Convert inputs to SI units
    const L = L_nm * 1e-9; // meters
    const m = m_rel * MASS_ELECTRON; // kg

    // E = (n^2 * pi^2 * hbar^2) / (2 * m * L^2)
    const numerator = Math.pow(n, 2) * Math.pow(Math.PI, 2) * Math.pow(HBAR, 2);
    const denominator = 2 * m * Math.pow(L, 2);
    
    const EnergyJoules = numerator / denominator;
    const EnergyEv = EnergyJoules / EV_CONVERSION;

    return { J: EnergyJoules, eV: EnergyEv };
}

// --- Drawing Functions ---

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;

    // Define Simulation Area (The Box) inside the canvas
    // We keep some padding for axes
    const padding = 40;
    const boxWidth = w - (padding * 2);
    const boxHeight = h - (padding * 2);
    const boxLeft = padding;
    const boxRight = w - padding;
    const baselineY = h / 2; // The zero line for the wave

    // 1. Draw Infinite Walls
    ctx.fillStyle = '#334155'; // Dark grey walls
    ctx.fillRect(0, 0, boxLeft, h); // Left wall area
    ctx.fillRect(boxRight, 0, padding, h); // Right wall area

    // Wall Borders
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    // Left Wall Line
    ctx.moveTo(boxLeft, 0);
    ctx.lineTo(boxLeft, h);
    // Right Wall Line
    ctx.moveTo(boxRight, 0);
    ctx.lineTo(boxRight, h);
    ctx.stroke();

    // 2. Draw Zero Line (Axis)
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(boxLeft, baselineY);
    ctx.lineTo(boxRight, baselineY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Calculate Wavefunction Scaling
    // We want the wave to fit nicely within the box height visually
    const amplitudeScale = (boxHeight / 2) * 0.8; 
    
    // 4. Draw Probability Density |psi|^2 (Static Background)
    ctx.fillStyle = 'rgba(244, 114, 182, 0.2)'; // Pinkish transparent
    ctx.strokeStyle = 'rgba(244, 114, 182, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boxLeft, baselineY);

    for (let x = 0; x <= boxWidth; x++) {
        // Normalized x from 0 to 1
        const xNorm = x / boxWidth;
        
        // Psi(x) part: sin(n * pi * x/L)
        const psi = Math.sin(n * Math.PI * xNorm);
        
        // Probability |Psi|^2 = sin^2(...)
        // We scale it up to visualize it
        const prob = psi * psi;
        
        // Plot y. Note: Canvas Y grows downwards, so we subtract from baseline
        const yPlot = baselineY - (prob * amplitudeScale);
        ctx.lineTo(boxLeft + x, yPlot);
    }
    
    ctx.lineTo(boxRight, baselineY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 5. Draw Real Part of Wavefunction Re(Psi) (Animated)
    // Animation factor: cos(omega * t). 
    // Since actual frequency is too high, we use an arbitrary visual speed.
    // Higher n oscillates faster in reality, let's mimic that slightly.
    const speedFactor = 0.05 + (n * 0.01); 
    const phase = Math.cos(time * speedFactor);

    ctx.strokeStyle = '#38bdf8'; // Cyan
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(boxLeft, baselineY);

    for (let x = 0; x <= boxWidth; x++) {
        const xNorm = x / boxWidth;
        // Spatial part
        const psiSpatial = Math.sin(n * Math.PI * xNorm);
        // Full Real part = Spatial * cos(t)
        const psiReal = psiSpatial * phase;

        const yPlot = baselineY - (psiReal * amplitudeScale);
        ctx.lineTo(boxLeft + x, yPlot);
    }
    ctx.stroke();

    // 6. Labels
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText("x = 0", boxLeft - 10, h - 10);
    ctx.fillText(`x = ${L_nm} nm`, boxRight - 40, h - 10);
    ctx.fillText("V = ∞", 5, h/2);
    ctx.fillText("V = ∞", w - 35, h/2);
    
    // Increment time for animation
    time++;
    requestAnimationFrame(draw);
}

// --- Updates ---

function updateSimulation() {
    // Read values
    n = parseInt(inputN.value);
    L_nm = parseFloat(inputL.value);
    m_rel = parseFloat(inputM.value);

    // Update Text Displays
    valN.textContent = n;
    valL.textContent = L_nm.toFixed(1);
    valM.textContent = m_rel.toFixed(1);

    // Calculate Energy
    const energies = calculateEnergy(n, L_nm, m_rel);
    
    // Update Energy Display
    dispEv.textContent = energies.eV.toExponential(3) + " eV";
    dispJoules.textContent = energies.J.toExponential(3) + " J";
}

// --- Event Listeners ---

inputN.addEventListener('input', updateSimulation);
inputL.addEventListener('input', updateSimulation);
inputM.addEventListener('input', updateSimulation);

// Initialize
updateSimulation();
draw();