// Op-Amp Inverting Amplifier Simulator
class OpAmpInverting {
    constructor() {
        // Circuit parameters
        this.Vin = 0;           // Input voltage (V)
        this.Rin = 10000;       // Input resistor (Ω) - 10kΩ
        this.Rf = 100000;       // Feedback resistor (Ω) - 100kΩ
        
        // Calculated outputs
        this.Av = 0;            // Voltage gain
        this.Vout = 0;          // Output voltage
        this.Iin = 0;           // Input current
        this.If = 0;            // Feedback current
        
        // Animation state
        this.animationRunning = false;
        this.animationPhase = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.calculate();
        this.updateDisplay();
        this.setupCanvas();
        this.drawWaveform();
    }
    
    initializeElements() {
        // Sliders
        this.vinSlider = document.getElementById('vinSlider');
        this.rinSlider = document.getElementById('rinSlider');
        this.rfSlider = document.getElementById('rfSlider');
        
        // Value displays
        this.vinValue = document.getElementById('vinValue');
        this.rinValue = document.getElementById('rinValue');
        this.rfValue = document.getElementById('rfValue');
        
        // Circuit labels
        this.vinCircuitLabel = document.getElementById('vinCircuitLabel');
        this.rinCircuitLabel = document.getElementById('rinCircuitLabel');
        this.rfCircuitLabel = document.getElementById('rfCircuitLabel');
        this.voutCircuitLabel = document.getElementById('voutCircuitLabel');
        this.iinLabel = document.getElementById('iinLabel');
        this.ifLabel = document.getElementById('ifLabel');
        
        // Result displays
        this.gainResult = document.getElementById('gainResult');
        this.gainDetail = document.getElementById('gainDetail');
        this.voutResult = document.getElementById('voutResult');
        this.phaseDetail = document.getElementById('phaseDetail');
        this.iinResult = document.getElementById('iinResult');
        this.ifResult = document.getElementById('ifResult');
        
        // Buttons
        this.calculateBtn = document.getElementById('calculateBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        
        // SVG wires
        this.wires = Array.from({ length: 11 }, (_, i) => 
            document.getElementById(`wire${i + 1}`)
        );
        
        // Canvas
        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');
    }
    
    attachEventListeners() {
        this.vinSlider.addEventListener('input', () => this.updateVin());
        this.rinSlider.addEventListener('input', () => this.updateRin());
        this.rfSlider.addEventListener('input', () => this.updateRf());
        
        this.calculateBtn.addEventListener('click', () => this.toggleAnimation());
        this.resetBtn.addEventListener('click', () => this.reset());
        
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.applyPreset(e.target.dataset.preset));
        });
        
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.drawWaveform();
        });
    }
    
    updateVin() {
        this.Vin = parseFloat(this.vinSlider.value);
        this.vinValue.textContent = this.Vin.toFixed(1);
        this.vinCircuitLabel.textContent = `${this.Vin.toFixed(1)}V`;
        this.calculate();
        this.updateDisplay();
        this.drawWaveform();
    }
    
    updateRin() {
        this.Rin = parseFloat(this.rinSlider.value) * 1000; // Convert kΩ to Ω
        this.rinValue.textContent = (this.Rin / 1000).toFixed(1);
        this.rinCircuitLabel.textContent = this.formatResistance(this.Rin);
        this.calculate();
        this.updateDisplay();
        this.drawWaveform();
    }
    
    updateRf() {
        this.Rf = parseFloat(this.rfSlider.value) * 1000; // Convert kΩ to Ω
        this.rfValue.textContent = (this.Rf / 1000).toFixed(1);
        this.rfCircuitLabel.textContent = this.formatResistance(this.Rf);
        this.calculate();
        this.updateDisplay();
        this.drawWaveform();
    }
    
    formatResistance(resistance) {
        if (resistance >= 1000000) {
            return `${(resistance / 1000000).toFixed(1)}MΩ`;
        } else if (resistance >= 1000) {
            return `${(resistance / 1000).toFixed(1)}kΩ`;
        } else {
            return `${resistance.toFixed(0)}Ω`;
        }
    }
    
    calculate() {
        // Voltage gain: Av = -Rf / Rin
        this.Av = -this.Rf / this.Rin;
        
        // Output voltage: Vout = Av * Vin
        this.Vout = this.Av * this.Vin;
        
        // Input current: Iin = Vin / Rin (virtual ground at inverting input)
        this.Iin = this.Vin / this.Rin;
        
        // Feedback current: If = Vout / Rf (equals Iin in ideal case)
        this.If = this.Vout / this.Rf;
    }
    
    updateDisplay() {
        // Gain display
        this.gainResult.textContent = this.Av.toFixed(2);
        this.gainDetail.textContent = `|Av| = ${Math.abs(this.Av).toFixed(2)}`;
        
        // Output voltage display
        this.voutResult.textContent = `${this.Vout.toFixed(2)} V`;
        this.voutCircuitLabel.textContent = `${this.Vout.toFixed(1)}V`;
        
        // Phase detail
        if (this.Vin !== 0) {
            if ((this.Vin > 0 && this.Vout < 0) || (this.Vin < 0 && this.Vout > 0)) {
                this.phaseDetail.textContent = 'Phase: Inverted 180°';
            } else {
                this.phaseDetail.textContent = 'Phase: No inversion';
            }
        } else {
            this.phaseDetail.textContent = 'Phase: N/A (Vin = 0)';
        }
        
        // Current displays
        this.iinResult.textContent = `${(this.Iin * 1000).toFixed(3)} mA`;
        this.ifResult.textContent = `${(this.If * 1000).toFixed(3)} mA`;
        
        // Circuit current labels
        this.iinLabel.textContent = `Iin=${(this.Iin * 1000).toFixed(2)}mA`;
        this.ifLabel.textContent = `If=${(Math.abs(this.If) * 1000).toFixed(2)}mA`;
        
        // Animate result cards
        this.animateResultCards();
    }
    
    animateResultCards() {
        const cards = document.querySelectorAll('.result-card');
        cards.forEach((card, i) => {
            setTimeout(() => {
                card.style.animation = 'none';
                setTimeout(() => {
                    card.style.animation = 'fadeIn 0.6s ease';
                }, 10);
            }, i * 100);
        });
    }
    
    applyPreset(preset) {
        switch(preset) {
            case 'unity':
                this.Rin = 10000;
                this.Rf = 10000;
                this.rinSlider.value = 10;
                this.rfSlider.value = 10;
                break;
            case 'x10':
                this.Rin = 10000;
                this.Rf = 100000;
                this.rinSlider.value = 10;
                this.rfSlider.value = 100;
                break;
            case 'x100':
                this.Rin = 1000;
                this.Rf = 100000;
                this.rinSlider.value = 1;
                this.rfSlider.value = 100;
                break;
        }
        
        this.rinValue.textContent = (this.Rin / 1000).toFixed(1);
        this.rfValue.textContent = (this.Rf / 1000).toFixed(1);
        this.rinCircuitLabel.textContent = this.formatResistance(this.Rin);
        this.rfCircuitLabel.textContent = this.formatResistance(this.Rf);
        
        this.calculate();
        this.updateDisplay();
        this.drawWaveform();
        
        // Visual feedback
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.style.transform = '';
        });
        event.target.style.transform = 'scale(0.95)';
        setTimeout(() => {
            event.target.style.transform = '';
        }, 200);
    }
    
    toggleAnimation() {
        if (this.animationRunning) {
            this.stopAnimation();
        } else {
            this.startAnimation();
        }
    }
    
    startAnimation() {
        this.animationRunning = true;
        this.calculateBtn.textContent = 'Stop Animation';
        this.calculateBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
        this.animate();
    }
    
    stopAnimation() {
        this.animationRunning = false;
        this.calculateBtn.textContent = 'Calculate';
        this.calculateBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        this.wires.forEach(wire => wire.classList.remove('active'));
    }
    
    animate() {
        if (!this.animationRunning) return;
        
        this.animationPhase += 0.02;
        
        // Animate current flow based on Vin polarity
        if (Math.abs(this.Vin) > 0.1) {
            // Input path: wire1 -> wire2
            this.wires[0].classList.add('active');
            this.wires[1].classList.add('active');
            
            // Virtual ground connections: wire3, wire4
            this.wires[2].classList.add('active');
            this.wires[3].classList.add('active');
            
            // Feedback path: wire6 -> wire7 -> wire8
            this.wires[5].classList.add('active');
            this.wires[6].classList.add('active');
            this.wires[7].classList.add('active');
            
            // Output path: wire5
            this.wires[4].classList.add('active');
            
            // Ground return: wire9, wire10, wire11
            this.wires[8].classList.add('active');
            this.wires[9].classList.add('active');
            this.wires[10].classList.add('active');
        } else {
            this.wires.forEach(wire => wire.classList.remove('active'));
        }
        
        requestAnimationFrame(() => this.animate());
    }
    
    reset() {
        this.stopAnimation();
        
        // Reset to default values
        this.Vin = 0;
        this.Rin = 10000;
        this.Rf = 100000;
        
        // Update sliders
        this.vinSlider.value = 0;
        this.rinSlider.value = 10;
        this.rfSlider.value = 100;
        
        // Update displays
        this.vinValue.textContent = '0.0';
        this.rinValue.textContent = '10';
        this.rfValue.textContent = '100';
        
        this.vinCircuitLabel.textContent = '0V';
        this.rinCircuitLabel.textContent = '10kΩ';
        this.rfCircuitLabel.textContent = '100kΩ';
        
        this.calculate();
        this.updateDisplay();
        this.drawWaveform();
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    
    drawWaveform() {
        const w = this.canvas.width / window.devicePixelRatio;
        const h = this.canvas.height / window.devicePixelRatio;
        
        this.ctx.clearRect(0, 0, w, h);
        
        const padding = 60;
        const graphW = w - 2 * padding;
        const graphH = h - 2 * padding;
        
        // Draw grid
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
        
        // Draw axes
        this.ctx.strokeStyle = '#1f2937';
        this.ctx.lineWidth = 2;
        
        // Center line (0V)
        const centerY = padding + graphH / 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(padding, centerY);
        this.ctx.lineTo(padding + graphW, centerY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Axes
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, padding + graphH);
        this.ctx.lineTo(padding + graphW, padding + graphH);
        this.ctx.stroke();
        
        // Labels
        this.ctx.fillStyle = '#1f2937';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.fillText('Voltage (V)', padding - 50, padding - 15);
        this.ctx.fillText('Time', padding + graphW - 30, padding + graphH + 40);
        
        // Draw voltage markers
        const maxV = Math.max(Math.abs(this.Vin), Math.abs(this.Vout), 5);
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#6b7280';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`+${maxV.toFixed(1)}V`, padding - 10, padding + 5);
        this.ctx.fillText('0V', padding - 10, centerY + 5);
        this.ctx.fillText(`-${maxV.toFixed(1)}V`, padding - 10, padding + graphH + 5);
        this.ctx.textAlign = 'left';
        
        // Draw sinusoidal waveforms
        const cycles = 2;
        const points = 200;
        
        // Input waveform (sine wave)
        this.ctx.strokeStyle = '#10b981';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        for (let i = 0; i <= points; i++) {
            const t = (i / points) * cycles * 2 * Math.PI;
            const x = padding + (i / points) * graphW;
            const y = centerY - (Math.sin(t) * this.Vin / maxV) * (graphH / 2.5);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Output waveform (inverted sine wave)
        this.ctx.strokeStyle = '#dc2626';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        
        for (let i = 0; i <= points; i++) {
            const t = (i / points) * cycles * 2 * Math.PI;
            const x = padding + (i / points) * graphW;
            const y = centerY - (Math.sin(t) * this.Vout / maxV) * (graphH / 2.5);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();
        
        // Draw phase shift annotation if there's significant signal
        if (Math.abs(this.Vin) > 0.5) {
            this.ctx.fillStyle = '#4b5563';
            this.ctx.font = 'italic 14px Arial';
            this.ctx.fillText('180° Phase Shift', padding + graphW / 2 - 50, padding + 20);
        }
    }
}

// Initialize simulator
document.addEventListener('DOMContentLoaded', () => {
    new OpAmpInverting();
});