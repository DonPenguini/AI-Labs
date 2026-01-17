// RLC Underdamped Circuit Simulator
class RLCSimulator {
    constructor() {
        // Circuit parameters
        this.R = 10;        // Resistance in Ohms
        this.L = 0.001;     // Inductance in Henries (1mH)
        this.C = 0.00001;   // Capacitance in Farads (10µF)
        this.V = 10;        // Source voltage in Volts
        
        // Calculated parameters
        this.omega0 = 0;    // Natural frequency
        this.zeta = 0;      // Damping ratio
        this.omegad = 0;    // Damped frequency
        
        // Simulation state
        this.isRunning = false;
        this.currentTime = 0;
        this.dataPoints = [];
        this.animationId = null;
        
        this.initializeElements();
        this.attachEventListeners();
        this.calculateParameters();
        this.setupCanvas();
    }
    
    initializeElements() {
        // Sliders
        this.resistanceSlider = document.getElementById('resistanceSlider');
        this.inductanceSlider = document.getElementById('inductanceSlider');
        this.capacitanceSlider = document.getElementById('capacitanceSlider');
        this.voltageSlider = document.getElementById('voltageSlider');
        
        // Value displays
        this.resistanceValue = document.getElementById('resistanceValue');
        this.inductanceValue = document.getElementById('inductanceValue');
        this.capacitanceValue = document.getElementById('capacitanceValue');
        this.voltageValue = document.getElementById('voltageValue');
        
        // Buttons
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // Status
        this.statusText = document.getElementById('statusText');
        
        // Circuit labels
        this.voltageLabel = document.getElementById('voltageLabel');
        this.resistorLabel = document.getElementById('resistorLabel');
        this.inductorLabel = document.getElementById('inductorLabel');
        this.capacitorLabel = document.getElementById('capacitorLabel');
        this.vcIndicator = document.getElementById('vcIndicator');
        
        // Parameter displays
        this.omega0Value = document.getElementById('omega0Value');
        this.zetaValue = document.getElementById('zetaValue');
        this.omegadValue = document.getElementById('omegadValue');
        this.conditionValue = document.getElementById('conditionValue');
        
        // Canvas
        this.canvas = document.getElementById('graphCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.showGrid = document.getElementById('showGrid');
        this.showPoints = document.getElementById('showPoints');
        
        // Wires
        this.wires = [
            document.getElementById('wire1'),
            document.getElementById('wire2'),
            document.getElementById('wire3'),
            document.getElementById('wire4'),
            document.getElementById('wire5'),
            document.getElementById('wire6')
        ];
    }
    
    attachEventListeners() {
        this.resistanceSlider.addEventListener('input', () => this.updateResistance());
        this.inductanceSlider.addEventListener('input', () => this.updateInductance());
        this.capacitanceSlider.addEventListener('input', () => this.updateCapacitance());
        this.voltageSlider.addEventListener('input', () => this.updateVoltage());
        
        this.startBtn.addEventListener('click', () => this.startSimulation());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        this.showGrid.addEventListener('change', () => this.drawGraph());
        this.showPoints.addEventListener('change', () => this.drawGraph());
        
        window.addEventListener('resize', () => this.setupCanvas());
    }
    
    updateResistance() {
        this.R = parseFloat(this.resistanceSlider.value);
        this.resistanceValue.textContent = this.R.toFixed(1);
        this.resistorLabel.textContent = `${this.R.toFixed(1)}Ω`;
        this.calculateParameters();
    }
    
    updateInductance() {
        this.L = parseFloat(this.inductanceSlider.value) / 1000; // Convert mH to H
        this.inductanceValue.textContent = (this.L * 1000).toFixed(3);
        this.inductorLabel.textContent = `${(this.L * 1000).toFixed(2)}mH`;
        this.calculateParameters();
    }
    
    updateCapacitance() {
        this.C = parseFloat(this.capacitanceSlider.value) / 1000000; // Convert µF to F
        this.capacitanceValue.textContent = (this.C * 1000000).toFixed(3);
        this.capacitorLabel.textContent = `${(this.C * 1000000).toFixed(2)}µF`;
        this.calculateParameters();
    }
    
    updateVoltage() {
        this.V = parseFloat(this.voltageSlider.value);
        this.voltageValue.textContent = this.V;
        this.voltageLabel.textContent = `${this.V}V`;
        this.calculateParameters();
    }
    
    calculateParameters() {
        // Natural frequency: omega0 = 1 / sqrt(L * C)
        this.omega0 = 1 / Math.sqrt(this.L * this.C);
        
        // Damping ratio: zeta = (R/2) * sqrt(C/L)
        this.zeta = (this.R / 2) * Math.sqrt(this.C / this.L);
        
        // Check if underdamped
        if (this.zeta < 1) {
            // Damped frequency: omegad = omega0 * sqrt(1 - zeta^2)
            this.omegad = this.omega0 * Math.sqrt(1 - this.zeta * this.zeta);
            
            this.omega0Value.textContent = `${this.omega0.toFixed(2)} rad/s`;
            this.zetaValue.textContent = this.zeta.toFixed(4);
            this.omegadValue.textContent = `${this.omegad.toFixed(2)} rad/s`;
            this.conditionValue.textContent = 'Underdamped ✓';
            this.conditionValue.style.color = '#10b981';
        } else {
            this.omega0Value.textContent = `${this.omega0.toFixed(2)} rad/s`;
            this.zetaValue.textContent = this.zeta.toFixed(4);
            this.omegadValue.textContent = 'N/A';
            this.conditionValue.textContent = 'Not Underdamped ✗';
            this.conditionValue.style.color = '#ef4444';
        }
    }
    
    calculateVc(t) {
        if (this.zeta >= 1) return 0; // Not underdamped
        
        // vc(t) = V * [1 - (1/sqrt(1-zeta^2)) * exp(-zeta*omega0*t) * sin(omegad*t + atan(sqrt(1-zeta^2)/zeta))]
        const sqrtTerm = Math.sqrt(1 - this.zeta * this.zeta);
        const phase = Math.atan(sqrtTerm / this.zeta);
        const expTerm = Math.exp(-this.zeta * this.omega0 * t);
        const sinTerm = Math.sin(this.omegad * t + phase);
        
        return this.V * (1 - (1 / sqrtTerm) * expTerm * sinTerm);
    }
    
    startSimulation() {
        if (this.zeta >= 1) {
            this.statusText.textContent = 'Error: Not Underdamped!';
            this.statusText.style.color = '#ef4444';
            return;
        }
        
        if (this.isRunning) {
            this.stopSimulation();
            return;
        }
        
        this.isRunning = true;
        this.currentTime = 0;
        this.dataPoints = [];
        this.startBtn.textContent = 'Stop Simulation';
        this.statusText.textContent = 'Running...';
        this.statusText.style.color = '#10b981';
        
        this.animate();
    }
    
    animate() {
        if (!this.isRunning) return;
        
        const dt = 0.0001; // Time step
        const maxTime = 10 / this.omega0; // Simulate for ~10 periods
        
        if (this.currentTime < maxTime) {
            const vc = this.calculateVc(this.currentTime);
            this.dataPoints.push({ t: this.currentTime, vc: vc });
            
            // Update voltage indicator
            this.vcIndicator.textContent = `Vc = ${vc.toFixed(2)}V`;
            this.vcIndicator.style.fill = vc > this.V * 0.5 ? '#dc2626' : '#2563eb';
            
            // Animate wires based on current
            const normalizedVc = vc / this.V;
            this.wires.forEach(wire => {
                if (normalizedVc > 0.1) {
                    wire.classList.add('active');
                } else {
                    wire.classList.remove('active');
                }
            });
            
            this.currentTime += dt;
            this.drawGraph();
            
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.stopSimulation();
            this.statusText.textContent = 'Complete';
            this.statusText.style.color = '#2563eb';
        }
    }
    
    stopSimulation() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.startBtn.textContent = 'Start Simulation';
    }
    
    reset() {
        this.stopSimulation();
        this.currentTime = 0;
        this.dataPoints = [];
        this.statusText.textContent = 'Ready';
        this.statusText.style.color = '#10b981';
        this.vcIndicator.textContent = 'Vc = 0.0V';
        this.wires.forEach(wire => wire.classList.remove('active'));
        this.drawGraph();
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.drawGraph();
    }
    
    drawGraph() {
        const w = this.canvas.width / window.devicePixelRatio;
        const h = this.canvas.height / window.devicePixelRatio;
        
        this.ctx.clearRect(0, 0, w, h);
        
        const padding = 60;
        const graphW = w - 2 * padding;
        const graphH = h - 2 * padding;
        
        // Draw grid
        if (this.showGrid.checked) {
            this.ctx.strokeStyle = '#e5e7eb';
            this.ctx.lineWidth = 1;
            
            for (let i = 0; i <= 10; i++) {
                const x = padding + (graphW / 10) * i;
                const y = padding + (graphH / 10) * i;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x, padding);
                this.ctx.lineTo(x, padding + graphH);
                this.ctx.stroke();
                
                this.ctx.beginPath();
                this.ctx.moveTo(padding, y);
                this.ctx.lineTo(padding + graphW, y);
                this.ctx.stroke();
            }
        }
        
        // Draw axes
        this.ctx.strokeStyle = '#1f2937';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, padding + graphH);
        this.ctx.lineTo(padding + graphW, padding + graphH);
        this.ctx.stroke();
        
        // Labels
        this.ctx.fillStyle = '#1f2937';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText('Vc (V)', padding - 50, padding - 10);
        this.ctx.fillText('Time (s)', padding + graphW - 30, padding + graphH + 40);
        
        if (this.dataPoints.length === 0) return;
        
        // Find max time and voltage for scaling
        const maxTime = Math.max(...this.dataPoints.map(p => p.t));
        const maxVc = Math.max(...this.dataPoints.map(p => Math.abs(p.vc)));
        const range = Math.max(maxVc, this.V) * 1.2;
        
        // Draw voltage reference line
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
        const vRefY = padding + graphH - (this.V / range) * graphH;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, vRefY);
        this.ctx.lineTo(padding + graphW, vRefY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Draw curve
        this.ctx.strokeStyle = '#2563eb';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        this.dataPoints.forEach((point, i) => {
            const x = padding + (point.t / maxTime) * graphW;
            const y = padding + graphH - (point.vc / range) * graphH;
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        
        this.ctx.stroke();
        
        // Draw points
        if (this.showPoints.checked && this.dataPoints.length < 500) {
            this.ctx.fillStyle = '#2563eb';
            this.dataPoints.forEach(point => {
                const x = padding + (point.t / maxTime) * graphW;
                const y = padding + graphH - (point.vc / range) * graphH;
                
                this.ctx.beginPath();
                this.ctx.arc(x, y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
        
        // Draw current value marker
        if (this.isRunning && this.dataPoints.length > 0) {
            const lastPoint = this.dataPoints[this.dataPoints.length - 1];
            const x = padding + (lastPoint.t / maxTime) * graphW;
            const y = padding + graphH - (lastPoint.vc / range) * graphH;
            
            this.ctx.fillStyle = '#10b981';
            this.ctx.beginPath();
            this.ctx.arc(x, y, 5, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
    new RLCSimulator();
});