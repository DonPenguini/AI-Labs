// --- DOM Elements ---
const canvas = document.getElementById('lossCanvas');
const ctx = canvas.getContext('2d');

const inputP = document.getElementById('prob-p');
const valP = document.getElementById('val-p');
const barFill = document.getElementById('prob-bar-fill');

const btnY0 = document.getElementById('btn-y0');
const btnY1 = document.getElementById('btn-y1');
const labelDesc = document.getElementById('label-desc');

const valLoss = document.getElementById('val-loss');
const lossDesc = document.getElementById('loss-meaning');
const mathFormula = document.getElementById('math-formula');

// Visual Explanation Elements
const liquid0 = document.getElementById('liquid-0');
const liquid1 = document.getElementById('liquid-1');

// --- State ---
let y = 0; // True Label
let p = 0.1; // Predicted Probability

// --- Initialization ---
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = 350;
    drawGraph();
}
window.addEventListener('resize', resizeCanvas);

// --- Logic ---

function setLabel(newY) {
    y = newY;
    
    // Update UI Buttons
    if (y === 0) {
        btnY0.classList.add('active');
        btnY1.classList.remove('active');
        labelDesc.textContent = "Target: Class 0 (Negative)";
        // Update MathJax to highlight relevant part
        updateFormulaHighlight(0);
    } else {
        btnY1.classList.add('active');
        btnY0.classList.remove('active');
        labelDesc.textContent = "Target: Class 1 (Positive)";
        updateFormulaHighlight(1);
    }
    
    updateSimulation();
}

function calculateLoss(y_true, p_pred) {
    // Avoid log(0) errors
    const epsilon = 1e-9;
    const p_safe = Math.max(epsilon, Math.min(1 - epsilon, p_pred));
    
    // Formula: -[y*log(p) + (1-y)*log(1-p)]
    if (y_true === 1) {
        return -Math.log(p_safe);
    } else {
        return -Math.log(1 - p_safe);
    }
}

function updateFormulaHighlight(targetY) {
    // Re-render MathJax with conditional coloring if possible, 
    // or simply update the text logic. 
    // For simplicity here, we stick to the static formula 
    // but we could swap innerHTML to bold the active term.
    let formulaHtml = "";
    if (targetY === 1) {
        formulaHtml = `$$ L = -[\\mathbf{1} \\cdot \\log(p) + 0] = -\\log(p) $$`;
    } else {
        formulaHtml = `$$ L = -[0 + \\mathbf{1} \\cdot \\log(1-p)] = -\\log(1-p) $$`;
    }
    mathFormula.innerHTML = formulaHtml;
    if(window.MathJax) MathJax.typesetPromise([mathFormula]);
}

function updateSimulation() {
    // Get P
    p = parseFloat(inputP.value);
    
    // Update UI Texts
    valP.textContent = p.toFixed(2);
    barFill.style.width = (p * 100) + "%";

    // Calculate Loss
    const loss = calculateLoss(y, p);
    valLoss.textContent = loss.toFixed(3);

    // Contextual Message
    if (loss < 0.2) {
        lossDesc.textContent = "Low Loss: Excellent Prediction!";
        lossDesc.style.color = "#10b981"; // Green
    } else if (loss < 0.7) {
        lossDesc.textContent = "Moderate Loss: Prediction is uncertain.";
        lossDesc.style.color = "#f59e0b"; // Orange
    } else {
        lossDesc.textContent = "High Loss: Model is confidently wrong!";
        lossDesc.style.color = "#ef4444"; // Red
    }

    // Update Buckets Animation
    // Liquid 1 represents P(y=1)
    liquid1.style.height = (p * 100) + "%";
    // Liquid 0 represents P(y=0) = 1 - p
    liquid0.style.height = ((1 - p) * 100) + "%";

    drawGraph();
}

// --- Drawing ---

function drawGraph() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Padding
    const padLeft = 50;
    const padRight = 30;
    const padTop = 30;
    const padBottom = 40;

    const graphW = w - padLeft - padRight;
    const graphH = h - padTop - padBottom;

    // --- Draw Axes ---
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Y Axis
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, h - padBottom);
    // X Axis
    ctx.moveTo(padLeft, h - padBottom);
    ctx.lineTo(w - padRight, h - padBottom);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText("Predicted Probability (p)", padLeft + graphW/2, h - 10);
    
    ctx.save();
    ctx.translate(15, padTop + graphH/2);
    ctx.rotate(-Math.PI/2);
    ctx.fillText("Loss (L)", 0, 0);
    ctx.restore();

    ctx.fillText("0", padLeft, h - padBottom + 20);
    ctx.fillText("1", w - padRight, h - padBottom + 20);

    // --- Draw Curve Function ---
    // We draw the curve for the CURRENT active label y
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = (y === 1) ? '#4f46e5' : '#ef4444'; // Blue for y=1, Red for y=0

    // Plot points
    // x goes from 0.01 to 0.99 to avoid Infinity
    for (let i = 0; i <= graphW; i++) {
        // Normalize pixel to 0..1 range
        const xRatio = i / graphW;
        // Clamp slightly to avoid edge infinity
        let pVal = 0.005 + (xRatio * 0.99); 
        
        let lossVal = 0;
        if (y === 1) {
            lossVal = -Math.log(pVal);
        } else {
            lossVal = -Math.log(1 - pVal);
        }

        // Map loss to Y pixel
        // Let's say max visible loss is roughly 5.0 for scaling
        const maxDisplayLoss = 5.0;
        const yRatio = Math.min(lossVal, maxDisplayLoss) / maxDisplayLoss;
        
        const px = padLeft + i;
        const py = (h - padBottom) - (yRatio * graphH);

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // --- Draw Current Point Marker ---
    const currentLoss = calculateLoss(y, p);
    const maxDisplayLoss = 5.0;
    const yRatioCurrent = Math.min(currentLoss, maxDisplayLoss) / maxDisplayLoss;

    const markerX = padLeft + (p * graphW);
    const markerY = (h - padBottom) - (yRatioCurrent * graphH);

    // Draw Line down
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.moveTo(markerX, markerY);
    ctx.lineTo(markerX, h - padBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Dot
    ctx.beginPath();
    ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15'; // Yellow
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

// --- Events ---
inputP.addEventListener('input', updateSimulation);

// Initialize
resizeCanvas(); // Sets up canvas size
setLabel(0); // Set initial state
updateSimulation(); // Draw