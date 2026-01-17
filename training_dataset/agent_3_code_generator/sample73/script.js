let fb = 1000;
let fs = 5000;
let valid = true;
let nyquistRate = 2000;

const fbSlider = document.getElementById('fb-slider');
const fsSlider = document.getElementById('fs-slider');
const fbValue = document.getElementById('fb-value');
const fsValue = document.getElementById('fs-value');
const resultPanel = document.getElementById('result-panel');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const nyquistValue = document.getElementById('nyquist-value');
const currentFs = document.getElementById('current-fs');
const marginValue = document.getElementById('margin-value');
const canvas = document.getElementById('signal-canvas');
const ctx = canvas.getContext('2d');

function formatNumber(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'k';
    return num.toFixed(0);
}

function checkNyquist() {
    nyquistRate = 2 * fb;
    valid = fs >= nyquistRate;
    
    nyquistValue.textContent = formatNumber(nyquistRate) + ' Hz';
    currentFs.textContent = formatNumber(fs) + ' Hz';
    
    const margin = fs - nyquistRate;
    marginValue.textContent = (margin >= 0 ? '+' : '') + formatNumber(margin) + ' Hz';
    
    if (valid) {
        resultPanel.classList.remove('invalid');
        statusIcon.textContent = '✓';
        statusText.textContent = 'Sampling Rate is Sufficient';
    } else {
        resultPanel.classList.add('invalid');
        statusIcon.textContent = '✗';
        statusText.textContent = 'Aliasing Will Occur!';
    }
}

function drawSignalVisualization() {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 30, bottom: 60, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = (height - padding.top - padding.bottom - 40) / 2;
    
    // Draw original signal (top)
    drawWaveform(
        padding.left, 
        padding.top, 
        chartWidth, 
        chartHeight, 
        'Original Signal (fb = ' + formatNumber(fb) + ' Hz)',
        false
    );
    
    // Draw sampled signal (bottom)
    drawWaveform(
        padding.left, 
        padding.top + chartHeight + 40, 
        chartWidth, 
        chartHeight, 
        'Sampled Signal (fs = ' + formatNumber(fs) + ' Hz)',
        true
    );
}

function drawWaveform(x, y, w, h, title, showSamples) {
    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(x, y, w, h);
    
    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const gridY = y + (h * i / 4);
        ctx.beginPath();
        ctx.moveTo(x, gridY);
        ctx.lineTo(x + w, gridY);
        ctx.stroke();
    }
    
    // Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(title, x, y - 10);
    
    // Draw continuous signal
    ctx.strokeStyle = valid ? '#667eea' : '#dc3545';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    const cycles = 3;
    const points = 500;
    
    for (let i = 0; i <= points; i++) {
        const t = (i / points) * cycles;
        const xPos = x + (i / points) * w;
        const signal = Math.sin(2 * Math.PI * t);
        const yPos = y + h/2 - (signal * h * 0.4);
        
        if (i === 0) {
            ctx.moveTo(xPos, yPos);
        } else {
            ctx.lineTo(xPos, yPos);
        }
    }
    ctx.stroke();
    
    // Draw sample points if requested
    if (showSamples) {
        const samplesPerCycle = fs / fb;
        const totalSamples = Math.floor(cycles * samplesPerCycle);
        
        ctx.fillStyle = valid ? '#28a745' : '#dc3545';
        
        for (let i = 0; i <= totalSamples; i++) {
            const t = (i / samplesPerCycle);
            const xPos = x + (t / cycles) * w;
            const signal = Math.sin(2 * Math.PI * t);
            const yPos = y + h/2 - (signal * h * 0.4);
            
            // Draw sample stem
            ctx.strokeStyle = valid ? '#28a745' : '#dc3545';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(xPos, y + h/2);
            ctx.lineTo(xPos, yPos);
            ctx.stroke();
            
            // Draw sample point
            ctx.beginPath();
            ctx.arc(xPos, yPos, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw reconstructed signal (dashed) if undersampled
        if (!valid) {
            ctx.strokeStyle = '#ffc107';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            
            const aliasedFreq = Math.abs(fs - fb);
            
            for (let i = 0; i <= points; i++) {
                const t = (i / points) * cycles;
                const xPos = x + (i / points) * w;
                const signal = Math.sin(2 * Math.PI * t * (aliasedFreq / fb));
                const yPos = y + h/2 - (signal * h * 0.4);
                
                if (i === 0) {
                    ctx.moveTo(xPos, yPos);
                } else {
                    ctx.lineTo(xPos, yPos);
                }
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
    
    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + h/2);
    ctx.lineTo(x + w, y + h/2);
    ctx.stroke();
    
    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', x - 5, y);
    ctx.fillText('0', x - 5, y + h/2);
    ctx.fillText('-1', x - 5, y + h);
    
    // X-axis label
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Time', x + w/2, y + h + 5);
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
    
    drawSignalVisualization();
}

function updateSimulation() {
    checkNyquist();
    drawSignalVisualization();
}

fbSlider.addEventListener('input', (e) => {
    fb = parseFloat(e.target.value);
    fbValue.textContent = formatNumber(fb) + ' Hz';
    updateSimulation();
});

fsSlider.addEventListener('input', (e) => {
    fs = parseFloat(e.target.value);
    fsValue.textContent = formatNumber(fs) + ' Hz';
    updateSimulation();
});

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
updateSimulation();