let fs = 1000;
let N = 1024;
let df = 0;
let spectrumData = [];

const fsSlider = document.getElementById('fs-slider');
const nSlider = document.getElementById('n-slider');
const fsValue = document.getElementById('fs-value');
const nValue = document.getElementById('n-value');
const dfValue = document.getElementById('df-value');
const formula = document.getElementById('formula');
const binWidth = document.getElementById('bin-width');
const canvas = document.getElementById('spectrum-canvas');
const ctx = canvas.getContext('2d');

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'k';
    if (num < 0.01) return num.toExponential(2);
    return num.toFixed(2);
}

function calculateDf() {
    df = fs / N;
    dfValue.textContent = formatNumber(df) + ' Hz';
    formula.textContent = `df = ${formatNumber(fs)} / ${formatNumber(N)} Hz`;
    binWidth.textContent = formatNumber(df);
}

function generateSpectrumData() {
    spectrumData = [];
    const numBins = Math.min(50, N / 2);
    
    for (let i = 0; i < numBins; i++) {
        spectrumData.push({
            bin: i,
            frequency: i * df,
            magnitude: Math.random() * 0.3 + 0.1
        });
    }
}

function drawSpectrum() {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (spectrumData.length === 0) return;
    
    const padding = { top: 20, right: 30, bottom: 50, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Draw background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Draw grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText((1 - i / 5).toFixed(1), padding.left - 8, y);
    }
    
    // Vertical grid lines
    const numVerticalLines = 5;
    for (let i = 0; i <= numVerticalLines; i++) {
        const x = padding.left + (chartWidth * i / numVerticalLines);
        ctx.strokeStyle = '#e0e0e0';
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
    }
    
    // Draw line chart
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const maxFreq = spectrumData[spectrumData.length - 1].frequency;
    
    spectrumData.forEach((point, index) => {
        const x = padding.left + (point.frequency / maxFreq) * chartWidth;
        const y = padding.top + chartHeight - (point.magnitude * chartHeight);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw dots
    spectrumData.forEach(point => {
        const x = padding.left + (point.frequency / maxFreq) * chartWidth;
        const y = padding.top + chartHeight - (point.magnitude * chartHeight);
        
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // X-axis label
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Frequency (Hz)', padding.left + chartWidth / 2, height - 20);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Magnitude', 0, 0);
    ctx.restore();
    
    // X-axis tick labels
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i <= numVerticalLines; i++) {
        const freq = (maxFreq * i / numVerticalLines);
        const x = padding.left + (chartWidth * i / numVerticalLines);
        ctx.fillText(formatNumber(freq), x, padding.top + chartHeight + 5);
    }
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Set canvas size with device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Set CSS size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    drawSpectrum();
}

function updateSimulation() {
    calculateDf();
    generateSpectrumData();
    drawSpectrum();
}

fsSlider.addEventListener('input', (e) => {
    fs = parseFloat(e.target.value);
    fsValue.textContent = formatNumber(fs) + ' Hz';
    updateSimulation();
});

nSlider.addEventListener('input', (e) => {
    N = parseInt(e.target.value);
    nValue.textContent = formatNumber(N);
    updateSimulation();
});

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
updateSimulation();