// Constants
const G0 = 9.81; // Standard gravity (m/s²)

// State variables
let isp = 300;  // Specific impulse (seconds)
let m0 = 10000; // Initial mass (kg)
let mf = 1000;  // Final mass (kg)
let deltaV = 0; // Delta-V (m/s)
let massRatio = 0;
let propellantMass = 0;
let propellantFraction = 0;

// DOM elements
const ispSlider = document.getElementById('ispSlider');
const m0Slider = document.getElementById('m0Slider');
const mfSlider = document.getElementById('mfSlider');
const ispValue = document.getElementById('ispValue');
const m0Value = document.getElementById('m0Value');
const mfValue = document.getElementById('mfValue');
const deltaVResult = document.getElementById('deltaVResult');
const massRatioResult = document.getElementById('massRatioResult');
const propMassResult = document.getElementById('propMassResult');
const propFractionResult = document.getElementById('propFractionResult');
const burnBtn = document.getElementById('burnBtn');
const resetBtn = document.getElementById('resetBtn');
const warningBox = document.getElementById('warningBox');
const warningText = document.getElementById('warningText');
const missionInfo = document.getElementById('missionInfo');

// SVG elements
const rocketGroup = document.getElementById('rocketGroup');
const fuelTank = document.getElementById('fuelTank');
const payloadSection = document.getElementById('payloadSection');
const massRatioText = document.getElementById('massRatioText');
const propellantMassText = document.getElementById('propellantMass');
const flameEffect = document.getElementById('flameEffect');

// Format numbers
function formatNumber(value, decimals = 0) {
    if (value >= 1e6) {
        return (value / 1e6).toFixed(1) + 'M';
    } else if (value >= 1e3) {
        return (value / 1e3).toFixed(1) + 'k';
    }
    return value.toFixed(decimals);
}

// Calculate rocket equation
function calculateRocketEquation() {
    if (m0 > mf && mf > 0 && isp > 0) {
        // deltaV = Isp * g0 * ln(m0/mf)
        massRatio = m0 / mf;
        deltaV = isp * G0 * Math.log(massRatio);
        propellantMass = m0 - mf;
        propellantFraction = (propellantMass / m0) * 100;
        
        warningBox.style.display = 'none';
    } else if (m0 <= mf) {
        warningBox.style.display = 'block';
        warningText.textContent = 'Initial mass (m₀) must be greater than final mass (mf)!';
        deltaV = 0;
        massRatio = 0;
    } else {
        warningBox.style.display = 'block';
        warningText.textContent = 'All parameters must be positive!';
        deltaV = 0;
        massRatio = 0;
    }
    
    updateResults();
    updateVisualization();
}

// Update results display
function updateResults() {
    deltaVResult.textContent = `${Math.round(deltaV)} m/s`;
    massRatioResult.textContent = massRatio.toFixed(2);
    propMassResult.textContent = `${formatNumber(propellantMass)} kg`;
    propFractionResult.textContent = `${propellantFraction.toFixed(1)}%`;
}

// Update visualization
function updateVisualization() {
    // Update info panel
    massRatioText.textContent = massRatio.toFixed(2);
    propellantMassText.textContent = `${formatNumber(propellantMass)} kg`;
    
    // Calculate visual proportions
    const totalHeight = 280;
    const fuelHeight = (propellantMass / m0) * totalHeight;
    const payloadHeight = (mf / m0) * totalHeight;
    
    // Update fuel tank height (grows from bottom)
    fuelTank.setAttribute('height', fuelHeight);
    fuelTank.setAttribute('y', 200 + totalHeight - fuelHeight);
    
    // Update payload section
    payloadSection.setAttribute('height', payloadHeight);
    payloadSection.setAttribute('y', 200 + totalHeight - fuelHeight - payloadHeight);
    
    // Hide flame by default
    flameEffect.style.display = 'none';
}

// Animate rocket launch
function launchRocket() {
    flameEffect.style.display = 'block';
    rocketGroup.classList.add('launching');
    
    // Simulate fuel depletion
    let currentFuel = propellantMass;
    const fuelBurnRate = propellantMass / 3; // Burn over 3 seconds
    
    const burnInterval = setInterval(() => {
        currentFuel -= fuelBurnRate * 0.05; // Update every 50ms
        
        if (currentFuel <= 0) {
            currentFuel = 0;
            clearInterval(burnInterval);
            setTimeout(() => {
                flameEffect.style.display = 'none';
            }, 200);
        }
        
        // Update fuel tank visual
        const fuelFraction = currentFuel / propellantMass;
        const totalHeight = 280;
        const maxFuelHeight = (propellantMass / m0) * totalHeight;
        const currentFuelHeight = fuelFraction * maxFuelHeight;
        
        fuelTank.setAttribute('height', currentFuelHeight);
        fuelTank.setAttribute('y', 200 + totalHeight - currentFuelHeight);
    }, 50);
    
    // Reset after animation
    setTimeout(() => {
        rocketGroup.classList.remove('launching');
        rocketGroup.style.transform = 'translateY(0)';
        updateVisualization();
    }, 3000);
}

// Reset visualization
function resetVisualization() {
    rocketGroup.classList.remove('launching');
    rocketGroup.style.transform = 'translateY(0)';
    flameEffect.style.display = 'none';
    updateVisualization();
}

// Event listeners for sliders
ispSlider.addEventListener('input', (e) => {
    isp = parseFloat(e.target.value);
    ispValue.textContent = isp;
    calculateRocketEquation();
});

m0Slider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    m0 = Math.pow(10, exponent);
    m0Value.textContent = formatNumber(m0);
    calculateRocketEquation();
});

mfSlider.addEventListener('input', (e) => {
    const exponent = parseFloat(e.target.value);
    mf = Math.pow(10, exponent);
    mfValue.textContent = formatNumber(mf);
    calculateRocketEquation();
});

// Preset buttons for Isp
document.querySelectorAll('.preset-btn[data-isp]').forEach(btn => {
    btn.addEventListener('click', () => {
        isp = parseFloat(btn.dataset.isp);
        ispSlider.value = isp;
        ispValue.textContent = isp;
        calculateRocketEquation();
    });
});

// Mission example buttons
document.querySelectorAll('.mission-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const requiredDV = parseFloat(btn.dataset.dv);
        missionInfo.textContent = `${btn.textContent} requires ~${requiredDV.toLocaleString()} m/s ΔV`;
        
        // Highlight if current config can achieve it
        if (deltaV >= requiredDV) {
            missionInfo.style.color = '#6ee7b7';
            missionInfo.textContent += ' ✓ Achievable!';
        } else {
            missionInfo.style.color = '#fca5a5';
            missionInfo.textContent += ' ✗ Need more ΔV';
        }
    });
});

// Button controls
burnBtn.addEventListener('click', () => {
    if (m0 > mf) {
        launchRocket();
    }
});

resetBtn.addEventListener('click', () => {
    resetVisualization();
    missionInfo.textContent = 'Select a mission to see required ΔV';
    missionInfo.style.color = '#6ee7b7';
});

// Initialize
calculateRocketEquation();