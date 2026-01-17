// Calculate discrete exponential
function calculateDiscreteExp(x0, r, n) {
    const base = 1 + r;
    const multiplier = Math.pow(base, n);
    const xn = x0 * multiplier;
    const change = xn - x0;
    const changePercent = x0 !== 0 ? (change / x0) * 100 : 0;
    
    return {
        base,
        multiplier,
        xn,
        change,
        changePercent
    };
}

// Generate sequence
function generateSequence(x0, r, maxN) {
    const sequence = [];
    for (let n = 0; n <= maxN; n++) {
        const value = x0 * Math.pow(1 + r, n);
        sequence.push({ n, value });
    }
    return sequence;
}

// Canvas Chart Base Class
class ChartCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawAxes(padding, maxY, minY = 0, xLabel = 'n', yLabel = 'Value') {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.stroke();

        // Grid
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (h - 2 * padding) * i / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(xLabel, w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(yLabel, 0, 0);
        ctx.restore();

        // Y-axis values
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const val = maxY - (maxY - minY) * i / 5;
            const y = padding + (h - 2 * padding) * i / 5;
            ctx.fillText(formatNumber(val), padding - 10, y + 4);
        }
    }
}

// Trajectory Chart
class TrajectoryChart extends ChartCanvas {
    draw(x0, r, n, animationStep = null) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 70;

        const sequence = generateSequence(x0, r, n);
        const values = sequence.map(s => s.value);
        const maxY = Math.max(...values, x0);
        const minY = Math.min(...values, 0);
        const range = maxY - minY || 1;

        this.drawAxes(padding, maxY, minY, 'Step (n)', 'Value (xₙ)');

        // Draw line
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#00d2ff');
        gradient.addColorStop(1, '#3a7bd5');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();

        const displayN = animationStep !== null ? Math.min(animationStep, n) : n;

        for (let i = 0; i <= displayN; i++) {
            const x = padding + (w - 2 * padding) * i / n;
            const y = h - padding - (h - 2 * padding) * (sequence[i].value - minY) / range;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw points
        for (let i = 0; i <= displayN; i++) {
            const x = padding + (w - 2 * padding) * i / n;
            const y = h - padding - (h - 2 * padding) * (sequence[i].value - minY) / range;
            
            ctx.fillStyle = i === displayN ? '#f5576c' : '#3a7bd5';
            ctx.beginPath();
            ctx.arc(x, y, i === displayN ? 8 : 4, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Highlight final value
        if (animationStep === null || animationStep >= n) {
            const x = padding + (w - 2 * padding);
            const y = h - padding - (h - 2 * padding) * (sequence[n].value - minY) / range;
            
            ctx.strokeStyle = '#f5576c';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

// Steps Bar Chart
class StepsChart extends ChartCanvas {
    draw(x0, r, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const maxDisplay = Math.min(n, 20);
        const sequence = generateSequence(x0, r, maxDisplay);
        const values = sequence.map(s => s.value);
        const maxY = Math.max(...values, 0);
        const minY = Math.min(...values, 0);
        const range = maxY - minY || 1;

        this.drawAxes(padding, maxY, minY, 'Step', 'Value');

        // Draw bars
        for (let i = 0; i <= maxDisplay; i++) {
            const barWidth = (w - 2 * padding) / (maxDisplay + 1) * 0.7;
            const x = padding + (w - 2 * padding) * i / maxDisplay - barWidth / 2;
            const zeroY = h - padding - (h - 2 * padding) * (0 - minY) / range;
            const barY = h - padding - (h - 2 * padding) * (sequence[i].value - minY) / range;
            const barHeight = Math.abs(zeroY - barY);

            const gradient = ctx.createLinearGradient(0, barY, 0, zeroY);
            gradient.addColorStop(0, '#00d2ff');
            gradient.addColorStop(1, '#3a7bd5');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, Math.min(barY, zeroY), barWidth, barHeight);
            
            // Border
            ctx.strokeStyle = '#2c5364';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, Math.min(barY, zeroY), barWidth, barHeight);
        }

        if (n > maxDisplay) {
            ctx.fillStyle = '#666';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`Showing first ${maxDisplay + 1} steps`, w / 2, h - padding + 30);
        }
    }
}

// Growth Factor Chart
class FactorChart extends ChartCanvas {
    draw(x0, r, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const base = 1 + r;
        
        this.drawAxes(padding, Math.max(base, 1), Math.min(base, 0), 'All Steps', 'Growth Factor');

        // Draw constant factor line
        const factorY = h - padding - (h - 2 * padding) * (base - Math.min(base, 0)) / 
                        Math.max(Math.abs(base), 0.1);

        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, base > 1 ? '#00d2ff' : '#e74c3c');
        gradient.addColorStop(1, base > 1 ? '#3a7bd5' : '#c0392b');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(padding, factorY);
        ctx.lineTo(w - padding, factorY);
        ctx.stroke();

        // Draw 1.0 reference line
        const oneY = h - padding - (h - 2 * padding) * (1 - Math.min(base, 0)) / 
                     Math.max(Math.abs(base), 0.1);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, oneY);
        ctx.lineTo(w - padding, oneY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Factor: ${base.toFixed(3)}`, w / 2, factorY - 15);
    }
}

// Comparison Chart
class ComparisonChart extends ChartCanvas {
    draw(x0, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const rates = [-0.5, 0, 0.05, 0.1, 0.2];
        const colors = ['#e74c3c', '#95a5a6', '#3498db', '#00d2ff', '#27ae60'];
        const sequences = rates.map(r => generateSequence(x0, r, n));
        
        const allValues = sequences.flat().map(s => s.value);
        const maxY = Math.max(...allValues);
        const minY = Math.min(...allValues, 0);
        const range = maxY - minY || 1;

        this.drawAxes(padding, maxY, minY, 'Step', 'Value');

        // Draw lines
        sequences.forEach((seq, idx) => {
            ctx.strokeStyle = colors[idx];
            ctx.lineWidth = 2;
            ctx.beginPath();

            seq.forEach((point, i) => {
                const x = padding + (w - 2 * padding) * i / n;
                const y = h - padding - (h - 2 * padding) * (point.value - minY) / range;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        });

        // Legend
        rates.forEach((r, idx) => {
            const legendY = padding + idx * 20;
            ctx.fillStyle = colors[idx];
            ctx.fillRect(w - 150, legendY, 15, 10);
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`r = ${r.toFixed(2)}`, w - 130, legendY + 9);
        });
    }
}

// Utility function
function formatNumber(num) {
    if (Math.abs(num) >= 1e6) {
        return num.toExponential(2);
    } else if (Math.abs(num) >= 1000) {
        return num.toFixed(0);
    } else {
        return num.toFixed(2);
    }
}

// Initialize charts
let trajectoryChart, stepsChart, factorChart, comparisonChart;

function updateDisplay() {
    const x0 = parseFloat(document.getElementById('x0').value);
    const r = parseFloat(document.getElementById('rate').value);
    const n = parseInt(document.getElementById('steps').value);

    document.getElementById('rateDisplay').textContent = r.toFixed(3);
    document.getElementById('stepsDisplay').textContent = n;

    // Update rate info
    const rateType = r > 0 ? 'Growth' : r < 0 ? 'Decay' : 'Constant';
    const ratePercent = (r * 100).toFixed(1) + '%';
    
    document.getElementById('rateType').textContent = rateType;
    document.getElementById('rateType').style.background = 
        r > 0 ? 'linear-gradient(135deg, #00d2ff, #3a7bd5)' : 
        r < 0 ? 'linear-gradient(135deg, #e74c3c, #c0392b)' :
        'linear-gradient(135deg, #95a5a6, #7f8c8d)';
    
    document.getElementById('ratePercent').textContent = 
        (r >= 0 ? '+' : '') + ratePercent;

    // Calculate characteristics
    if (r > 0) {
        const doublingTime = Math.log(2) / Math.log(1 + r);
        document.getElementById('doublingTime').textContent = doublingTime.toFixed(2) + ' steps';
        document.getElementById('halfLife').textContent = 'N/A';
    } else if (r < 0 && r > -1) {
        const halfLife = Math.log(0.5) / Math.log(1 + r);
        document.getElementById('halfLife').textContent = halfLife.toFixed(2) + ' steps';
        document.getElementById('doublingTime').textContent = 'N/A';
    } else {
        document.getElementById('doublingTime').textContent = 'N/A';
        document.getElementById('halfLife').textContent = 'N/A';
    }

    document.getElementById('sequenceType').textContent = 
        r === 0 ? 'Constant' : 'Geometric';
}

function calculate() {
    const x0 = parseFloat(document.getElementById('x0').value);
    const r = parseFloat(document.getElementById('rate').value);
    const n = parseInt(document.getElementById('steps').value);

    const result = calculateDiscreteExp(x0, r, n);

    // Update result display
    const resultValue = document.getElementById('finalValue');
    resultValue.textContent = formatNumber(result.xn);
    resultValue.classList.add('animating');
    setTimeout(() => resultValue.classList.remove('animating'), 500);

    document.getElementById('base').textContent = result.base.toFixed(4);
    document.getElementById('multiplier').textContent = formatNumber(result.multiplier);
    document.getElementById('totalChange').textContent = 
        (result.change >= 0 ? '+' : '') + formatNumber(result.change);
    document.getElementById('changePercent').textContent = 
        (result.changePercent >= 0 ? '+' : '') + result.changePercent.toFixed(2) + '%';

    // Update charts
    trajectoryChart.draw(x0, r, n);
    stepsChart.draw(x0, r, n);
    factorChart.draw(x0, r, n);
    comparisonChart.draw(x0, n);
    
    // Update table
    updateTable(x0, r, n);
}

function updateTable(x0, r, n) {
    const container = document.getElementById('valueTable');
    const maxRows = 20;
    const sequence = generateSequence(x0, r, Math.min(n, maxRows));

    let html = '<table class="value-table">';
    html += '<thead><tr><th>Step (n)</th><th>Value (xₙ)</th><th>Growth Factor</th></tr></thead>';
    html += '<tbody>';

    sequence.forEach(point => {
        html += `<tr>
            <td>${point.n}</td>
            <td>${formatNumber(point.value)}</td>
            <td>${(1 + r).toFixed(3)}</td>
        </tr>`;
    });

    if (n > maxRows) {
        html += `<tr><td colspan="3" style="text-align:center; color:#888;">
            ... (${n - maxRows} more rows)</td></tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

function animate() {
    const x0 = parseFloat(document.getElementById('x0').value);
    const r = parseFloat(document.getElementById('rate').value);
    const n = parseInt(document.getElementById('steps').value);

    let currentStep = 0;
    const interval = setInterval(() => {
        trajectoryChart.draw(x0, r, n, currentStep);
        
        const result = calculateDiscreteExp(x0, r, currentStep);
        document.getElementById('finalValue').textContent = formatNumber(result.xn);
        
        currentStep++;
        
        if (currentStep > n) {
            clearInterval(interval);
            calculate();
        }
    }, 100);
}

function reset() {
    document.getElementById('x0').value = '100';
    document.getElementById('rate').value = '0.05';
    document.getElementById('steps').value = '10';
    updateDisplay();
    calculate();
}

function loadScenario(scenario) {
    const scenarios = {
        population: { x0: 1000, r: 0.02, n: 50 },
        investment: { x0: 1000, r: 0.07, n: 30 },
        decay: { x0: 1000, r: -0.1, n: 50 },
        compound: { x0: 10000, r: 0.05, n: 20 }
    };

    const params = scenarios[scenario];
    document.getElementById('x0').value = params.x0;
    document.getElementById('rate').value = params.r;
    document.getElementById('steps').value = params.n;
    
    updateDisplay();
    calculate();
}

// Event listeners
window.addEventListener('load', () => {
    trajectoryChart = new TrajectoryChart('trajectoryCanvas');
    stepsChart = new StepsChart('stepsCanvas');
    factorChart = new FactorChart('factorCanvas');
    comparisonChart = new ComparisonChart('comparisonCanvas');

    document.getElementById('x0').addEventListener('input', updateDisplay);
    document.getElementById('rate').addEventListener('input', updateDisplay);
    document.getElementById('steps').addEventListener('input', updateDisplay);

    document.getElementById('calculateBtn').addEventListener('click', calculate);
    document.getElementById('animateBtn').addEventListener('click', animate);
    document.getElementById('resetBtn').addEventListener('click', reset);

    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const scenario = e.currentTarget.dataset.scenario;
            loadScenario(scenario);
        });
    });

    updateDisplay();
    calculate();
});

window.addEventListener('resize', () => {
    trajectoryChart.setupCanvas();
    stepsChart.setupCanvas();
    factorChart.setupCanvas();
    comparisonChart.setupCanvas();
    calculate();
});