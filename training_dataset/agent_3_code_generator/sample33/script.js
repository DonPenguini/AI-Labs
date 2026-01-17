// Global variables
let D = 1e-9;
let C1 = 800;
let C2 = 200;
let L = 1e-3;
let profileChart = null;
let fluxChart = null;

// Calculate flux
function calculate(dVal, c1Val, c2Val, lVal) {
    const flux = (dVal * (c1Val - c2Val)) / lVal;
    const gradient = (c1Val - c2Val) / lVal;
    const deltaC = c1Val - c2Val;
    return { flux, gradient, deltaC };
}

// Format scientific notation
function formatScientific(value, decimals = 2) {
    if (value === 0) return '0.00e+0';
    const exponent = Math.floor(Math.log10(Math.abs(value)));
    const mantissa = value / Math.pow(10, exponent);
    return `${mantissa.toFixed(decimals)}e${exponent >= 0 ? '+' : ''}${exponent}`;
}

// Generate concentration profile data
function generateProfile() {
    const points = 100;
    const positions = [];
    const concentrations = [];
    
    for (let i = 0; i <= points; i++) {
        const x = (L * i) / points;
        const c = C1 - ((C1 - C2) * i) / points; // Linear profile in steady state
        positions.push((x * 1000).toFixed(4)); // Convert to mm
        concentrations.push(c);
    }
    
    return { positions, concentrations };
}

// Generate flux vs driving force data
function generateFluxData() {
    const points = 50;
    const deltaCs = [];
    const fluxes = [];
    
    // Range from -1000 to +1000 to show both directions
    const minDeltaC = -1000;
    const maxDeltaC = 1000;
    
    for (let i = 0; i <= points; i++) {
        const dc = minDeltaC + ((maxDeltaC - minDeltaC) * i) / points;
        const flux = (D * dc) / L;
        deltaCs.push(dc.toFixed(1));
        fluxes.push(flux);
    }
    
    return { deltaCs, fluxes };
}

// Update all displays
function updateDisplay() {
    const result = calculate(D, C1, C2, L);
    
    // Update result displays
    const fluxSign = result.flux >= 0 ? '+' : '';
    document.getElementById('flux').textContent = fluxSign + formatScientific(result.flux, 3) + ' mol/(m²·s)';
    document.getElementById('gradient').textContent = formatScientific(result.gradient, 2) + ' mol/m⁴';
    document.getElementById('delta-c').textContent = result.deltaC.toFixed(0) + ' mol/m³';
    
    // Update membrane display labels
    document.getElementById('c1-display').textContent = C1.toFixed(0);
    document.getElementById('c2-display').textContent = C2.toFixed(0);
    document.getElementById('l-display').textContent = (L * 1000).toFixed(2);
    
    // Update charts
    updateProfileChart();
    updateFluxChart();
    
    // Update particles
    updateParticles();
    
    // Update flux arrow direction
    updateFluxArrow(result.flux);
}

// Update flux arrow based on flux direction
function updateFluxArrow(flux) {
    const arrow = document.getElementById('flux-arrow');
    const arrowBody = arrow.querySelector('.arrow-body');
    
    if (flux > 0) {
        // Left to right (C1 > C2)
        arrow.style.flexDirection = 'row';
        arrowBody.style.background = '#dc2626';
    } else if (flux < 0) {
        // Right to left (C2 > C1)
        arrow.style.flexDirection = 'row-reverse';
        arrowBody.style.background = '#2563eb';
    } else {
        // No flux
        arrowBody.style.background = '#9ca3af';
    }
}

// Initialize particles in upstream and downstream
function initParticles() {
    const upstreamContainer = document.getElementById('upstream-particles');
    const downstreamContainer = document.getElementById('downstream-particles');
    
    upstreamContainer.innerHTML = '';
    downstreamContainer.innerHTML = '';
    
    // Create particles based on concentration
    const upstreamCount = Math.min(Math.floor(C1 / 50), 30);
    const downstreamCount = Math.min(Math.floor(C2 / 50), 30);
    
    for (let i = 0; i < upstreamCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 80 + 10 + '%';
        particle.style.top = Math.random() * 80 + 10 + '%';
        upstreamContainer.appendChild(particle);
    }
    
    for (let i = 0; i < downstreamCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 80 + 10 + '%';
        particle.style.top = Math.random() * 80 + 10 + '%';
        downstreamContainer.appendChild(particle);
    }
}

// Update particles
function updateParticles() {
    initParticles();
    updateSideColors();
}

// Update side colors based on concentration
function updateSideColors() {
    const upstreamSide = document.querySelector('.upstream');
    const downstreamSide = document.querySelector('.downstream');
    
    // Determine intensity based on concentration
    const maxConc = 1000;
    const upstreamIntensity = Math.min(C1 / maxConc, 1);
    const downstreamIntensity = Math.min(C2 / maxConc, 1);
    
    // Set colors - darker blue for higher concentration
    if (C1 > C2) {
        upstreamSide.style.background = `linear-gradient(135deg, 
            rgb(${59 - upstreamIntensity * 20}, ${130 - upstreamIntensity * 50}, ${246 - upstreamIntensity * 30}) 0%, 
            rgb(${37 - upstreamIntensity * 20}, ${99 - upstreamIntensity * 40}, ${235 - upstreamIntensity * 30}) 100%)`;
        downstreamSide.style.background = `linear-gradient(135deg, 
            rgb(${147 + downstreamIntensity * 40}, ${197 + downstreamIntensity * 30}, ${253}) 0%, 
            rgb(${191 + downstreamIntensity * 40}, ${219 + downstreamIntensity * 20}, ${254}) 100%)`;
    } else if (C2 > C1) {
        upstreamSide.style.background = `linear-gradient(135deg, 
            rgb(${147 + upstreamIntensity * 40}, ${197 + upstreamIntensity * 30}, ${253}) 0%, 
            rgb(${191 + upstreamIntensity * 40}, ${219 + upstreamIntensity * 20}, ${254}) 100%)`;
        downstreamSide.style.background = `linear-gradient(135deg, 
            rgb(${59 - downstreamIntensity * 20}, ${130 - downstreamIntensity * 50}, ${246 - downstreamIntensity * 30}) 0%, 
            rgb(${37 - downstreamIntensity * 20}, ${99 - downstreamIntensity * 40}, ${235 - downstreamIntensity * 30}) 100%)`;
    } else {
        // Equal concentrations
        const midColor = `linear-gradient(135deg, rgb(100, 150, 250) 0%, rgb(120, 170, 250) 100%)`;
        upstreamSide.style.background = midColor;
        downstreamSide.style.background = midColor;
    }
}

// Initialize profile chart
function initProfileChart() {
    const ctx = document.getElementById('profileChart').getContext('2d');
    const data = generateProfile();
    
    profileChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.positions,
            datasets: [
                {
                    label: 'Concentration (mol/m³)',
                    data: data.concentrations,
                    borderColor: '#0891b2',
                    backgroundColor: 'rgba(8, 145, 178, 0.1)',
                    borderWidth: 3,
                    tension: 0,
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
                            return 'C = ' + context.parsed.y.toFixed(2) + ' mol/m³';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Position in Membrane (mm)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Concentration (mol/m³)'
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// Initialize flux chart
function initFluxChart() {
    const ctx = document.getElementById('fluxChart').getContext('2d');
    const data = generateFluxData();
    
    fluxChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.deltaCs,
            datasets: [
                {
                    label: 'Flux J (mol/(m²·s))',
                    data: data.fluxes,
                    borderColor: '#dc2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
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
                            return 'J = ' + formatScientific(context.parsed.y, 3) + ' mol/(m²·s)';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Driving Force ΔC = C₁ - C₂ (mol/m³)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Flux J (mol/(m²·s))'
                    },
                    ticks: {
                        callback: function(value) {
                            return formatScientific(value, 1);
                        }
                    }
                }
            }
        }
    });
    
    // Add current point
    addCurrentPointToChart();
}

// Add current operating point to flux chart
function addCurrentPointToChart() {
    if (fluxChart) {
        const result = calculate(D, C1, C2, L);
        
        // Remove existing current point dataset if any
        if (fluxChart.data.datasets.length > 1) {
            fluxChart.data.datasets.pop();
        }
        
        // Add current point
        fluxChart.data.datasets.push({
            label: 'Current Point',
            data: [{ x: result.deltaC, y: result.flux }],
            borderColor: '#7c3aed',
            backgroundColor: '#7c3aed',
            pointRadius: 8,
            pointHoverRadius: 10,
            showLine: false,
            type: 'scatter'
        });
        
        fluxChart.update('none');
    }
}

// Update profile chart
function updateProfileChart() {
    if (profileChart) {
        const data = generateProfile();
        profileChart.data.labels = data.positions;
        profileChart.data.datasets[0].data = data.concentrations;
        profileChart.update('none');
    }
}

// Update flux chart
function updateFluxChart() {
    if (fluxChart) {
        const data = generateFluxData();
        fluxChart.data.labels = data.deltaCs;
        fluxChart.data.datasets[0].data = data.fluxes;
        addCurrentPointToChart();
    }
}

// Animate diffusion
function animateDiffusion() {
    const container = document.getElementById('diffusing-particles');
    const flux = (D * (C1 - C2)) / L;
    
    // Clear existing particles
    container.innerHTML = '';
    
    // Determine direction and number of particles based on flux magnitude
    const isLeftToRight = flux > 0;
    const numParticles = Math.min(Math.floor(Math.abs(flux) / 1e-5) + 3, 12);
    
    // Create multiple diffusing particles
    for (let i = 0; i < numParticles; i++) {
        const particle = document.createElement('div');
        particle.className = 'diffusing-particle';
        particle.style.top = Math.random() * 80 + 10 + '%';
        particle.style.animationDelay = (i * 0.25) + 's';
        
        if (isLeftToRight) {
            particle.classList.add('animating-left-to-right');
        } else {
            particle.classList.add('animating-right-to-left');
        }
        
        container.appendChild(particle);
    }
    
    // Clean up after animation
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000 + (numParticles * 250));
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // D slider (logarithmic)
    const dSlider = document.getElementById('d-slider');
    const dValue = document.getElementById('d-value');
    const dExponent = document.getElementById('d-exponent');
    
    dSlider.addEventListener('input', function() {
        const exponent = parseFloat(this.value);
        D = Math.pow(10, exponent);
        dValue.textContent = formatScientific(D, 2);
        dExponent.textContent = exponent.toFixed(1);
        updateDisplay();
    });
    
    // C1 slider
    const c1Slider = document.getElementById('c1-slider');
    const c1Value = document.getElementById('c1-value');
    
    c1Slider.addEventListener('input', function() {
        C1 = parseFloat(this.value);
        c1Value.textContent = C1.toFixed(0);
        updateDisplay();
    });
    
    // C2 slider
    const c2Slider = document.getElementById('c2-slider');
    const c2Value = document.getElementById('c2-value');
    
    c2Slider.addEventListener('input', function() {
        C2 = parseFloat(this.value);
        c2Value.textContent = C2.toFixed(0);
        updateDisplay();
    });
    
    // L slider (logarithmic)
    const lSlider = document.getElementById('l-slider');
    const lValue = document.getElementById('l-value');
    const lExponent = document.getElementById('l-exponent');
    const lMm = document.getElementById('l-mm');
    
    lSlider.addEventListener('input', function() {
        const exponent = parseFloat(this.value);
        L = Math.pow(10, exponent);
        lValue.textContent = formatScientific(L, 2);
        lExponent.textContent = exponent.toFixed(1);
        lMm.textContent = (L * 1000).toFixed(2);
        updateDisplay();
    });
    
    // Animate button
    document.getElementById('animate-btn').addEventListener('click', animateDiffusion);
    
    // Initialize
    initParticles();
    initProfileChart();
    initFluxChart();
    updateDisplay();
});