let n = 2;
let wc = 1000;
let w = 500;
let magnitude = 0;

const nSlider = document.getElementById('n-slider');
const wcSlider = document.getElementById('wc-slider');
const wSlider = document.getElementById('w-slider');
const nValue = document.getElementById('n-value');
const wcValue = document.getElementById('wc-value');
const wValue = document.getElementById('w-value');
const magValue = document.getElementById('mag-value');
const magDb = document.getElementById('mag-db');
const attenuation = document.getElementById('attenuation');
const ratio = document.getElementById('ratio');
const canvas = document.getElementById('response-canvas');
const ctx = canvas.getContext('2d');

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'k';
    if (num < 0.01) return num.toExponential(2);
    return num.toFixed(0);
}

function calculateMagnitude(freq) {
    const ratio = freq / wc;
    const mag = 1 / Math.sqrt(1 + Math.pow(ratio, 2 * n));
    return mag;
}

function updateResults() {
    magnitude = calculateMagnitude(w);
    
    magValue.textContent = magnitude.toFixed(4);
    
    const dB = 20 * Math.log10(magnitude);
    magDb.textContent = dB.toFixed(2) + ' dB';
    
    const atten = (1 - magnitude) * 100;
    attenuation.textContent = atten.toFixed(1) + '%';
    
    const freqRatio = w / wc;
    ratio.textContent = freqRatio.toFixed(2);
}

function drawFrequencyResponse() {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 40, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid (magnitude)
    for (let i = 0; i <= 10; i++) {
        const y = padding.top + (chartHeight * i / 10);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
        
        // Y-axis labels (dB)
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const dbVal = -i * 6;
        ctx.fillText(dbVal + ' dB', padding.left - 8, y);
    }
    
    // Vertical grid (frequency - log scale)
    const decades = 4;
    for (let decade = 0; decade <= decades; decade++) {
        const freq = Math.pow(10, decade) * (wc / 1000);
        const logFreq = Math.log10(freq / (wc / 1000));
        const x = padding.left + (logFreq / decades) * chartWidth;
        
        if (x >= padding.left && x <= padding.left + chartWidth) {
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
        }
    }
    
    // Draw cutoff frequency line
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const cutoffX = padding.left + chartWidth / 2;
    ctx.beginPath();
    ctx.moveTo(cutoffX, padding.top);
    ctx.lineTo(cutoffX, padding.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw -3dB line
    ctx.strokeStyle = '#ff9800';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    const db3Y = padding.top + chartHeight * (3 / 60);
    ctx.beginPath();
    ctx.moveTo(padding.left, db3Y);
    ctx.lineTo(padding.left + chartWidth, db3Y);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw frequency response curve
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const points = 500;
    const minFreq = wc / 1000;
    const maxFreq = wc * 100;
    
    // Clipping region to prevent drawing outside chart
    ctx.save();
    ctx.beginPath();
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight);
    ctx.clip();
    
    ctx.beginPath();
    for (let i = 0; i <= points; i++) {
        const logFreq = Math.log10(minFreq) + (i / points) * (Math.log10(maxFreq) - Math.log10(minFreq));
        const freq = Math.pow(10, logFreq);
        const mag = calculateMagnitude(freq);
        const db = 20 * Math.log10(mag);
        
        // Clamp dB to visible range
        const clampedDb = Math.max(-60, Math.min(0, db));
        
        const x = padding.left + ((logFreq - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq))) * chartWidth;
        const y = padding.top + chartHeight - ((clampedDb + 60) / 60) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    }
    ctx.stroke();
    ctx.restore();
    
    // Draw current frequency marker
    const currentLogFreq = Math.log10(w);
    const currentX = padding.left + ((currentLogFreq - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq))) * chartWidth;
    const currentMag = calculateMagnitude(w);
    const currentDb = 20 * Math.log10(currentMag);
    const clampedCurrentDb = Math.max(-60, Math.min(0, currentDb));
    const currentY = padding.top + chartHeight - ((clampedCurrentDb + 60) / 60) * chartHeight;
    
    if (currentX >= padding.left && currentX <= padding.left + chartWidth) {
        // Vertical line to point
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(currentX, padding.top + chartHeight);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Point
        ctx.fillStyle = '#dc3545';
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    // Axes
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
    
    // Labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    
    // X-axis label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Frequency (rad/s)', padding.left + chartWidth / 2, height - 25);
    
    // Y-axis label
    ctx.save();
    ctx.translate(20, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Magnitude (dB)', 0, 0);
    ctx.restore();
    
    // X-axis tick labels
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let decade = 0; decade <= decades; decade++) {
        const freq = Math.pow(10, decade) * (wc / 1000);
        const logFreq = Math.log10(freq / (wc / 1000));
        const x = padding.left + (logFreq / decades) * chartWidth;
        
        if (x >= padding.left && x <= padding.left + chartWidth) {
            ctx.fillText(formatNumber(freq), x, padding.top + chartHeight + 5);
        }
    }
    
    // Legend
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillStyle = '#ffc107';
    ctx.fillText('ωc = ' + formatNumber(wc) + ' rad/s', padding.left + 10, padding.top + 10);
    
    ctx.fillStyle = '#dc3545';
    ctx.fillText('ω = ' + formatNumber(w) + ' rad/s', padding.left + 10, padding.top + 25);
    
    ctx.fillStyle = '#667eea';
    ctx.fillText('Order n = ' + n, padding.left + 10, padding.top + 40);
}

function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    drawFrequencyResponse();
}

function updateSimulation() {
    updateResults();
    drawFrequencyResponse();
}

nSlider.addEventListener('input', (e) => {
    n = parseInt(e.target.value);
    nValue.textContent = n;
    updateSimulation();
});

wcSlider.addEventListener('input', (e) => {
    wc = parseFloat(e.target.value);
    wcValue.textContent = formatNumber(wc) + ' rad/s';
    updateSimulation();
});

wSlider.addEventListener('input', (e) => {
    w = parseFloat(e.target.value);
    wValue.textContent = formatNumber(w) + ' rad/s';
    updateSimulation();
});

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
updateSimulation();