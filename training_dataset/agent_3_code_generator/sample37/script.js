// State variables
let torque = 10;
let spinRate = 100;
let momentOfInertia = 1;
let precessionRate = 0;
let isAnimating = true;
let precessionAngle = 0;
let spinAngle = 0;
let lastTime = Date.now();
let animationFrame = null;

// DOM elements
const torqueSlider = document.getElementById('torqueSlider');
const spinRateSlider = document.getElementById('spinRateSlider');
const inertiaSlider = document.getElementById('inertiaSlider');
const torqueValue = document.getElementById('torqueValue');
const spinRateValue = document.getElementById('spinRateValue');
const inertiaValue = document.getElementById('inertiaValue');
const precessionResult = document.getElementById('precessionResult');
const directionResult = document.getElementById('directionResult');
const resultLabel = document.getElementById('resultLabel');
const playPauseBtn = document.getElementById('playPauseBtn');
const resetBtn = document.getElementById('resetBtn');

// SVG elements
const supportArm = document.getElementById('supportArm');
const gyroGroup = document.getElementById('gyroGroup');
const gyroDisc = document.getElementById('gyroDisc');
const spinAxis = document.getElementById('spinAxis');
const rotIndicator = document.getElementById('rotIndicator');
const torqueArrow = document.getElementById('torqueArrow');
const torqueLine = document.getElementById('torqueLine');
const torqueLabel = document.getElementById('torqueLabel');
const precessionPath = document.getElementById('precessionPath');

// Calculate precession rate
function calculatePrecession() {
    if (spinRate !== 0 && momentOfInertia > 0) {
        precessionRate = torque / (momentOfInertia * spinRate);
    } else {
        precessionRate = 0;
    }
    updateResults();
}

// Update results display
function updateResults() {
    precessionResult.textContent = precessionRate.toFixed(4) + ' rad/s';
    resultLabel.textContent = `Ωₚ = ${precessionRate.toFixed(3)} rad/s`;
    
    if (precessionRate > 0) {
        directionResult.textContent = 'Counter-clockwise';
    } else if (precessionRate < 0) {
        directionResult.textContent = 'Clockwise';
    } else {
        directionResult.textContent = 'No precession';
    }
}

// Update visualization
function updateVisualization() {
    const centerX = 200;
    const centerY = 200;
    const armLength = 120;
    
    // Calculate gyroscope position
    const gyroX = centerX + armLength * Math.cos(precessionAngle);
    const gyroY = centerY + armLength * Math.sin(precessionAngle);
    
    // Update support arm
    supportArm.setAttribute('x2', gyroX);
    supportArm.setAttribute('y2', gyroY);
    
    // Update gyroscope group position
    gyroGroup.setAttribute('transform', `translate(${gyroX}, ${gyroY})`);
    
    // Update spin rotation
    const spinDeg = (spinAngle * 180 / Math.PI) % 360;
    gyroDisc.setAttribute('transform', `rotate(${spinDeg})`);
    spinAxis.setAttribute('transform', `rotate(${spinDeg})`);
    rotIndicator.setAttribute('transform', `rotate(${spinDeg})`);
    
    // Update torque arrow
    if (torque !== 0) {
        torqueArrow.style.display = 'block';
        const arrowY = gyroY - 40;
        const arrowEndY = arrowY - Math.sign(torque) * 30;
        torqueLine.setAttribute('x1', gyroX);
        torqueLine.setAttribute('y1', arrowY);
        torqueLine.setAttribute('x2', gyroX);
        torqueLine.setAttribute('y2', arrowEndY);
        torqueLabel.setAttribute('x', gyroX + 10);
        torqueLabel.setAttribute('y', gyroY - 55);
    } else {
        torqueArrow.style.display = 'none';
    }
    
    // Update precession path
    if (precessionRate !== 0) {
        precessionPath.style.display = 'block';
        const radius = 130;
        const arcFlag = precessionRate > 0 ? 1 : 0;
        const endX = centerX + radius * Math.cos(Math.PI / 4);
        const endY = centerY + radius * Math.sin(Math.PI / 4);
        precessionPath.setAttribute('d', 
            `M ${centerX + radius} ${centerY} A ${radius} ${radius} 0 0 ${arcFlag} ${endX} ${endY}`
        );
    } else {
        precessionPath.style.display = 'none';
    }
}

// Animation loop
function animate() {
    if (!isAnimating) return;
    
    const now = Date.now();
    const dt = (now - lastTime) / 1000; // Convert to seconds
    lastTime = now;
    
    precessionAngle = (precessionAngle + precessionRate * dt) % (2 * Math.PI);
    spinAngle = (spinAngle + spinRate * dt * 0.1) % (2 * Math.PI);
    
    updateVisualization();
    
    animationFrame = requestAnimationFrame(animate);
}

// Event listeners for sliders
torqueSlider.addEventListener('input', (e) => {
    torque = parseFloat(e.target.value);
    torqueValue.textContent = torque.toFixed(2);
    calculatePrecession();
    updateVisualization();
});

spinRateSlider.addEventListener('input', (e) => {
    spinRate = parseFloat(e.target.value);
    spinRateValue.textContent = spinRate.toFixed(2);
    calculatePrecession();
});

inertiaSlider.addEventListener('input', (e) => {
    momentOfInertia = parseFloat(e.target.value);
    inertiaValue.textContent = momentOfInertia.toFixed(3);
    calculatePrecession();
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
    precessionAngle = 0;
    spinAngle = 0;
    lastTime = Date.now();
    updateVisualization();
});

// Initialize
calculatePrecession();
updateVisualization();
animate();