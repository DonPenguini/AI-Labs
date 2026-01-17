// Constants
const WIEN_CONSTANT = 2.897771955e-3; // m*K

// DOM Elements
const canvas = document.getElementById('radiationGraph');
const ctx = canvas.getContext('2d');
const tempInput = document.getElementById('tempInput');
const tempVal = document.getElementById('tempVal');
const lambdaOutput = document.getElementById('lambdaOutput');
const unitOutput = document.getElementById('unitOutput');
const regionText = document.getElementById('regionText');
const blackbodyObject = document.getElementById('blackbodyObject');
const spectrumPointer = document.getElementById('spectrumPointer');

// State
let temperature = 5800; // Kelvin

// Resize Handling
let width, height;
function resize() {
    width = canvas.parentElement.clientWidth;
    height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;
    updateSimulation();
}
window.addEventListener('resize', resize);

// Main Calculation & Update Function
function updateSimulation() {
    // 1. Get Temperature
    temperature = parseInt(tempInput.value);
    tempVal.textContent = temperature;

    // 2. Calculate Peak Wavelength (Wien's Law)
    // lambda_max = b / T
    const lambdaMaxMeters = WIEN_CONSTANT / temperature;
    
    // Convert to nice units
    let displayVal, displayUnit;
    let lambdaNm = lambdaMaxMeters * 1e9; // nanometers

    if (lambdaNm > 1000) {
        displayVal = (lambdaNm / 1000).toFixed(2);
        displayUnit = "µm";
    } else {
        displayVal = Math.round(lambdaNm);
        displayUnit = "nm";
    }

    lambdaOutput.textContent = displayVal;
    unitOutput.textContent = displayUnit;

    // 3. Update Visuals
    updateGraph(lambdaNm);
    updateColor(temperature);
    updateSpectrumBar(lambdaNm);
}

// Draw the Blackbody Curve
function updateGraph(peakNm) {
    // We want the graph to show the shape of Planck's law.
    // X-axis: Wavelength. Y-axis: Spectral Radiance.
    
    // To make the "displacement" visible but keep the graph readable,
    // we need to choose a window. 
    // If we fix the window, high T peaks go off screen left, low T peaks go off screen right.
    // A common way to visualize Wien's law is to scale the X-axis dynamically 
    // such that the peak is always roughly centered, OR let it move.
    
    // Let's define a visible range based on the current peak to keep it nice.
    // Range: 0 to 4 * peak. This ensures the "tail" is visible.
    const maxX = peakNm * 4; 
    
    ctx.clearRect(0, 0, width, height);

    // Draw Grid / Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Y axis
    ctx.moveTo(40, 0); ctx.lineTo(40, height - 20);
    // X axis
    ctx.moveTo(40, height - 20); ctx.lineTo(width, height - 20);
    ctx.stroke();

    // Plot Curve
    // Planck's Law Shape: I(lambda) ~ (1/lambda^5) * (1 / (exp(hc/lkT) - 1))
    // Simplified for shape relative to peak: 
    // x = lambda / lambda_max
    // I(x) ~ 1/x^5 * 1 / (exp(4.965/x) - 1)  <-- 4.965 comes from solving dI/dl=0
    
    ctx.beginPath();
    ctx.strokeStyle = '#ffeb3b';
    ctx.lineWidth = 3;

    const xStart = 40;
    const yBase = height - 20;
    const graphWidth = width - xStart;
    const graphHeight = height - 40;

    let first = true;

    // We iterate pixels across the screen
    for (let px = 0; px < graphWidth; px++) {
        // Map pixel to wavelength (nm)
        // px=0 -> nm=0, px=max -> nm=maxX
        const nm = (px / graphWidth) * maxX;
        
        if (nm <= 0) continue;

        // Calculate normalized intensity (0 to 1)
        // Using dimensionless variable x = lambda / peak_lambda
        const x = nm / peakNm;
        
        // Planck distribution normalized to peak = 1.0
        // Formula: (x^-5 / (e^(4.9651/x) - 1)) normalized by peak value.
        // Peak occurs at x=1. Value at x=1 is approx 21.2.
        // So we divide by that to normalize to 0-1 range.
        
        const rawVal = (1 / Math.pow(x, 5)) * (1 / (Math.exp(4.965114 / x) - 1));
        const normVal = rawVal * 21.2014; // Normalization factor

        const py = yBase - (normVal * graphHeight * 0.9); // 0.9 to leave top margin

        if (first) {
            ctx.moveTo(xStart + px, py);
            first = false;
        } else {
            ctx.lineTo(xStart + px, py);
        }
    }
    ctx.stroke();

    // Draw Peak Line (Wien's Law)
    // The peak is exactly at peakNm
    const peakPx = xStart + (peakNm / maxX) * graphWidth;
    const peakPy = yBase - (1.0 * graphHeight * 0.9);

    ctx.beginPath();
    ctx.strokeStyle = '#00bcd4'; // Cyan
    ctx.setLineDash([5, 5]);
    ctx.moveTo(peakPx, yBase);
    ctx.lineTo(peakPx, peakPy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Peak Label
    ctx.fillStyle = '#00bcd4';
    ctx.font = '12px Arial';
    ctx.fillText(`Peak: ${Math.round(peakNm)} nm`, peakPx + 5, peakPy + 15);
    
    // Draw Axis Labels (Dynamic)
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(maxX)} nm`, width, height - 5);
}

// Update the Color Sphere
function updateColor(temp) {
    const color = getKelvinRGB(temp);
    blackbodyObject.style.backgroundColor = color;
    blackbodyObject.style.boxShadow = `0 0 30px 10px ${color}`;
}

// Update Spectrum Bar Position
function updateSpectrumBar(nm) {
    let region = "";
    let percent = 0;

    // Map wavelength ranges to a simple 0-100 linear scale for the UI bar
    // The bar gradient is: Far UV (0%) -> UV Border (20%) -> Visible (30-60%) -> IR (100%)
    
    if (nm < 10) {
        region = "X-Rays / Gamma";
        percent = 5;
    } else if (nm < 380) {
        region = "Ultraviolet";
        // Map 10-380 to 5-30%
        percent = 5 + ((nm - 10) / 370) * 25;
    } else if (nm >= 380 && nm <= 750) {
        region = "Visible Light";
        // Map 380-750 to 30-60%
        percent = 30 + ((nm - 380) / 370) * 30;
    } else if (nm > 750) {
        region = "Infrared";
        // Map 750-10000+ to 60-100% (log scale approx for UI)
        percent = 60 + Math.min(40, Math.log10(nm/750) * 20);
    }

    spectrumPointer.style.left = `${percent}%`;
    regionText.textContent = region;
    
    // Change pointer color based on background darkness? Keep white.
}

// Helper: Approx RGB from Temperature (Tanner Helland's algorithm adapted)
function getKelvinRGB(temp) {
    temp = temp / 100;
    let r, g, b;

    if (temp <= 66) {
        r = 255;
        g = temp;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        
        if (temp <= 19) {
            b = 0;
        } else {
            b = temp - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
        }
    } else {
        r = temp - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        
        g = temp - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        
        b = 255;
    }

    // Clamp
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Event Listeners
tempInput.addEventListener('input', updateSimulation);

// Initialize
resize();
// Wait for resize to fire or call explicitly
setTimeout(updateSimulation, 100);