// Calculate geometric sum
function calculateGeometricSum(a, r, n) {
    if (Math.abs(r - 1) < 0.001) {
        // When r ≈ 1, use arithmetic sum
        return {
            sum: a * n,
            numerator: null,
            denominator: null,
            rPowerN: null,
            undefined: true
        };
    }
    
    const rPowerN = Math.pow(r, n);
    const numerator = a * (1 - rPowerN);
    const denominator = 1 - r;
    const sum = numerator / denominator;
    
    return {
        sum,
        numerator,
        denominator,
        rPowerN,
        undefined: false
    };
}

// Generate series terms
function generateTerms(a, r, n) {
    const terms = [];
    let partialSum = 0;
    
    for (let i = 0; i < n; i++) {
        const term = a * Math.pow(r, i);
        partialSum += term;
        terms.push({
            index: i + 1,
            term,
            partialSum
        });
    }
    
    return terms;
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

    drawAxes(padding, maxY, minY = 0) {
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
    }
}

// Terms Visualization
class TermsChart extends ChartCanvas {
    draw(a, r, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 70;

        const maxDisplay = Math.min(n, 30);
        const terms = generateTerms(a, r, maxDisplay);
        const values = terms.map(t => t.term);
        const maxY = Math.max(...values, 0);
        const minY = Math.min(...values, 0);
        const range = maxY - minY || 1;

        this.drawAxes(padding, maxY, minY);

        // Draw bars
        for (let i = 0; i < maxDisplay; i++) {
            const barWidth = (w - 2 * padding) / maxDisplay * 0.7;
            const x = padding + (w - 2 * padding) * i / maxDisplay;
            const zeroY = h - padding - (h - 2 * padding) * (0 - minY) / range;
            const barY = h - padding - (h - 2 * padding) * (values[i] - minY) / range;
            const barHeight = Math.abs(zeroY - barY);

            const gradient = ctx.createLinearGradient(0, barY, 0, zeroY);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, Math.min(barY, zeroY), barWidth, barHeight);
            
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, Math.min(barY, zeroY), barWidth, barHeight);
        }

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Term Index', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Term Value', 0, 0);
        ctx.restore();

        if (n > maxDisplay) {
            ctx.fillStyle = '#666';
            ctx.font = '13px sans-serif';
            ctx.fillText(`Showing first ${maxDisplay} terms`, w / 2, h - padding + 30);
        }
    }
}

// Partial Sums Chart
class PartialSumsChart extends ChartCanvas {
    draw(a, r, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const terms = generateTerms(a, r, n);
        const partialSums = terms.map(t => t.partialSum);
        const maxY = Math.max(...partialSums, 0);
        const minY = Math.min(...partialSums, 0);
        const range = maxY - minY || 1;

        this.drawAxes(padding, maxY, minY);

        // Draw line
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < terms.length; i++) {
            const x = padding + (w - 2 * padding) * i / (n - 1);
            const y = h - padding - (h - 2 * padding) * (partialSums[i] - minY) / range;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw points
        terms.forEach((term, i) => {
            const x = padding + (w - 2 * padding) * i / (n - 1);
            const y = h - padding - (h - 2 * padding) * (term.partialSum - minY) / range;
            
            ctx.fillStyle = i === terms.length - 1 ? '#f5576c' : '#764ba2';
            ctx.beginPath();
            ctx.arc(x, y, i === terms.length - 1 ? 8 : 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Number of Terms', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Partial Sum', 0, 0);
        ctx.restore();
    }
}

// Cumulative Progress Chart
class CumulativeChart extends ChartCanvas {
    draw(a, r, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const terms = generateTerms(a, r, n);
        const finalSum = terms[terms.length - 1].partialSum;

        this.drawAxes(padding, 100, 0);

        // Draw area
        const gradient = ctx.createLinearGradient(0, h - padding, 0, padding);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(1, 'rgba(118, 75, 162, 0.3)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);

        for (let i = 0; i < terms.length; i++) {
            const x = padding + (w - 2 * padding) * i / (n - 1);
            const percentage = (terms[i].partialSum / finalSum) * 100;
            const y = h - padding - (h - 2 * padding) * percentage / 100;
            ctx.lineTo(x, y);
        }

        ctx.lineTo(w - padding, h - padding);
        ctx.closePath();
        ctx.fill();

        // Draw line
        ctx.strokeStyle = '#764ba2';
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < terms.length; i++) {
            const x = padding + (w - 2 * padding) * i / (n - 1);
            const percentage = (terms[i].partialSum / finalSum) * 100;
            const y = h - padding - (h - 2 * padding) * percentage / 100;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Number of Terms', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('% of Total Sum', 0, 0);
        ctx.restore();
    }
}

// Ratio Effect Chart
class RatioEffectChart extends ChartCanvas {
    draw(a, n) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const ratios = [];
        const sums = [];
        
        for (let r = -0.9; r <= 1.9; r += 0.05) {
            if (Math.abs(r - 1) > 0.05) {
                ratios.push(r);
                const result = calculateGeometricSum(a, r, n);
                sums.push(result.sum);
            }
        }

        const maxY = Math.max(...sums, 0);
        const minY = Math.min(...sums, 0);
        const range = maxY - minY || 1;

        this.drawAxes(padding, maxY, minY);

        // Draw line
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();

        ratios.forEach((r, i) => {
            const x = padding + (w - 2 * padding) * (r + 0.9) / 2.8;
            const y = h - padding - (h - 2 * padding) * (sums[i] - minY) / range;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw r=1 exclusion zone
        const r1X = padding + (w - 2 * padding) * (1 + 0.9) / 2.8;
        ctx.fillStyle = 'rgba(231, 76, 60, 0.1)';
        ctx.fillRect(r1X - 10, padding, 20, h - 2 * padding);
        
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(r1X, padding);
        ctx.lineTo(r1X, h - padding);
        ctx.stroke();
        ctx.setLineDash([]);

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Common Ratio (r)', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Sum', 0, 0);
        ctx.restore();

        // r = 1 label
        ctx.fillStyle = '#e74c3c';
        ctx.font = '12px sans-serif';
        ctx.fillText('r=1', r1X, padding - 5);
    }
}

// Utility functions
function formatNumber(num) {
    if (Math.abs(num) >= 1e6 || (Math.abs(num) < 0.001 && num !== 0)) {
        return num.toExponential(4);
    } else {
        return num.toFixed(4);
    }
}

// Initialize charts
let termsChart, partialSumsChart, cumulativeChart, ratioEffectChart;

function updateDisplay() {
    const a = parseFloat(document.getElementById('firstTerm').value);
    const r = parseFloat(document.getElementById('ratio').value);
    const n = parseInt(document.getElementById('terms').value);

    document.getElementById('ratioDisplay').textContent = r.toFixed(3);
    document.getElementById('termsDisplay').textContent = n;

    // Check for r = 1
    const warning = document.getElementById('ratioWarning');
    if (Math.abs(r - 1) < 0.02) {
        warning.classList.add('show');
    } else {
        warning.classList.remove('show');
    }
}

function calculate() {
    const a = parseFloat(document.getElementById('firstTerm').value);
    const r = parseFloat(document.getElementById('ratio').value);
    const n = parseInt(document.getElementById('terms').value);

    const result = calculateGeometricSum(a, r, n);

    // Update sum display
    const sumValue = document.getElementById('sumValue');
    if (result.undefined) {
        sumValue.textContent = 'Undefined';
        sumValue.style.color = '#e74c3c';
    } else {
        sumValue.textContent = formatNumber(result.sum);
        sumValue.style.color = '#667eea';
    }
    sumValue.classList.add('updating');
    setTimeout(() => sumValue.classList.remove('updating'), 500);

    // Update breakdown
    document.getElementById('numerator').textContent = 
        result.numerator !== null ? formatNumber(result.numerator) : 'N/A';
    document.getElementById('denominator').textContent = 
        result.denominator !== null ? formatNumber(result.denominator) : 'N/A';
    document.getElementById('rPowerN').textContent = 
        result.rPowerN !== null ? formatNumber(result.rPowerN) : 'N/A';

    // Update properties
    const lastTerm = a * Math.pow(r, n - 1);
    document.getElementById('lastTerm').textContent = formatNumber(lastTerm);

    const seriesType = Math.abs(r) < 1 ? 'Convergent' : Math.abs(r) > 1 ? 'Divergent' : 'Special';
    document.getElementById('seriesType').textContent = seriesType;

    const behavior = r > 0 ? (r < 1 ? 'Decreasing' : 'Increasing') : 'Alternating';
    document.getElementById('behavior').textContent = behavior;

    if (Math.abs(r) < 1) {
        const infiniteSum = a / (1 - r);
        document.getElementById('infiniteSum').textContent = formatNumber(infiniteSum);
    } else {
        document.getElementById('infiniteSum').textContent = 'Diverges';
    }

    // Update charts
    termsChart.draw(a, r, n);
    partialSumsChart.draw(a, r, n);
    cumulativeChart.draw(a, r, n);
    ratioEffectChart.draw(a, n);

    // Update table
    updateTable(a, r, n);
}

function updateTable(a, r, n) {
    const container = document.getElementById('termsTable');
    const maxRows = 20;
    const terms = generateTerms(a, r, Math.min(n, maxRows));

    let html = '<table class="terms-table">';
    html += '<thead><tr><th>k</th><th>Term (ar<sup>k-1</sup>)</th><th>Partial Sum</th></tr></thead>';
    html += '<tbody>';

    terms.forEach(term => {
        html += `<tr>
            <td>${term.index}</td>
            <td>${formatNumber(term.term)}</td>
            <td>${formatNumber(term.partialSum)}</td>
        </tr>`;
    });

    if (n > maxRows) {
        html += `<tr><td colspan="3" style="text-align:center; color:#888;">
            ... (${n - maxRows} more terms)</td></tr>`;
    }

    html += '</tbody></table>';
    container.innerHTML = html;
}

function reset() {
    document.getElementById('firstTerm').value = '1';
    document.getElementById('ratio').value = '0.5';
    document.getElementById('terms').value = '10';
    updateDisplay();
    calculate();
}

function loadExample(example) {
    const examples = {
        halving: { a: 1, r: 0.5, n: 10 },
        doubling: { a: 1, r: 2, n: 8 },
        alternating: { a: 1, r: -0.5, n: 10 },
        fraction: { a: 100, r: 0.1, n: 5 }
    };

    const params = examples[example];
    document.getElementById('firstTerm').value = params.a;
    document.getElementById('ratio').value = params.r;
    document.getElementById('terms').value = params.n;

    updateDisplay();
    calculate();
}

// Event listeners
window.addEventListener('load', () => {
    termsChart = new TermsChart('termsCanvas');
    partialSumsChart = new PartialSumsChart('partialSumsCanvas');
    cumulativeChart = new CumulativeChart('cumulativeCanvas');
    ratioEffectChart = new RatioEffectChart('ratioEffectCanvas');

    document.getElementById('firstTerm').addEventListener('input', updateDisplay);
    document.getElementById('ratio').addEventListener('input', updateDisplay);
    document.getElementById('terms').addEventListener('input', updateDisplay);

    document.getElementById('calculateBtn').addEventListener('click', calculate);
    document.getElementById('resetBtn').addEventListener('click', reset);

    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const example = e.currentTarget.dataset.example;
            loadExample(example);
        });
    });

    updateDisplay();
    calculate();
});

window.addEventListener('resize', () => {
    termsChart.setupCanvas();
    partialSumsChart.setupCanvas();
    cumulativeChart.setupCanvas();
    ratioEffectChart.setupCanvas();
    calculate();
});