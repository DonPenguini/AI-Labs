// State variables
let mu = 3.986e14; // Earth's gravitational parameter
let radius = 6.78e6; // Low Earth Orbit radius
let orbitalSpeed = 0;
let orbitalPeriod = 0;
let isAnimating = true;
let orbitAngle = 0;
let animationSpeed = 1;
let lastTime = Date.now();
let animationFrame = null;
let orbitCount = 0;
let completedOrbits = 0;

// DOM elements
const muSlider = document.getElementById('muSlider');
const radiusSlider = document.getElementById('radiusSlider');
const speedSlider = document.getElementById('speedSlider');
const muValue = document.getElementById('muValue');
const radiusValue = document.getElementById('radiusValue');
const speedValue = document.getElementById('speedValue');
const speedResult = document.getElementById('speedResult');
const periodResult = document.getElementById('periodResult');
const periodReadable = document.getElementById('periodReadable');
const circumferenceResult = document.getElementById('circumferenceResult');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const orbitInfo = document.getElementById('orbitInfo');

// SVG elements
const orbitPath = document.getElementById('orbitPath');
const satellite = document.getElementById('satellite');
const velocityVector = document.getElementById('velocityVector');
const radiusLine = document.getElementById('radiusLine');
const radiusLabel = document.getElementById('radiusLabel');

// Constants
const CENTER_X = 250;
const CENTER_Y = 250;
const DISPLAY_RADIUS = 150; // Visual radius on canvas

// Generate stars background
function generateStars() {
    const starsGroup = document.getElementById('stars');
    for (let i = 0; i < 100; i++) {
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        star.setAttribute('cx', Math.random() * 500);
        star.setAttribute('cy', Math.random() * 500);
        star.setAttribute('r', Math.random() * 1.5);
        star.setAttribute('fill', '#ffffff');
        star.setAttribute('opacity', Math.random() * 0.7 + 0.3);
        starsGroup.appendChild(star);
    }
}

// Format time in readable format
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(1)}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${mins}m ${secs}s`;
    } else {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        return `${days}d ${hours}h`;
    }
}

// Format scientific notation
function formatScientific(value, decimals = 2) {
    if (value === 0) return '0';
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);
    return `${mantissa.toFixed(decimals)}e${exponent}`;
}

// Calculate orbital parameters
function calculateOrbit() {
    if (radius > 0 && mu > 0) {
        // v = sqrt(mu/r)
        orbitalSpeed = Math.sqrt(mu / radius);
        
        // T = 2*pi*sqrt(r^3/mu)
        orbitalPeriod = 2 * Math.PI * Math.sqrt(Math.pow(radius, 3) / mu);
    } else {
        orbitalSpeed = 0;
        orbitalPeriod = 0;
    }
    updateResults();
}

// Update results display
function updateResults() {
    speedResult.textContent = `${Math.round(orbitalSpeed)} m/s`;
    periodResult.textContent = `${Math.round(orbitalPeriod)} s`;
    periodReadable.textContent = formatTime(orbitalPeriod);
    
    const circumference = 2 * Math.PI * radius;
    circumferenceResult.textContent = formatScientific(circumference);
}

// Update visualization
function updateVisualization() {
    // Calculate satellite position
    const satX = CENTER_X + DISPLAY_RADIUS * Math.cos(orbitAngle);
    const satY = CENTER_Y + DISPLAY_RADIUS * Math.sin(orbitAngle);
    
    // Update satellite position
    satellite.setAttribute('transform', `translate(${satX}, ${satY})`);
    
    // Update velocity vector (tangent to orbit)
    const velocityLength = 40;
    const velocityAngle = orbitAngle + Math.PI / 2; // Perpendicular to radius
    const velEndX = satX + velocityLength * Math.cos(velocityAngle);
    const velEndY = satY + velocityLength * Math.sin(velocityAngle);
    
    velocityVector.setAttribute('x1', satX);
    velocityVector.setAttribute('y1', satY);
    velocityVector.setAttribute('x2', velEndX);
    velocityVector.setAttribute('y2', velEndY);
    
    // Update radius line
    radiusLine.setAttribute('x2', satX);
    radiusLine.setAttribute('y2', satY);
    
    // Update radius label position (midpoint)
    const labelX = CENTER_X + (satX - CENTER_X) / 2;
    const labelY = CENTER_Y + (satY - CENTER_Y) / 2;
    radiusLabel.setAttribute('x', labelX);
    radiusLabel.setAttribute('y', labelY - 5);
    
    // Update orbit info
    orbitInfo.textContent = `Orbit: ${completedOrbits} completed`;
}

// Animation loop
function animate() {
    if (!isAnimating) return;
    
    const now = Date.now();
    const dt = (now - lastTime) / 1000; // Convert to seconds
    lastTime = now;
    
    // Calculate angular velocity (radians per second)
    // We want to complete one visual orbit in a reasonable time
    // Scale the actual orbital period to animation time
    const visualPeriod = 10; // seconds for one visual orbit
    const angularVelocity = (2 * Math.PI / visualPeriod) * animationSpeed;
    
    const oldAngle = orbitAngle;
    orbitAngle = (orbitAngle + angularVelocity * dt) % (2 * Math.PI);
    
    // Check if we completed an orbit
    if (oldAngle > orbitAngle) {
        completedOrbits++;
    }
    
    updateVisualization();
    
    animationFrame = requestAnimationFrame(animate);
}

// Event listeners for sliders
muSlider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    mu = Math.pow(10, exponent);
    muValue.textContent = formatScientific(mu);
    calculateOrbit();
});

radiusSlider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    radius = Math.pow(10, exponent);
    radiusValue.textContent = formatScientific(radius);
    calculateOrbit();
});

speedSlider.addEventListener('input', (e) => {
    animationSpeed = parseFloat(e.target.value);
    speedValue.textContent = animationSpeed.toFixed(1);
});

// Preset buttons
document.querySelectorAll('.preset-btn[data-mu]').forEach(btn => {
    btn.addEventListener('click', () => {
        mu = parseFloat(btn.dataset.mu);
        const exponent = Math.log10(mu);
        muSlider.value = exponent;
        muValue.textContent = formatScientific(mu);
        calculateOrbit();
    });
});

document.querySelectorAll('.preset-btn[data-radius]').forEach(btn => {
    btn.addEventListener('click', () => {
        radius = parseFloat(btn.dataset.radius);
        const exponent = Math.log10(radius);
        radiusSlider.value = exponent;
        radiusValue.textContent = formatScientific(radius);
        calculateOrbit();
    });
});

// Play/Pause button
playPauseBtn.addEventListener('click', () => {
    if (isAnimating) {
        isAnimating = false;
        playPauseBtn.textContent = 'Play';
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    } else {
        isAnimating = true;
        playPauseBtn.textContent = 'Pause';
        lastTime = Date.now();
        animate();
    }
});

// Reset button
resetBtn.addEventListener('click', () => {
    orbitAngle = 0;
    completedOrbits = 0;
    lastTime = Date.now();
    updateVisualization();
});

// Initialize
generateStars();
calculateOrbit();
updateVisualization();
animate();