// Matrix operations
class Matrix {
    static multiply(A, B) {
        const rowsA = A.length;
        const colsA = A[0].length;
        const colsB = B[0].length;
        const result = Array(rowsA).fill(0).map(() => Array(colsB).fill(0));
        
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                for (let k = 0; k < colsA; k++) {
                    result[i][j] += A[i][k] * B[k][j];
                }
            }
        }
        return result;
    }

    static add(A, B) {
        return A.map((row, i) => row.map((val, j) => val + B[i][j]));
    }

    static scale(A, scalar) {
        return A.map(row => row.map(val => val * scalar));
    }

    static identity(n) {
        return Array(n).fill(0).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
    }

    static expm(A, t) {
        // Matrix exponential using Taylor series
        const n = A.length;
        const maxTerms = 30;
        let result = Matrix.identity(n);
        let term = Matrix.identity(n);
        
        const At = Matrix.scale(A, t);
        
        for (let k = 1; k < maxTerms; k++) {
            term = Matrix.multiply(term, At);
            term = Matrix.scale(term, 1 / k);
            result = Matrix.add(result, term);
            
            // Check convergence
            const maxVal = Math.max(...term.flat().map(Math.abs));
            if (maxVal < 1e-10) break;
        }
        
        return result;
    }

    static eigenvalues2x2(A) {
        // For 2x2 matrix: λ = (tr ± sqrt(tr² - 4*det)) / 2
        const trace = A[0][0] + A[1][1];
        const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
        const discriminant = trace * trace - 4 * det;
        
        if (discriminant >= 0) {
            const sqrtDisc = Math.sqrt(discriminant);
            return [
                (trace + sqrtDisc) / 2,
                (trace - sqrtDisc) / 2
            ];
        } else {
            const real = trace / 2;
            const imag = Math.sqrt(-discriminant) / 2;
            return [
                { real, imag },
                { real, imag: -imag }
            ];
        }
    }
}

// Chart management
class ChartManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = { time: [], values: [] };
        this.animationProgress = 0;
    }

    setData(time, values) {
        this.data = { time, values };
        this.animationProgress = 0;
    }

    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (this.data.time.length === 0) return;

        // Determine data range
        const maxTime = Math.max(...this.data.time);
        const maxVal = Math.max(...this.data.values, 0);
        const minVal = Math.min(...this.data.values, 0);
        const range = maxVal - minVal;
        const padding = 50;

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.stroke();

        // Draw grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (height - 2 * padding) * i / 5;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();

            const value = maxVal - (range * i / 5);
            ctx.fillStyle = '#666';
            ctx.font = '12px monospace';
            ctx.fillText(value.toFixed(2), 5, y + 4);
        }

        // Draw curve with animation
        const visiblePoints = Math.floor(this.data.time.length * this.animationProgress);
        
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let i = 0; i < visiblePoints; i++) {
            const x = padding + (width - 2 * padding) * this.data.time[i] / maxTime;
            const y = height - padding - (height - 2 * padding) * (this.data.values[i] - minVal) / range;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw current point
        if (visiblePoints > 0) {
            const i = visiblePoints - 1;
            const x = padding + (width - 2 * padding) * this.data.time[i] / maxTime;
            const y = height - padding - (height - 2 * padding) * (this.data.values[i] - minVal) / range;

            ctx.fillStyle = '#764ba2';
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Animate
        if (this.animationProgress < 1) {
            this.animationProgress += 0.02;
            requestAnimationFrame(() => this.draw());
        }
    }
}

class PhaseChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.data = { x1: [], x2: [] };
        this.animationProgress = 0;
    }

    setData(x1, x2) {
        this.data = { x1, x2 };
        this.animationProgress = 0;
    }

    draw() {
        const ctx = this.ctx;
        const canvas = this.canvas;
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (this.data.x1.length === 0) return;

        const padding = 50;
        const maxX1 = Math.max(...this.data.x1, 0);
        const minX1 = Math.min(...this.data.x1, 0);
        const maxX2 = Math.max(...this.data.x2, 0);
        const minX2 = Math.min(...this.data.x2, 0);
        const rangeX1 = maxX1 - minX1;
        const rangeX2 = maxX2 - minX2;

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, height - padding);
        ctx.stroke();

        // Draw grid
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const x = padding + (width - 2 * padding) * i / 5;
            const y = padding + (height - 2 * padding) * i / 5;
            
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, height - padding);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.fillText('x₁', width - 30, height - padding + 20);
        ctx.fillText('x₂', padding - 30, padding);

        // Draw trajectory with animation
        const visiblePoints = Math.floor(this.data.x1.length * this.animationProgress);
        
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();

        for (let i = 0; i < visiblePoints; i++) {
            const x = padding + (width - 2 * padding) * (this.data.x1[i] - minX1) / rangeX1;
            const y = height - padding - (height - 2 * padding) * (this.data.x2[i] - minX2) / rangeX2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Draw start and end points
        if (visiblePoints > 0) {
            // Start point
            const x0 = padding + (width - 2 * padding) * (this.data.x1[0] - minX1) / rangeX1;
            const y0 = height - padding - (height - 2 * padding) * (this.data.x2[0] - minX2) / rangeX2;
            ctx.fillStyle = '#27ae60';
            ctx.beginPath();
            ctx.arc(x0, y0, 6, 0, 2 * Math.PI);
            ctx.fill();

            // Current point
            const i = visiblePoints - 1;
            const x = padding + (width - 2 * padding) * (this.data.x1[i] - minX1) / rangeX1;
            const y = height - padding - (height - 2 * padding) * (this.data.x2[i] - minX2) / rangeX2;
            ctx.fillStyle = '#764ba2';
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Animate
        if (this.animationProgress < 1) {
            this.animationProgress += 0.02;
            requestAnimationFrame(() => this.draw());
        }
    }
}

// Initialize charts
const chart1 = new ChartManager('chart1');
const chart2 = new ChartManager('chart2');
const phaseChart = new PhaseChart('phaseChart');

// Setup canvas sizes
function setupCanvases() {
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    });
}

// Simulation
function simulate() {
    // Get parameters
    const A = [
        [parseFloat(document.getElementById('a11').value), parseFloat(document.getElementById('a12').value)],
        [parseFloat(document.getElementById('a21').value), parseFloat(document.getElementById('a22').value)]
    ];
    
    const B = [
        [parseFloat(document.getElementById('b1').value)],
        [parseFloat(document.getElementById('b2').value)]
    ];
    
    const u = parseFloat(document.getElementById('u').value);
    const x0 = [
        [parseFloat(document.getElementById('x01').value)],
        [parseFloat(document.getElementById('x02').value)]
    ];
    
    const maxTime = parseFloat(document.getElementById('maxTime').value);
    const dt = 0.05;
    const steps = Math.floor(maxTime / dt);

    // Calculate eigenvalues and stability
    const eigenvals = Matrix.eigenvalues2x2(A);
    updateSystemInfo(eigenvals);

    // Simulate
    const time = [];
    const x1_values = [];
    const x2_values = [];

    for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        time.push(t);

        // x(t) = exp(A*t)*x0 + integral exp(A*(t-tau))*B*u dtau
        const expAt = Matrix.expm(A, t);
        const term1 = Matrix.multiply(expAt, x0);

        // Numerical integration for the second term
        let term2 = [[0], [0]];
        const integSteps = Math.floor(t / dt);
        for (let j = 0; j < integSteps; j++) {
            const tau = j * dt;
            const expATerm = Matrix.expm(A, t - tau);
            const integrand = Matrix.multiply(expATerm, B);
            const contribution = Matrix.scale(integrand, u * dt);
            term2 = Matrix.add(term2, contribution);
        }

        const x = Matrix.add(term1, term2);
        x1_values.push(x[0][0]);
        x2_values.push(x[1][0]);
    }

    // Update charts
    chart1.setData(time, x1_values);
    chart2.setData(time, x2_values);
    phaseChart.setData(x1_values, x2_values);

    chart1.draw();
    chart2.draw();
    phaseChart.draw();
}

function updateSystemInfo(eigenvals) {
    let eigenStr = 'Eigenvalues: ';
    let stable = true;

    eigenvals.forEach((ev, i) => {
        if (typeof ev === 'object') {
            eigenStr += `${ev.real.toFixed(3)} ${ev.imag >= 0 ? '+' : ''}${ev.imag.toFixed(3)}i`;
            if (ev.real >= 0) stable = false;
        } else {
            eigenStr += ev.toFixed(3);
            if (ev >= 0) stable = false;
        }
        if (i < eigenvals.length - 1) eigenStr += ', ';
    });

    document.getElementById('eigenvalues').textContent = eigenStr;
    document.getElementById('stability').textContent = `Stability: ${stable ? 'STABLE' : 'UNSTABLE'}`;
    document.getElementById('stability').style.color = stable ? '#27ae60' : '#e74c3c';
}

function reset() {
    document.getElementById('a11').value = '-1';
    document.getElementById('a12').value = '0';
    document.getElementById('a21').value = '0';
    document.getElementById('a22').value = '-2';
    document.getElementById('b1').value = '1';
    document.getElementById('b2').value = '1';
    document.getElementById('u').value = '1';
    document.getElementById('x01').value = '0';
    document.getElementById('x02').value = '0';
    document.getElementById('maxTime').value = '10';
    document.getElementById('timeValue').textContent = '10';
}

// Event listeners
document.getElementById('simulateBtn').addEventListener('click', simulate);
document.getElementById('resetBtn').addEventListener('click', reset);
document.getElementById('maxTime').addEventListener('input', (e) => {
    document.getElementById('timeValue').textContent = e.target.value;
});

// Initialize
window.addEventListener('load', () => {
    setupCanvases();
    simulate();
});

window.addEventListener('resize', () => {
    setupCanvases();
    // Redraw without animation
    chart1.animationProgress = 1;
    chart2.animationProgress = 1;
    phaseChart.animationProgress = 1;
    chart1.draw();
    chart2.draw();
    phaseChart.draw();
});