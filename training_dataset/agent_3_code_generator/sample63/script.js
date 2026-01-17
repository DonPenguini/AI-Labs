// Canvas Setup
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const i0Slider = document.getElementById('i0-slider');
const thetaSlider = document.getElementById('theta-slider');
const i0Display = document.getElementById('i0-val');
const thetaDisplay = document.getElementById('theta-val');
const degDisplay = document.getElementById('deg-val');
const outputDisplay = document.getElementById('output-i');

// State Variables
let state = {
    I0: 5000,           // Incident Intensity
    theta: 0,           // Angle in radians
    I: 5000,            // Transmitted Intensity
    time: 0             // For animation
};

// Resize Canvas
function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = 400; // Fixed height for simulation
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Constants for Visualization
const MAX_I0 = 10000;
const WAVE_SPEED = 0.1;
const FREQUENCY = 0.1;
const SCALE_FACTOR = 80; // Scale amplitude for drawing

// Logic
function calculate() {
    // Malus' Law: I = I0 * cos^2(theta)
    const cosTheta = Math.cos(state.theta);
    state.I = state.I0 * (cosTheta * cosTheta);
}

function updateUI() {
    i0Display.textContent = state.I0;
    thetaDisplay.textContent = parseFloat(state.theta).toFixed(2);
    degDisplay.textContent = (state.theta * (180 / Math.PI)).toFixed(0);
    outputDisplay.textContent = state.I.toFixed(2);
}

// Drawing Helper: Draw Sine Wave
// startX, endX: Horizontal bounds
// amplitude: Wave height
// angle: Rotation of the vibration plane (0 is vertical)
// phase: Animation offset
function drawWave(startX, endX, amplitude, angle, phase, color, opacity) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(${color}, ${opacity})`;
    ctx.lineWidth = 3;

    const centerY = canvas.height / 2;
    const step = 2; // Pixel step for smoothness

    // We draw the wave as if it's 3D projected onto 2D.
    // A vertical wave (angle 0) oscillates in Y.
    // A horizontal wave (angle PI/2) oscillates in Z (depth), which we simulate via perspective or just flat.
    // To make it clear, we will rotate the drawing context.

    // Save context to rotate for polarization angle
    ctx.save();
    
    // We visualize the "envelope" of polarization by rotating the wave on the canvas plane
    // This is a stylistic choice to show the angle clearly.
    // In reality, it rotates around the propagation axis (Z), but here we map polarization angle to screen Y-X rotation
    // so the user can "see" the angle physically.
    
    // However, rotating the whole wave path looks like the light is changing direction.
    // Better visualization:
    // The wave travels Left -> Right (X-axis).
    // The vibration is in the Y-Z plane.
    // We will draw the projection of the vibration onto the screen Y axis.
    // Amplitude displayed = Real Amplitude * cos(visual_angle).
    // But to show the "twist", we can draw "slanted" lines representing the field vectors.
    
    for (let x = startX; x <= endX; x += step) {
        // Sine calculation
        const k = 0.05; // Wave number
        const yRaw = amplitude * Math.sin(k * (x - startX) - phase);
        
        // Apply rotation to the vector (x, y)
        // Actually, the wave propagates in X. Displacement is in the plane perpendicular to X.
        // Let's draw the displacement vector at the specific angle.
        
        const yDisp = yRaw * Math.cos(angle); // Project on Y
        const xDisp = -yRaw * Math.sin(angle) * 0.3; // Project on X (foreshortened for pseudo-3D)
        
        // We add xDisp to current x, yDisp to centerY
        if (x === startX) {
            ctx.moveTo(x + xDisp, centerY + yDisp);
        } else {
            ctx.lineTo(x + xDisp, centerY + yDisp);
        }
    }
    
    ctx.stroke();
    ctx.restore();
}

// Drawing Helper: Draw Polarizer Filter
function drawPolarizer(x, angle) {
    const centerY = canvas.height / 2;
    const radius = 90;

    ctx.save();
    ctx.translate(x, centerY);
    
    // Outer Frame
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(50, 50, 60, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Rotate for the slit
    ctx.rotate(angle);

    // Draw Slit / Axis
    ctx.beginPath();
    ctx.moveTo(0, -radius);
    ctx.lineTo(0, radius);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Grating lines (aesthetic)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for(let i = -radius + 10; i < radius; i+=10) {
        ctx.beginPath();
        ctx.moveTo(i, -Math.sqrt(radius*radius - i*i));
        ctx.lineTo(i, Math.sqrt(radius*radius - i*i));
        ctx.stroke();
    }

    ctx.restore();
}

function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerY = canvas.height / 2;
    const polarizerX = canvas.width / 2;
    
    // Normalize Amplitude based on Max Intensity
    // Amplitude is proportional to sqrt(Intensity)
    const maxAmp = SCALE_FACTOR;
    const inputAmp = Math.sqrt(state.I0 / MAX_I0) * maxAmp;
    const outputAmp = Math.sqrt(state.I / MAX_I0) * maxAmp;

    // 1. Draw Incident Wave (Left of Polarizer)
    // Assume incident is vertically polarized (Angle = 0)
    // To make it look "unfiltered", we sometimes draw chaotic waves, 
    // but the problem implies I0 is incident intensity. 
    // Usually Malus law implies I0 is the intensity of *polarized* light hitting the analyzer.
    // So we draw a vertically polarized wave.
    drawWave(0, polarizerX - 40, inputAmp, 0, state.time, "255, 200, 0", 1.0);

    // Draw Light Beam (Glow effect background)
    ctx.globalCompositeOperation = 'screen';
    const grd = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grd.addColorStop(0, `rgba(255, 200, 0, ${state.I0/MAX_I0 * 0.2})`);
    grd.addColorStop(0.5, `rgba(255, 200, 0, ${state.I0/MAX_I0 * 0.2})`);
    grd.addColorStop(0.51, `rgba(255, 200, 0, ${state.I/MAX_I0 * 0.2})`);
    grd.addColorStop(1, `rgba(255, 200, 0, ${state.I/MAX_I0 * 0.1})`);
    ctx.fillStyle = grd;
    ctx.fillRect(0, centerY - 100, canvas.width, 200);
    ctx.globalCompositeOperation = 'source-over';

    // 2. Draw Transmitted Wave (Right of Polarizer)
    // Angle matches the polarizer angle
    // Amplitude matches calculated I
    drawWave(polarizerX + 40, canvas.width, outputAmp, state.theta, state.time, "255, 200, 0", 1.0);

    // 3. Draw Polarizer
    drawPolarizer(polarizerX, state.theta);
    
    // Draw Axis Arrows (Coordinate System Helper)
    // Left side (Vertical)
    if (state.I0 > 0) {
        ctx.beginPath();
        ctx.strokeStyle = "#FFF";
        ctx.lineWidth = 2;
        ctx.moveTo(50, centerY - inputAmp);
        ctx.lineTo(50, centerY + inputAmp);
        // Arrowheads
        ctx.moveTo(45, centerY - inputAmp + 5);
        ctx.lineTo(50, centerY - inputAmp);
        ctx.lineTo(55, centerY - inputAmp + 5);
        ctx.stroke();
        ctx.fillStyle = "#FFF";
        ctx.fillText("E0", 45, centerY - inputAmp - 10);
    }

    // Right side (Rotated)
    if (state.I > 0) {
        const xBase = polarizerX + 100;
        const xDisp = -outputAmp * Math.sin(state.theta) * 0.3;
        const yDisp = outputAmp * Math.cos(state.theta);
        
        ctx.beginPath();
        ctx.strokeStyle = "#FFF";
        ctx.moveTo(xBase - xDisp, centerY - yDisp);
        ctx.lineTo(xBase + xDisp, centerY + yDisp);
        ctx.stroke();
        ctx.fillText("E", xBase, centerY - yDisp - 10);
    }

    // Update Animation Time
    state.time += WAVE_SPEED;
    
    requestAnimationFrame(draw);
}

// Event Listeners
i0Slider.addEventListener('input', (e) => {
    state.I0 = parseFloat(e.target.value);
    calculate();
    updateUI();
});

thetaSlider.addEventListener('input', (e) => {
    state.theta = parseFloat(e.target.value);
    calculate();
    updateUI();
});

// Initialization
calculate();
updateUI();
requestAnimationFrame(draw);