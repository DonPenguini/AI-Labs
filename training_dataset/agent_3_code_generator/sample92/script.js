// DOM Elements
const canvas = document.getElementById('scatterCanvas');
const ctx = canvas.getContext('2d');
const covInput = document.getElementById('covInput');
const sxInput = document.getElementById('sxInput');
const syInput = document.getElementById('syInput');
const covVal = document.getElementById('covVal');
const sxVal = document.getElementById('sxVal');
const syVal = document.getElementById('syVal');
const rOutput = document.getElementById('rOutput');
const meterFill = document.getElementById('meterFill');
const demoBtn = document.getElementById('demoBtn');
const animOverlay = document.getElementById('animOverlay');
const animTitle = document.getElementById('animTitle');
const animText = document.getElementById('animText');

// Constants
const NUM_POINTS = 300;
const Z1 = new Float32Array(NUM_POINTS);
const Z2 = new Float32Array(NUM_POINTS);
const SCALE = 15;

// State
let width, height, centerX, centerY;
let isAnimating = false;
let animationFrameId;

// Initialize Noise (Standard Normal)
function initNoise() {
    for (let i = 0; i < NUM_POINTS; i++) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        Z1[i] = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        Z2[i] = Math.sqrt(-2.0 * Math.log(u)) * Math.sin(2.0 * Math.PI * v);
    }
}

// Resize Canvas
function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
    centerX = width / 2;
    centerY = height / 2;
    if (!isAnimating) draw();
}
window.addEventListener('resize', resize);

// --- Core Physics/Math Logic ---
function getValues() {
    return {
        cov: parseFloat(covInput.value),
        sx: parseFloat(sxInput.value),
        sy: parseFloat(syInput.value)
    };
}

function calculateR(cov, sx, sy) {
    if (sx * sy === 0) return 0;
    let r = cov / (sx * sy);
    return Math.max(-1, Math.min(1, r)); // Clamp
}

function draw() {
    // 1. Calc Math
    const vals = getValues();
    const r = calculateR(vals.cov, vals.sx, vals.sy);

    // 2. Update Text UI
    covVal.textContent = vals.cov.toFixed(1);
    sxVal.textContent = vals.sx.toFixed(1);
    syVal.textContent = vals.sy.toFixed(1);
    rOutput.textContent = r.toFixed(3);
    
    // 3. Update Meter
    const pct = ((r + 1) / 2) * 100;
    meterFill.style.left = `${pct}%`;
    meterFill.style.backgroundColor = Math.abs(r) > 0.8 ? '#2ecc71' : '#4a90e2';

    // 4. Draw Canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Grid Lines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
    ctx.stroke();

    // Points
    const rCompl = Math.sqrt(Math.max(0, 1 - r*r));
    ctx.fillStyle = `rgba(${r>0?46:231}, ${r>0?204:76}, ${r>0?113:60}, 0.8)`; // Green if pos, Red if neg

    for (let i = 0; i < NUM_POINTS; i++) {
        const x_stat = vals.sx * Z1[i];
        const y_stat = vals.sy * (r * Z1[i] + rCompl * Z2[i]);

        const px = centerX + (x_stat * SCALE);
        const py = centerY - (y_stat * SCALE);
        
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI*2);
        ctx.fill();
    }
}

// --- Animation / Demo Logic ---

const demoSequence = [
    { 
        cov: 0, sx: 10, sy: 10, time: 2000, 
        title: "No Correlation (r = 0)", 
        text: "When Covariance is 0, X and Y are independent. The shape is a round cloud."
    },
    { 
        cov: 80, sx: 10, sy: 10, time: 3000, 
        title: "Positive Correlation", 
        text: "As Covariance increases, Y tends to increase with X. The cloud stretches into a line sloping up." 
    },
    { 
        cov: 100, sx: 10, sy: 10, time: 3000, 
        title: "Perfect Positive (r = 1)", 
        text: "Maximum Covariance for these standard deviations! All points fall exactly on a line." 
    },
    { 
        cov: 0, sx: 5, sy: 15, time: 2000, 
        title: "Changing Spread", 
        text: "Even with r=0, changing Standard Deviations (sx, sy) squashes or stretches the cloud without tilting it." 
    },
    { 
        cov: -60, sx: 10, sy: 10, time: 3000, 
        title: "Negative Correlation", 
        text: "Negative Covariance means Y decreases as X increases. The slope flips downward." 
    }
];

let demoIndex = 0;
let lastTime = 0;
let transitionProgress = 0;

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function animateLoop(timestamp) {
    if (!isAnimating) return;
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    const currentStep = demoSequence[demoIndex];
    const nextIndex = (demoIndex + 1) % demoSequence.length;
    const nextStep = demoSequence[nextIndex];

    // Show Overlay Text
    animOverlay.classList.remove('hidden');
    animTitle.innerText = currentStep.title;
    animText.innerText = currentStep.text;

    // Interpolate values
    // We move from 'currentStep' targets to 'nextStep' targets
    // But to make it pause for reading, we can handle logic differently.
    // Simplified: Just lerp sliders towards current target.
    
    // Smoothly move sliders to target
    const speed = 0.05; // Smoothing factor
    
    let currCov = parseFloat(covInput.value);
    let currSx = parseFloat(sxInput.value);
    let currSy = parseFloat(syInput.value);

    // Determine target
    const targetCov = currentStep.cov;
    const targetSx = currentStep.sx;
    const targetSy = currentStep.sy;

    // Apply Lerp
    covInput.value = lerp(currCov, targetCov, speed);
    sxInput.value = lerp(currSx, targetSx, speed);
    syInput.value = lerp(currSy, targetSy, speed);

    draw();

    // Check if we are "close enough" to target to consider this step done
    // Or just use a timer. Let's use a timer for simplicity.
    transitionProgress += dt;
    if (transitionProgress > currentStep.time) {
        transitionProgress = 0;
        demoIndex = nextIndex;
    }

    animationFrameId = requestAnimationFrame(animateLoop);
}

function toggleDemo() {
    isAnimating = !isAnimating;
    if (isAnimating) {
        demoBtn.textContent = "⏹ Stop Animation";
        demoBtn.classList.add('active');
        lastTime = 0;
        transitionProgress = 0;
        // Disable inputs during demo
        covInput.disabled = true;
        sxInput.disabled = true;
        syInput.disabled = true;
        
        requestAnimationFrame(animateLoop);
    } else {
        demoBtn.textContent = "▶ Start Animation Loop";
        demoBtn.classList.remove('active');
        animOverlay.classList.add('hidden');
        cancelAnimationFrame(animationFrameId);
        
        // Re-enable inputs
        covInput.disabled = false;
        sxInput.disabled = false;
        syInput.disabled = false;
    }
}

// Event Listeners
covInput.addEventListener('input', draw);
sxInput.addEventListener('input', draw);
syInput.addEventListener('input', draw);
demoBtn.addEventListener('click', toggleDemo);

// Init
initNoise();
resize();
draw();