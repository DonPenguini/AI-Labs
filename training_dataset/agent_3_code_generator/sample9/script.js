// --- Elements ---
const principalSlider = document.getElementById('principal');
const principalNum = document.getElementById('principal-num');
const rateSlider = document.getElementById('rate');
const rateVal = document.getElementById('rate-val');
const yearsSlider = document.getElementById('years');
const yearsVal = document.getElementById('years-val');

const futureValueEl = document.getElementById('future-value');
const totalInterestEl = document.getElementById('total-interest');
const apyValueEl = document.getElementById('apy-value');

const canvas = document.getElementById('growthChart');
const ctx = canvas.getContext('2d');

// --- State ---
let P = 10000;    // Principal
let r = 0.05;     // Annual Nominal Rate (decimal)
let t = 10;       // Years
let animationFrameId;
let chartProgress = 0; // 0 to 1 for animation

// --- Initialization ---
function init() {
    resizeCanvas();
    updateValues();
    animateChart(); // Start the loop
}

// --- Event Listeners ---
principalSlider.addEventListener('input', (e) => {
    P = parseFloat(e.target.value);
    principalNum.value = P;
    resetAnimation();
});

principalNum.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if(val < 0) val = 0;
    P = val;
    principalSlider.value = val; // Might max out, but that's UI behavior
    resetAnimation();
});

rateSlider.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    rateVal.textContent = val.toFixed(1);
    r = val / 100;
    resetAnimation();
});

yearsSlider.addEventListener('input', (e) => {
    t = parseInt(e.target.value);
    yearsVal.textContent = t;
    resetAnimation();
});

window.addEventListener('resize', () => {
    resizeCanvas();
    drawChart(1); // Redraw immediately on resize
});

function resizeCanvas() {
    // Make canvas sharp on high DPI screens
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    // Store CSS dimensions for logic
    canvas.cssWidth = rect.width;
    canvas.cssHeight = rect.height;
}

function resetAnimation() {
    updateValues(); // Update text immediately
    chartProgress = 0; // Reset chart drawing
}

// --- Logic ---
function updateValues() {
    const monthlyRate = r / 12;
    const months = t * 12;
    
    // Future Value: A = P * (1 + i)^n
    const A = P * Math.pow(1 + monthlyRate, months);
    
    // APY: (1 + i)^12 - 1
    const apy = Math.pow(1 + monthlyRate, 12) - 1;

    // Display formatted
    futureValueEl.textContent = formatCurrency(A);
    totalInterestEl.textContent = formatCurrency(A - P);
    apyValueEl.textContent = (apy * 100).toFixed(2) + "%";
}

function formatCurrency(num) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(num);
}

// --- Animation Loop ---
function animateChart() {
    // Increment progress
    if (chartProgress < 1) {
        chartProgress += 0.02; // Animation speed
        if (chartProgress > 1) chartProgress = 1;
        drawChart(chartProgress);
    }
    
    animationFrameId = requestAnimationFrame(animateChart);
}

// --- Drawing ---
function drawChart(progress) {
    const w = canvas.cssWidth;
    const h = canvas.cssHeight;
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Calc Data Points
    const monthlyRate = r / 12;
    const totalMonths = t * 12;
    const dataPoints = [];
    
    // If t=0, just handle gracefully
    if (totalMonths === 0) {
        // Draw empty state or single point
        return;
    }

    // Generate monthly data
    for (let i = 0; i <= totalMonths; i++) {
        const bal = P * Math.pow(1 + monthlyRate, i);
        dataPoints.push(bal);
    }

    const maxVal = dataPoints[dataPoints.length - 1];
    
    // Scales
    // X axis: 0 to totalMonths
    // Y axis: 0 to maxVal * 1.1 (for headroom)
    const yMax = maxVal > 0 ? maxVal * 1.1 : 100;
    
    // Helper to map coordinates
    const getX = (monthIndex) => padding.left + (monthIndex / totalMonths) * chartW;
    const getY = (val) => padding.top + chartH - (val / yMax) * chartH;

    // 1. Draw Axes
    ctx.beginPath();
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1;
    
    // Y Axis line
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, h - padding.bottom);
    
    // X Axis line
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // 2. Draw Grid & Labels
    ctx.fillStyle = "#666";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    
    // Y Grid (5 steps)
    for(let i=0; i<=5; i++) {
        const val = (yMax / 5) * i;
        const yPos = getY(val);
        
        ctx.fillText(compactNumber(val), padding.left - 10, yPos + 3);
        
        ctx.beginPath();
        ctx.strokeStyle = "rgba(0,0,0,0.05)";
        ctx.moveTo(padding.left, yPos);
        ctx.lineTo(w - padding.right, yPos);
        ctx.stroke();
    }

    // X Labels (Years)
    ctx.textAlign = "center";
    const yearStep = Math.max(1, Math.floor(t / 5));
    for (let yr = 0; yr <= t; yr += yearStep) {
        const xPos = getX(yr * 12);
        ctx.fillText(yr + "y", xPos, h - padding.bottom + 15);
    }

    // 3. Draw Curves
    // We determine how many months to draw based on 'progress'
    const currentMaxIndex = Math.floor(totalMonths * progress);
    
    if (currentMaxIndex > 0) {
        // Area under the curve (Interest)
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(0)); // bottom left
        
        for (let i = 0; i <= currentMaxIndex; i++) {
            ctx.lineTo(getX(i), getY(dataPoints[i]));
        }
        
        // Close shape for fill
        ctx.lineTo(getX(currentMaxIndex), getY(0)); 
        ctx.closePath();
        ctx.fillStyle = "rgba(39, 174, 96, 0.2)"; // Green tint
        ctx.fill();

        // The Principal Line (Flat dashed line or rect area at bottom)
        // Let's draw principal as a gray area at the bottom distinct from interest
        // Actually, better to just fill the whole area green (total balance),
        // and draw a grey area for principal at the bottom.
        
        // Principal Area
        const pY = getY(P);
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(0));
        ctx.lineTo(getX(0), pY);
        ctx.lineTo(getX(currentMaxIndex), pY);
        ctx.lineTo(getX(currentMaxIndex), getY(0));
        ctx.fillStyle = "rgba(189, 195, 199, 0.3)"; // Gray tint
        ctx.fill();
        
        // Total Balance Line stroke
        ctx.beginPath();
        ctx.strokeStyle = "#27ae60";
        ctx.lineWidth = 3;
        ctx.moveTo(getX(0), getY(dataPoints[0]));
        for (let i = 1; i <= currentMaxIndex; i++) {
            ctx.lineTo(getX(i), getY(dataPoints[i]));
        }
        ctx.stroke();
    }
}

function compactNumber(num) {
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num);
}

// Start
init();