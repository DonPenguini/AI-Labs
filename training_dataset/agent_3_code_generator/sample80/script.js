// Utility functions
function factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

function power(base, exp) {
    return Math.pow(base, exp);
}

// M/M/c Queue calculations
class MMCQueue {
    constructor(lambda, mu, c) {
        this.lambda = lambda;
        this.mu = mu;
        this.c = c;
    }

    calculateUtilization() {
        return this.lambda / (this.c * this.mu);
    }

    calculateErlangC() {
        const rho = this.calculateUtilization();
        if (rho >= 1) return null;

        const a = this.lambda / this.mu;
        
        // Calculate numerator: (a^c / c!) / (1 - rho)
        let numerator = power(a, this.c) / factorial(this.c) / (1 - rho);
        
        // Calculate denominator: sum of (a^k / k!) for k=0 to c-1, plus numerator
        let denominator = 0;
        for (let k = 0; k < this.c; k++) {
            denominator += power(a, k) / factorial(k);
        }
        denominator += numerator;
        
        const pwait = numerator / denominator;
        return pwait;
    }

    calculateQueueLength() {
        const rho = this.calculateUtilization();
        if (rho >= 1) return Infinity;

        const pwait = this.calculateErlangC();
        if (pwait === null) return Infinity;

        const lq = (pwait * rho) / (1 - rho);
        return lq;
    }

    calculateWaitTime() {
        const lq = this.calculateQueueLength();
        if (!isFinite(lq)) return Infinity;
        return lq / this.lambda;
    }

    calculateSystemTime() {
        const wq = this.calculateWaitTime();
        if (!isFinite(wq)) return Infinity;
        return wq + 1 / this.mu;
    }

    getAllMetrics() {
        const rho = this.calculateUtilization();
        const pwait = this.calculateErlangC();
        const lq = this.calculateQueueLength();
        const wq = this.calculateWaitTime();
        const w = this.calculateSystemTime();

        return {
            rho,
            pwait,
            lq,
            wq,
            w,
            stable: rho < 1
        };
    }
}

// Chart management
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
}

class UtilizationChart extends ChartCanvas {
    draw(rho, c) {
        this.clear();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 30;

        // Draw background circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#ecf0f1';
        ctx.fill();
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw utilization arc
        const utilizationAngle = Math.min(rho, 1) * 2 * Math.PI;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + utilizationAngle);
        ctx.lineTo(centerX, centerY);
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        if (rho < 0.7) {
            gradient.addColorStop(0, '#27ae60');
            gradient.addColorStop(1, '#229954');
        } else if (rho < 0.9) {
            gradient.addColorStop(0, '#f39c12');
            gradient.addColorStop(1, '#e67e22');
        } else {
            gradient.addColorStop(0, '#e74c3c');
            gradient.addColorStop(1, '#c0392b');
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw percentage text
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${(rho * 100).toFixed(1)}%`, centerX, centerY - 10);

        ctx.font = '16px sans-serif';
        ctx.fillText(`${c} server${c > 1 ? 's' : ''}`, centerX, centerY + 25);

        // Draw threshold line at 100%
        if (rho >= 1) {
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.stroke();
        }
    }
}

class MetricsChart extends ChartCanvas {
    draw(lambda, mu) {
        this.clear();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 60;
        const rightPadding = 40;

        // Calculate metrics for different server counts
        const minServers = 1;
        const maxServers = 15;
        const serverCounts = [];
        const lqValues = [];

        for (let c = minServers; c <= maxServers; c++) {
            const queue = new MMCQueue(lambda, mu, c);
            const metrics = queue.getAllMetrics();
            serverCounts.push(c);
            lqValues.push(metrics.stable ? metrics.lq : null);
        }

        // Find max Lq for scaling
        const validLq = lqValues.filter(v => v !== null && isFinite(v));
        const maxLq = validLq.length > 0 ? Math.max(...validLq, 1) : 10;
        const niceMaxLq = Math.ceil(maxLq / 5) * 5; // Round up to nice number

        // Draw grid and Y-axis labels
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - padding - 40) * (1 - i / 5);
            const value = (niceMaxLq * i / 5).toFixed(1);
            
            // Grid line
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - rightPadding, y);
            ctx.stroke();
            
            // Y-axis label
            ctx.fillText(value, padding - 10, y);
            
            // Y-axis tick
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding - 5, y);
            ctx.lineTo(padding, y);
            ctx.stroke();
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
        }

        // Draw X-axis grid and labels
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (let c = minServers; c <= maxServers; c++) {
            const x = padding + (width - padding - rightPadding) * (c - minServers) / (maxServers - minServers);
            
            // Grid line
            ctx.strokeStyle = '#e0e0e0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - 40);
            ctx.stroke();
            
            // X-axis label (show every server count)
            ctx.fillStyle = '#666';
            ctx.font = '11px sans-serif';
            ctx.fillText(c.toString(), x, height - 35);
            
            // X-axis tick
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, height - 40);
            ctx.lineTo(x, height - 35);
            ctx.stroke();
        }

        // Draw axes (after grid so they're on top)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - 40);
        ctx.lineTo(width - rightPadding, height - 40);
        ctx.stroke();

        // Draw Lq line and points
        ctx.strokeStyle = '#3498db';
        ctx.lineWidth = 3;
        ctx.beginPath();
        let firstPoint = true;
        
        for (let i = 0; i < serverCounts.length; i++) {
            const c = serverCounts[i];
            if (lqValues[i] !== null && isFinite(lqValues[i])) {
                const x = padding + (width - padding - rightPadding) * (c - minServers) / (maxServers - minServers);
                const y = height - 40 - (height - padding - 40) * Math.min(lqValues[i] / niceMaxLq, 1);
                
                if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }
        ctx.stroke();

        // Draw point markers (separate loop to ensure they're on top)
        for (let i = 0; i < serverCounts.length; i++) {
            const c = serverCounts[i];
            if (lqValues[i] !== null && isFinite(lqValues[i])) {
                const x = padding + (width - padding - rightPadding) * (c - minServers) / (maxServers - minServers);
                const y = height - 40 - (height - padding - 40) * Math.min(lqValues[i] / niceMaxLq, 1);
                
                ctx.fillStyle = '#3498db';
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
                
                // White border for visibility
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Axis labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Number of Servers (c)', width / 2, height - 5);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textBaseline = 'top';
        ctx.fillText('Average Queue Length (Lq)', 0, 0);
        ctx.restore();
    }
}

class HeatmapChart extends ChartCanvas {
    draw(mu) {
        this.clear();
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 60;
        const legendWidth = 25;
        const legendPadding = 10;

        const lambdaMin = 1;
        const lambdaMax = 20;
        const cMin = 1;
        const cMax = 10;
        const gridSize = 20;

        const cellWidth = (width - 2 * padding - legendWidth - legendPadding) / gridSize;
        const cellHeight = (height - 2 * padding) / gridSize;

        // Draw heatmap
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const lambda = lambdaMin + (lambdaMax - lambdaMin) * i / (gridSize - 1);
                const c = Math.round(cMin + (cMax - cMin) * j / (gridSize - 1));
                
                const queue = new MMCQueue(lambda, mu, c);
                const rho = queue.calculateUtilization();

                let color;
                if (rho >= 1) {
                    color = '#2c3e50';
                } else if (rho >= 0.9) {
                    color = `rgb(231, 76, 60)`;
                } else if (rho >= 0.7) {
                    color = '#f39c12';
                } else {
                    const t = rho / 0.7;
                    color = `rgb(${Math.floor(39 + (243 - 39) * t)}, ${Math.floor(174 + (174 - 174) * t)}, ${Math.floor(96 + (219 - 96) * t)})`;
                }

                ctx.fillStyle = color;
                ctx.fillRect(
                    padding + i * cellWidth,
                    height - padding - (j + 1) * cellHeight,
                    cellWidth + 1,
                    cellHeight + 1
                );
            }
        }

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding - legendWidth - legendPadding, height - padding);
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(padding, padding);
        ctx.stroke();

        // X-axis labels and ticks
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        for (let i = 0; i <= 4; i++) {
            const lambda = lambdaMin + (lambdaMax - lambdaMin) * i / 4;
            const x = padding + (width - 2 * padding - legendWidth - legendPadding) * i / 4;
            
            ctx.fillText(lambda.toFixed(0), x, height - padding + 5);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, height - padding);
            ctx.lineTo(x, height - padding + 5);
            ctx.stroke();
        }

        // Y-axis labels and ticks
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        for (let i = 0; i <= 4; i++) {
            const c = Math.round(cMin + (cMax - cMin) * i / 4);
            const y = height - padding - (height - 2 * padding) * i / 4;
            
            ctx.fillText(c.toString(), padding - 8, y);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding - 5, y);
            ctx.lineTo(padding, y);
            ctx.stroke();
        }

        // Axis titles
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Arrival Rate (λ)', width / 2 - legendWidth / 2, height - 20);
        
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Servers (c)', 0, 0);
        ctx.restore();

        // Color legend
        const legendHeight = height - 2 * padding;
        const legendX = width - padding - legendWidth;
        const legendY = padding;

        for (let i = 0; i < 100; i++) {
            const rho = 1 - (i / 100);
            let color;
            if (rho >= 0.9) {
                color = `rgb(231, 76, 60)`;
            } else if (rho >= 0.7) {
                color = '#f39c12';
            } else {
                const t = rho / 0.7;
                color = `rgb(${Math.floor(39 + (243 - 39) * t)}, 174, ${Math.floor(96 + (219 - 96) * t)})`;
            }
            ctx.fillStyle = color;
            ctx.fillRect(legendX, legendY + i * legendHeight / 100, legendWidth, legendHeight / 100 + 1);
        }

        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);
        
        // Legend labels
        ctx.fillStyle = '#333';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('1.0', legendX + legendWidth + 5, legendY);
        ctx.fillText('0.7', legendX + legendWidth + 5, legendY + legendHeight * 0.3);
        ctx.fillText('0.0', legendX + legendWidth + 5, legendY + legendHeight);
        
        ctx.textAlign = 'center';
        ctx.font = 'bold 11px sans-serif';
        ctx.save();
        ctx.translate(legendX + legendWidth / 2, padding - 15);
        ctx.fillText('ρ', 0, 0);
        ctx.restore();
    }
}

// Queue visualization
function drawQueueVisualization(lambda, mu, c) {
    const container = document.getElementById('queueViz');
    container.innerHTML = '';

    const queue = new MMCQueue(lambda, mu, c);
    const metrics = queue.getAllMetrics();

    // Create servers row
    const serversLabel = document.createElement('div');
    serversLabel.className = 'queue-label';
    serversLabel.textContent = 'Servers:';
    container.appendChild(serversLabel);

    const serversRow = document.createElement('div');
    serversRow.className = 'servers-row';
    
    const busyServers = Math.min(Math.round(metrics.rho * c), c);
    for (let i = 0; i < c; i++) {
        const server = document.createElement('div');
        server.className = i < busyServers ? 'server busy' : 'server idle';
        server.textContent = i < busyServers ? 'B' : 'I';
        serversRow.appendChild(server);
    }
    container.appendChild(serversRow);

    // Create queue line
    const queueLabel = document.createElement('div');
    queueLabel.className = 'queue-label';
    queueLabel.style.marginTop = '20px';
    queueLabel.textContent = `Queue (L_q ≈ ${metrics.lq.toFixed(2)}):`;
    container.appendChild(queueLabel);

    const queueLine = document.createElement('div');
    queueLine.className = 'queue-line';
    
    const customersInQueue = Math.round(metrics.lq);
    const maxDisplay = 20;
    for (let i = 0; i < Math.min(customersInQueue, maxDisplay); i++) {
        const customer = document.createElement('div');
        customer.className = 'customer';
        customer.textContent = 'C';
        queueLine.appendChild(customer);
    }
    
    if (customersInQueue > maxDisplay) {
        const more = document.createElement('div');
        more.className = 'customer';
        more.textContent = '...';
        more.style.fontSize = '1.5rem';
        queueLine.appendChild(more);
    }
    
    container.appendChild(queueLine);
}

// Global state
let utilizationChart, metricsChart, heatmapChart;

function updateDisplay() {
    const lambda = parseFloat(document.getElementById('lambda').value);
    const mu = parseFloat(document.getElementById('mu').value);
    const c = parseInt(document.getElementById('c').value);

    document.getElementById('lambdaValue').textContent = lambda.toFixed(1);
    document.getElementById('muValue').textContent = mu.toFixed(1);
    document.getElementById('cValue').textContent = c;
}

function calculate() {
    const lambda = parseFloat(document.getElementById('lambda').value);
    const mu = parseFloat(document.getElementById('mu').value);
    const c = parseInt(document.getElementById('c').value);

    const queue = new MMCQueue(lambda, mu, c);
    const metrics = queue.getAllMetrics();

    // Update metrics display
    document.getElementById('rhoValue').textContent = metrics.rho.toFixed(4);
    document.getElementById('pwaitValue').textContent = metrics.stable ? metrics.pwait.toFixed(4) : 'N/A';
    document.getElementById('lqValue').textContent = metrics.stable ? metrics.lq.toFixed(4) : '∞';
    document.getElementById('wqValue').textContent = metrics.stable ? metrics.wq.toFixed(4) + ' hours' : '∞';
    document.getElementById('wValue').textContent = metrics.stable ? metrics.w.toFixed(4) + ' hours' : '∞';

    // Update stability warning
    const warning = document.getElementById('stabilityWarning');
    if (!metrics.stable) {
        warning.classList.remove('hidden');
    } else {
        warning.classList.add('hidden');
    }

    // Update charts
    utilizationChart.draw(metrics.rho, c);
    metricsChart.draw(lambda, mu);
    heatmapChart.draw(mu);
    
    // Update queue visualization
    drawQueueVisualization(lambda, mu, c);
}

function reset() {
    document.getElementById('lambda').value = '5';
    document.getElementById('mu').value = '2';
    document.getElementById('c').value = '3';
    updateDisplay();
    calculate();
}

// Initialize
window.addEventListener('load', () => {
    utilizationChart = new UtilizationChart('utilizationChart');
    metricsChart = new MetricsChart('metricsChart');
    heatmapChart = new HeatmapChart('heatmapChart');

    document.getElementById('lambda').addEventListener('input', updateDisplay);
    document.getElementById('mu').addEventListener('input', updateDisplay);
    document.getElementById('c').addEventListener('input', updateDisplay);
    
    document.getElementById('calculateBtn').addEventListener('click', calculate);
    document.getElementById('resetBtn').addEventListener('click', reset);

    updateDisplay();
    calculate();
});

window.addEventListener('resize', () => {
    utilizationChart.setupCanvas();
    metricsChart.setupCanvas();
    heatmapChart.setupCanvas();
    calculate();
});