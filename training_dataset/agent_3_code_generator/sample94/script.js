// Configuration
const NUM_CLASSES = 5;
const INITIAL_LOGITS = [2.0, 1.0, 0.1, 1.5, -1.0];
let temperature = 1.0;

// DOM Elements
const slidersContainer = document.getElementById('slidersContainer');
const logitChart = document.getElementById('logitChart');
const probChart = document.getElementById('probChart');
const sumExpVal = document.getElementById('sumExpVal');
const maxProbVal = document.getElementById('maxProbVal');
const tempInput = document.getElementById('tempInput');
const tempVal = document.getElementById('tempVal');
const randomizeBtn = document.getElementById('randomizeBtn');
const resetBtn = document.getElementById('resetBtn');

// State
let logits = [...INITIAL_LOGITS];

// Initialization
function init() {
    createInputs();
    createBars(logitChart, 'logit');
    createBars(probChart, 'prob');
    updateSimulation();
}

// Create Slider Inputs
function createInputs() {
    slidersContainer.innerHTML = '';
    logits.forEach((val, i) => {
        const div = document.createElement('div');
        div.className = 'input-group';
        div.innerHTML = `
            <span class="class-label">z<sub>${i}</sub></span>
            <input type="range" min="-5" max="5" step="0.1" value="${val}" data-index="${i}" class="input-slider">
            <span class="logit-val" id="logit-val-${i}">${val.toFixed(1)}</span>
        `;
        slidersContainer.appendChild(div);
    });

    // Add event listeners to new sliders
    document.querySelectorAll('.input-slider').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.index);
            const val = parseFloat(e.target.value);
            logits[idx] = val;
            
            // Update text display
            document.getElementById(`logit-val-${idx}`).textContent = val.toFixed(1);
            
            updateSimulation();
        });
    });
}

// Create Visual Bars (Empty structure)
function createBars(container, type) {
    container.innerHTML = '';
    for (let i = 0; i < NUM_CLASSES; i++) {
        const wrapper = document.createElement('div');
        wrapper.className = 'bar-wrapper';
        
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'bar-value';
        valueDisplay.id = `${type}-text-${i}`;
        
        const bar = document.createElement('div');
        bar.className = `bar bar-${i}`;
        bar.id = `${type}-bar-${i}`;
        
        wrapper.appendChild(valueDisplay);
        wrapper.appendChild(bar);
        container.appendChild(wrapper);
    }
}

// Core Logic & Animation Update
function updateSimulation() {
    // 1. Calculate Exponentials
    // Apply Temperature: z_i / T
    const expValues = logits.map(z => Math.exp(z / temperature));
    
    // 2. Calculate Sum
    const sumExp = expValues.reduce((a, b) => a + b, 0);
    
    // 3. Calculate Probabilities
    const probs = expValues.map(v => v / sumExp);

    // 4. Update UI - Logit Chart (Relative visualization)
    // To visualize negative and positive logits nicely, we map them to percentage height
    // Range [-5, 5] -> [0%, 100%] roughly for visual check
    const minLogit = -5;
    const maxLogit = 5;
    
    logits.forEach((z, i) => {
        const bar = document.getElementById(`logit-bar-${i}`);
        const text = document.getElementById(`logit-text-${i}`);
        
        // Normalize for visual height (simple linear map)
        let percent = ((z - minLogit) / (maxLogit - minLogit)) * 100;
        percent = Math.max(5, Math.min(100, percent)); // Clamp
        
        bar.style.height = `${percent}%`;
        text.textContent = z.toFixed(1);
        
        // Visual cue: fade out bars if their logit is very low relative to others? 
        // No, keep opacity 1. Just height indicates value.
    });

    // 5. Update UI - Probability Chart
    probs.forEach((p, i) => {
        const bar = document.getElementById(`prob-bar-${i}`);
        const text = document.getElementById(`prob-text-${i}`);
        
        // Prob is 0 to 1, map to 0% to 100% height
        const heightPercent = Math.max(1, p * 100); // Min 1% visibility
        
        bar.style.height = `${heightPercent}%`;
        text.textContent = (p * 100).toFixed(1) + '%';
        
        // Highlight the "Winner"
        if (p === Math.max(...probs)) {
            bar.style.filter = 'brightness(1.1)';
            bar.style.boxShadow = '0 0 10px rgba(0,0,0,0.2)';
        } else {
            bar.style.filter = 'none';
            bar.style.boxShadow = 'none';
        }
    });

    // 6. Update Stats
    sumExpVal.textContent = sumExp.toFixed(2);
    const maxP = Math.max(...probs) * 100;
    maxProbVal.textContent = maxP.toFixed(1) + '%';
}

// Event Listeners for Controls
tempInput.addEventListener('input', (e) => {
    temperature = parseFloat(e.target.value);
    tempVal.textContent = temperature.toFixed(1);
    updateSimulation();
});

randomizeBtn.addEventListener('click', () => {
    logits = logits.map(() => (Math.random() * 8 - 4)); // Random between -4 and 4
    
    // Update sliders and text
    logits.forEach((val, i) => {
        const slider = document.querySelector(`input[data-index="${i}"]`);
        slider.value = val;
        document.getElementById(`logit-val-${i}`).textContent = val.toFixed(1);
    });
    
    updateSimulation();
});

resetBtn.addEventListener('click', () => {
    logits = [...INITIAL_LOGITS];
    temperature = 1.0;
    tempInput.value = 1.0;
    tempVal.textContent = "1.0";
    
    // Reset sliders
    logits.forEach((val, i) => {
        const slider = document.querySelector(`input[data-index="${i}"]`);
        slider.value = val;
        document.getElementById(`logit-val-${i}`).textContent = val.toFixed(1);
    });
    
    updateSimulation();
});

// Start
init();