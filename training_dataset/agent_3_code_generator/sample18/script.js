// MOSFET Saturation Simulator
class MOSFETSimulator {
    constructor() {
        this.params = {
            kn: 1e-3,
            vth: 1.0,
            lambda: 0.02,
            vgs: 3.0,
            vds: 5.0
        };
        
        this.chart = null;
        this.particles = [];
        this.initializeControls();
        this.initializeChart();
        this.animate();
        this.updateSimulation();
    }
    
    initializeControls() {
        // kn slider (logarithmic scale)
        const knSlider = document.getElementById('kn');
        knSlider.addEventListener('input', (e) => {
            this.params.kn = Math.pow(10, parseFloat(e.target.value));
            document.getElementById('kn-value').textContent = this.params.kn.toExponential(2) + ' A/V²';
            this.updateSimulation();
        });
        
        // Vth slider
        const vthSlider = document.getElementById('vth');
        vthSlider.addEventListener('input', (e) => {
            this.params.vth = parseFloat(e.target.value);
            document.getElementById('vth-value').textContent = this.params.vth.toFixed(1) + ' V';
            this.updateSimulation();
        });
        
        // Lambda slider
        const lambdaSlider = document.getElementById('lambda');
        lambdaSlider.addEventListener('input', (e) => {
            this.params.lambda = parseFloat(e.target.value);
            document.getElementById('lambda-value').textContent = this.params.lambda.toFixed(3) + ' 1/V';
            this.updateSimulation();
        });
        
        // Vgs slider
        const vgsSlider = document.getElementById('vgs');
        vgsSlider.addEventListener('input', (e) => {
            this.params.vgs = parseFloat(e.target.value);
            document.getElementById('vgs-value').textContent = this.params.vgs.toFixed(1) + ' V';
            this.updateSimulation();
        });
        
        // Vds slider
        const vdsSlider = document.getElementById('vds');
        vdsSlider.addEventListener('input', (e) => {
            this.params.vds = parseFloat(e.target.value);
            document.getElementById('vds-value').textContent = this.params.vds.toFixed(1) + ' V';
            this.updateSimulation();
        });
    }
    
    calculateDrainCurrent() {
        const { kn, vth, lambda, vgs, vds } = this.params;
        
        // Check if in saturation region
        if (vgs < vth) {
            return { id: 0, inSaturation: false };
        }
        
        // Square-law model in saturation
        const id = 0.5 * kn * Math.pow(vgs - vth, 2) * (1 + lambda * vds);
        
        return { id, inSaturation: true };
    }
    
    updateSimulation() {
        const result = this.calculateDrainCurrent();
        const idMilliamps = result.id * 1000; // Convert to mA
        
        // Update current display
        const currentValue = document.querySelector('.current-value');
        const currentUnit = document.querySelector('.current-unit');
        
        if (idMilliamps >= 1) {
            currentValue.textContent = idMilliamps.toFixed(2);
            currentUnit.textContent = 'mA';
        } else {
            currentValue.textContent = (idMilliamps * 1000).toFixed(2);
            currentUnit.textContent = 'µA';
        }
        
        // Update status
        const status = document.getElementById('status');
        if (!result.inSaturation) {
            status.classList.add('warning');
            status.querySelector('.status-text').textContent = 'Cut-off (Vgs < Vth)';
        } else {
            status.classList.remove('warning');
            status.querySelector('.status-text').textContent = 'Saturation Region';
        }
        
        // Animate channel and particles
        this.animateChannel(result.inSaturation, result.id);
        
        // Update chart
        this.updateChart();
    }
    
    animateChannel(inSaturation, current) {
        const channel = document.getElementById('channel');
        const gate = document.getElementById('gate');
        
        if (inSaturation) {
            const opacity = Math.min(0.8, current * 400);
            channel.style.opacity = opacity;
            gate.style.fill = '#e74c3c';
            
            // Update particle flow rate based on current
            this.particleFlowRate = Math.max(0.5, current * 500);
        } else {
            channel.style.opacity = '0';
            gate.style.fill = '#95a5a6';
            this.particleFlowRate = 0;
        }
    }
    
    createParticle() {
        if (Math.random() > this.particleFlowRate / 100) return;
        
        const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        particle.setAttribute('r', '3');
        particle.setAttribute('cx', '140');
        particle.setAttribute('cy', '162');
        particle.setAttribute('fill', '#4CAF50');
        particle.setAttribute('class', 'particle');
        
        const particlesGroup = document.getElementById('particles');
        particlesGroup.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 2000);
    }
    
    animate() {
        this.createParticle();
        requestAnimationFrame(() => this.animate());
    }
    
    initializeChart() {
        const canvas = document.getElementById('chart');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        this.chartCtx = ctx;
        this.chartWidth = canvas.offsetWidth;
        this.chartHeight = canvas.offsetHeight;
    }
    
    updateChart() {
        const ctx = this.chartCtx;
        const width = this.chartWidth;
        const height = this.chartHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Chart margins
        const margin = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        // Generate data points (Id vs Vds for current Vgs)
        const dataPoints = [];
        const vdsMax = 10;
        const steps = 50;
        
        for (let i = 0; i <= steps; i++) {
            const vds = (vdsMax / steps) * i;
            const id = 0.5 * this.params.kn * Math.pow(Math.max(0, this.params.vgs - this.params.vth), 2) * (1 + this.params.lambda * vds);
            dataPoints.push({ vds, id: id * 1000 }); // Convert to mA
        }
        
        // Find max Id for scaling
        const maxId = Math.max(...dataPoints.map(d => d.id), 1);
        
        // Draw axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(margin.left, margin.top);
        ctx.lineTo(margin.left, height - margin.bottom);
        ctx.lineTo(width - margin.right, height - margin.bottom);
        ctx.stroke();
        
        // Draw grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = margin.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(margin.left, y);
            ctx.lineTo(width - margin.right, y);
            ctx.stroke();
        }
        
        // Draw curve
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        dataPoints.forEach((point, i) => {
            const x = margin.left + (point.vds / vdsMax) * chartWidth;
            const y = height - margin.bottom - (point.id / maxId) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();
        
        // Draw current operating point
        const currentX = margin.left + (this.params.vds / vdsMax) * chartWidth;
        const currentId = 0.5 * this.params.kn * Math.pow(Math.max(0, this.params.vgs - this.params.vth), 2) * (1 + this.params.lambda * this.params.vds) * 1000;
        const currentY = height - margin.bottom - (currentId / maxId) * chartHeight;
        
        ctx.fillStyle = '#ff5722';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = '#ff5722';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Labels
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Vds (V)', width / 2, height - 5);
        
        ctx.save();
        ctx.translate(15, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Id (mA)', 0, 0);
        ctx.restore();
        
        // Axis values
        ctx.font = '10px Arial';
        ctx.fillText('0', margin.left, height - margin.bottom + 20);
        ctx.fillText(vdsMax.toFixed(0), width - margin.right, height - margin.bottom + 20);
        
        ctx.textAlign = 'right';
        ctx.fillText('0', margin.left - 10, height - margin.bottom);
        ctx.fillText(maxId.toFixed(2), margin.left - 10, margin.top + 5);
        
        // Chart title
        ctx.textAlign = 'center';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Id vs Vds (Vgs = ${this.params.vgs.toFixed(1)}V)`, width / 2, 15);
    }
}

// Initialize simulator when page loads
window.addEventListener('DOMContentLoaded', () => {
    new MOSFETSimulator();
});