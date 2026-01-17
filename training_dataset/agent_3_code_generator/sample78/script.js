let Kp = 1;
let Ki = 0.5;
let Kd = 0.1;
let tau = 1;

const kpSlider = document.getElementById('kp-slider');
const kiSlider = document.getElementById('ki-slider');
const kdSlider = document.getElementById('kd-slider');
const tauSlider = document.getElementById('tau-slider');
const kpValue = document.getElementById('kp-value');
const kiValue = document.getElementById('ki-value');
const kdValue = document.getElementById('kd-value');
const tauValue = document.getElementById('tau-value');
const kpDisplay = document.getElementById('kp-display');
const kiDisplay = document.getElementById('ki-display');
const kdDisplay = document.getElementById('kd-display');
const pAction = document.getElementById('p-action');
const iAction = document.getElementById('i-action');
const dAction = document.getElementById('d-action');
const responseCanvas = document.getElementById('response-canvas');
const bodeCanvas = document.getElementById('bode-canvas');
const respCtx = responseCanvas.getContext('2d');
const bodeCtx = bodeCanvas.getContext('2d');

function formatNumber(num) {
    if (Math.abs(num) >= 1000) return num.toFixed(0);
    if (Math.abs(num) >= 10) return num.toFixed(2);
    return num.toFixed(2);
}

function updateDisplay() {
    kpDisplay.textContent = Kp.toFixed(2);
    kiDisplay.textContent = Ki.toFixed(2);
    kdDisplay.textContent = Kd.toFixed(2);
    pAction.textContent = 'Kp = ' + Kp.toFixed(2);
    iAction.textContent = 'Ki = ' + Ki.toFixed(2);
    dAction.textContent = 'Kd = ' + Kd.toFixed(2);
}

function simulateClosedLoopStep() {
    // Simplified closed-loop step response simulation
    const dt = 0.01;
    const duration = Math.max(10 * tau, 10);
    const steps = Math.floor(duration / dt);
    
    let y = 0;
    let integral = 0;
    let prevError = 0;
    const data = [];
    
    for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        const setpoint = 1;
        const error = setpoint - y;
        
        integral += error * dt;
        const derivative = (error - prevError) / dt;
        
        const u = Kp * error + Ki * integral + Kd * derivative;
        
        // First-order plant response
        const dydt = (u - y) / tau;
        y += dydt * dt;
        
        prevError = error;
        
        if (i % 10 === 0) {
            data.push({ t, y });
        }
    }
    
    return data;
}

function drawStepResponse() {
    const width = responseCanvas.width;
    const height = responseCanvas.height;
    
    respCtx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 40, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    respCtx.fillStyle = '#fafafa';
    respCtx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Get response data
    const data = simulateClosedLoopStep();
    const maxTime = data[data.length - 1].t;
    const yValues = data.map(d => d.y);
    const minY = Math.min(0, ...yValues);
    const maxY = Math.max(1.5, ...yValues);
    const yRange = maxY - minY;
    
    // Grid
    respCtx.strokeStyle = '#e0e0e0';
    respCtx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight * i / 5);
        respCtx.beginPath();
        respCtx.moveTo(padding.left, y);
        respCtx.lineTo(padding.left + chartWidth, y);
        respCtx.stroke();
    }
    
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (chartWidth * i / 5);
        respCtx.beginPath();
        respCtx.moveTo(x, padding.top);
        respCtx.lineTo(x, padding.top + chartHeight);
        respCtx.stroke();
    }
    
    // Draw setpoint line
    respCtx.strokeStyle = '#ffc107';
    respCtx.lineWidth = 2;
    respCtx.setLineDash([5, 5]);
    const setpointY = padding.top + chartHeight - ((1 - minY) / yRange) * chartHeight;
    respCtx.beginPath();
    respCtx.moveTo(padding.left, setpointY);
    respCtx.lineTo(padding.left + chartWidth, setpointY);
    respCtx.stroke();
    respCtx.setLineDash([]);
    
    // Draw response
    respCtx.strokeStyle = '#667eea';
    respCtx.lineWidth = 3;
    respCtx.beginPath();
    
    data.forEach((point, i) => {
        const x = padding.left + (point.t / maxTime) * chartWidth;
        const y = padding.top + chartHeight - ((point.y - minY) / yRange) * chartHeight;
        
        if (i === 0) {
            respCtx.moveTo(x, y);
        } else {
            respCtx.lineTo(x, y);
        }
    });
    respCtx.stroke();
    
    // Axes
    respCtx.strokeStyle = '#333';
    respCtx.lineWidth = 2;
    respCtx.beginPath();
    respCtx.moveTo(padding.left, padding.top + chartHeight);
    respCtx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    respCtx.stroke();
    
    respCtx.beginPath();
    respCtx.moveTo(padding.left, padding.top);
    respCtx.lineTo(padding.left, padding.top + chartHeight);
    respCtx.stroke();
    
    // Labels
    respCtx.fillStyle = '#333';
    respCtx.font = '12px Arial';
    respCtx.textAlign = 'center';
    respCtx.textBaseline = 'top';
    respCtx.fillText('Time (s)', padding.left + chartWidth / 2, height - 25);
    
    respCtx.save();
    respCtx.translate(20, padding.top + chartHeight / 2);
    respCtx.rotate(-Math.PI / 2);
    respCtx.textAlign = 'center';
    respCtx.fillText('Output', 0, 0);
    respCtx.restore();
    
    // Y-axis labels
    respCtx.fillStyle = '#666';
    respCtx.font = '11px Arial';
    respCtx.textAlign = 'right';
    respCtx.textBaseline = 'middle';
    
    for (let i = 0; i <= 5; i++) {
        const val = minY + (yRange / 5) * (5 - i);
        const y = padding.top + (chartHeight * i / 5);
        respCtx.fillText(formatNumber(val), padding.left - 8, y);
    }
    
    // X-axis labels
    respCtx.textAlign = 'center';
    respCtx.textBaseline = 'top';
    
    for (let i = 0; i <= 5; i++) {
        const time = (maxTime / 5) * i;
        const x = padding.left + (chartWidth * i / 5);
        respCtx.fillText(formatNumber(time), x, padding.top + chartHeight + 5);
    }
    
    // Legend
    respCtx.font = '11px Arial';
    respCtx.textAlign = 'left';
    respCtx.fillStyle = '#667eea';
    respCtx.fillText('Closed-Loop Response', padding.left + 10, padding.top + 10);
    respCtx.fillStyle = '#ffc107';
    respCtx.fillText('Setpoint = 1', padding.left + 10, padding.top + 25);
}

function drawBodePlot() {
    const width = bodeCanvas.width;
    const height = bodeCanvas.height;
    
    bodeCtx.clearRect(0, 0, width, height);
    
    const padding = { top: 30, right: 40, bottom: 60, left: 70 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Background
    bodeCtx.fillStyle = '#fafafa';
    bodeCtx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // Grid
    bodeCtx.strokeStyle = '#e0e0e0';
    bodeCtx.lineWidth = 1;
    
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight * i / 5);
        bodeCtx.beginPath();
        bodeCtx.moveTo(padding.left, y);
        bodeCtx.lineTo(padding.left + chartWidth, y);
        bodeCtx.stroke();
    }
    
    // Calculate open-loop frequency response
    const minFreq = 0.001;
    const maxFreq = 100;
    const points = 200;
    const magData = [];
    
    for (let i = 0; i <= points; i++) {
        const logW = Math.log10(minFreq) + (i / points) * (Math.log10(maxFreq) - Math.log10(minFreq));
        const w = Math.pow(10, logW);
        
        // Gc(jw) = Kp + Ki/jw + Kd*jw
        const gcReal = Kp;
        const gcImag = Kd * w - Ki / w;
        const gcMag = Math.sqrt(gcReal * gcReal + gcImag * gcImag);
        
        // Gp(jw) = 1/(tau*jw + 1)
        const gpMag = 1 / Math.sqrt(1 + (tau * w) * (tau * w));
        
        // L(jw) = Gc * Gp
        const lMag = gcMag * gpMag;
        const lDb = 20 * Math.log10(lMag);
        
        magData.push({ w, db: lDb });
    }
    
    const minDb = -60;
    const maxDb = 60;
    
    // Draw 0dB line
    bodeCtx.strokeStyle = '#ffc107';
    bodeCtx.lineWidth = 2;
    bodeCtx.setLineDash([5, 5]);
    const zeroDbY = padding.top + chartHeight - ((0 - minDb) / (maxDb - minDb)) * chartHeight;
    bodeCtx.beginPath();
    bodeCtx.moveTo(padding.left, zeroDbY);
    bodeCtx.lineTo(padding.left + chartWidth, zeroDbY);
    bodeCtx.stroke();
    bodeCtx.setLineDash([]);
    
    // Draw magnitude plot
    bodeCtx.strokeStyle = '#667eea';
    bodeCtx.lineWidth = 3;
    bodeCtx.beginPath();
    
    magData.forEach((point, i) => {
        const logW = Math.log10(point.w);
        const x = padding.left + ((logW - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq))) * chartWidth;
        const db = Math.max(minDb, Math.min(maxDb, point.db));
        const y = padding.top + chartHeight - ((db - minDb) / (maxDb - minDb)) * chartHeight;
        
        if (i === 0) {
            bodeCtx.moveTo(x, y);
        } else {
            bodeCtx.lineTo(x, y);
        }
    });
    bodeCtx.stroke();
    
    // Axes
    bodeCtx.strokeStyle = '#333';
    bodeCtx.lineWidth = 2;
    bodeCtx.beginPath();
    bodeCtx.moveTo(padding.left, padding.top + chartHeight);
    bodeCtx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    bodeCtx.stroke();
    
    bodeCtx.beginPath();
    bodeCtx.moveTo(padding.left, padding.top);
    bodeCtx.lineTo(padding.left, padding.top + chartHeight);
    bodeCtx.stroke();
    
    // Labels
    bodeCtx.fillStyle = '#333';
    bodeCtx.font = '12px Arial';
    bodeCtx.textAlign = 'center';
    bodeCtx.textBaseline = 'top';
    bodeCtx.fillText('Frequency (rad/s)', padding.left + chartWidth / 2, height - 25);
    
    bodeCtx.save();
    bodeCtx.translate(20, padding.top + chartHeight / 2);
    bodeCtx.rotate(-Math.PI / 2);
    bodeCtx.textAlign = 'center';
    bodeCtx.fillText('Magnitude (dB)', 0, 0);
    bodeCtx.restore();
    
    // Y-axis labels
    bodeCtx.fillStyle = '#666';
    bodeCtx.font = '11px Arial';
    bodeCtx.textAlign = 'right';
    bodeCtx.textBaseline = 'middle';
    
    for (let i = 0; i <= 5; i++) {
        const db = minDb + ((maxDb - minDb) / 5) * (5 - i);
        const y = padding.top + (chartHeight * i / 5);
        bodeCtx.fillText(db.toFixed(0), padding.left - 8, y);
    }
    
    // X-axis labels
    bodeCtx.textAlign = 'center';
    bodeCtx.textBaseline = 'top';
    
    const decades = [0.001, 0.01, 0.1, 1, 10, 100];
    decades.forEach(freq => {
        if (freq >= minFreq && freq <= maxFreq) {
            const logW = Math.log10(freq);
            const x = padding.left + ((logW - Math.log10(minFreq)) / (Math.log10(maxFreq) - Math.log10(minFreq))) * chartWidth;
            bodeCtx.fillText(freq.toString(), x, padding.top + chartHeight + 5);
        }
    });
    
    // Legend
    bodeCtx.font = '11px Arial';
    bodeCtx.textAlign = 'left';
    bodeCtx.fillStyle = '#667eea';
    bodeCtx.fillText('Open Loop L(s)', padding.left + 10, padding.top + 10);
    bodeCtx.fillStyle = '#ffc107';
    bodeCtx.fillText('0 dB (Unity Gain)', padding.left + 10, padding.top + 25);
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
    updateDisplay();
    drawStepResponse();
    drawBodePlot();
}

kpSlider.addEventListener('input', (e) => {
    Kp = parseFloat(e.target.value);
    kpValue.textContent = Kp.toFixed(2);
    updateSimulation();
});

kiSlider.addEventListener('input', (e) => {
    Ki = parseFloat(e.target.value);
    kiValue.textContent = Ki.toFixed(2) + ' 1/s';
    updateSimulation();
});

kdSlider.addEventListener('input', (e) => {
    Kd = parseFloat(e.target.value);
    kdValue.textContent = Kd.toFixed(2) + ' s';
    updateSimulation();
});

tauSlider.addEventListener('input', (e) => {
    tau = parseFloat(e.target.value);
    tauValue.textContent = tau.toFixed(2) + ' s';
    updateSimulation();
});

window.addEventListener('resize', () => {
    resizeCanvas(responseCanvas);
    resizeCanvas(bodeCanvas);
    updateSimulation();
});

// Initialize
resizeCanvas(responseCanvas);
resizeCanvas(bodeCanvas);
updateSimulation();