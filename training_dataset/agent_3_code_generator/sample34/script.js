// Global variables
let xD = 0.95;
let xB = 0.05;
let alpha = 2.5;
let mcCabeChart = null;
let alphaChart = null;

// Calculate minimum stages using Fenske equation
function calculate(xDVal, xBVal, alphaVal) {
    // Nmin = log((xD/(1-xD)) * ((1-xB)/xB)) / log(alpha)
    const numerator = (xDVal / (1 - xDVal)) * ((1 - xBVal) / xBVal);
    const nMin = Math.log(numerator) / Math.log(alphaVal);
    
    // Separation factor
    const separationFactor = numerator;
    
    // Approximate recovery (simplified)
    const recovery = ((xDVal - xBVal) / (1 - xBVal)) * 100;
    
    return { nMin, separationFactor, recovery };
}

// Generate equilibrium curve data
function generateEquilibriumCurve() {
    const points = 100;
    const xLiquid = [];
    const yVapor = [];
    
    for (let i = 0; i <= points; i++) {
        const x = i / points;
        // Equilibrium: y = alpha*x / (1 + (alpha-1)*x)
        const y = (alpha * x) / (1 + (alpha - 1) * x);
        xLiquid.push(x);
        yVapor.push(y);
    }
    
    return { xLiquid, yVapor };
}

// Generate McCabe-Thiele stepping data for total reflux
function generateSteppingData() {
    const steps = [];
    const nMin = calculate(xD, xB, alpha).nMin;
    const stages = Math.ceil(nMin);
    
    let x = xB;
    let y = xB; // Start at bottoms
    
    steps.push({ x: x, y: y }); // Starting point
    
    for (let i = 0; i < stages + 2; i++) {
        // Horizontal line (liquid composition constant on stage)
        y = (alpha * x) / (1 + (alpha - 1) * x);
        steps.push({ x: x, y: y });
        
        if (y >= xD) break;
        
        // Vertical line at total reflux (operating line is y=x)
        x = y;
        steps.push({ x: x, y: y });
        
        if (x >= xD) break;
    }
    
    return steps;
}

// Generate Nmin vs alpha data
function generateAlphaData() {
    const points = 50;
    const alphas = [];
    const nMins = [];
    
    for (let i = 0; i <= points; i++) {
        const a = 1.1 + (3.9 * i) / points; // From 1.1 to 5.0
        const result = calculate(xD, xB, a);
        alphas.push(a.toFixed(2));
        nMins.push(result.nMin);
    }
    
    return { alphas, nMins };
}

// Update all displays
function updateDisplay() {
    const result = calculate(xD, xB, alpha);
    
    // Update result displays
    document.getElementById('nmin').textContent = result.nMin.toFixed(2);
    document.getElementById('separation-factor').textContent = result.separationFactor.toFixed(2);
    document.getElementById('recovery').textContent = result.recovery.toFixed(1) + '%';
    
    // Update column display labels
    document.getElementById('xd-display').textContent = xD.toFixed(3);
    document.getElementById('xb-display').textContent = xB.toFixed(3);
    
    // Update charts
    updateMcCabeChart();
    updateAlphaChart();
}

// Generate column stages
function generateColumnStages() {
    const columnBody = document.getElementById('column-body');
    columnBody.innerHTML = '';
    
    const nMin = calculate(xD, xB, alpha).nMin;
    const stages = Math.ceil(nMin);
    
    // Generate stages from top to bottom
    for (let i = 1; i <= stages; i++) {
        const stage = document.createElement('div');
        stage.className = 'stage';
        stage.id = `stage-${i}`;
        
        const stageNum = document.createElement('span');
        stageNum.className = 'stage-number';
        stageNum.textContent = `Stage ${i}`;
        stage.appendChild(stageNum);
        
        // Calculate composition for this stage (linear interpolation for visualization)
        const composition = xD - ((xD - xB) * (i - 1)) / stages;
        const fillPercent = (composition / xD) * 100;
        
        stage.style.setProperty('--fill-width', fillPercent + '%');
        stage.querySelector('::before')?.style.setProperty('width', fillPercent + '%');
        
        columnBody.appendChild(stage);
    }
    
    // Set dynamic height for column
    const columnHeight = stages * 34; // 30px height + 4px margin
    document.getElementById('column').style.height = columnHeight + 'px';
}

// Visualize column with animation
function visualizeColumn() {
    generateColumnStages();
    
    const stages = document.querySelectorAll('.stage');
    const nMin = calculate(xD, xB, alpha).nMin;
    const totalStages = Math.ceil(nMin);
    
    stages.forEach((stage, index) => {
        setTimeout(() => {
            const composition = xD - ((xD - xB) * index) / totalStages;
            const fillPercent = (composition / xD) * 100;
            stage.style.setProperty('--fill-width', fillPercent + '%');
            stage.querySelector('::before').style.width = fillPercent + '%';
        }, index * 200);
    });
}

// Initialize McCabe-Thiele chart
function initMcCabeChart() {
    const ctx = document.getElementById('mcCabeChart').getContext('2d');
    const eqData = generateEquilibriumCurve();
    const stepData = generateSteppingData();
    
    mcCabeChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Equilibrium Curve',
                    data: eqData.xLiquid.map((x, i) => ({ x: x, y: eqData.yVapor[i] })),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'y = x (45° line)',
                    data: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                    borderColor: '#9ca3af',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Operating Line (Total Reflux)',
                    data: stepData,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                    borderWidth: 2,
                    stepped: false,
                    pointRadius: 0,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': (' + 
                                   context.parsed.x.toFixed(3) + ', ' + 
                                   context.parsed.y.toFixed(3) + ')';
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    max: 1,
                    display: true,
                    title: {
                        display: true,
                        text: 'x (Liquid Mole Fraction - Light Component)'
                    },
                    ticks: {
                        stepSize: 0.1
                    }
                },
                y: {
                    type: 'linear',
                    min: 0,
                    max: 1,
                    display: true,
                    title: {
                        display: true,
                        text: 'y (Vapor Mole Fraction - Light Component)'
                    },
                    ticks: {
                        stepSize: 0.1
                    }
                }
            }
        }
    });
}

// Initialize alpha chart
function initAlphaChart() {
    const ctx = document.getElementById('alphaChart').getContext('2d');
    const data = generateAlphaData();
    
    alphaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.alphas,
            datasets: [
                {
                    label: 'Minimum Stages (Nmin)',
                    data: data.nMins,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Nmin = ' + context.parsed.y.toFixed(2) + ' stages';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Relative Volatility (α)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Minimum Stages (Nmin)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Add current point
    addCurrentPointToAlphaChart();
}

// Add current operating point to alpha chart
function addCurrentPointToAlphaChart() {
    if (alphaChart) {
        const result = calculate(xD, xB, alpha);
        
        // Remove existing current point dataset if any
        if (alphaChart.data.datasets.length > 1) {
            alphaChart.data.datasets.pop();
        }
        
        // Add current point
        alphaChart.data.datasets.push({
            label: 'Current α',
            data: [{ x: alpha, y: result.nMin }],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
            type: 'scatter'
        });
        
        alphaChart.update('none');
    }
}

// Update McCabe-Thiele chart
function updateMcCabeChart() {
    if (mcCabeChart) {
        const eqData = generateEquilibriumCurve();
        const stepData = generateSteppingData();
        
        mcCabeChart.data.datasets[0].data = eqData.xLiquid.map((x, i) => ({ x: x, y: eqData.yVapor[i] }));
        mcCabeChart.data.datasets[2].data = stepData;
        mcCabeChart.update('none');
    }
}

// Update alpha chart
function updateAlphaChart() {
    if (alphaChart) {
        const data = generateAlphaData();
        alphaChart.data.labels = data.alphas;
        alphaChart.data.datasets[0].data = data.nMins;
        addCurrentPointToAlphaChart();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // xD slider
    const xdSlider = document.getElementById('xd-slider');
    const xdValue = document.getElementById('xd-value');
    
    xdSlider.addEventListener('input', function() {
        xD = parseFloat(this.value);
        // Ensure xD > xB
        if (xD <= xB) {
            xD = xB + 0.01;
            this.value = xD;
        }
        xdValue.textContent = xD.toFixed(3);
        updateDisplay();
    });
    
    // xB slider
    const xbSlider = document.getElementById('xb-slider');
    const xbValue = document.getElementById('xb-value');
    
    xbSlider.addEventListener('input', function() {
        xB = parseFloat(this.value);
        // Ensure xB < xD
        if (xB >= xD) {
            xB = xD - 0.01;
            this.value = xB;
        }
        xbValue.textContent = xB.toFixed(3);
        updateDisplay();
    });
    
    // alpha slider
    const alphaSlider = document.getElementById('alpha-slider');
    const alphaValue = document.getElementById('alpha-value');
    
    alphaSlider.addEventListener('input', function() {
        alpha = parseFloat(this.value);
        alphaValue.textContent = alpha.toFixed(2);
        updateDisplay();
    });
    
    // Visualize button
    document.getElementById('visualize-btn').addEventListener('click', visualizeColumn);
    
    // Initialize
    generateColumnStages();
    initMcCabeChart();
    initAlphaChart();
    updateDisplay();
});