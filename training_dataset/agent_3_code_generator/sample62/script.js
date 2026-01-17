/**
 * S62 Double Slit Interference Simulation
 * Domain: Optics
 * * Logic:
 * 1. Inputs: Wavelength (lambda) and Slit Spacing (d).
 * 2. Calculate theta = asin(lambda / d).
 * 3. Visualize wave propagation and intensity pattern on canvas.
 */

// DOM Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const lambdaSlider = document.getElementById('lambdaSlider');
const dSlider = document.getElementById('dSlider');
const lambdaValDisplay = document.getElementById('lambdaVal');
const dValDisplay = document.getElementById('dVal');
const thetaOutput = document.getElementById('thetaOutput');
const ratioOutput = document.getElementById('ratioOutput');
const errorMsg = document.getElementById('errorMsg');

// State Variables (Values in SI units: meters)
let state = {
    lambda: 500e-9, // 500 nm default
    d: 2e-6,        // 2 micrometers default
    theta: 0,
    isValid: true,
    time: 0
};

// Initialization
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Add event listeners to sliders
    lambdaSlider.addEventListener('input', handleInput);
    dSlider.addEventListener('input', handleInput);

    // Initial calculation
    handleInput();
    
    // Start Animation Loop
    requestAnimationFrame(animate);
}

function resizeCanvas() {
    // Handle High DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
}

function handleInput() {
    // Inputs are on logarithmic scales (base 10)
    // Slider value x represents 10^x
    state.lambda = Math.pow(10, parseFloat(lambdaSlider.value));
    state.d = Math.pow(10, parseFloat(dSlider.value));

    // Update UI text
    lambdaValDisplay.textContent = formatSci(state.lambda) + " m";
    dValDisplay.textContent = formatSci(state.d) + " m";

    calculatePhysics();
}

function calculatePhysics() {
    const ratio = state.lambda / state.d;
    
    ratioOutput.textContent = ratio.toFixed(4);

    // Check constraints: lambda/d <= 1
    if (ratio > 1) {
        state.isValid = false;
        state.theta = NaN;
        thetaOutput.textContent = "Undefined";
        errorMsg.classList.remove('hidden');
    } else {
        state.isValid = true;
        // Calculate First Order Maximum (m=1)
        const rad = Math.asin(ratio);
        const deg = rad * (180 / Math.PI);
        state.theta = deg;
        thetaOutput.textContent = deg.toFixed(2) + "°";
        errorMsg.classList.add('hidden');
    }
}

function formatSci(num) {
    return num.toExponential(2);
}

// Animation Loop
function animate() {
    state.time += 0.1; // Increment time for wave animation
    draw();
    requestAnimationFrame(animate);
}

function draw() {
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    
    // Clear Canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    const centerX = width * 0.1; // Slits position (left side)
    const centerY = height / 2;
    const screenX = width * 0.85; // Screen position (right side)

    // 1. Draw Geometry (Slits and Screen)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;

    // Draw Screen Line
    ctx.beginPath();
    ctx.moveTo(screenX, 20);
    ctx.lineTo(screenX, height - 20);
    ctx.stroke();

    // Draw Optical Axis
    ctx.strokeStyle = '#333';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Visualize Slits
    // Since actual d is microscopic, we use a schematic representation width
    const schematicGap = 20; 
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    
    // Wall Top
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, centerY - schematicGap);
    ctx.stroke();
    
    // Wall Middle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 2); // Small blockage in middle
    ctx.lineTo(centerX, centerY + 2);
    ctx.stroke();

    // Wall Bottom
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + schematicGap);
    ctx.lineTo(centerX, height);
    ctx.stroke();

    // 3. Draw Wave Animation (Schematic)
    // We draw arcs emanating from the two schematic slits
    if (state.isValid) {
        ctx.lineWidth = 1;
        // Color based on wavelength (approximate mapping for visual flair)
        // Since lambda varies wildly, we just use a standard blue-cyan for logic
        ctx.strokeStyle = 'rgba(79, 172, 254, 0.4)';
        
        const numWaves = 10;
        const waveSpeed = 2; 
        const phase = (state.time * waveSpeed) % 20;

        for (let i = 0; i < width; i+=20) {
            let r = i + phase;
            if(r > screenX - centerX) continue; // Don't draw past screen

            // Top Slit Source
            ctx.beginPath();
            ctx.arc(centerX, centerY - 10, r, -Math.PI/2, Math.PI/2);
            ctx.stroke();

            // Bottom Slit Source
            ctx.beginPath();
            ctx.arc(centerX, centerY + 10, r, -Math.PI/2, Math.PI/2);
            ctx.stroke();
        }
    }

    // 4. Draw Intensity Pattern on Screen
    drawIntensityProfile(width, height, screenX, centerY);

    // 5. Draw First Order Max Ray (m=1)
    if (state.isValid) {
        drawGeometryRays(width, height, centerX, centerY, screenX);
    }
}

function drawIntensityProfile(w, h, screenX, centerY) {
    if (!state.isValid) return;

    ctx.beginPath();
    ctx.strokeStyle = '#ff5e62';
    ctx.lineWidth = 2;

    // We map the physical intensity function to the canvas pixels
    // I = I0 * cos^2( (pi * d * sin(theta)) / lambda )
    // On the screen, y = L * tan(theta). For small angles y ~ L*theta
    // Phase difference phi = (2*pi*d*y) / (lambda * L)
    
    // Schematic Scaling:
    // We cannot use real lambda/d for drawing because the ratio changes by orders of magnitude.
    // We compute a "visual frequency" based on the ratio to show the effect.
    // If lambda/d is small, fringes are close. If lambda/d is large, fringes are wide.
    
    let ratio = state.lambda / state.d;
    
    // Visual scaling factor to make the graph look nice on canvas
    // A ratio of 0.1 should show several fringes. A ratio of 0.5 fewer.
    const visualScale = 2000 * ratio; 

    for (let y = 0; y < h; y++) {
        let dy = y - centerY; // Distance from center of screen in pixels
        
        // Intensity formula adaptation for visualization
        // The argument inside cos represents phase shift.
        let intensity = Math.pow(Math.cos(dy / visualScale * Math.PI), 2);
        
        // Draw the curve offset from the screen line
        let xVal = screenX + (intensity * 40); // Amplitude of 40px
        
        if (y === 0) ctx.moveTo(xVal, y);
        else ctx.lineTo(xVal, y);
    }
    ctx.stroke();
    
    // Fill the area
    ctx.lineTo(screenX, h);
    ctx.lineTo(screenX, 0);
    ctx.fillStyle = 'rgba(255, 94, 98, 0.2)';
    ctx.fill();
}

function drawGeometryRays(w, h, cx, cy, sx) {
    // Calculate the Y position on the screen for m=1
    // In physics: sin(theta) = lambda/d
    // On canvas: we use the same schematic visualScale from drawIntensityProfile to ensure alignment
    
    let ratio = state.lambda / state.d;
    
    // We need to match the peak of the intensity graph we just drew.
    // The first zero of cos^2(k*y) is at k*y = pi/2 -> y = pi/(2k).
    // The first peak (m=1) is at k*y = pi -> y = pi/k.
    // In drawIntensity, k = PI / visualScale.
    // So Peak Y = visualScale.
    
    const visualScale = 2000 * ratio;
    const yOffset = visualScale;

    // Limit yOffset to stay within canvas for sanity
    if (yOffset > h/2) return; // Off screen

    const targetY_up = cy - yOffset;
    
    // Draw Ray Line
    ctx.strokeStyle = '#ffd700'; // Gold
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(sx, targetY_up);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Point on screen
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(sx, targetY_up, 4, 0, Math.PI*2);
    ctx.fill();

    // Draw Label
    ctx.fillStyle = '#fff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`m=1 (${state.theta.toFixed(1)}°)`, sx + 10, targetY_up + 4);
}

// Start simulation
init();