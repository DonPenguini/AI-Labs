// State variables
let mu = 3.986e14; // Earth's gravitational parameter
let r1 = 6.78e6;   // Initial radius (LEO)
let r2 = 4.22e7;   // Final radius (GEO)
let v1, v2, a, vtp, vta, dV1, dV2, dVtot;
let transferTime = 0;

let isAnimating = true;
let animationSpeed = 1;
let phase = 0; // 0: initial orbit, 1: transfer orbit, 2: final orbit
let orbitAngle = 0;
let lastTime = Date.now();
let animationFrame = null;

// DOM elements
const muSlider = document.getElementById('muSlider');
const r1Slider = document.getElementById('r1Slider');
const r2Slider = document.getElementById('r2Slider');
const speedSlider = document.getElementById('speedSlider');
const muValue = document.getElementById('muValue');
const r1Value = document.getElementById('r1Value');
const r2Value = document.getElementById('r2Value');
const speedValue = document.getElementById('speedValue');
const dv1Result = document.getElementById('dv1Result');
const dv2Result = document.getElementById('dv2Result');
const dvTotalResult = document.getElementById('dvTotalResult');
const transferTimeEl = document.getElementById('transferTime');
const v1Info = document.getElementById('v1Info');
const v2Info = document.getElementById('v2Info');
const smaInfo = document.getElementById('smaInfo');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');
const phaseText = document.getElementById('phaseText');

// SVG elements
const orbit1 = document.getElementById('orbit1');
const orbit2 = document.getElementById('orbit2');
const transferOrbit = document.getElementById('transferOrbit');
const satellite = document.getElementById('satellite');
const burn1Marker = document.getElementById('burn1Marker');
const burn2Marker = document.getElementById('burn2Marker');
const r1Label = document.getElementById('r1Label');
const r2Label = document.getElementById('r2Label');

// Constants
const CENTER_X = 300;
const CENTER_Y = 300;
const SCALE = 100; // Base scale for visual representation

// Generate stars background
function generateStars() {
    const starsGroup = document.getElementById('stars');
    for (let i = 0; i < 150; i++) {
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        star.setAttribute('cx', Math.random() * 600);
        star.setAttribute('cy', Math.random() * 600);
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

// Calculate transfer parameters
function calculateTransfer() {
    if (r1 > 0 && r2 > 0 && mu > 0) {
        // Circular orbit velocities
        v1 = Math.sqrt(mu / r1);
        v2 = Math.sqrt(mu / r2);
        
        // Semi-major axis of transfer orbit
        a = 0.5 * (r1 + r2);
        
        // Transfer orbit velocities at perigee and apogee
        vtp = Math.sqrt(mu * (2 / r1 - 1 / a));
        vta = Math.sqrt(mu * (2 / r2 - 1 / a));
        
        // Delta-V calculations
        dV1 = vtp - v1;
        dV2 = v2 - vta;
        dVtot = Math.abs(dV1) + Math.abs(dV2);
        
        // Transfer time (half orbital period of transfer ellipse)
        transferTime = Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
    } else {
        v1 = v2 = a = vtp = vta = dV1 = dV2 = dVtot = transferTime = 0;
    }
    updateResults();
    updateVisualization();
}

// Update results display
function updateResults() {
    dv1Result.textContent = `${Math.round(Math.abs(dV1))} m/s`;
    dv2Result.textContent = `${Math.round(Math.abs(dV2))} m/s`;
    dvTotalResult.textContent = `${Math.round(dVtot)} m/s`;
    transferTimeEl.textContent = formatTime(transferTime);
    
    v1Info.textContent = `${Math.round(v1)} m/s`;
    v2Info.textContent = `${Math.round(v2)} m/s`;
    smaInfo.textContent = formatScientific(a);
}

// Update visualization
function updateVisualization() {
    // Scale radii for display (logarithmic-like scaling for better visualization)
    const minRadius = 50;
    const maxRadius = 250;
    const ratio = r2 / r1;
    
    let displayR1, displayR2;
    
    if (ratio > 1) {
        // r2 is larger
        displayR2 = maxRadius;
        displayR1 = Math.max(minRadius, maxRadius / Math.pow(ratio, 0.5));
    } else {
        // r1 is larger
        displayR1 = maxRadius;
        displayR2 = Math.max(minRadius, maxRadius * Math.pow(ratio, 0.5));
    }
    
    // Update orbit circles
    orbit1.setAttribute('r', displayR1);
    orbit2.setAttribute('r', displayR2);
    
    // Update transfer ellipse
    const semiMajor = (displayR1 + displayR2) / 2;
    const semiMinor = Math.sqrt(displayR1 * displayR2);
    
    if (r2 > r1) {
        transferOrbit.setAttribute('rx', semiMajor);
        transferOrbit.setAttribute('ry', semiMinor);
        transferOrbit.setAttribute('transform', `rotate(0 ${CENTER_X} ${CENTER_Y})`);
    } else {
        transferOrbit.setAttribute('rx', semiMinor);
        transferOrbit.setAttribute('ry', semiMajor);
        transferOrbit.setAttribute('transform', `rotate(90 ${CENTER_X} ${CENTER_Y})`);
    }
    
    // Update labels
    r1Label.setAttribute('x', CENTER_X + displayR1 + 10);
    r2Label.setAttribute('x', CENTER_X + displayR2 + 10);
    
    // Store display radii for animation
    window.displayR1 = displayR1;
    window.displayR2 = displayR2;
}

// Update satellite position based on phase
function updateSatellitePosition() {
    let x, y;
    
    if (phase === 0) {
        // Initial circular orbit
        x = CENTER_X + window.displayR1 * Math.cos(orbitAngle);
        y = CENTER_Y + window.displayR1 * Math.sin(orbitAngle);
        phaseText.textContent = 'Phase: Initial Orbit';
        burn1Marker.style.display = 'none';
        burn2Marker.style.display = 'none';
    } else if (phase === 1) {
        // Transfer orbit (elliptical)
        const semiMajor = (window.displayR1 + window.displayR2) / 2;
        const semiMinor = Math.sqrt(window.displayR1 * window.displayR2);
        
        if (r2 > r1) {
            x = CENTER_X + (semiMajor * Math.cos(orbitAngle) - (semiMajor - window.displayR1));
            y = CENTER_Y + semiMinor * Math.sin(orbitAngle);
        } else {
            x = CENTER_X + semiMinor * Math.cos(orbitAngle);
            y = CENTER_Y + (semiMajor * Math.sin(orbitAngle) - (semiMajor - window.displayR1));
        }
        
        phaseText.textContent = 'Phase: Transfer Orbit';
        
        // Show burn markers
        if (orbitAngle < 0.2) {
            burn1Marker.style.display = 'block';
            const burn1X = CENTER_X + window.displayR1;
            const burn1Y = CENTER_Y;
            burn1Marker.setAttribute('transform', `translate(${burn1X}, ${burn1Y})`);
            burn1Marker.querySelector('line').setAttribute('x2', 35);
            burn1Marker.querySelector('text').setAttribute('x', 40);
            burn1Marker.querySelector('text').setAttribute('y', 5);
        } else {
            burn1Marker.style.display = 'none';
        }
        
        if (orbitAngle > Math.PI - 0.2 && orbitAngle < Math.PI + 0.2) {
            burn2Marker.style.display = 'block';
            const burn2X = CENTER_X - window.displayR2;
            const burn2Y = CENTER_Y;
            burn2Marker.setAttribute('transform', `translate(${burn2X}, ${burn2Y})`);
            burn2Marker.querySelector('line').setAttribute('x2', -35);
            burn2Marker.querySelector('text').setAttribute('x', -40);
            burn2Marker.querySelector('text').setAttribute('y', 5);
            burn2Marker.querySelector('text').setAttribute('text-anchor', 'end');
        } else {
            burn2Marker.style.display = 'none';
        }
    } else {
        // Final circular orbit
        x = CENTER_X + window.displayR2 * Math.cos(orbitAngle);
        y = CENTER_Y + window.displayR2 * Math.sin(orbitAngle);
        phaseText.textContent = 'Phase: Final Orbit';
        burn1Marker.style.display = 'none';
        burn2Marker.style.display = 'none';
    }
    
    satellite.setAttribute('transform', `translate(${x}, ${y})`);
}

// Animation loop
function animate() {
    if (!isAnimating) return;
    
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    
    // Angular velocity for visual purposes
    const baseAngularVel = 0.5; // radians per second
    const angularVel = baseAngularVel * animationSpeed;
    
    orbitAngle += angularVel * dt;
    
    // Phase transitions
    if (phase === 0 && orbitAngle >= 2 * Math.PI) {
        phase = 1;
        orbitAngle = 0;
    } else if (phase === 1 && orbitAngle >= Math.PI) {
        phase = 2;
        orbitAngle = 0;
    } else if (phase === 2 && orbitAngle >= 2 * Math.PI) {
        phase = 0;
        orbitAngle = 0;
    }
    
    updateSatellitePosition();
    
    animationFrame = requestAnimationFrame(animate);
}

// Event listeners
muSlider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    mu = Math.pow(10, exponent);
    muValue.textContent = formatScientific(mu);
    calculateTransfer();
});

r1Slider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    r1 = Math.pow(10, exponent);
    r1Value.textContent = formatScientific(r1);
    calculateTransfer();
});

r2Slider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    r2 = Math.pow(10, exponent);
    r2Value.textContent = formatScientific(r2);
    calculateTransfer();
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
        calculateTransfer();
    });
});

document.querySelectorAll('.preset-btn-transfer').forEach(btn => {
    btn.addEventListener('click', () => {
        r1 = parseFloat(btn.dataset.r1);
        r2 = parseFloat(btn.dataset.r2);
        
        const exp1 = Math.log10(r1);
        const exp2 = Math.log10(r2);
        
        r1Slider.value = exp1;
        r2Slider.value = exp2;
        
        r1Value.textContent = formatScientific(r1);
        r2Value.textContent = formatScientific(r2);
        
        calculateTransfer();
    });
});

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

resetBtn.addEventListener('click', () => {
    phase = 0;
    orbitAngle = 0;
    lastTime = Date.now();
    updateSatellitePosition();
});

// Initialize
generateStars();
calculateTransfer();
animate();