// EMA Calculation
function calculateEMA(beta, mPrev, x) {
    const term1 = beta * mPrev;
    const term2 = (1 - beta) * x;
    const mNew = term1 + term2;
    const change = mNew - mPrev;
    
    return {
        term1,
        term2,
        mNew,
        change
    };
}

// Time series data
let timeSeries = {
    values: [],
    ema: [],
    beta: 0.9
};

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

    drawAxes(padding, minY, maxY) {
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

        // Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const val = maxY - (maxY - minY) * i / 5;
            const y = padding + (h - 2 * padding) * i / 5;
            ctx.fillText(val.toFixed(1), padding - 10, y + 4);
        }
    }
}

// Time Series Chart
class TimeSeriesChart extends ChartCanvas {
    draw() {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        if (timeSeries.values.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data - add points to begin', w / 2, h / 2);
            return;
        }

        const allValues = [...timeSeries.values, ...timeSeries.ema];
        const maxY = Math.max(...allValues);
        const minY = Math.min(...allValues);
        const range = maxY - minY || 1;

        this.drawAxes(padding, minY, maxY);

        const n = timeSeries.values.length;

        // Draw raw values
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = padding + (w - 2 * padding) * i / Math.max(n - 1, 1);
            const y = h - padding - (h - 2 * padding) * (timeSeries.values[i] - minY) / range;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw raw value points
        timeSeries.values.forEach((val, i) => {
            const x = padding + (w - 2 * padding) * i / Math.max(n - 1, 1);
            const y = h - padding - (h - 2 * padding) * (val - minY) / range;
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Draw EMA
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i < timeSeries.ema.length; i++) {
            const x = padding + (w - 2 * padding) * i / Math.max(n - 1, 1);
            const y = h - padding - (h - 2 * padding) * (timeSeries.ema[i] - minY) / range;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw EMA points
        timeSeries.ema.forEach((val, i) => {
            const x = padding + (w - 2 * padding) * i / Math.max(n - 1, 1);
            const y = h - padding - (h - 2 * padding) * (val - minY) / range;
            ctx.fillStyle = '#667eea';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time Step', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Value', 0, 0);
        ctx.restore();

        // Legend
        ctx.textAlign = 'left';
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(w - 200, padding, 15, 10);
        ctx.fillStyle = '#333';
        ctx.font = '13px sans-serif';
        ctx.fillText('Raw Values', w - 180, padding + 9);

        ctx.fillStyle = '#667eea';
        ctx.fillRect(w - 200, padding + 20, 15, 10);
        ctx.fillStyle = '#333';
        ctx.fillText('EMA', w - 180, padding + 29);
    }
}

// Response Chart
class ResponseChart extends ChartCanvas {
    draw(beta) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const steps = 50;
        const responses = [];
        
        // Step response: initial value 0, step to 100
        let ema = 0;
        for (let i = 0; i <= steps; i++) {
            if (i > 0) {
                ema = beta * ema + (1 - beta) * 100;
            }
            responses.push(ema);
        }

        const maxY = 100;
        const minY = 0;

        this.drawAxes(padding, minY, maxY);

        // Draw target line
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding, h - padding - (h - 2 * padding));
        ctx.lineTo(w - padding, h - padding - (h - 2 * padding));
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw response
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const x = padding + (w - 2 * padding) * i / steps;
            const y = h - padding - (h - 2 * padding) * responses[i] / 100;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Time Steps', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('EMA Value', 0, 0);
        ctx.restore();

        // Legend
        ctx.textAlign = 'left';
        ctx.font = '13px sans-serif';
        ctx.fillStyle = '#333';
        ctx.fillText('Step Input: 0 → 100', w - 200, padding + 9);
    }
}

// Decay Chart
class DecayChart extends ChartCanvas {
    draw(beta) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const steps = 30;
        const weights = [];
        
        // Calculate contribution weights
        for (let t = 0; t <= steps; t++) {
            weights.push(Math.pow(beta, t) * (1 - beta));
        }

        const maxWeight = Math.max(...weights);

        this.drawAxes(padding, 0, maxWeight);

        // Draw bars
        for (let i = 0; i <= steps; i++) {
            const x = padding + (w - 2 * padding) * i / steps;
            const barWidth = (w - 2 * padding) / steps * 0.7;
            const barHeight = (h - 2 * padding) * weights[i] / maxWeight;

            const gradient = ctx.createLinearGradient(0, h - padding - barHeight, 0, h - padding);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, h - padding - barHeight, barWidth, barHeight);
        }

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Steps Back in Time', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Weight', 0, 0);
        ctx.restore();
    }
}

// Initialize charts
let timeSeriesChart, responseChart, decayChart;

function updateDisplay() {
    const beta = parseFloat(document.getElementById('betaSlider').value);
    const mPrev = parseFloat(document.getElementById('prevAvg').value);
    const x = parseFloat(document.getElementById('currentValue').value);

    document.getElementById('betaDisplay').textContent = beta.toFixed(3);

    // Calculate half-life
    const halfLife = Math.log(0.5) / Math.log(beta);
    document.getElementById('halfLife').textContent = Math.abs(halfLife).toFixed(1);

    // Calculate EMA
    const result = calculateEMA(beta, mPrev, x);

    document.getElementById('term1').textContent = result.term1.toFixed(3);
    document.getElementById('term2').textContent = result.term2.toFixed(3);
    document.getElementById('newAvg').textContent = result.mNew.toFixed(3);
    document.getElementById('change').textContent = 
        (result.change >= 0 ? '+' : '') + result.change.toFixed(3);

    // Update weight bars
    const oldWeightPct = beta * 100;
    const newWeightPct = (1 - beta) * 100;
    
    document.getElementById('oldWeight').style.width = oldWeightPct + '%';
    document.getElementById('newWeight').style.width = newWeightPct + '%';
    
    document.getElementById('oldWeight').querySelector('.weight-label').textContent = 
        `β = ${oldWeightPct.toFixed(1)}%`;
    document.getElementById('newWeight').querySelector('.weight-label').textContent = 
        `(1-β) = ${newWeightPct.toFixed(1)}%`;

    // Update info card
    const effectiveWindow = Math.ceil(1 / (1 - beta));
    document.getElementById('effectiveWindow').textContent = effectiveWindow;
    
    // Update current EMA in info card based on time series if available
    if (timeSeries.ema.length > 0) {
        document.getElementById('currentEMA').textContent = 
            timeSeries.ema[timeSeries.ema.length - 1].toFixed(2);
    } else {
        document.getElementById('currentEMA').textContent = mPrev.toFixed(2);
    }
    
    document.getElementById('lagFactor').textContent = beta.toFixed(2);
    
    let smoothness = 'Low';
    if (beta > 0.9) smoothness = 'Very High';
    else if (beta > 0.7) smoothness = 'High';
    else if (beta > 0.5) smoothness = 'Medium';
    document.getElementById('smoothness').textContent = smoothness;

    // Update charts
    responseChart.draw(beta);
    decayChart.draw(beta);
}

function performUpdate() {
    const beta = parseFloat(document.getElementById('betaSlider').value);
    const mPrev = parseFloat(document.getElementById('prevAvg').value);
    const x = parseFloat(document.getElementById('currentValue').value);

    const result = calculateEMA(beta, mPrev, x);

    // Add current value to time series
    timeSeries.values.push(x);
    
    if (timeSeries.ema.length === 0) {
        timeSeries.ema.push(x);
    } else {
        timeSeries.ema.push(result.mNew);
    }
    
    timeSeries.beta = beta;
    
    // Update the graph
    timeSeriesChart.draw();

    // Update previous average to new value for next calculation
    document.getElementById('prevAvg').value = result.mNew.toFixed(6);
    
    updateDisplay();
}

function reset() {
    document.getElementById('betaSlider').value = '0.9';
    document.getElementById('prevAvg').value = '50';
    document.getElementById('currentValue').value = '80';
    
    // Clear time series as well
    timeSeries = {
        values: [],
        ema: [],
        beta: 0.9
    };
    timeSeriesChart.draw();
    
    updateDisplay();
}

function addRandomPoint() {
    const beta = parseFloat(document.getElementById('betaSlider').value);
    const value = Math.random() * 100;
    
    timeSeries.values.push(value);
    
    if (timeSeries.ema.length === 0) {
        timeSeries.ema.push(value);
    } else {
        const lastEMA = timeSeries.ema[timeSeries.ema.length - 1];
        const newEMA = beta * lastEMA + (1 - beta) * value;
        timeSeries.ema.push(newEMA);
    }
    
    timeSeries.beta = beta;
    timeSeriesChart.draw();
    
    // Update current EMA display
    document.getElementById('currentEMA').textContent = 
        timeSeries.ema[timeSeries.ema.length - 1].toFixed(2);
}

function addStepChange() {
    const beta = parseFloat(document.getElementById('betaSlider').value);
    
    // Add 10 points at one level, then 10 at another
    const lowValue = 30;
    const highValue = 70;
    
    for (let i = 0; i < 10; i++) {
        const value = lowValue + (Math.random() - 0.5) * 5;
        timeSeries.values.push(value);
        
        if (timeSeries.ema.length === 0) {
            timeSeries.ema.push(value);
        } else {
            const lastEMA = timeSeries.ema[timeSeries.ema.length - 1];
            const newEMA = beta * lastEMA + (1 - beta) * value;
            timeSeries.ema.push(newEMA);
        }
    }
    
    for (let i = 0; i < 10; i++) {
        const value = highValue + (Math.random() - 0.5) * 5;
        timeSeries.values.push(value);
        
        const lastEMA = timeSeries.ema[timeSeries.ema.length - 1];
        const newEMA = beta * lastEMA + (1 - beta) * value;
        timeSeries.ema.push(newEMA);
    }
    
    timeSeries.beta = beta;
    timeSeriesChart.draw();
    
    document.getElementById('currentEMA').textContent = 
        timeSeries.ema[timeSeries.ema.length - 1].toFixed(2);
}

function clearSeries() {
    timeSeries = {
        values: [],
        ema: [],
        beta: parseFloat(document.getElementById('betaSlider').value)
    };
    timeSeriesChart.draw();
    
    // Update display to show calculator's prevAvg instead
    updateDisplay();
}

// Event listeners
window.addEventListener('load', () => {
    timeSeriesChart = new TimeSeriesChart('timeSeriesCanvas');
    responseChart = new ResponseChart('responseCanvas');
    decayChart = new DecayChart('decayCanvas');

    document.getElementById('betaSlider').addEventListener('input', updateDisplay);
    document.getElementById('prevAvg').addEventListener('input', updateDisplay);
    document.getElementById('currentValue').addEventListener('input', updateDisplay);

    document.getElementById('updateBtn').addEventListener('click', performUpdate);
    document.getElementById('resetBtn').addEventListener('click', reset);
    document.getElementById('addRandom').addEventListener('click', addRandomPoint);
    document.getElementById('addStep').addEventListener('click', addStepChange);
    document.getElementById('clearSeries').addEventListener('click', clearSeries);

    updateDisplay();
});

window.addEventListener('resize', () => {
    timeSeriesChart.setupCanvas();
    responseChart.setupCanvas();
    decayChart.setupCanvas();
    
    timeSeriesChart.draw();
    responseChart.draw(parseFloat(document.getElementById('betaSlider').value));
    decayChart.draw(parseFloat(document.getElementById('betaSlider').value));
});