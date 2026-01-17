const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const varXSlider = document.getElementById('varX');
const covXYSlider = document.getElementById('covXY');
const varXValueDisplay = document.getElementById('varXValue');
const covXYValueDisplay = document.getElementById('covXYValue');
const beta1ValueDisplay = document.getElementById('beta1Value');

// Initial State
let varX = parseInt(varXSlider.value);
let covXY = parseInt(covXYSlider.value);
let beta1 = covXY / varX;

// Visualization Parameters
const numPoints = 200;
const points = [];
const scale = 2.5; // Pixels per data unit
const animationSpeed = 0.1; // Lower is smoother/slower

// Helper function for standard normal distribution (Box-Muller transform)
function randn_bm() {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Initialize points with fixed base standard normal random values.
// This ensures the cloud shape transforms smoothly instead of regenerating randomly.
for (let i = 0; i < numPoints; i++) {
    points.push({
        baseX: randn_bm(),
        baseE: randn_bm(), // Base error term
        currentX: 0,
        currentY: 0,
        targetX: 0,
        targetY: 0
    });
}

// Function to recalculate targets based on slider inputs
function updateSimulationTargets() {
    // 1. Calculate Beta1
    beta1 = covXY / varX;
    
    // 2. Update Numerical Displays
    varXValueDisplay.textContent = varX;
    covXYValueDisplay.textContent = covXY;
    beta1ValueDisplay.textContent = beta1.toFixed(3);

    // 3. Calculate new target positions for data points
    const stdX = Math.sqrt(varX);
    // We add noise proportional to the spread to maintain a cloud-like appearance.
    const noiseScale = stdX * 0.4; 

    for (let i = 0; i < numPoints; i++) {
        const p = points[i];
        // Scale X dimension based on sqrt(Variance)
        p.targetX = p.baseX * stdX;
        // Generate Y based on the linear model: y = beta1 * x + noise
        p.targetY = beta1 * p.targetX + p.baseE * noiseScale;
    }
}

// Main Animation Loop
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // --- Draw Axes ---
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(canvas.width, centerY); // X-axis
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, canvas.height); // Y-axis
    ctx.stroke();

    // --- Draw Regression Line ---
    ctx.strokeStyle = '#e74c3c'; // Accent color for the line
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Calculate endpoints that extend beyond the canvas visible area
    const xStart = -centerX / scale * 1.5;
    const yStart = beta1 * xStart;
    const xEnd = centerX / scale * 1.5;
    const yEnd = beta1 * xEnd;
    // Transform to canvas coordinates (note Y inversion)
    ctx.moveTo(centerX + xStart * scale, centerY - yStart * scale);
    ctx.lineTo(centerX + xEnd * scale, centerY - yEnd * scale);
    ctx.stroke();

    // --- Update and Draw Points ---
    ctx.fillStyle = 'rgba(52, 152, 219, 0.5)'; // Semi-transparent blue
    for (let i = 0; i < numPoints; i++) {
        const p = points[i];
        // Smoothly interpolate current position towards target position
        p.currentX += (p.targetX - p.currentX) * animationSpeed;
        p.currentY += (p.targetY - p.currentY) * animationSpeed;

        const canvasX = centerX + p.currentX * scale;
        const canvasY = centerY - p.currentY * scale; // Invert Y for canvas

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(draw);
}

// Event Listeners for Sliders
varXSlider.addEventListener('input', (e) => {
    varX = parseInt(e.target.value);
    updateSimulationTargets();
});

covXYSlider.addEventListener('input', (e) => {
    covXY = parseInt(e.target.value);
    updateSimulationTargets();
});

// Initialize and Start
updateSimulationTargets();
draw();