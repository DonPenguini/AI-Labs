// Simulation state
let state = {
    alpha: 1e-5,
    L: 1.0,
    dx: 0.02,
    dt: 0.1,
    tempLeft: 100,
    tempRight: 0,
    tempInitial: 20,
    temperature: [],
    nodes: 0,
    time: 0,
    isRunning: false,
    animationId: null
};

// Canvas setup
const canvas = document.getElementById('temperature-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Initialize temperature array
function initializeTemperature() {
    state.nodes = Math.floor(state.L / state.dx) + 1;
    state.temperature = new Array(state.nodes);
    
    // Set boundary conditions
    state.temperature[0] = state.tempLeft;
    state.temperature[state.nodes - 1] = state.tempRight;
    
    // Set initial interior temperatures
    for (let i = 1; i < state.nodes - 1; i++) {
        state.temperature[i] = state.tempInitial;
    }
    
    state.time = 0;
    document.getElementById('nodes-display').textContent = state.nodes;
}

// Calculate Fourier number
function calculateFourier() {
    return (state.alpha * state.dt) / (state.dx * state.dx);
}

// Update stability indicator
function updateStabilityIndicator() {
    const Fo = calculateFourier();
    const isStable = Fo <= 0.5;
    
    document.getElementById('fourier-value').textContent = Fo.toFixed(4);
    
    const statusEl = document.getElementById('stability-status');
    if (isStable) {
        statusEl.textContent = 'STABLE ✓';
        statusEl.className = 'stability-status stable';
    } else {
        statusEl.textContent = 'UNSTABLE ✗';
        statusEl.className = 'stability-status unstable';
    }
}

// Update temperature using explicit FTCS scheme
function updateTemperature() {
    const Fo = calculateFourier();
    const newTemp = [...state.temperature];
    
    // Update interior nodes
    for (let i = 1; i < state.nodes - 1; i++) {
        newTemp[i] = state.temperature[i] + 
                     Fo * (state.temperature[i + 1] - 2 * state.temperature[i] + state.temperature[i - 1]);
    }
    
    // Maintain boundary conditions
    newTemp[0] = state.tempLeft;
    newTemp[state.nodes - 1] = state.tempRight;
    
    state.temperature = newTemp;
    state.time += state.dt;
    
    document.getElementById('time-display').textContent = state.time.toFixed(2) + ' s';
}

// Get color based on temperature
function getTemperatureColor(temp) {
    const minTemp = Math.min(state.tempLeft, state.tempRight, state.tempInitial);
    const maxTemp = Math.max(state.tempLeft, state.tempRight, state.tempInitial);
    const range = maxTemp - minTemp;
    
    if (range === 0) return { r: 0, g: 0, b: 255 };
    
    const normalized = (temp - minTemp) / range;
    
    let r, g, b;
    
    if (normalized < 0.5) {
        // Blue to Yellow
        const t = normalized * 2;
        r = Math.floor(t * 255);
        g = Math.floor(t * 255);
        b = Math.floor(255 * (1 - t));
    } else {
        // Yellow to Red
        const t = (normalized - 0.5) * 2;
        r = 255;
        g = Math.floor(255 * (1 - t));
        b = 0;
    }
    
    return { r, g, b };
}

// Draw temperature distribution
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
        const y = padding + (graphHeight / 10) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
    }
    
    // Y-axis labels (temperature)
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    const minTemp = Math.min(state.tempLeft, state.tempRight, state.tempInitial, ...state.temperature);
    const maxTemp = Math.max(state.tempLeft, state.tempRight, state.tempInitial, ...state.temperature);
    const tempRange = maxTemp - minTemp;
    
    for (let i = 0; i <= 10; i++) {
        const temp = maxTemp - (tempRange / 10) * i;
        const y = padding + (graphHeight / 10) * i;
        ctx.fillText(temp.toFixed(1) + '°C', padding - 10, y + 5);
    }
    
    // X-axis labels (position)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const pos = (state.L / 5) * i;
        const x = padding + (graphWidth / 5) * i;
        ctx.fillText(pos.toFixed(2) + 'm', x, height - padding + 20);
    }
    
    // Axis titles
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Temperature (°C)', 0, 0);
    ctx.restore();
    
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Position (m)', width / 2, height - 20);
    
    // Draw temperature distribution as filled area
    if (state.temperature.length > 0) {
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        
        for (let i = 0; i < state.nodes; i++) {
            const x = padding + (graphWidth / (state.nodes - 1)) * i;
            const temp = state.temperature[i];
            const normalizedTemp = (temp - minTemp) / (tempRange || 1);
            const y = height - padding - normalizedTemp * graphHeight;
            
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.lineTo(width - padding, height - padding);
        ctx.closePath();
        
        // Gradient fill
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.3)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 255, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fill();
    }
    
    // Draw temperature line
    if (state.temperature.length > 0) {
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let i = 0; i < state.nodes; i++) {
            const x = padding + (graphWidth / (state.nodes - 1)) * i;
            const temp = state.temperature[i];
            const normalizedTemp = (temp - minTemp) / (tempRange || 1);
            const y = height - padding - normalizedTemp * graphHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
        
        // Draw points with color based on temperature
        for (let i = 0; i < state.nodes; i++) {
            const x = padding + (graphWidth / (state.nodes - 1)) * i;
            const temp = state.temperature[i];
            const normalizedTemp = (temp - minTemp) / (tempRange || 1);
            const y = height - padding - normalizedTemp * graphHeight;
            
            const color = getTemperatureColor(temp);
            ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
}

// Animation loop
function animate() {
    if (state.isRunning) {
        updateTemperature();
        draw();
        state.animationId = requestAnimationFrame(animate);
    }
}

// Event listeners for controls
document.getElementById('alpha').addEventListener('input', (e) => {
    state.alpha = Math.pow(10, parseFloat(e.target.value));
    document.getElementById('alpha-value').textContent = state.alpha.toExponential(2);
    updateStabilityIndicator();
    if (!state.isRunning) {
        initializeTemperature();
        draw();
    }
});

document.getElementById('length').addEventListener('input', (e) => {
    state.L = parseFloat(e.target.value);
    document.getElementById('length-value').textContent = state.L.toFixed(2);
    updateStabilityIndicator();
    if (!state.isRunning) {
        initializeTemperature();
        draw();
    }
});

document.getElementById('dx').addEventListener('input', (e) => {
    state.dx = parseFloat(e.target.value);
    document.getElementById('dx-value').textContent = state.dx.toFixed(3);
    updateStabilityIndicator();
    if (!state.isRunning) {
        initializeTemperature();
        draw();
    }
});

document.getElementById('dt').addEventListener('input', (e) => {
    state.dt = parseFloat(e.target.value);
    document.getElementById('dt-value').textContent = state.dt.toFixed(3);
    updateStabilityIndicator();
});

document.getElementById('temp-left').addEventListener('input', (e) => {
    state.tempLeft = parseFloat(e.target.value);
    document.getElementById('temp-left-value').textContent = state.tempLeft.toFixed(0);
    if (!state.isRunning) {
        initializeTemperature();
        draw();
    }
});

document.getElementById('temp-right').addEventListener('input', (e) => {
    state.tempRight = parseFloat(e.target.value);
    document.getElementById('temp-right-value').textContent = state.tempRight.toFixed(0);
    if (!state.isRunning) {
        initializeTemperature();
        draw();
    }
});

document.getElementById('temp-initial').addEventListener('input', (e) => {
    state.tempInitial = parseFloat(e.target.value);
    document.getElementById('temp-initial-value').textContent = state.tempInitial.toFixed(0);
    if (!state.isRunning) {
        initializeTemperature();
        draw();
    }
});

document.getElementById('start-btn').addEventListener('click', () => {
    state.isRunning = true;
    document.getElementById('start-btn').disabled = true;
    document.getElementById('pause-btn').disabled = false;
    animate();
});

document.getElementById('pause-btn').addEventListener('click', () => {
    state.isRunning = false;
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
    }
});

document.getElementById('reset-btn').addEventListener('click', () => {
    state.isRunning = false;
    document.getElementById('start-btn').disabled = false;
    document.getElementById('pause-btn').disabled = true;
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
    }
    initializeTemperature();
    draw();
});

// Initialize
initializeTemperature();
updateStabilityIndicator();
draw();