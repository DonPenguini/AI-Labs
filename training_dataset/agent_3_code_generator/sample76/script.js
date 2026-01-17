let deltaF = 75000;
let fm = 15000;
let BW = 0;
let beta = 0;

const deltaSlider = document.getElementById('delta-slider');
const fmSlider = document.getElementById('fm-slider');
const deltaValue = document.getElementById('delta-value');
const fmValue = document.getElementById('fm-value');
const bwValue = document.getElementById('bw-value');
const betaValue = document.getElementById('beta-value');
const modType = document.getElementById('mod-type');
const bwRatio = document.getElementById('bw-ratio');
const deviationTerm = document.getElementById('deviation-term');
const modulationTerm = document.getElementById('modulation-term');
const totalBw = document.getElementById('total-bw');
const spectrumCanvas = document.getElementById('spectrum-canvas');
const signalCanvas = document.getElementById('signal-canvas');
const specCtx = spectrumCanvas.getContext('2d');
const sigCtx = signalCanvas.getContext('2d');

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return num.toFixed(0);
}

function calculateBandwidth() {
    BW = 2 * (deltaF + fm);
    beta = deltaF / fm;
    
    bwValue.textContent = formatNumber(BW) + 'Hz';
    betaValue.textContent = beta.toFixed(2);
    
    // Determine modulation type
    if (beta < 0.3) {
        modType.textContent = 'Narrowband FM';
    } else if (beta < 1) {
        modType.textContent = 'Intermediate FM';
    } else {
        modType.textContent = 'Wideband FM';
    }
    
    // Bandwidth ratio
    const ratio = BW / (2 * fm);
    bwRatio.textContent = ratio.toFixed(1) + '×';
    
    // Component breakdown
    deviationTerm.textContent = formatNumber(2 * deltaF) + 'Hz';
    modulationTerm.textContent = formatNumber(2 * fm) + 'Hz';
    totalBw.textContent = formatNumber(BW) + 'Hz';
}

function drawSpectrum() {
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;
    
    specCtx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 40, bottom: 50, left: 60 };
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
    
    // Draw carrier frequency marker
    const centerX = padding.left + chartWidth / 2;
    
    // Draw bandwidth indicator
    const bwPixels = (BW / (BW * 1.5)) * chartWidth;
    const bwLeft = centerX - bwPixels / 2;
    const bwRight = centerX + bwPixels / 2;
    
    specCtx.fillStyle = 'rgba(102, 126, 234, 0.1)';
    specCtx.fillRect(bwLeft, padding.top, bwPixels, chartHeight);
    
    specCtx.strokeStyle = '#667eea';
    specCtx.lineWidth = 2;
    specCtx.setLineDash([5, 5]);
    specCtx.beginPath();
    specCtx.moveTo(bwLeft, padding.top);
    specCtx.lineTo(bwLeft, padding.top + chartHeight);
    specCtx.moveTo(bwRight, padding.top);
    specCtx.lineTo(bwRight, padding.top + chartHeight);
    specCtx.stroke();
    specCtx.setLineDash([]);
    
    // Draw spectral components using Bessel functions approximation
    const maxSidebands = Math.min(Math.ceil(beta + 2), 15);
    const spacing = chartWidth / (maxSidebands * 4);
    
    for (let n = -maxSidebands; n <= maxSidebands; n++) {
        const x = centerX + n * spacing;
        
        // Approximate Bessel function magnitude
        let magnitude;
        if (n === 0) {
            // Carrier
            magnitude = Math.abs(Math.cos(beta / 2));
        } else {
            // Sidebands - simplified approximation
            magnitude = Math.exp(-Math.abs(n) / (beta + 1)) * (beta / (Math.abs(n) + 1));
        }
        
        magnitude = Math.min(magnitude, 1);
        
        const lineHeight = magnitude * chartHeight * 0.8;
        const lineY = padding.top + chartHeight - lineHeight;
        
        // Draw spectral line
        const color = n === 0 ? '#ffc107' : '#667eea';
        specCtx.strokeStyle = color;
        specCtx.lineWidth = 2;
        specCtx.beginPath();
        specCtx.moveTo(x, padding.top + chartHeight);
        specCtx.lineTo(x, lineY);
        specCtx.stroke();
        
        // Draw circle at top
        specCtx.fillStyle = color;
        specCtx.beginPath();
        specCtx.arc(x, lineY, 3, 0, Math.PI * 2);
        specCtx.fill();
    }
    
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
    specCtx.fillText('Amplitude', 0, 0);
    specCtx.restore();
    
    // Frequency markers
    specCtx.fillStyle = '#666';
    specCtx.font = '10px Arial';
    specCtx.textAlign = 'center';
    specCtx.textBaseline = 'top';
    specCtx.fillText('fc', centerX, padding.top + chartHeight + 5);
    specCtx.fillText('fc - BW/2', bwLeft, padding.top + chartHeight + 20);
    specCtx.fillText('fc + BW/2', bwRight, padding.top + chartHeight + 20);
    
    // Bandwidth label
    specCtx.fillStyle = '#667eea';
    specCtx.font = 'bold 11px Arial';
    specCtx.fillText('BW = ' + formatNumber(BW) + 'Hz', centerX, padding.top + 10);
}

function drawSignal() {
    const width = signalCanvas.width;
    const height = signalCanvas.height;
    
    sigCtx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    sigCtx.fillStyle = '#fafafa';
    sigCtx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Grid
    sigCtx.strokeStyle = '#e0e0e0';
    sigCtx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartHeight * i / 4);
        sigCtx.beginPath();
        sigCtx.moveTo(padding.left, y);
        sigCtx.lineTo(padding.left + chartWidth, y);
        sigCtx.stroke();
    }
    
    // Draw modulating signal (dashed)
    sigCtx.strokeStyle = '#ff9800';
    sigCtx.lineWidth = 2;
    sigCtx.setLineDash([5, 5]);
    sigCtx.beginPath();
    
    const points = 500;
    const cycles = 3;
    
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * cycles * 2 * Math.PI;
        const x = padding.left + (i / points) * chartWidth;
        const modulating = Math.cos(t);
        const y = padding.top + chartHeight / 2 - (modulating * chartHeight * 0.25);
        
        if (i === 0) {
            sigCtx.moveTo(x, y);
        } else {
            sigCtx.lineTo(x, y);
        }
    }
    sigCtx.stroke();
    sigCtx.setLineDash([]);
    
    // Draw FM signal
    sigCtx.strokeStyle = '#667eea';
    sigCtx.lineWidth = 2;
    sigCtx.beginPath();
    
    let phase = 0;
    const dt = 1 / points;
    
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * cycles * 2 * Math.PI;
        const x = padding.left + (i / points) * chartWidth;
        
        const modulating = Math.cos(t);
        const instantFreq = 1 + (beta * 0.5) * modulating;
        phase += instantFreq * dt * 20;
        
        const signal = Math.cos(phase);
        const y = padding.top + chartHeight / 2 - (signal * chartHeight * 0.4);
        
        if (i === 0) {
            sigCtx.moveTo(x, y);
        } else {
            sigCtx.lineTo(x, y);
        }
    }
    sigCtx.stroke();
    
    // Axes
    sigCtx.strokeStyle = '#333';
    sigCtx.lineWidth = 2;
    sigCtx.beginPath();
    sigCtx.moveTo(padding.left, padding.top + chartHeight / 2);
    sigCtx.lineTo(padding.left + chartWidth, padding.top + chartHeight / 2);
    sigCtx.stroke();
    
    // Labels
    sigCtx.fillStyle = '#333';
    sigCtx.font = '12px Arial';
    sigCtx.textAlign = 'center';
    sigCtx.textBaseline = 'top';
    sigCtx.fillText('Time', padding.left + chartWidth / 2, height - 25);
    
    sigCtx.save();
    sigCtx.translate(20, padding.top + chartHeight / 2);
    sigCtx.rotate(-Math.PI / 2);
    sigCtx.textAlign = 'center';
    sigCtx.fillText('Amplitude', 0, 0);
    sigCtx.restore();
    
    // Legend
    sigCtx.font = '11px Arial';
    sigCtx.textAlign = 'left';
    sigCtx.fillStyle = '#667eea';
    sigCtx.fillText('FM Signal', padding.left + 10, padding.top + 10);
    sigCtx.fillStyle = '#ff9800';
    sigCtx.fillText('Modulating Signal', padding.left + 100, padding.top + 10);
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
    calculateBandwidth();
    drawSpectrum();
    drawSignal();
}

deltaSlider.addEventListener('input', (e) => {
    deltaF = parseFloat(e.target.value);
    deltaValue.textContent = formatNumber(deltaF) + 'Hz';
    updateSimulation();
});

fmSlider.addEventListener('input', (e) => {
    fm = parseFloat(e.target.value);
    fmValue.textContent = formatNumber(fm) + 'Hz';
    updateSimulation();
});

window.addEventListener('resize', () => {
    resizeCanvas(spectrumCanvas);
    resizeCanvas(signalCanvas);
    updateSimulation();
});

// Initialize
resizeCanvas(spectrumCanvas);
resizeCanvas(signalCanvas);
updateSimulation();