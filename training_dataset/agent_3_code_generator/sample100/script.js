// Global variables
let n = 10;
let p = 0.5;
let k = 5;
let chart = null;

// DOM elements
const nSlider = document.getElementById('n-slider');
const nInput = document.getElementById('n-input');
const pSlider = document.getElementById('p-slider');
const pInput = document.getElementById('p-input');
const kSlider = document.getElementById('k-slider');
const kInput = document.getElementById('k-input');
const resultBox = document.getElementById('result-box');
const resultK = document.getElementById('result-k');
const resultValue = document.getElementById('result-value');
const resultPercent = document.getElementById('result-percent');
const canvas = document.getElementById('distributionChart');
const ctx = canvas.getContext('2d');

// Compute binomial coefficient C(n,k)
function binomialCoeff(n, k) {
    if (k > n || k < 0) return 0;
    if (k === 0 || k === n) return 1;
    
    let result = 1;
    for (let i = 1; i <= Math.min(k, n - k); i++) {
        result *= (n - i + 1) / i;
    }
    return result;
}

// Compute binomial PMF
function binomialPMF(n, k, p) {
    if (k > n || k < 0 || p < 0 || p > 1) return 0;
    const coeff = binomialCoeff(n, k);
    return coeff * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

// Update k slider max based on n
function updateKSliderMax() {
    kSlider.max = n;
    kInput.max = n;
    if (k > n) {
        k = n;
        kSlider.value = k;
        kInput.value = k;
    }
}

// Animate result box
function animateResult() {
    resultBox.classList.add('animating');
    setTimeout(() => {
        resultBox.classList.remove('animating');
    }, 300);
}

// Update probability display
function updateProbability() {
    const prob = binomialPMF(n, k, p);
    resultK.textContent = k;
    resultValue.textContent = prob.toFixed(8);
    resultPercent.textContent = `≈ ${(prob * 100).toFixed(4)}%`;
    animateResult();
}

// Draw distribution chart
function drawChart() {
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Generate distribution data
    const maxDisplay = Math.min(n, 50);
    const step = n > 50 ? Math.ceil(n / 50) : 1;
    const data = [];
    let maxProb = 0;
    
    for (let i = 0; i <= n; i += step) {
        const prob = binomialPMF(n, i, p);
        data.push({ k: i, prob: prob });
        maxProb = Math.max(maxProb, prob);
    }
    
    // Chart dimensions
    const padding = 60;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // Draw axes
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw grid lines
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Draw Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const y = height - padding - (chartHeight * i / 5);
        const value = (maxProb * i / 5).toFixed(3);
        ctx.fillText(value, padding - 10, y + 4);
    }
    
    // Draw X-axis label
    ctx.textAlign = 'center';
    ctx.fillText('Number of Successes (k)', width / 2, height - 20);
    
    // Draw Y-axis label
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Probability', 0, 0);
    ctx.restore();
    
    // Draw bars
    const barWidth = chartWidth / data.length;
    const barGap = barWidth * 0.1;
    
    data.forEach((point, index) => {
        const barHeight = (point.prob / maxProb) * chartHeight;
        const x = padding + (index * barWidth) + barGap;
        const y = height - padding - barHeight;
        const width = barWidth - 2 * barGap;
        
        // Determine bar color
        const isSelected = point.k === k;
        ctx.fillStyle = isSelected ? '#6366f1' : '#8b5cf6';
        ctx.globalAlpha = isSelected ? 1.0 : 0.6;
        
        // Draw bar with rounded top
        ctx.beginPath();
        ctx.moveTo(x, height - padding);
        ctx.lineTo(x, y + 8);
        ctx.arcTo(x, y, x + 8, y, 8);
        ctx.lineTo(x + width - 8, y);
        ctx.arcTo(x + width, y, x + width, y + 8, 8);
        ctx.lineTo(x + width, height - padding);
        ctx.closePath();
        ctx.fill();
        
        // Draw X-axis labels for selected points
        if (data.length <= 20 || index % 5 === 0 || isSelected) {
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#6b7280';
            ctx.font = isSelected ? 'bold 12px sans-serif' : '11px sans-serif';
            ctx.fillText(point.k, x + width / 2, height - padding + 20);
        }
    });
    
    ctx.globalAlpha = 1.0;
    
    // Draw reference line for selected k
    const selectedIndex = data.findIndex(d => d.k === k);
    if (selectedIndex !== -1) {
        const x = padding + (selectedIndex * barWidth) + barWidth / 2;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

// Resize canvas to match container
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    drawChart();
}

// Event listeners for n
nSlider.addEventListener('input', (e) => {
    n = parseInt(e.target.value);
    nInput.value = n;
    updateKSliderMax();
    updateProbability();
    drawChart();
});

nInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value >= 1 && value <= 100) {
        n = value;
        nSlider.value = n;
        updateKSliderMax();
        updateProbability();
        drawChart();
    }
});

// Event listeners for p
pSlider.addEventListener('input', (e) => {
    p = parseFloat(e.target.value);
    pInput.value = p;
    updateProbability();
    drawChart();
});

pInput.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    if (value >= 0 && value <= 1) {
        p = value;
        pSlider.value = p;
        updateProbability();
        drawChart();
    }
});

// Event listeners for k
kSlider.addEventListener('input', (e) => {
    k = parseInt(e.target.value);
    kInput.value = k;
    updateProbability();
    drawChart();
});

kInput.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    if (value >= 0 && value <= n) {
        k = value;
        kSlider.value = k;
        updateProbability();
        drawChart();
    }
});

// Window resize handler
window.addEventListener('resize', resizeCanvas);

// Initialize
window.addEventListener('load', () => {
    resizeCanvas();
    updateProbability();
});