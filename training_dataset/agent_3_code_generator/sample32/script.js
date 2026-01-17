// Global variables
let qmax = 5.0;
let K = 1.0;
let C = 2.0;
let isothermChart = null;
let linearChart = null;

// Calculate adsorbed amount
function calculate(qmaxVal, kVal, cVal) {
    const q = (qmaxVal * kVal * cVal) / (1 + kVal * cVal);
    const theta = q / qmaxVal; // Fractional coverage
    const kc = kVal * cVal;
    return { q, theta, kc };
}

// Generate isotherm data
function generateIsothermData() {
    const points = 100;
    const concentrations = [];
    const adsorptions = [];
    
    const maxC = 10;
    for (let i = 0; i <= points; i++) {
        const c = (maxC * i) / points;
        const q = (qmax * K * c) / (1 + K * c);
        concentrations.push(c.toFixed(2));
        adsorptions.push(q);
    }
    
    return { concentrations, adsorptions };
}

// Generate linearized data (1/q vs 1/C)
function generateLinearizedData() {
    const points = 50;
    const invC = [];
    const invQ = [];
    
    const minC = 0.1;
    const maxC = 10;
    
    for (let i = 0; i <= points; i++) {
        const c = minC + ((maxC - minC) * i) / points;
        const q = (qmax * K * c) / (1 + K * c);
        
        if (q > 0.01) { // Avoid division by very small numbers
            invC.push((1 / c).toFixed(4));
            invQ.push(1 / q);
        }
    }
    
    return { invC, invQ };
}

// Update all displays
function updateDisplay() {
    const result = calculate(qmax, K, C);
    
    // Update result displays
    document.getElementById('adsorbed-amount').textContent = result.q.toFixed(4) + ' mol/kg';
    document.getElementById('fractional-coverage').textContent = (result.theta * 100).toFixed(2) + '%';
    document.getElementById('kc-value').textContent = result.kc.toFixed(4);
    
    // Update charts
    updateIsothermChart();
    updateLinearChart();
    
    // Update surface visualization
    updateSurfaceVisualization(result.theta);
}

// Initialize surface grid
function initSurfaceGrid() {
    const grid = document.getElementById('surface-grid');
    grid.innerHTML = '';
    
    // Create 100 sites (10x10 grid)
    for (let i = 0; i < 100; i++) {
        const site = document.createElement('div');
        site.className = 'site vacant';
        site.id = `site-${i}`;
        grid.appendChild(site);
    }
}

// Update surface visualization based on fractional coverage
function updateSurfaceVisualization(theta, animate = false) {
    const totalSites = 100;
    const occupiedSites = Math.round(theta * totalSites);
    
    // Create array of site indices and shuffle
    const siteIndices = Array.from({ length: totalSites }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = siteIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [siteIndices[i], siteIndices[j]] = [siteIndices[j], siteIndices[i]];
    }
    
    // Update sites
    for (let i = 0; i < totalSites; i++) {
        const site = document.getElementById(`site-${siteIndices[i]}`);
        
        if (i < occupiedSites) {
            if (!site.classList.contains('occupied')) {
                site.classList.remove('vacant');
                site.classList.add('occupied');
                if (animate) {
                    site.classList.add('animating');
                    setTimeout(() => site.classList.remove('animating'), 500);
                }
            }
        } else {
            site.classList.remove('occupied');
            site.classList.add('vacant');
        }
    }
}

// Initialize isotherm chart
function initIsothermChart() {
    const ctx = document.getElementById('isothermChart').getContext('2d');
    const data = generateIsothermData();
    
    isothermChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.concentrations,
            datasets: [
                {
                    label: 'Adsorbed Amount q (mol/kg)',
                    data: data.adsorptions,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0
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
                            return 'q = ' + context.parsed.y.toFixed(4) + ' mol/kg';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Concentration C (mol/L)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Adsorbed Amount q (mol/kg)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Add current point
    addCurrentPointToChart();
}

// Initialize linearized chart
function initLinearChart() {
    const ctx = document.getElementById('linearChart').getContext('2d');
    const data = generateLinearizedData();
    
    linearChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.invC,
            datasets: [
                {
                    label: '1/q (kg/mol)',
                    data: data.invQ,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0,
                    pointRadius: 0
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
                            return '1/q = ' + context.parsed.y.toFixed(4) + ' kg/mol';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '1/C (L/mol)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '1/q (kg/mol)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Add current operating point to isotherm chart
function addCurrentPointToChart() {
    if (isothermChart) {
        const result = calculate(qmax, K, C);
        
        // Remove existing current point dataset if any
        if (isothermChart.data.datasets.length > 1) {
            isothermChart.data.datasets.pop();
        }
        
        // Add current point
        isothermChart.data.datasets.push({
            label: 'Current Point',
            data: [{ x: C, y: result.q }],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
            type: 'scatter'
        });
        
        isothermChart.update('none');
    }
}

// Update isotherm chart
function updateIsothermChart() {
    if (isothermChart) {
        const data = generateIsothermData();
        isothermChart.data.labels = data.concentrations;
        isothermChart.data.datasets[0].data = data.adsorptions;
        addCurrentPointToChart();
    }
}

// Update linearized chart
function updateLinearChart() {
    if (linearChart) {
        const data = generateLinearizedData();
        linearChart.data.labels = data.invC;
        linearChart.data.datasets[0].data = data.invQ;
        linearChart.update('none');
    }
}

// Animate adsorption
function animateAdsorption() {
    const result = calculate(qmax, K, C);
    updateSurfaceVisualization(result.theta, true);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // qmax slider
    const qmaxSlider = document.getElementById('qmax-slider');
    const qmaxValue = document.getElementById('qmax-value');
    
    qmaxSlider.addEventListener('input', function() {
        qmax = parseFloat(this.value);
        qmaxValue.textContent = qmax.toFixed(2);
        updateDisplay();
    });
    
    // K slider (logarithmic)
    const kSlider = document.getElementById('k-slider');
    const kValue = document.getElementById('k-value');
    const kExponent = document.getElementById('k-exponent');
    const kActual = document.getElementById('k-actual');
    
    kSlider.addEventListener('input', function() {
        const exponent = parseFloat(this.value);
        K = Math.pow(10, exponent);
        kValue.textContent = K.toFixed(3);
        kExponent.textContent = exponent.toFixed(2);
        kActual.textContent = K.toFixed(3);
        updateDisplay();
    });
    
    // C slider
    const cSlider = document.getElementById('c-slider');
    const cValue = document.getElementById('c-value');
    const cInput = document.getElementById('c-input');
    
    cSlider.addEventListener('input', function() {
        C = parseFloat(this.value);
        cValue.textContent = C.toFixed(2);
        cInput.value = C.toFixed(2);
        updateDisplay();
    });
    
    cInput.addEventListener('input', function() {
        let val = parseFloat(this.value);
        if (val < 0) val = 0;
        if (val > 10) val = 10;
        C = val;
        cSlider.value = C;
        cValue.textContent = C.toFixed(2);
        updateDisplay();
    });
    
    // Animate button
    document.getElementById('animate-btn').addEventListener('click', animateAdsorption);
    
    // Initialize
    initSurfaceGrid();
    initIsothermChart();
    initLinearChart();
    updateDisplay();
});