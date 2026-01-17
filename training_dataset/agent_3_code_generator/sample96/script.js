// Loss functions and their gradients
const lossFunctions = {
    quadratic: {
        loss: (w) => Math.pow(w - 2, 2),
        gradient: (w) => 2 * (w - 2),
        name: 'Quadratic',
        range: [-2, 6]
    },
    sine: {
        loss: (w) => Math.sin(w) + 2,
        gradient: (w) => Math.cos(w),
        name: 'Sine',
        range: [-8, 8]
    },
    abs: {
        loss: (w) => Math.abs(w - 3),
        gradient: (w) => w > 3 ? 1 : (w < 3 ? -1 : 0),
        name: 'Absolute',
        range: [-2, 8]
    }
};

// Global state
let currentLossFunction = 'quadratic';
let history = {
    weights: [],
    losses: [],
    stepSizes: [],
    steps: 0
};

// Canvas managers
class CanvasChart {
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

    drawAxes(padding, maxX, maxY, minY = 0) {
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

class LossLandscape extends CanvasChart {
    draw(currentW) {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 60;

        const lossFunc = lossFunctions[currentLossFunction];
        const [minW, maxW] = lossFunc.range;
        
        // Calculate loss values
        const points = 200;
        const wValues = [];
        const lossValues = [];
        let maxLoss = -Infinity;
        let minLoss = Infinity;

        for (let i = 0; i <= points; i++) {
            const weight = minW + (maxW - minW) * i / points;
            const loss = lossFunc.loss(weight);
            wValues.push(weight);
            lossValues.push(loss);
            maxLoss = Math.max(maxLoss, loss);
            minLoss = Math.min(minLoss, loss);
        }

        // Draw axes
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

        // Draw loss curve
        const gradient = ctx.createLinearGradient(0, padding, 0, h - padding);
        gradient.addColorStop(0, '#3a7bd5');
        gradient.addColorStop(1, '#00d2ff');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i <= points; i++) {
            const x = padding + (w - 2 * padding) * (wValues[i] - minW) / (maxW - minW);
            const y = h - padding - (h - 2 * padding) * (lossValues[i] - minLoss) / (maxLoss - minLoss);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw trajectory
        if (history.weights.length > 1) {
            ctx.strokeStyle = 'rgba(231, 76, 60, 0.8)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();

            for (let i = 0; i < history.weights.length; i++) {
                const weight = history.weights[i];
                if (weight >= minW && weight <= maxW) {
                    const loss = history.losses[i];
                    const x = padding + (w - 2 * padding) * (weight - minW) / (maxW - minW);
                    const y = h - padding - (h - 2 * padding) * (loss - minLoss) / (maxLoss - minLoss);
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw points
            history.weights.forEach((weight, i) => {
                if (weight >= minW && weight <= maxW) {
                    const loss = history.losses[i];
                    const x = padding + (w - 2 * padding) * (weight - minW) / (maxW - minW);
                    const y = h - padding - (h - 2 * padding) * (loss - minLoss) / (maxLoss - minLoss);
                    
                    ctx.fillStyle = i === history.weights.length - 1 ? '#e74c3c' : 'rgba(231, 76, 60, 0.5)';
                    ctx.beginPath();
                    ctx.arc(x, y, i === history.weights.length - 1 ? 8 : 5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }

        // Draw current position
        if (currentW >= minW && currentW <= maxW) {
            const currentLoss = lossFunc.loss(currentW);
            const x = padding + (w - 2 * padding) * (currentW - minW) / (maxW - minW);
            const y = h - padding - (h - 2 * padding) * (currentLoss - minLoss) / (maxLoss - minLoss);

            ctx.fillStyle = '#f5576c';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Weight (w)', w / 2, h - 10);
        
        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Loss', 0, 0);
        ctx.restore();

        // Axis values
        ctx.font = '12px sans-serif';
        ctx.fillText(minW.toFixed(1), padding, h - padding + 20);
        ctx.fillText(maxW.toFixed(1), w - padding, h - padding + 20);
        ctx.textAlign = 'right';
        ctx.fillText(maxLoss.toFixed(2), padding - 5, padding + 5);
        ctx.fillText(minLoss.toFixed(2), padding - 5, h - padding + 5);
    }
}

class WeightEvolution extends CanvasChart {
    draw() {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 50;

        if (history.weights.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data yet', w / 2, h / 2);
            return;
        }

        this.drawAxes(padding, history.steps, Math.max(...history.weights), Math.min(...history.weights));

        const maxW = Math.max(...history.weights);
        const minW = Math.min(...history.weights);
        const range = maxW - minW || 1;

        // Draw line
        const gradient = ctx.createLinearGradient(0, 0, w, 0);
        gradient.addColorStop(0, '#00d2ff');
        gradient.addColorStop(1, '#3a7bd5');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.beginPath();

        history.weights.forEach((weight, i) => {
            const x = padding + (w - 2 * padding) * i / Math.max(history.steps, 1);
            const y = h - padding - (h - 2 * padding) * (weight - minW) / range;
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw points
        history.weights.forEach((weight, i) => {
            const x = padding + (w - 2 * padding) * i / Math.max(history.steps, 1);
            const y = h - padding - (h - 2 * padding) * (weight - minW) / range;
            
            ctx.fillStyle = i === history.weights.length - 1 ? '#f5576c' : '#3a7bd5';
            ctx.beginPath();
            ctx.arc(x, y, i === history.weights.length - 1 ? 6 : 4, 0, 2 * Math.PI);
            ctx.fill();
        });

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Step', w / 2, h - 10);
        
        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Weight', 0, 0);
        ctx.restore();
    }
}

class StepSizeHistory extends CanvasChart {
    draw() {
        this.clear();
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 50;

        if (history.stepSizes.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No data yet', w / 2, h / 2);
            return;
        }

        const maxStep = Math.max(...history.stepSizes.map(Math.abs));
        
        this.drawAxes(padding, history.steps, maxStep, -maxStep);

        // Draw bars
        history.stepSizes.forEach((step, i) => {
            const x = padding + (w - 2 * padding) * i / Math.max(history.steps, 1);
            const barWidth = (w - 2 * padding) / Math.max(history.steps, 1) * 0.8;
            const centerY = h - padding - (h - 2 * padding) / 2;
            const barHeight = (h - 2 * padding) / 2 * Math.abs(step) / maxStep;
            
            ctx.fillStyle = step < 0 ? 'rgba(58, 123, 213, 0.7)' : 'rgba(231, 76, 60, 0.7)';
            
            if (step < 0) {
                ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
            } else {
                ctx.fillRect(x, centerY, barWidth, barHeight);
            }
        });

        // Zero line
        const centerY = h - padding - (h - 2 * padding) / 2;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, centerY);
        ctx.lineTo(w - padding, centerY);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Step', w / 2, h - 10);
        
        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Step Size (α·g)', 0, 0);
        ctx.restore();
    }
}

// Initialize charts
let lossChart, weightChart, stepChart;

function updateCalculation() {
    const w = parseFloat(document.getElementById('weight').value);
    const alpha = parseFloat(document.getElementById('alpha').value);
    const g = parseFloat(document.getElementById('gradient').value);

    const stepSize = alpha * g;
    const wNew = w - stepSize;
    const change = wNew - w;

    document.getElementById('wOld').textContent = w.toFixed(3);
    document.getElementById('stepSize').textContent = stepSize.toFixed(3);
    document.getElementById('wNew').textContent = wNew.toFixed(3);
    document.getElementById('change').textContent = change.toFixed(3);

    return { w, alpha, g, wNew, stepSize };
}

function performStep() {
    const { w, wNew, stepSize } = updateCalculation();
    const lossFunc = lossFunctions[currentLossFunction];
    const loss = lossFunc.loss(w);

    // Add to history
    history.weights.push(w);
    history.losses.push(loss);
    history.stepSizes.push(-stepSize);
    history.steps++;

    // Update weight
    document.getElementById('weight').value = wNew.toFixed(6);

    // Update displays
    updateCharts();
    updateStats();
}

function autoOptimize() {
    const steps = 20;
    const alpha = parseFloat(document.getElementById('alpha').value);
    
    for (let i = 0; i < steps; i++) {
        const w = parseFloat(document.getElementById('weight').value);
        const lossFunc = lossFunctions[currentLossFunction];
        const g = lossFunc.gradient(w);
        
        document.getElementById('gradient').value = g.toFixed(6);
        performStep();
    }
}

function updateCharts() {
    const w = parseFloat(document.getElementById('weight').value);
    lossChart.draw(w);
    weightChart.draw();
    stepChart.draw();
}

function updateStats() {
    const lossFunc = lossFunctions[currentLossFunction];
    const currentW = parseFloat(document.getElementById('weight').value);
    const currentLoss = lossFunc.loss(currentW);
    const minLoss = history.losses.length > 0 ? Math.min(...history.losses) : currentLoss;
    
    document.getElementById('stepCount').textContent = history.steps;
    document.getElementById('currentLoss').textContent = currentLoss.toFixed(4);
    document.getElementById('minLoss').textContent = minLoss.toFixed(4);
    
    if (history.losses.length >= 2) {
        const recentChange = Math.abs(history.losses[history.losses.length - 1] - 
                                      history.losses[history.losses.length - 2]);
        const converged = recentChange < 0.001;
        document.getElementById('convergence').textContent = converged ? 'Yes' : 'No';
        document.getElementById('convergence').style.color = converged ? '#27ae60' : '#e74c3c';
    } else {
        document.getElementById('convergence').textContent = '-';
    }
}

function reset() {
    document.getElementById('weight').value = '5';
    document.getElementById('alpha').value = '0.1';
    document.getElementById('alphaSlider').value = '0.1';
    document.getElementById('gradient').value = '2';
    
    history = {
        weights: [],
        losses: [],
        stepSizes: [],
        steps: 0
    };
    
    updateCalculation();
    updateCharts();
    updateStats();
}

function clearHistory() {
    history = {
        weights: [],
        losses: [],
        stepSizes: [],
        steps: 0
    };
    updateCharts();
    updateStats();
}

// Event listeners
window.addEventListener('load', () => {
    lossChart = new LossLandscape('lossCanvas');
    weightChart = new WeightEvolution('weightCanvas');
    stepChart = new StepSizeHistory('stepCanvas');

    document.getElementById('weight').addEventListener('input', () => {
        updateCalculation();
        updateCharts();
        updateStats();
    });
    
    document.getElementById('alpha').addEventListener('input', (e) => {
        document.getElementById('alphaSlider').value = e.target.value;
        updateCalculation();
    });
    
    document.getElementById('alphaSlider').addEventListener('input', (e) => {
        document.getElementById('alpha').value = e.target.value;
        updateCalculation();
    });
    
    document.getElementById('gradient').addEventListener('input', updateCalculation);
    
    document.getElementById('stepBtn').addEventListener('click', performStep);
    document.getElementById('resetBtn').addEventListener('click', reset);
    document.getElementById('autoOptimize').addEventListener('click', autoOptimize);
    document.getElementById('clearHistory').addEventListener('click', clearHistory);

    document.querySelectorAll('input[name="lossFunc"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentLossFunction = e.target.value;
            clearHistory();
            updateCharts();
        });
    });

    updateCalculation();
    updateCharts();
    updateStats();
});

window.addEventListener('resize', () => {
    lossChart.setupCanvas();
    weightChart.setupCanvas();
    stepChart.setupCanvas();
    updateCharts();
});