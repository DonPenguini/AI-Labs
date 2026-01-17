// Constants
const R = 8.314; // Gas constant J/(mol*K)

// Parameters
let params = {
    n: 1,      // mol
    T: 300,    // K
    V: 0.1,    // m³
    a: 0.5,    // Pa*m⁶/mol²
    b: 0.00005 // m³/mol
};

// Animation state
let isPlaying = false;
let animationSpeed = 1.0;
let particles = [];
let animationFrame = null;

// Canvas setup
const canvas = document.getElementById('gasCanvas');
const ctx = canvas.getContext('2d');

// Initialize particles
function initializeParticles() {
    const particleCount = Math.min(Math.floor(params.n * 20), 100);
    particles = [];
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2
        });
    }
}

// Calculate pressure using Van der Waals equation
function calculatePressure(n, T, V, a, b) {
    if (V <= n * b) return null; // Constraint violation
    const idealTerm = (n * R * T) / (V - n * b);
    const attractionTerm = a * Math.pow(n / V, 2);
    return idealTerm - attractionTerm;
}

// Update pressure display
function updatePressure() {
    const P = calculatePressure(params.n, params.T, params.V, params.a, params.b);
    const resultsSection = document.getElementById('resultsSection');
    const pressureValue = document.getElementById('pressureValue');
    const pressureDetails = document.getElementById('pressureDetails');
    const constraintWarning = document.getElementById('constraintWarning');
    
    if (P === null) {
        resultsSection.classList.add('invalid');
        pressureValue.textContent = '—';
        pressureDetails.innerHTML = '';
        constraintWarning.classList.remove('hidden');
    } else {
        resultsSection.classList.remove('invalid');
        pressureValue.textContent = P.toExponential(3) + ' Pa';
        
        const idealTerm = (params.n * R * params.T) / (params.V - params.n * params.b);
        const attractionTerm = params.a * Math.pow(params.n / params.V, 2);
        
        pressureDetails.innerHTML = `
            <div>Ideal term: ${idealTerm.toExponential(3)} Pa</div>
            <div>Attraction term: ${attractionTerm.toExponential(3)} Pa</div>
        `;
        constraintWarning.classList.add('hidden');
    }
}

// Update particles
function updateParticles() {
    const speed = Math.sqrt(params.T / 300);
    const containerScale = Math.pow(params.V / 0.1, 1/3);
    const effectiveWidth = Math.min(canvas.width * containerScale, canvas.width);
    const effectiveHeight = Math.min(canvas.height * containerScale, canvas.height);
    
    particles.forEach(p => {
        // Update position
        p.x += p.vx * speed * animationSpeed;
        p.y += p.vy * speed * animationSpeed;
        
        // Bounce off walls
        if (p.x <= 0 || p.x >= effectiveWidth) {
            p.vx = -p.vx;
            p.x = Math.max(0, Math.min(effectiveWidth, p.x));
        }
        if (p.y <= 0 || p.y >= effectiveHeight) {
            p.vy = -p.vy;
            p.y = Math.max(0, Math.min(effectiveHeight, p.y));
        }
    });
}

// Draw particles
function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate container size
    const containerScale = Math.pow(params.V / 0.1, 1/3);
    const effectiveWidth = Math.min(canvas.width * containerScale, canvas.width);
    const effectiveHeight = Math.min(canvas.height * containerScale, canvas.height);
    
    // Draw container bounds
    const offsetX = (canvas.width - effectiveWidth) / 2;
    const offsetY = (canvas.height - effectiveHeight) / 2;
    
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, effectiveWidth, effectiveHeight);
    
    // Draw particles
    const hue = 240 - params.T / 4;
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(offsetX + p.x, offsetY + p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${hue}, 70%, 50%, 0.5)`;
        ctx.fill();
        ctx.shadowBlur = 0;
    });
}

// Animation loop
function animate() {
    if (!isPlaying) return;
    
    updateParticles();
    drawParticles();
    
    animationFrame = requestAnimationFrame(animate);
}

// Update parameter displays
function updateDisplays() {
    document.getElementById('nValue').textContent = params.n.toFixed(2) + ' mol';
    document.getElementById('tValue').textContent = params.T.toFixed(0) + ' K';
    document.getElementById('vValue').textContent = params.V.toFixed(4) + ' m³';
    document.getElementById('aValue').textContent = params.a.toFixed(3) + ' Pa·m⁶/mol²';
    document.getElementById('bValue').textContent = params.b.toExponential(2) + ' m³/mol';
    document.getElementById('minVolume').textContent = 'Min: ' + (params.n * params.b).toExponential(2) + ' m³';
    document.getElementById('speedValue').textContent = animationSpeed.toFixed(1);
    
    updatePressure();
    drawParticles();
}

// Event listeners
document.getElementById('playBtn').addEventListener('click', function() {
    isPlaying = !isPlaying;
    const playIcon = document.getElementById('playIcon');
    
    if (isPlaying) {
        this.innerHTML = '<span id="playIcon">⏸</span> Pause';
        animate();
    } else {
        this.innerHTML = '<span id="playIcon">▶</span> Play';
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    }
});

document.getElementById('resetBtn').addEventListener('click', function() {
    params = {
        n: 1,
        T: 300,
        V: 0.1,
        a: 0.5,
        b: 0.00005
    };
    
    // Reset sliders
    document.getElementById('nSlider').value = 1;
    document.getElementById('tSlider').value = 300;
    document.getElementById('vSlider').value = 0.1;
    document.getElementById('aSlider').value = 0.5;
    document.getElementById('bSlider').value = 0.00005;
    
    // Stop animation
    isPlaying = false;
    document.getElementById('playBtn').innerHTML = '<span id="playIcon">▶</span> Play';
    if (animationFrame) {
        cancelAnimationFrame(animationFrame);
    }
    
    initializeParticles();
    updateDisplays();
});

document.getElementById('speedSlider').addEventListener('input', function() {
    animationSpeed = parseFloat(this.value);
    document.getElementById('speedValue').textContent = animationSpeed.toFixed(1);
});

// Parameter sliders
document.getElementById('nSlider').addEventListener('input', function() {
    params.n = parseFloat(this.value);
    initializeParticles();
    updateDisplays();
});

document.getElementById('tSlider').addEventListener('input', function() {
    params.T = parseFloat(this.value);
    updateDisplays();
});

document.getElementById('vSlider').addEventListener('input', function() {
    params.V = parseFloat(this.value);
    updateDisplays();
});

document.getElementById('aSlider').addEventListener('input', function() {
    params.a = parseFloat(this.value);
    updateDisplays();
});

document.getElementById('bSlider').addEventListener('input', function() {
    params.b = parseFloat(this.value);
    updateDisplays();
});

// Initialize
initializeParticles();
updateDisplays();