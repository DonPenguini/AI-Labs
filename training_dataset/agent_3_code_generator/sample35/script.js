// Global variables
let x1 = 0.5;
let P1sat = 200;
let P2sat = 100;
let pxyChart = null;
let yxChart = null;

// Calculate bubble point and vapor composition
function calculate(x1Val, p1satVal, p2satVal) {
    const x2 = 1 - x1Val;
    const P = x1Val * p1satVal + x2 * p2satVal; // Raoult's Law
    const y1 = (x1Val * p1satVal) / P; // Vapor mole fraction
    const alpha = p1satVal / p2satVal; // Relative volatility
    
    return { P, y1, x2, alpha };
}

// Generate P-x-y data
function generatePxyData() {
    const points = 100;
    const x1Data = [];
    const pBubble = [];
    const pDew = [];
    
    for (let i = 0; i <= points; i++) {
        const x = i / points;
        const xComp2 = 1 - x;
        
        // Bubble point curve (liquid line)
        const pB = x * P1sat + xComp2 * P2sat;
        
        // Dew point curve (vapor line) - need to solve for x from y
        // For Raoult: y1 = x1*P1sat/P, so at dew point P = y1*P1sat + (1-y1)*P2sat
        const y = x; // Use x values as y for dew curve
        const pD = (y * P1sat * P2sat) / (y * P1sat + (1 - y) * P2sat);
        
        x1Data.push(x.toFixed(3));
        pBubble.push(pB);
        pDew.push(pD);
    }
    
    return { x1Data, pBubble, pDew };
}

// Generate y-x equilibrium data
function generateYxData() {
    const points = 100;
    const xData = [];
    const yData = [];
    
    for (let i = 0; i <= points; i++) {
        const x = i / points;
        const xComp2 = 1 - x;
        const P = x * P1sat + xComp2 * P2sat;
        const y = (x * P1sat) / P;
        
        xData.push(x.toFixed(3));
        yData.push(y);
    }
    
    return { xData, yData };
}

// Update all displays
function updateDisplay() {
    const result = calculate(x1, P1sat, P2sat);
    
    // Update result displays
    document.getElementById('bubble-pressure').textContent = result.P.toFixed(1) + ' kPa';
    document.getElementById('vapor-fraction').textContent = result.y1.toFixed(3);
    document.getElementById('rel-volatility').textContent = result.alpha.toFixed(2);
    
    // Update gauge
    document.getElementById('gauge-pressure').textContent = result.P.toFixed(1) + ' kPa';
    
    // Update composition percentages
    document.getElementById('x1-percent').textContent = (x1 * 100).toFixed(1);
    document.getElementById('x2-percent').textContent = (result.x2 * 100).toFixed(1);
    
    // Update composition bar
    document.getElementById('comp1-bar').style.width = (x1 * 100) + '%';
    document.getElementById('comp2-bar').style.width = (result.x2 * 100) + '%';
    
    // Update charts
    updatePxyChart();
    updateYxChart();
    
    // Update molecules
    updateMolecules();
}

// Initialize molecules in liquid and vapor phases
function initMolecules() {
    const liquidContainer = document.getElementById('liquid-molecules');
    const vaporContainer = document.getElementById('vapor-molecules');
    
    liquidContainer.innerHTML = '';
    vaporContainer.innerHTML = '';
    
    // Liquid molecules
    const liquidCount = 40;
    const comp1CountLiquid = Math.round(x1 * liquidCount);
    
    for (let i = 0; i < liquidCount; i++) {
        const molecule = document.createElement('div');
        molecule.className = i < comp1CountLiquid ? 'molecule molecule-1' : 'molecule molecule-2';
        molecule.style.left = Math.random() * 90 + 5 + '%';
        molecule.style.top = Math.random() * 90 + 5 + '%';
        liquidContainer.appendChild(molecule);
    }
    
    // Vapor molecules (based on y1)
    const result = calculate(x1, P1sat, P2sat);
    const vaporCount = 20;
    const comp1CountVapor = Math.round(result.y1 * vaporCount);
    
    for (let i = 0; i < vaporCount; i++) {
        const molecule = document.createElement('div');
        molecule.className = i < comp1CountVapor ? 'molecule molecule-1' : 'molecule molecule-2';
        molecule.style.left = Math.random() * 90 + 5 + '%';
        molecule.style.top = Math.random() * 90 + 5 + '%';
        vaporContainer.appendChild(molecule);
    }
}

// Update molecules
function updateMolecules() {
    initMolecules();
}

// Animate bubble formation
function animateBubbles() {
    const container = document.getElementById('bubble-container');
    container.innerHTML = '';
    
    // Create multiple bubbles
    const numBubbles = 8;
    for (let i = 0; i < numBubbles; i++) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        const size = 20 + Math.random() * 30;
        bubble.style.width = size + 'px';
        bubble.style.height = size + 'px';
        bubble.style.left = Math.random() * 80 + 10 + '%';
        bubble.style.animationDelay = (i * 0.3) + 's';
        
        bubble.classList.add('animating');
        container.appendChild(bubble);
    }
    
    // Clean up after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000 + (numBubbles * 300));
}

// Initialize P-x-y chart
function initPxyChart() {
    const ctx = document.getElementById('pxyChart').getContext('2d');
    const data = generatePxyData();
    
    pxyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.x1Data,
            datasets: [
                {
                    label: 'Bubble Point (Liquid)',
                    data: data.pBubble,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'Dew Point (Vapor)',
                    data: data.pDew,
                    borderColor: '#a855f7',
                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
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
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' kPa';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mole Fraction of Component 1 (x₁, y₁)'
                    },
                    ticks: {
                        maxTicksLimit: 11
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Pressure (kPa)'
                    },
                    beginAtZero: false
                }
            }
        }
    });
    
    addCurrentPointToPxyChart();
}

// Initialize y-x chart
function initYxChart() {
    const ctx = document.getElementById('yxChart').getContext('2d');
    const data = generateYxData();
    
    yxChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.xData,
            datasets: [
                {
                    label: 'VLE Curve (y₁ vs x₁)',
                    data: data.yData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: 'y = x (45° line)',
                    data: [0, 1],
                    borderColor: '#9ca3af',
                    borderWidth: 2,
                    borderDash: [5, 5],
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
                            if (context.datasetIndex === 0) {
                                return 'y₁ = ' + context.parsed.y.toFixed(3);
                            }
                            return context.dataset.label;
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
                        text: 'Liquid Mole Fraction (x₁)'
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
                        text: 'Vapor Mole Fraction (y₁)'
                    },
                    ticks: {
                        stepSize: 0.1
                    }
                }
            }
        }
    });
    
    addCurrentPointToYxChart();
}

// Add current operating point to P-x-y chart
function addCurrentPointToPxyChart() {
    if (pxyChart) {
        const result = calculate(x1, P1sat, P2sat);
        
        // Remove existing current point datasets if any
        while (pxyChart.data.datasets.length > 2) {
            pxyChart.data.datasets.pop();
        }
        
        // Add current liquid point
        pxyChart.data.datasets.push({
            label: 'Current State',
            data: [{ x: x1, y: result.P }],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
            type: 'scatter'
        });
        
        // Add tie line
        pxyChart.data.datasets.push({
            label: 'Tie Line',
            data: [{ x: x1, y: result.P }, { x: result.y1, y: result.P }],
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [3, 3],
            pointRadius: 4,
            pointBackgroundColor: '#ef4444',
            type: 'scatter',
            showLine: true
        });
        
        pxyChart.update('none');
    }
}

// Add current operating point to y-x chart
function addCurrentPointToYxChart() {
    if (yxChart) {
        const result = calculate(x1, P1sat, P2sat);
        
        // Remove existing current point dataset if any
        if (yxChart.data.datasets.length > 2) {
            yxChart.data.datasets.pop();
        }
        
        // Add current point
        yxChart.data.datasets.push({
            label: 'Current Point',
            data: [{ x: x1, y: result.y1 }],
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
            type: 'scatter'
        });
        
        yxChart.update('none');
    }
}

// Update P-x-y chart
function updatePxyChart() {
    if (pxyChart) {
        const data = generatePxyData();
        pxyChart.data.labels = data.x1Data;
        pxyChart.data.datasets[0].data = data.pBubble;
        pxyChart.data.datasets[1].data = data.pDew;
        addCurrentPointToPxyChart();
    }
}

// Update y-x chart
function updateYxChart() {
    if (yxChart) {
        const data = generateYxData();
        yxChart.data.labels = data.xData;
        yxChart.data.datasets[0].data = data.yData;
        addCurrentPointToYxChart();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // x1 slider
    const x1Slider = document.getElementById('x1-slider');
    const x1Value = document.getElementById('x1-value');
    
    x1Slider.addEventListener('input', function() {
        x1 = parseFloat(this.value);
        x1Value.textContent = x1.toFixed(3);
        updateDisplay();
    });
    
    // P1sat slider
    const p1satSlider = document.getElementById('p1sat-slider');
    const p1satValue = document.getElementById('p1sat-value');
    
    p1satSlider.addEventListener('input', function() {
        P1sat = parseFloat(this.value);
        p1satValue.textContent = P1sat.toFixed(0);
        updateDisplay();
    });
    
    // P2sat slider
    const p2satSlider = document.getElementById('p2sat-slider');
    const p2satValue = document.getElementById('p2sat-value');
    
    p2satSlider.addEventListener('input', function() {
        P2sat = parseFloat(this.value);
        p2satValue.textContent = P2sat.toFixed(0);
        updateDisplay();
    });
    
    // Animate button
    document.getElementById('animate-btn').addEventListener('click', animateBubbles);
    
    // Initialize
    initMolecules();
    initPxyChart();
    initYxChart();
    updateDisplay();
});