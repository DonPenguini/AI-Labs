// --- DOM Elements ---
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const inputW1 = document.getElementById('w1');
const inputW2 = document.getElementById('w2');
const inputB = document.getElementById('b');
const labels = {
    w1: document.getElementById('val-w1'),
    w2: document.getElementById('val-w2'),
    b: document.getElementById('val-b'),
    epoch: document.getElementById('epoch-display'),
    loss: document.getElementById('loss-display'),
    eq: document.getElementById('boundary-eq')
};

const btnTrain = document.getElementById('btn-train');
const btnReset = document.getElementById('btn-reset');

// --- State Variables ---
let w1 = 0.1;
let w2 = 0.5;
let b = 0.0;

let points = [];
const numPointsPerClass = 30;
const range = 8; // Coordinate range (-8 to 8)

let isTraining = false;
let epoch = 0;
const learningRate = 0.05;

// --- Initialization ---

function generateData() {
    points = [];
    
    // Helper for random normal distribution (approx)
    const randn = () => {
        let u = 0, v = 0;
        while(u === 0) u = Math.random();
        while(v === 0) v = Math.random();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    // Generate Class 0 (Red) - Centered at (-3, -3)
    for(let i=0; i<numPointsPerClass; i++) {
        points.push({
            x: -3 + randn() * 1.5,
            y: -3 + randn() * 1.5,
            label: 0
        });
    }

    // Generate Class 1 (Blue) - Centered at (3, 3)
    for(let i=0; i<numPointsPerClass; i++) {
        points.push({
            x: 3 + randn() * 1.5,
            y: 3 + randn() * 1.5,
            label: 1
        });
    }

    // Reset Model parameters to random-ish small values
    w1 = (Math.random() - 0.5);
    w2 = (Math.random() - 0.5);
    b = 0;
    epoch = 0;
    
    updateSliders();
    draw();
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 500;
    draw();
}
window.addEventListener('resize', resizeCanvas);

// --- Math & Training Logic ---

function sigmoid(z) {
    return 1 / (1 + Math.exp(-z));
}

function predict(x, y) {
    return sigmoid(w1 * x + w2 * y + b);
}

// Calculate Binary Cross Entropy Loss
function calculateLoss() {
    let sumLoss = 0;
    const m = points.length;
    
    points.forEach(p => {
        let h = predict(p.x, p.y);
        // Clip to avoid log(0)
        h = Math.max(0.00001, Math.min(0.99999, h));
        
        // Loss = -y*log(h) - (1-y)*log(1-h)
        if (p.label === 1) {
            sumLoss += -Math.log(h);
        } else {
            sumLoss += -Math.log(1 - h);
        }
    });
    
    return sumLoss / m;
}

function trainStep() {
    const m = points.length;
    let dw1 = 0;
    let dw2 = 0;
    let db = 0;

    // Gradient Descent Step
    points.forEach(p => {
        const h = predict(p.x, p.y);
        const error = h - p.label; // (prediction - truth)

        dw1 += error * p.x;
        dw2 += error * p.y;
        db += error;
    });

    // Average gradients
    dw1 /= m;
    dw2 /= m;
    db /= m;

    // Update weights
    w1 -= learningRate * dw1;
    w2 -= learningRate * dw2;
    b -= learningRate * db;

    epoch++;
    updateSliders();
}

// --- Visualization ---

// Map simulation coordinates to canvas pixels
function toCanvasX(x) { return canvas.width/2 + (x * (canvas.width/(range*2.5))); }
function toCanvasY(y) { return canvas.height/2 - (y * (canvas.height/(range*2.5 * (canvas.height/canvas.width)))); }
// Map pixels to simulation coordinates
function fromCanvasX(px) { return (px - canvas.width/2) / (canvas.width/(range*2.5)); }
function fromCanvasY(py) { return -(py - canvas.height/2) / (canvas.height/(range*2.5 * (canvas.height/canvas.width))); }

function draw() {
    const w = canvas.width;
    const h = canvas.height;
    
    // 1. Train if active
    if (isTraining) {
        // Run a few steps per frame for speed
        for(let k=0; k<5; k++) trainStep();
    }

    ctx.clearRect(0, 0, w, h);

    // 2. Draw Probability Heatmap (Background)
    const res = 10; // Resolution
    for (let py = 0; py < h; py += res) {
        for (let px = 0; px < w; px += res) {
            const xx = fromCanvasX(px);
            const yy = fromCanvasY(py);
            const prob = predict(xx, yy);

            // Color blending: Red (0) -> White (0.5) -> Blue (1)
            let r, g, b_col, a;
            
            // Using a softer palette
            if (prob < 0.5) {
                // Class 0 zone (Reddish)
                const strength = (0.5 - prob) * 2; 
                ctx.fillStyle = `rgba(239, 68, 68, ${strength * 0.2})`;
            } else {
                // Class 1 zone (Blueish)
                const strength = (prob - 0.5) * 2; 
                ctx.fillStyle = `rgba(59, 130, 246, ${strength * 0.2})`;
            }
            ctx.fillRect(px, py, res, res);
        }
    }

    // 3. Draw Axes
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(0)); ctx.lineTo(w, toCanvasY(0));
    ctx.moveTo(toCanvasX(0), 0); ctx.lineTo(toCanvasX(0), h);
    ctx.stroke();

    // 4. Draw Decision Boundary (Line where w1*x + w2*y + b = 0)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    // Find two points to draw the line
    // y = -(w1*x + b)/w2
    const xStart = -range * 1.5;
    const xEnd = range * 1.5;
    
    if (Math.abs(w2) > 0.001) {
        const yStart = -(w1 * xStart + b) / w2;
        const yEnd = -(w1 * xEnd + b) / w2;
        ctx.moveTo(toCanvasX(xStart), toCanvasY(yStart));
        ctx.lineTo(toCanvasX(xEnd), toCanvasY(yEnd));
    } else {
        // Vertical line case
        const xVert = -b / w1;
        ctx.moveTo(toCanvasX(xVert), 0);
        ctx.lineTo(toCanvasX(xVert), h);
    }
    ctx.stroke();

    // 5. Draw Data Points
    points.forEach(p => {
        const cx = toCanvasX(p.x);
        const cy = toCanvasY(p.y);
        
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI*2);
        
        // Solid color based on TRUE label
        ctx.fillStyle = p.label === 1 ? '#3b82f6' : '#ef4444';
        ctx.fill();
        
        // Border indicates prediction correctness
        // If prediction matches label, white border. If wrong, dark border.
        const pred = predict(p.x, p.y) >= 0.5 ? 1 : 0;
        ctx.strokeStyle = (pred === p.label) ? 'white' : 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    // 6. Loop
    if (isTraining) {
        requestAnimationFrame(draw);
    }
}

// --- UI Helper Functions ---

function updateSliders() {
    // Update Slider UI positions
    inputW1.value = w1;
    inputW2.value = w2;
    inputB.value = b;
    
    // Update Text Labels
    labels.w1.textContent = w1.toFixed(2);
    labels.w2.textContent = w2.toFixed(2);
    labels.b.textContent = b.toFixed(2);
    
    // Update Stats
    labels.epoch.textContent = epoch;
    labels.loss.textContent = calculateLoss().toFixed(3);
    
    // Update Equation using MathJax
    const tex = `$$ ${w1.toFixed(2)}x_1 + ${w2.toFixed(2)}x_2 + ${b.toFixed(2)} = 0 $$`;
    labels.eq.innerHTML = tex;
    if(window.MathJax) MathJax.typesetPromise([labels.eq]);
}

// --- Event Listeners ---

// Manual Slider Inputs
const handleManualInput = () => {
    // Stop auto-training if user touches slider
    if (isTraining) toggleTraining(); 
    
    w1 = parseFloat(inputW1.value);
    w2 = parseFloat(inputW2.value);
    b = parseFloat(inputB.value);
    updateSliders();
    draw();
};

inputW1.addEventListener('input', handleManualInput);
inputW2.addEventListener('input', handleManualInput);
inputB.addEventListener('input', handleManualInput);

// Buttons
function toggleTraining() {
    isTraining = !isTraining;
    if (isTraining) {
        btnTrain.textContent = "Pause Training";
        btnTrain.classList.remove('primary');
        btnTrain.classList.add('secondary');
        draw(); // triggers loop
    } else {
        btnTrain.textContent = "Resume Training";
        btnTrain.classList.add('primary');
        btnTrain.classList.remove('secondary');
    }
}

btnTrain.addEventListener('click', toggleTraining);

btnReset.addEventListener('click', () => {
    isTraining = false;
    btnTrain.textContent = "Start Training";
    btnTrain.classList.add('primary');
    generateData();
});

// Start
generateData();
resizeCanvas();