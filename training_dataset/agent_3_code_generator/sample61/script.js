/**
 * Single Slit Diffraction Simulation (Visible Light)
 * Computes: theta = asin(lambda/a)
 * Visualizes: Intensity profile I = I0 * (sin(beta)/beta)^2
 */

// --- DOM Elements ---
const canvas = document.getElementById('diffractionCanvas');
const ctx = canvas.getContext('2d');

const wavelengthSlider = document.getElementById('wavelength');
const slitSlider = document.getElementById('slit_width');

const wavelengthValDisplay = document.getElementById('wavelength-val');
const slitValDisplay = document.getElementById('slit-val');
const slitUnitDisplay = document.getElementById('slit-unit');

const ratioDisplay = document.getElementById('ratio-val');
const thetaDisplay = document.getElementById('theta-val');
const warningMsg = document.getElementById('warning-msg');

// --- State ---
let state = {
    // Wavelength in Meters (Slider is in nm: 380-750)
    lambda: parseFloat(wavelengthSlider.value) * 1e-9, 
    // Slit Width in Meters (Slider is log scale 10^x)
    a: Math.pow(10, parseFloat(slitSlider.value))
};

// --- Utilities ---

function formatSlitWidth(val) {
    // Auto-scale units for display
    if (val < 1e-3) return { num: (val * 1e6).toFixed(1), unit: 'μm' };
    if (val < 1) return { num: (val * 1e3).toFixed(2), unit: 'mm' };
    return { num: val.toFixed(3), unit: 'm' };
}

// Convert wavelength (nm) to RGB color
function wavelengthToColor(nm) {
    let r, g, b;
    if (nm >= 380 && nm < 440) {
        r = -(nm - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (nm >= 440 && nm < 490) {
        r = 0;
        g = (nm - 440) / (490 - 440);
        b = 1;
    } else if (nm >= 490 && nm < 510) {
        r = 0;
        g = 1;
        b = -(nm - 510) / (510 - 490);
    } else if (nm >= 510 && nm < 580) {
        r = (nm - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (nm >= 580 && nm < 645) {
        r = 1;
        g = -(nm - 645) / (645 - 580);
        b = 0;
    } else if (nm >= 645 && nm <= 750) {
        r = 1;
        g = 0;
        b = 0;
    } else {
        return 'rgb(100,100,100)'; // Fallback
    }

    // Intensity falloff near limits of vision
    let factor;
    if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / (420 - 380);
    else if (nm >= 420 && nm < 700) factor = 1.0;
    else if (nm >= 700 && nm <= 750) factor = 0.3 + 0.7 * (750 - nm) / (750 - 700);
    else factor = 0;

    const rgb = [Math.round(r * factor * 255), Math.round(g * factor * 255), Math.round(b * factor * 255)];
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

// --- Physics Calculation ---
function calculate() {
    const ratio = state.lambda / state.a;
    
    // Update Ratio UI
    ratioDisplay.textContent = ratio.toExponential(3);

    // Check constraints
    if (ratio >= 1) {
        thetaDisplay.textContent = "Undefined";
        warningMsg.classList.remove('hidden');
        return null;
    } else {
        warningMsg.classList.add('hidden');
        const thetaRad = Math.asin(ratio);
        const thetaDeg = (thetaRad * 180 / Math.PI).toFixed(2);
        thetaDisplay.textContent = thetaDeg;
        return thetaRad;
    }
}

// --- Drawing ---
function draw() {
    // Handle resizing
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    
    const w = canvas.width;
    const h = canvas.height;
    const centerY = h / 2;
    const centerX = w / 2;

    const thetaMin = calculate(); // First minimum angle in radians
    const nm = state.lambda * 1e9;
    const color = wavelengthToColor(nm);

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    // Dynamic Scaling:
    // Ensure the central maximum always fits nicely.
    // Width of central max ~ 2 * thetaMin
    // We want this to occupy roughly 40-50% of the screen width usually.
    let displayScale = 0;
    
    if (thetaMin !== null && thetaMin > 0) {
         // Map the first minimum to x = 150 pixels from center
         displayScale = 150 / Math.sin(thetaMin); 
    } else {
        displayScale = 10;
    }

    // Clamp zoom to prevent rendering issues at extreme values
    displayScale = Math.min(Math.max(displayScale, 200), 50000);

    const patternHeight = 120;
    const patternYStart = h - patternHeight - 20;

    // 1. Draw Diffraction Gradient Band
    const gradient = ctx.createLinearGradient(0, 0, w, 0);
    const steps = 150; 
    
    for(let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const distFromCenter = Math.abs(x - centerX);
        
        // Calculate sin(theta) for this pixel
        const sinTheta = distFromCenter / displayScale; 
        
        let intensity = 0;
        if (sinTheta === 0) {
            intensity = 1;
        } else {
            // Beta = (pi * a * sin(theta)) / lambda
            const beta = Math.PI * (state.a * sinTheta / state.lambda);
            if (beta !== 0) {
                intensity = Math.pow(Math.sin(beta) / beta, 2);
            } else {
                intensity = 1;
            }
        }
        
        // Enhance visibility of side lobes (gamma correction-ish)
        // A pure linear intensity is hard to see on screens for higher orders
        const visualIntensity = Math.pow(intensity, 0.5); 

        // Parse RGB color to inject alpha
        const rgbVals = color.match(/\d+/g);
        if(rgbVals) {
             gradient.addColorStop(i/steps, `rgba(${rgbVals[0]}, ${rgbVals[1]}, ${rgbVals[2]}, ${visualIntensity})`);
        }
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, patternYStart, w, patternHeight);
    
    // Draw Axis Line
    ctx.strokeStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(0, patternYStart + patternHeight);
    ctx.lineTo(w, patternYStart + patternHeight);
    ctx.stroke();

    ctx.fillStyle = '#aaa';
    ctx.font = '12px sans-serif';
    ctx.fillText('Diffraction Pattern on Screen', 10, patternYStart - 8);

    // 2. Draw Intensity Graph (Sinc Curve)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.shadowBlur = 4;
    ctx.shadowColor = color; // Glow effect matching the light

    for (let x = 0; x < w; x+=2) {
        const distFromCenter = Math.abs(x - centerX);
        const sinTheta = distFromCenter / displayScale;
        
        let intensity = 0;
        if (sinTheta === 0) intensity = 1;
        else {
            const beta = Math.PI * (state.a * sinTheta / state.lambda);
            intensity = Math.pow(Math.sin(beta) / beta, 2);
        }

        const plotY = patternYStart - (intensity * (h * 0.45)); 
        if (x === 0) ctx.moveTo(x, plotY);
        else ctx.lineTo(x, plotY);
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow

    // 3. Annotate First Minimum
    if (thetaMin !== null) {
        const xOffset = (Math.sin(thetaMin) * displayScale);
        const m1Right = centerX + xOffset;
        const m1Left = centerX - xOffset;

        // Visual markers
        ctx.strokeStyle = '#888';
        ctx.setLineDash([4, 4]);

        if (m1Right < w) {
            ctx.beginPath();
            ctx.moveTo(m1Right, patternYStart);
            ctx.lineTo(m1Right, patternYStart - (h * 0.45));
            ctx.stroke();
            
            drawLabel(`m=1`, m1Right, patternYStart - (h * 0.45) - 20);
            drawLabel(`θ=${(thetaMin * 180 / Math.PI).toFixed(2)}°`, m1Right, patternYStart - (h * 0.45) - 5);
        }
        
        if (m1Left > 0) {
            ctx.beginPath();
            ctx.moveTo(m1Left, patternYStart);
            ctx.lineTo(m1Left, patternYStart - (h * 0.45));
            ctx.stroke();
            drawLabel(`m=-1`, m1Left, patternYStart - (h * 0.45) - 5);
        }
        ctx.setLineDash([]);
    }
}

function drawLabel(text, x, y) {
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
}

// --- Event Listeners ---

function update() {
    // 1. Read Inputs
    const lambdaNm = parseFloat(wavelengthSlider.value); // Linear nm
    const slitLog = parseFloat(slitSlider.value);       // Log meters

    state.lambda = lambdaNm * 1e-9;
    state.a = Math.pow(10, slitLog);

    // 2. Update Text
    wavelengthValDisplay.textContent = lambdaNm;
    
    // Color the thumb of the slider to match physics
    const color = wavelengthToColor(lambdaNm);
    wavelengthSlider.style.setProperty('--primary-color', color);
    
    // Slit Text
    const sFmt = formatSlitWidth(state.a);
    slitValDisplay.textContent = sFmt.num;
    slitUnitDisplay.textContent = sFmt.unit;

    // 3. Draw
    draw();
}

// Init listeners
wavelengthSlider.addEventListener('input', update);
slitSlider.addEventListener('input', update);
window.addEventListener('resize', draw);

// Initial call
update();