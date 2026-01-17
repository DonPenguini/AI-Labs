let m = 0.5;
let sidebandFraction = 0;

const mSlider = document.getElementById('m-slider');
const mValue = document.getElementById('m-value');
const modStatus = document.getElementById('mod-status');
const sidebandValue = document.getElementById('sideband-value');
const sidebandPercent = document.getElementById('sideband-percent');
const carrierPercent = document.getElementById('carrier-percent');
const efficiency = document.getElementById('efficiency');
const carrierBar = document.getElementById('carrier-bar');
const sidebandBar = document.getElementById('sideband-bar');
const carrierBarValue = document.getElementById('carrier-bar-value');
const sidebandBarValue = document.getElementById('sideband-bar-value');
const waveformCanvas = document.getElementById('waveform-canvas');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const waveCtx = waveformCanvas.getContext('2d');
const specCtx = spectrumCanvas.getContext('2d');

function formatNumber(num) {
    if (num < 0.01) return num.toExponential(2);
    return num.toFixed(3);
}

function calculateSidebandPower() {
    sidebandFraction = (m * m) / 2;
    
    sidebandValue.textContent = formatNumber(sidebandFraction);
    
    const sidebandPct = sidebandFraction * 100;
    const carrierPct = 100 - sidebandPct;
    
    sidebandPercent.textContent = sidebandPct.toFixed(2) + '%';
    carrierPercent.textContent = carrierPct.toFixed(2) + '%';
    efficiency.textContent = sidebandPct.toFixed(2) + '%';
    
    // Update power bars
    carrierBar.style.width = carrierPct + '%';
    sidebandBar.style.width = sidebandPct + '%';
    carrierBarValue.textContent = carrierPct.toFixed(1) + '%';
    sidebandBarValue.textContent = sidebandPct.toFixed(1) + '%';
    
    // Update modulation status
    const modPct = m * 100;
    if (m === 0) {
        modStatus.textContent = 'No Modulation (Carrier Only)';
        modStatus.style.background = '#ffebee';
        modStatus.style.color = '#c62828';
    } else if (m < 0.3) {
        modStatus.textContent = modPct.toFixed(0) + '% Modulation (Low)';
        modStatus.style.background = '#fff3e0';
        modStatus.style.color = '#e65100';
    } else if (m < 0.7) {
        modStatus.textContent = modPct.toFixed(0) + '% Modulation (Moderate)';
        modStatus.style.background = '#e7f3ff';
        modStatus.style.color = '#1976D2';
    } else if (m < 1) {
        modStatus.textContent = modPct.toFixed(0) + '% Modulation (High)';
        modStatus.style.background = '#e8f5e9';
        modStatus.style.color = '#2e7d32';
    } else {
        modStatus.textContent = '100% Modulation (Maximum)';
        modStatus.style.background = '#e8f5e9';
        modStatus.style.color = '#1b5e20';
    }
}

function drawWaveform() {
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;
    
    waveCtx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    waveCtx.fillStyle = '#fafafa';
    waveCtx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Grid
    waveCtx.strokeStyle = '#e0e0e0';
    waveCtx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        waveCtx.beginPath();
        waveCtx.moveTo(padding.left, y);
        waveCtx.lineTo(padding.left + chartWidth, y);
        waveCtx.stroke();
    }
    
    // Draw envelope
    waveCtx.strokeStyle = '#ff9800';
    waveCtx.lineWidth = 2;
    waveCtx.setLineDash([5, 5]);
    
    const points = 500;
    const cycles = 4;
    
    // Upper envelope
    waveCtx.beginPath();
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * cycles * 2 * Math.PI;
        const x = padding.left + (i / points) * chartWidth;
        const envelope = 1 + m * Math.cos(t / cycles);
        const y = padding.top + chartHeight / 2 - (envelope * chartHeight * 0.35);
        
        if (i === 0) {
            waveCtx.moveTo(x, y);
        } else {
            waveCtx.lineTo(x, y);
        }
    }
    waveCtx.stroke();
    
    // Lower envelope
    waveCtx.beginPath();
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * cycles * 2 * Math.PI;
        const x = padding.left + (i / points) * chartWidth;
        const envelope = 1 + m * Math.cos(t / cycles);
        const y = padding.top + chartHeight / 2 + (envelope * chartHeight * 0.35);
        
        if (i === 0) {
            waveCtx.moveTo(x, y);
        } else {
            waveCtx.lineTo(x, y);
        }
    }
    waveCtx.stroke();
    waveCtx.setLineDash([]);
    
    // Draw AM signal
    waveCtx.strokeStyle = '#667eea';
    waveCtx.lineWidth = 2;
    waveCtx.beginPath();
    
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * cycles * 2 * Math.PI;
        const x = padding.left + (i / points) * chartWidth;
        const modulating = Math.cos(t / cycles);
        const carrier = Math.cos(t * 20);
        const signal = (1 + m * modulating) * carrier;
        const y = padding.top + chartHeight / 2 - (signal * chartHeight * 0.35);
        
        if (i === 0) {
            waveCtx.moveTo(x, y);
        } else {
            waveCtx.lineTo(x, y);
        }
    }
    waveCtx.stroke();
    
    // Axes
    waveCtx.strokeStyle = '#333';
    waveCtx.lineWidth = 2;
    waveCtx.beginPath();
    waveCtx.moveTo(padding.left, padding.top + chartHeight / 2);
    waveCtx.lineTo(padding.left + chartWidth, padding.top + chartHeight / 2);
    waveCtx.stroke();
    
    // Labels
    waveCtx.fillStyle = '#333';
    waveCtx.font = '12px Arial';
    waveCtx.textAlign = 'center';
    waveCtx.textBaseline = 'top';
    waveCtx.fillText('Time', padding.left + chartWidth / 2, height - 25);
    
    waveCtx.save();
    waveCtx.translate(20, padding.top + chartHeight / 2);
    waveCtx.rotate(-Math.PI / 2);
    waveCtx.textAlign = 'center';
    waveCtx.fillText('Amplitude', 0, 0);
    waveCtx.restore();
    
    // Y-axis labels
    waveCtx.fillStyle = '#666';
    waveCtx.font = '10px Arial';
    waveCtx.textAlign = 'right';
    waveCtx.textBaseline = 'middle';
    waveCtx.fillText((1 + m).toFixed(1), padding.left - 5, padding.top);
    waveCtx.fillText('0', padding.left - 5, padding.top + chartHeight / 2);
    waveCtx.fillText('-' + (1 + m).toFixed(1), padding.left - 5, padding.top + chartHeight);
    
    // Legend
    waveCtx.font = '11px Arial';
    waveCtx.textAlign = 'left';
    waveCtx.fillStyle = '#667eea';
    waveCtx.fillText('AM Signal', padding.left + 10, padding.top + 10);
    waveCtx.fillStyle = '#ff9800';
    waveCtx.fillText('Envelope', padding.left + 90, padding.top + 10);
}

function drawSpectrum() {
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    
    specCtx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    specCtx.fillStyle = '#fafafa';
    specCtx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Grid
    specCtx.strokeStyle = '#e0e0e0';
    specCtx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        specCtx.beginPath();
        specCtx.moveTo(padding.left, y);
        specCtx.lineTo(padding.left + chartWidth, y);
        specCtx.stroke();
    }
    
    // Carrier power (normalized to 1)
    const carrierPower = 1;
    const sidebandPower = m * m / 4; // Each sideband
    
    const maxPower = Math.max(carrierPower, sidebandPower * 2);
    
    // Draw spectral lines
    const centerX = padding.left + chartWidth / 2;
    const spacing = chartWidth / 8;
    
    // Lower sideband
    drawSpectralLine(specCtx, centerX - spacing, padding.top, chartHeight, sidebandPower / maxPower, '#764ba2', 'LSB');
    
    // Carrier
    drawSpectralLine(specCtx, centerX, padding.top, chartHeight, carrierPower / maxPower, '#ffc107', 'fc');
    
    // Upper sideband
    drawSpectralLine(specCtx, centerX + spacing, padding.top, chartHeight, sidebandPower / maxPower, '#667eea', 'USB');
    
    // Axes
    specCtx.strokeStyle = '#333';
    specCtx.lineWidth = 2;
    specCtx.beginPath();
    specCtx.moveTo(padding.left, padding.top + chartHeight);
    specCtx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    specCtx.stroke();
    
    specCtx.beginPath();
    specCtx.moveTo(padding.left, padding.top);
    specCtx.lineTo(padding.left, padding.top + chartHeight);
    specCtx.stroke();
    
    // Labels
    specCtx.fillStyle = '#333';
    specCtx.font = '12px Arial';
    specCtx.textAlign = 'center';
    specCtx.textBaseline = 'top';
    specCtx.fillText('Frequency', padding.left + chartWidth / 2, height - 25);
    
    specCtx.save();
    specCtx.translate(20, padding.top + chartHeight / 2);
    specCtx.rotate(-Math.PI / 2);
    specCtx.textAlign = 'center';
    specCtx.fillText('Power', 0, 0);
    specCtx.restore();
    
    // Frequency labels
    specCtx.fillStyle = '#666';
    specCtx.font = '10px Arial';
    specCtx.textAlign = 'center';
    specCtx.textBaseline = 'top';
    specCtx.fillText('fc - fm', centerX - spacing, padding.top + chartHeight + 5);
    specCtx.fillText('fc', centerX, padding.top + chartHeight + 5);
    specCtx.fillText('fc + fm', centerX + spacing, padding.top + chartHeight + 5);
}

function drawSpectralLine(ctx, x, y, height, magnitude, color, label) {
    const lineHeight = magnitude * height * 0.8;
    const lineY = y + height - lineHeight;
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x, lineY);
    ctx.stroke();
    
    // Draw circle at top
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, lineY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw label
    ctx.fillStyle = color;
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, x, lineY - 8);
}

function resizeCanvas(canvas) {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
}

function updateSimulation() {
    calculateSidebandPower();
    drawWaveform();
    drawSpectrum();
}

mSlider.addEventListener('input', (e) => {
    m = parseFloat(e.target.value);
    mValue.textContent = m.toFixed(2);
    updateSimulation();
});

window.addEventListener('resize', () => {
    resizeCanvas(waveformCanvas);
    resizeCanvas(spectrumCanvas);
    updateSimulation();
});

// Initialize
resizeCanvas(waveformCanvas);
resizeCanvas(spectrumCanvas);
updateSimulation();