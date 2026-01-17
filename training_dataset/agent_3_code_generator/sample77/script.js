let K = 1;
let tau = 1;
let t = 0;
let y = 0;

const kSlider = document.getElementById('k-slider');
const tauSlider = document.getElementById('tau-slider');
const tSlider = document.getElementById('t-slider');
const kValue = document.getElementById('k-value');
const tauValue = document.getElementById('tau-value');
const tValue = document.getElementById('t-value');
const currentTime = document.getElementById('current-time');
const yValue = document.getElementById('y-value');
const steadyState = document.getElementById('steady-state');
const percentSs = document.getElementById('percent-ss');
const timeConstants = document.getElementById('time-constants');
const riseTime = document.getElementById('rise-time');
const settlingTime = document.getElementById('settling-time');
const oneTau = document.getElementById('one-tau');
const finalValue = document.getElementById('final-value');
const canvas = document.getElementById('response-canvas');
const ctx = canvas.getContext('2d');

function formatNumber(num) {
    if (Math.abs(num) >= 1000) return num.toFixed(0);
    if (Math.abs(num) >= 10) return num.toFixed(2);
    return num.toFixed(3);
}

function calculateResponse(time) {
    if (tau <= 0) return 0;
    return K * (1 - Math.exp(-time / tau));
}

function updateResults() {
    y = calculateResponse(t);
    
    yValue.textContent = formatNumber(y);
    currentTime.textContent = t.toFixed(2);
    steadyState.textContent = formatNumber(K);
    
    const percent = K !== 0 ? (y / K) * 100 : 0;
    percentSs.textContent = percent.toFixed(1) + '%';
    
    const numTau = t / tau;
    timeConstants.textContent = numTau.toFixed(2) + 'τ';
    
    // Calculate characteristics
    const rt = tau * (Math.log(0.9) - Math.log(0.1)) / (-1);
    riseTime.textContent = rt.toFixed(2) + ' s';
    
    const st = 4 * tau;
    settlingTime.textContent = st.toFixed(2) + ' s';
    
    oneTau.textContent = tau.toFixed(2) + ' s';
    finalValue.textContent = formatNumber(K);
}

function drawResponse() {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 40, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Determine time range
    const maxTime = Math.max(5 * tau, t + tau);
    const minY = Math.min(0, K);
    const maxY = Math.max(0, K);
    const yRange = maxY - minY;
    const yPadding = yRange * 0.1;
    
    // Grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight * i / 5);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
    }
    
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (chartWidth * i / 5);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
    }
    
    // Draw steady state line
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    const ssY = padding.top + chartHeight - ((K - minY - yPadding) / (yRange + 2 * yPadding)) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, ssY);
    ctx.lineTo(padding.left + chartWidth, ssY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw time constant markers
    for (let i = 1; i <= 5; i++) {
        const tcTime = i * tau;
        if (tcTime <= maxTime) {
            const x = padding.left + (tcTime / maxTime) * chartWidth;
            ctx.strokeStyle = '#ff9800';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Label
            ctx.fillStyle = '#ff9800';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(i + 'τ', x, padding.top - 5);
        }
    }
    
    // Draw response curve
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const points = 500;
    for (let i = 0; i <= points; i++) {
        const time = (i / points) * maxTime;
        const response = calculateResponse(time);
        const x = padding.left + (time / maxTime) * chartWidth;
        const yPos = padding.top + chartHeight - ((response - minY - yPadding) / (yRange + 2 * yPadding)) * chartHeight;
        
        if (i === 0) {
            ctx.moveTo(x, yPos);
        } else {
            ctx.lineTo(x, yPos);
        }
    }
    ctx.stroke();
    
    // Draw current point
    if (t <= maxTime) {
        const x = padding.left + (t / maxTime) * chartWidth;
        const yPos = padding.top + chartHeight - ((y - minY - yPadding) / (yRange + 2 * yPadding)) * chartHeight;
        
        // Vertical line
        ctx.strokeStyle = '#dc3545';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top + chartHeight);
        ctx.lineTo(x, yPos);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Point
        ctx.fillStyle = '#dc3545';
        ctx.beginPath();
        ctx.arc(x, yPos, 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, yPos, 6, 0, Math.PI * 2);
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
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Time (s)', padding.left + chartWidth / 2, height - 25);
    
    ctx.save();
    ctx.translate(20, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Output y(t)', 0, 0);
    ctx.restore();
    
    // Y-axis labels
    ctx.fillStyle = '#666';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 5; i++) {
        const val = minY + yPadding + (yRange / 5) * (5 - i);
        const y = padding.top + (chartHeight * i / 5);
        ctx.fillText(formatNumber(val), padding.left - 8, y);
    }
    
    // X-axis labels
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i <= 5; i++) {
        const time = (maxTime / 5) * i;
        const x = padding.left + (chartWidth * i / 5);
        ctx.fillText(formatNumber(time), x, padding.top + chartHeight + 5);
    }
    
    // Legend
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#667eea';
    ctx.fillText('Response: y(t) = K(1 - e^(-t/τ))', padding.left + 10, padding.top + 10);
    ctx.fillStyle = '#ffc107';
    ctx.fillText('Steady State: K = ' + formatNumber(K), padding.left + 10, padding.top + 25);
    ctx.fillStyle = '#dc3545';
    ctx.fillText('Current: t = ' + t.toFixed(2) + ' s', padding.left + 10, padding.top + 40);
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
    
    drawResponse();
}

function updateSimulation() {
    updateResults();
    drawResponse();
}

kSlider.addEventListener('input', (e) => {
    K = parseFloat(e.target.value);
    kValue.textContent = K.toFixed(2);
    updateSimulation();
});

tauSlider.addEventListener('input', (e) => {
    tau = parseFloat(e.target.value);
    tauValue.textContent = tau.toFixed(2) + ' s';
    // Update t slider max to be 5*tau
    tSlider.max = Math.max(20, 5 * tau);
    updateSimulation();
});

tSlider.addEventListener('input', (e) => {
    t = parseFloat(e.target.value);
    tValue.textContent = t.toFixed(2) + ' s';
    updateSimulation();
});

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
updateSimulation();