// Physical constants
const KB = 1.380649e-23; // Boltzmann constant (J/K)
const H = 6.62607015e-34; // Planck constant (J·s)
const C = 299792458; // Speed of light (m/s)
const WIEN_CONSTANT = 2.897771955e-3; // Wien's displacement constant (m·K)

// State variables
let temperature = 5778; // Temperature in Kelvin (Sun's surface)
let peakFrequency = 0;
let peakWavelength = 0;

// DOM elements
const tempSlider = document.getElementById('tempSlider');
const tempValue = document.getElementById('tempValue');
const tempDisplay = document.getElementById('tempDisplay');
const tempType = document.getElementById('tempType');
const peakFreqResult = document.getElementById('peakFreqResult');
const peakWavelengthResult = document.getElementById('peakWavelengthResult');
const spectralRegion = document.getElementById('spectralRegion');
const colorTemp = document.getElementById('colorTemp');
const wienDisp = document.getElementById('wienDisp');
const stefanPower = document.getElementById('stefanPower');
const energyAtPeak = document.getElementById('energyAtPeak');

// SVG elements
const planckCurve = document.getElementById('planckCurve');
const planckLine = document.getElementById('planckLine');
const peakMarker = document.getElementById('peakMarker');
const glowCircle = document.getElementById('glowCircle');
const bodyCircle = document.getElementById('bodyCircle');

// Temperature presets with descriptions
const tempPresets = {
    2.7: 'CMB',
    300: 'Room Temp',
    1000: 'Lava',
    3000: 'Incandescent',
    5778: "Sun's Surface",
    10000: 'Hot Star'
};

// Format scientific notation
function formatScientific(value, decimals = 2) {
    if (value === 0) return '0';
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);
    return `${mantissa.toFixed(decimals)}e${exponent}`;
}

// Format wavelength with appropriate units
function formatWavelength(wavelengthMeters) {
    if (wavelengthMeters < 1e-9) {
        return `${(wavelengthMeters * 1e12).toFixed(1)} pm`;
    } else if (wavelengthMeters < 1e-6) {
        return `${(wavelengthMeters * 1e9).toFixed(0)} nm`;
    } else if (wavelengthMeters < 1e-3) {
        return `${(wavelengthMeters * 1e6).toFixed(1)} μm`;
    } else if (wavelengthMeters < 1) {
        return `${(wavelengthMeters * 1e3).toFixed(1)} mm`;
    } else {
        return `${wavelengthMeters.toFixed(2)} m`;
    }
}

// Determine spectral region and color
function getSpectralInfo(wavelengthNm) {
    if (wavelengthNm < 10) {
        return { region: 'X-ray', color: 'Violet' };
    } else if (wavelengthNm < 380) {
        return { region: 'Ultraviolet', color: 'UV' };
    } else if (wavelengthNm < 450) {
        return { region: 'Visible (Violet)', color: 'Violet' };
    } else if (wavelengthNm < 495) {
        return { region: 'Visible (Blue)', color: 'Blue' };
    } else if (wavelengthNm < 570) {
        return { region: 'Visible (Green)', color: 'Green' };
    } else if (wavelengthNm < 590) {
        return { region: 'Visible (Yellow)', color: 'Yellow' };
    } else if (wavelengthNm < 620) {
        return { region: 'Visible (Orange)', color: 'Orange' };
    } else if (wavelengthNm < 750) {
        return { region: 'Visible (Red)', color: 'Red' };
    } else if (wavelengthNm < 1e6) {
        return { region: 'Infrared', color: 'IR' };
    } else {
        return { region: 'Radio', color: 'Radio' };
    }
}

// Get blackbody color based on temperature
function getBlackbodyColor(temp) {
    if (temp < 1000) {
        return { glow: '#4b0000', body: '#1a0000' };
    } else if (temp < 2000) {
        return { glow: '#ff4500', body: '#8b0000' };
    } else if (temp < 3000) {
        return { glow: '#ff6347', body: '#dc143c' };
    } else if (temp < 4000) {
        return { glow: '#ffa500', body: '#ff4500' };
    } else if (temp < 5000) {
        return { glow: '#ffff00', body: '#ffa500' };
    } else if (temp < 6500) {
        return { glow: '#fffacd', body: '#ffff00' };
    } else if (temp < 8000) {
        return { glow: '#f0f8ff', body: '#fffacd' };
    } else {
        return { glow: '#add8e6', body: '#87ceeb' };
    }
}

// Get color description
function getColorDescription(temp) {
    if (temp < 1000) return 'Dim Red';
    if (temp < 2000) return 'Red';
    if (temp < 3000) return 'Orange-Red';
    if (temp < 4000) return 'Orange';
    if (temp < 5000) return 'Yellow-Orange';
    if (temp < 6500) return 'Yellow-White';
    if (temp < 8000) return 'White';
    return 'Blue-White';
}

// Calculate peak frequency using Planck's approximation
function calculatePeakFrequency() {
    if (temperature > 0) {
        // nu_max ≈ 2.821 * kB * T / h
        peakFrequency = 2.821 * KB * temperature / H;
        
        // Calculate wavelength from frequency: λ = c/ν
        peakWavelength = C / peakFrequency;
    } else {
        peakFrequency = 0;
        peakWavelength = 0;
    }
    
    updateResults();
    updateVisualization();
}

// Update results display
function updateResults() {
    // Peak frequency
    peakFreqResult.textContent = `${formatScientific(peakFrequency)} Hz`;
    
    // Peak wavelength
    peakWavelengthResult.textContent = formatWavelength(peakWavelength);
    
    // Spectral region
    const wavelengthNm = peakWavelength * 1e9;
    const spectralInfo = getSpectralInfo(wavelengthNm);
    spectralRegion.textContent = spectralInfo.region;
    
    // Color temperature
    colorTemp.textContent = getColorDescription(temperature);
    
    // Wien's displacement
    const wienLambda = WIEN_CONSTANT / temperature;
    wienDisp.textContent = `λₘₐₓT = ${formatScientific(WIEN_CONSTANT, 3)} m·K`;
    
    // Stefan-Boltzmann (qualitative)
    const stefanRelative = Math.pow(temperature / 5778, 4);
    stefanPower.textContent = `${stefanRelative.toFixed(2)}× Sun`;
    
    // Energy at peak
    const energyJ = H * peakFrequency;
    const energyEv = energyJ / 1.602176634e-19;
    energyAtPeak.textContent = `E = ${energyEv.toFixed(2)} eV`;
}

// Update visualization
function updateVisualization() {
    // Update temperature displays
    tempDisplay.textContent = `${Math.round(temperature)} K`;
    const presetName = tempPresets[temperature] || '';
    tempType.textContent = presetName || `${Math.round(temperature)} K`;
    
    // Update blackbody glow color
    const colors = getBlackbodyColor(temperature);
    glowCircle.setAttribute('fill', colors.glow);
    bodyCircle.setAttribute('fill', colors.body);
    
    // Draw Planck curve
    drawPlanckCurve();
}

// Draw the Planck distribution curve
function drawPlanckCurve() {
    const width = 490;
    const height = 350;
    const offsetX = 80;
    const offsetY = 50;
    
    // Frequency range for visualization (log scale)
    const minFreqLog = 13; // 10^13 Hz
    const maxFreqLog = 16; // 10^16 Hz
    const peakFreqLog = Math.log10(peakFrequency);
    
    // Adjust range to center on peak
    const rangeLog = 2; // ±2 orders of magnitude from peak
    const centerLog = peakFreqLog;
    const startLog = Math.max(12, centerLog - rangeLog);
    const endLog = Math.min(17, centerLog + rangeLog);
    
    const points = 100;
    let pathData = '';
    let lineData = '';
    let maxIntensity = 0;
    
    // Calculate curve points
    const intensities = [];
    for (let i = 0; i <= points; i++) {
        const freqLog = startLog + (endLog - startLog) * i / points;
        const freq = Math.pow(10, freqLog);
        
        // Simplified Planck function (relative intensity)
        const x = H * freq / (KB * temperature);
        let intensity;
        if (x > 100) {
            intensity = 0;
        } else {
            intensity = Math.pow(freq, 3) / (Math.exp(x) - 1);
        }
        
        intensities.push(intensity);
        if (intensity > maxIntensity) maxIntensity = intensity;
    }
    
    // Normalize and create path
    for (let i = 0; i <= points; i++) {
        const freqLog = startLog + (endLog - startLog) * i / points;
        const x = offsetX + (freqLog - startLog) / (endLog - startLog) * width;
        const normalizedIntensity = intensities[i] / maxIntensity;
        const y = offsetY + height - normalizedIntensity * height;
        
        if (i === 0) {
            pathData += `M ${x} ${offsetY + height} L ${x} ${y}`;
            lineData += `M ${x} ${y}`;
        } else {
            pathData += ` L ${x} ${y}`;
            lineData += ` L ${x} ${y}`;
        }
    }
    
    pathData += ` L ${offsetX + width} ${offsetY + height} Z`;
    
    planckCurve.setAttribute('d', pathData);
    planckLine.setAttribute('d', lineData);
    
    // Position peak marker
    const peakX = offsetX + (peakFreqLog - startLog) / (endLog - startLog) * width;
    const peakIdx = Math.round((peakFreqLog - startLog) / (endLog - startLog) * points);
    const peakIntensity = peakIdx >= 0 && peakIdx < intensities.length ? 
        intensities[peakIdx] / maxIntensity : 0.8;
    const peakY = offsetY + height - peakIntensity * height;
    
    peakMarker.querySelector('line').setAttribute('x1', peakX);
    peakMarker.querySelector('line').setAttribute('x2', peakX);
    peakMarker.querySelector('circle').setAttribute('cx', peakX);
    peakMarker.querySelector('circle').setAttribute('cy', peakY);
    peakMarker.querySelector('text').setAttribute('x', peakX);
    peakMarker.querySelector('text').setAttribute('y', peakY - 15);
}

// Event listeners
tempSlider.addEventListener('input', (e) => {
    temperature = parseFloat(e.target.value);
    tempValue.textContent = Math.round(temperature);
    calculatePeakFrequency();
});

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        temperature = parseFloat(btn.dataset.temp);
        tempSlider.value = temperature;
        tempValue.textContent = Math.round(temperature);
        calculatePeakFrequency();
    });
});

// Initialize
calculatePeakFrequency();