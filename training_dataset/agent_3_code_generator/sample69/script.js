// Constants
const RYDBERG_ENERGY = 13.6; // eV

// DOM Elements
const canvas = document.getElementById('atomCanvas');
const ctx = canvas.getContext('2d');
const zInput = document.getElementById('zInput');
const nInput = document.getElementById('nInput');
const zVal = document.getElementById('zVal');
const nVal = document.getElementById('nVal');
const energyOutput = document.getElementById('energyOutput');
const radiusOutput = document.getElementById('radiusOutput');
const velocityOutput = document.getElementById('velocityOutput');

// State
let Z = 1;
let n = 1;
let electronAngle = 0;

// Resize canvas handling
let width, height, centerX, centerY;
function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
    centerX = width / 2;
    centerY = height / 2;
}
window.addEventListener('resize', resize);
resize();

// Calculation Logic
function updateCalculations() {
    // 1. Energy: E = -13.6 * Z^2 / n^2
    const energy = -RYDBERG_ENERGY * (Math.pow(Z, 2) / Math.pow(n, 2));
    
    // 2. Relative Radius (Bohr radius units): r ~ n^2 / Z
    const relRadius = Math.pow(n, 2) / Z;
    
    // 3. Relative Velocity: v ~ Z / n
    const relVelocity = Z / n;

    // Update Text UI
    zVal.textContent = Z;
    nVal.textContent = n;
    energyOutput.textContent = `${energy.toFixed(2)} eV`;
    radiusOutput.textContent = `${relRadius.toFixed(2)} a₀`;
    velocityOutput.textContent = `${relVelocity.toFixed(2)} v₁`;
    
    // Update MathJax typeset if needed (optional dynamic refresh)
}

// Animation Loop
function draw() {
    // Clear canvas
    ctx.fillStyle = '#111'; // Dark space background
    ctx.fillRect(0, 0, width, height);

    // Physics parameters for visualization
    // We want to visualize the orbit. 
    // Since r scales with n^2 (1 to 100 range), we can't draw 1:1 scale easily.
    // Approach: We scale the view such that the orbit is always a comfortable size (e.g., 35% of canvas min dimension).
    // However, to show the effect of Z and n, we will animate the transition or use visual cues.
    
    const baseRadius = Math.min(width, height) * 0.35; 
    
    // Orbit Ring
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
    ctx.lineWidth = 2;
    ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Draw Nucleus
    // Nucleus size grows slightly with Z to indicate mass/charge increase
    const nucleusSize = 6 + (Z * 1.5); 
    ctx.beginPath();
    ctx.fillStyle = '#ff4d4d'; // Reddish nucleus
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff4d4d';
    ctx.arc(centerX, centerY, nucleusSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Nucleus Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Z}+`, centerX, centerY);

    // Electron Motion
    // Velocity v proportional to Z/n
    // Base speed factor
    const speedFactor = 0.02;
    const orbitalSpeed = (Z / n) * speedFactor;
    
    electronAngle += orbitalSpeed;

    const electronX = centerX + Math.cos(electronAngle) * baseRadius;
    const electronY = centerY + Math.sin(electronAngle) * baseRadius;

    // Draw Electron
    ctx.beginPath();
    ctx.fillStyle = '#00f0ff'; // Cyan electron
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.arc(electronX, electronY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Electron Trail (visual effect)
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.lineWidth = 4;
    ctx.arc(centerX, centerY, baseRadius, electronAngle - 0.5, electronAngle);
    ctx.stroke();

    requestAnimationFrame(draw);
}

// Event Listeners
zInput.addEventListener('input', (e) => {
    Z = parseInt(e.target.value);
    updateCalculations();
});

nInput.addEventListener('input', (e) => {
    n = parseInt(e.target.value);
    updateCalculations();
});

// Initialize
updateCalculations();
draw();