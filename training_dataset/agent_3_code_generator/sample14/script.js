// Boost Converter CCM Simulator
class BoostConverter {
    constructor() {
        // Circuit parameters
        this.Vin = 12;           // Input voltage (V)
        this.D = 0.50;           // Duty cycle
        this.fs = 50000;         // Switching frequency (Hz)
        this.L = 0.0001;         // Inductance (H) - 100µH
        this.C = 0.0001;         // Capacitance (F) - 100µF
        this.Rload = 50;         // Load resistance (Ω)
        
        // Calculated outputs
        this.Vout = 0;
        this.Iout = 0;
        this.deltaIL = 0;
        this.deltaVC = 0;
        
        // Animation state
        this.animationRunning = false;
        this.animationFrame = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.calculate();
        this.updateDisplay();
        this.setupCanvases();
    }
    
    initializeElements() {
        // Sliders
        this.vinSlider = document.getElementById('vinSlider');
        this.dutySlider = document.getElementById('dutySlider');
        this.fsSlider = document.getElementById('fsSlider');
        this.lSlider = document.getElementById('lSlider');
        this.cSlider = document.getElementById('cSlider');
        this.rloadSlider = document.getElementById('rloadSlider');
        
        // Value displays
        this.vinValue = document.getElementById('vinValue');
        this.dutyValue = document.getElementById('dutyValue');
        this.fsValue = document.getElementById('fsValue');
        this.lValue = document.getElementById('lValue');
        this.cValue = document.getElementById('cValue');
        this.rloadValue = document.getElementById('rloadValue');
        
        // Circuit labels
        this.vinLabel = document.getElementById('vinLabel');
        this.inductorLabel = document.getElementById('inductorLabel');
        this.capacitorLabel = document.getElementById('capacitorLabel');
        this.loadLabel = document.getElementById('loadLabel');
        this.dutyLabel = document.getElementById('dutyLabel');
        this.voutIndicator = document.getElementById('voutValue');
        
        // Result displays
        this.voutResult = document.getElementById('voutResult');
        this.ioutResult = document.getElementById('ioutResult');
        this.deltaILResult = document.getElementById('deltaILResult');
        this.deltaVCResult = document.getElementById('deltaVCResult');
        
        // Buttons
        this.simulateBtn = document.getElementById('simulateBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // SVG elements
        this.wires = Array.from({ length: 11 }, (_, i) => 
            document.getElementById(`wire${i + 1}`)
        );
        this.switchBlade = document.getElementById('switchBlade');
        this.diodeGlow = document.getElementById('diodeGlow');
        
        // Canvases
        this.canvas1 = document.getElementById('waveformCanvas1');
        this.ctx1 = this.canvas1.getContext('2d');
        this.canvas2 = document.getElementById('waveformCanvas2');
        this.ctx2 = this.canvas2.getContext('2d');
    }
    
    attachEventListeners() {
        this.vinSlider.addEventListener('input', () => this.updateVin());
        this.dutySlider.addEventListener('input', () => this.updateDuty());
        this.fsSlider.addEventListener('input', () => this.updateFs());
        this.lSlider.addEventListener('input', () => this.updateL());
        this.cSlider.addEventListener('input', () => this.updateC());
        this.rloadSlider.addEventListener('input', () => this.updateRload());
        
        this.simulateBtn.addEventListener('click', () => this.toggleSimulation());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        window.addEventListener('resize', () => this.setupCanvases());
    }
    
    updateVin() {
        this.Vin = parseFloat(this.vinSlider.value);
        this.vinValue.textContent = this.Vin.toFixed(1);
        this.vinLabel.textContent = `${this.Vin}V`;
        this.calculate();
        this.updateDisplay();
    }
    
    updateDuty() {
        this.D = parseFloat(this.dutySlider.value);
        this.dutyValue.textContent = this.D.toFixed(2);
        this.dutyLabel.textContent = `D=${this.D.toFixed(2)}`;
        this.calculate();
        this.updateDisplay();
    }
    
    updateFs() {
        this.fs = parseFloat(this.fsSlider.value) * 1000; // Convert to Hz
        this.fsValue.textContent = (this.fs / 1000).toFixed(0);
        this.calculate();
        this.updateDisplay();
    }
    
    updateL() {
        this.L = parseFloat(this.lSlider.value) / 1000000; // Convert µH to H
        this.lValue.textContent = (this.L * 1000000).toFixed(0);
        this.inductorLabel.textContent = `${(this.L * 1000000).toFixed(0)}µH`;
        this.calculate();
        this.updateDisplay();
    }
    
    updateC() {
        this.C = parseFloat(this.cSlider.value) / 1000000; // Convert µF to F
        this.cValue.textContent = (this.C * 1000000).toFixed(0);
        this.capacitorLabel.textContent = `${(this.C * 1000000).toFixed(0)}µF`;
        this.calculate();
        this.updateDisplay();
    }
    
    updateRload() {
        this.Rload = parseFloat(this.rloadSlider.value);
        this.rloadValue.textContent = this.Rload.toFixed(1);
        this.loadLabel.textContent = `${this.Rload.toFixed(0)}Ω`;
        this.calculate();
        this.updateDisplay();
    }
    
    calculate() {
        // Output voltage: Vout = Vin / (1 - D)
        this.Vout = this.Vin / (1 - this.D);
        
        // Output current: Iout = Vout / Rload
        this.Iout = this.Vout / this.Rload;
        
        // Inductor ripple current: deltaIL = (Vin * D) / (L * fs)
        this.deltaIL = (this.Vin * this.D) / (this.L * this.fs);
        
        // Capacitor ripple voltage: deltaVC = (Iout * D) / (C * fs)
        this.deltaVC = (this.Iout * this.D) / (this.C * this.fs);
    }
    
    updateDisplay() {
        this.voutResult.textContent = `${this.Vout.toFixed(2)} V`;
        this.voutIndicator.textContent = `${this.Vout.toFixed(1)}V`;
        this.ioutResult.textContent = `${this.Iout.toFixed(3)} A`;
        this.deltaILResult.textContent = `${this.deltaIL.toFixed(3)} A`;
        this.deltaVCResult.textContent = `${this.deltaVC.toFixed(3)} V`;
        
        // Animate result cards
        document.querySelectorAll('.result-card').forEach((card, i) => {
            setTimeout(() => {
                card.style.animation = 'none';
                setTimeout(() => {
                    card.style.animation = 'fadeIn 0.5s ease';
                }, 10);
            }, i * 100);
        });
    }
    
    toggleSimulation() {
        if (this.animationRunning) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }
    
    startAnimation() {
        this.animationRunning = true;
        this.simulateBtn.textContent = 'Stop Simulation';
        this.simulateBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        this.animate();
    }
    
    stopAnimation() {
        this.animationRunning = false;
        this.simulateBtn.textContent = 'Run Simulation';
        this.simulateBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        this.wires.forEach(wire => wire.classList.remove('active'));
        this.switchBlade.classList.remove('on');
        this.diodeGlow.classList.remove('conducting');
    }
    
    animate() {
        if (!this.animationRunning) return;
        
        const period = 1000 / (this.fs / 1000); // Period in ms for visualization
        const timeInCycle = (Date.now() % period) / period;
        
        // Switch ON phase (0 to D)
        if (timeInCycle < this.D) {
            this.switchBlade.classList.add('on');
            this.diodeGlow.classList.remove('conducting');
            
            // Current flows: Vin -> L -> Switch -> Ground
            [0, 1, 2, 9, 10].forEach(i => {
                if (this.wires[i]) this.wires[i].classList.add('active');
            });
            [3, 4, 5, 6, 7, 8].forEach(i => {
                if (this.wires[i]) this.wires[i].classList.remove('active');
            });
        } 
        // Switch OFF phase (D to 1)
        else {
            this.switchBlade.classList.remove('on');
            this.diodeGlow.classList.add('conducting');
            
            // Current flows: Vin -> L -> Diode -> Load -> Ground
            [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(i => {
                if (this.wires[i]) this.wires[i].classList.add('active');
            });
            [9, 10].forEach(i => {
                if (this.wires[i]) this.wires[i].classList.remove('active');
            });
        }
        
        this.drawWaveforms(timeInCycle);
        
        requestAnimationFrame(() => this.animate());
    }
    
    reset() {
        this.stopAnimation();
        
        // Reset to default values
        this.Vin = 12;
        this.D = 0.50;
        this.fs = 50000;
        this.L = 0.0001;
        this.C = 0.0001;
        this.Rload = 50;
        
        // Update sliders
        this.vinSlider.value = this.Vin;
        this.dutySlider.value = this.D;
        this.fsSlider.value = this.fs / 1000;
        this.lSlider.value = this.L * 1000000;
        this.cSlider.value = this.C * 1000000;
        this.rloadSlider.value = this.Rload;
        
        // Update displays
        this.vinValue.textContent = this.Vin;
        this.dutyValue.textContent = this.D.toFixed(2);
        this.fsValue.textContent = (this.fs / 1000).toFixed(0);
        this.lValue.textContent = (this.L * 1000000).toFixed(0);
        this.cValue.textContent = (this.C * 1000000).toFixed(0);
        this.rloadValue.textContent = this.Rload.toFixed(1);
        
        this.calculate();
        this.updateDisplay();
        this.drawWaveforms(0);
    }
    
    setupCanvases() {
        [this.canvas1, this.canvas2].forEach(canvas => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * window.devicePixelRatio;
            canvas.height = rect.height * window.devicePixelRatio;
            const ctx = canvas.getContext('2d');
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        });
        this.drawWaveforms(0);
    }
    
    drawWaveforms(timeInCycle) {
        this.drawSwitchAndCurrent(timeInCycle);
        this.drawOutputRipple(timeInCycle);
    }
    
    drawSwitchAndCurrent(timeInCycle) {
        const w = this.canvas1.width / window.devicePixelRatio;
        const h = this.canvas1.height / window.devicePixelRatio;
        
        this.ctx1.clearRect(0, 0, w, h);
        
        const padding = 40;
        const graphW = w - 2 * padding;
        const graphH = (h - 3 * padding) / 2;
        
        // Draw switch state
        this.ctx1.fillStyle = '#1f2937';
        this.ctx1.font = 'bold 14px Arial';
        this.ctx1.fillText('Switch State', padding, padding - 10);
        
        this.ctx1.strokeStyle = '#e5e7eb';
        this.ctx1.lineWidth = 1;
        this.ctx1.strokeRect(padding, padding, graphW, graphH);
        
        // Draw switch waveform
        this.ctx1.strokeStyle = '#f59e0b';
        this.ctx1.lineWidth = 2;
        this.ctx1.beginPath();
        
        for (let i = 0; i <= graphW; i++) {
            const t = i / graphW;
            const x = padding + i;
            const switchState = (t % 1) < this.D ? 1 : 0;
            const y = padding + graphH - switchState * graphH * 0.8;
            
            if (i === 0) this.ctx1.moveTo(x, y);
            else this.ctx1.lineTo(x, y);
        }
        this.ctx1.stroke();
        
        // Current position marker
        const markerX = padding + timeInCycle * graphW;
        this.ctx1.strokeStyle = '#dc2626';
        this.ctx1.lineWidth = 2;
        this.ctx1.beginPath();
        this.ctx1.moveTo(markerX, padding);
        this.ctx1.lineTo(markerX, padding + graphH);
        this.ctx1.stroke();
        
        // Draw inductor current
        const y2Start = padding + graphH + padding;
        this.ctx1.fillText('Inductor Current', padding, y2Start - 10);
        
        this.ctx1.strokeStyle = '#e5e7eb';
        this.ctx1.strokeRect(padding, y2Start, graphW, graphH);
        
        // Calculate average current
        const Iavg = this.Iout / (1 - this.D);
        
        // Draw inductor current waveform
        this.ctx1.strokeStyle = '#10b981';
        this.ctx1.lineWidth = 2;
        this.ctx1.beginPath();
        
        for (let i = 0; i <= graphW; i++) {
            const t = i / graphW;
            let iL;
            
            if ((t % 1) < this.D) {
                // Rising (switch ON)
                const localT = (t % 1) / this.D;
                iL = Iavg - this.deltaIL / 2 + this.deltaIL * localT;
            } else {
                // Falling (switch OFF)
                const localT = ((t % 1) - this.D) / (1 - this.D);
                iL = Iavg + this.deltaIL / 2 - this.deltaIL * localT;
            }
            
            const x = padding + i;
            const y = y2Start + graphH - (iL / (Iavg + this.deltaIL)) * graphH * 0.8;
            
            if (i === 0) this.ctx1.moveTo(x, y);
            else this.ctx1.lineTo(x, y);
        }
        this.ctx1.stroke();
        
        // Current position marker
        this.ctx1.strokeStyle = '#dc2626';
        this.ctx1.lineWidth = 2;
        this.ctx1.beginPath();
        this.ctx1.moveTo(markerX, y2Start);
        this.ctx1.lineTo(markerX, y2Start + graphH);
        this.ctx1.stroke();
    }
    
    drawOutputRipple(timeInCycle) {
        const w = this.canvas2.width / window.devicePixelRatio;
        const h = this.canvas2.height / window.devicePixelRatio;
        
        this.ctx2.clearRect(0, 0, w, h);
        
        const padding = 40;
        const graphW = w - 2 * padding;
        const graphH = h - 2 * padding;
        
        // Draw title and border
        this.ctx2.fillStyle = '#1f2937';
        this.ctx2.font = 'bold 14px Arial';
        this.ctx2.fillText(`Vout Ripple (±${(this.deltaVC / 2).toFixed(3)}V)`, padding, padding - 10);
        
        this.ctx2.strokeStyle = '#e5e7eb';
        this.ctx2.lineWidth = 1;
        this.ctx2.strokeRect(padding, padding, graphW, graphH);
        
        // Draw average line
        this.ctx2.strokeStyle = '#94a3b8';
        this.ctx2.setLineDash([5, 5]);
        this.ctx2.beginPath();
        this.ctx2.moveTo(padding, padding + graphH / 2);
        this.ctx2.lineTo(padding + graphW, padding + graphH / 2);
        this.ctx2.stroke();
        this.ctx2.setLineDash([]);
        
        // Draw ripple waveform (triangular)
        this.ctx2.strokeStyle = '#2563eb';
        this.ctx2.lineWidth = 2.5;
        this.ctx2.beginPath();
        
        for (let i = 0; i <= graphW; i++) {
            const t = i / graphW;
            let vRipple;
            
            if ((t % 1) < this.D) {
                // Discharging (switch ON)
                const localT = (t % 1) / this.D;
                vRipple = this.deltaVC / 2 - this.deltaVC * localT;
            } else {
                // Charging (switch OFF)
                const localT = ((t % 1) - this.D) / (1 - this.D);
                vRipple = -this.deltaVC / 2 + this.deltaVC * localT;
            }
            
            const x = padding + i;
            const y = padding + graphH / 2 - (vRipple / this.deltaVC) * graphH * 0.4;
            
            if (i === 0) this.ctx2.moveTo(x, y);
            else this.ctx2.lineTo(x, y);
        }
        this.ctx2.stroke();
        
        // Current position marker
        const markerX = padding + timeInCycle * graphW;
        this.ctx2.strokeStyle = '#dc2626';
        this.ctx2.lineWidth = 2;
        this.ctx2.beginPath();
        this.ctx2.moveTo(markerX, padding);
        this.ctx2.lineTo(markerX, padding + graphH);
        this.ctx2.stroke();
        
        // Labels
        this.ctx2.fillStyle = '#6b7280';
        this.ctx2.font = '12px Arial';
        this.ctx2.fillText(`+${(this.deltaVC / 2).toFixed(3)}V`, padding - 35, padding + 10);
        this.ctx2.fillText(`-${(this.deltaVC / 2).toFixed(3)}V`, padding - 35, padding + graphH - 5);
    }
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
    new BoostConverter();
});