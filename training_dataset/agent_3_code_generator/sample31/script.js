// Global variables
let Cf = 2.0;
let k = 0.1;
let tau = 10;
let chart = null;

// Calculate outlet concentration and conversion
function calculate(cfVal, kVal, tauVal) {
    const outlet = cfVal * Math.exp(-kVal * tauVal);
    const conversion = 1 - Math.exp(-kVal * tauVal);
    const damkohler = kVal * tauVal;
    return { outlet, conversion, damkohler };
}

// Generate concentration profile data
function generateProfile() {
    const points = 100;
    const timeData = [];
    const concentrationData = [];
    const conversionData = [];
    
    for (let i = 0; i <= points; i++) {
        const t = (tau * i) / points;
        const conc = Cf * Math.exp(-k * t);
        const conv = (1 - Math.exp(-k * t)) * 100;
        
        timeData.push(t.toFixed(2));
        concentrationData.push(conc);
        conversionData.push(conv);
    }
    
    return { timeData, concentrationData, conversionData };
}

// Update all displays
function updateDisplay() {
    const result = calculate(Cf, k, tau);
    
    // Update result displays
    document.getElementById('outlet-conc').textContent = result.outlet.toFixed(4) + ' mol/L';
    document.getElementById('conversion').textContent = (result.conversion * 100).toFixed(2) + '%';
    document.getElementById('damkohler').textContent = result.damkohler.toFixed(4);
    
    // Update reactor labels
    document.getElementById('inlet-label').textContent = Cf.toFixed(2);
    document.getElementById('outlet-label').textContent = result.outlet.toFixed(2);
    
    // Update chart
    updateChart();
}

// Initialize chart
function initChart() {
    const ctx = document.getElementById('profileChart').getContext('2d');
    const profileData = generateProfile();
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: profileData.timeData,
            datasets: [
                {
                    label: 'Concentration (mol/L)',
                    data: profileData.concentrationData,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y',
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'Conversion (%)',
                    data: profileData.conversionData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    yAxisID: 'y1',
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
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toFixed(4);
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Space Time (s)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Concentration (mol/L)'
                    },
                    beginAtZero: true
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Conversion (%)'
                    },
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        drawOnChartArea: false,
                    }
                }
            }
        }
    });
}

// Update chart data
function updateChart() {
    if (chart) {
        const profileData = generateProfile();
        chart.data.labels = profileData.timeData;
        chart.data.datasets[0].data = profileData.concentrationData;
        chart.data.datasets[1].data = profileData.conversionData;
        chart.update('none');
    }
}

// Animate flow particle
function animateFlow() {
    const particle = document.getElementById('particle');
    particle.classList.remove('animating');
    
    // Force reflow
    void particle.offsetWidth;
    
    particle.classList.add('animating');
    
    // Remove class after animation
    setTimeout(() => {
        particle.classList.remove('animating');
    }, 3000);
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Feed Concentration slider
    const cfSlider = document.getElementById('cf-slider');
    const cfValue = document.getElementById('cf-value');
    
    cfSlider.addEventListener('input', function() {
        Cf = parseFloat(this.value);
        cfValue.textContent = Cf.toFixed(2);
        updateDisplay();
    });
    
    // Rate Constant slider
    const kSlider = document.getElementById('k-slider');
    const kValue = document.getElementById('k-value');
    const kInput = document.getElementById('k-input');
    
    kSlider.addEventListener('input', function() {
        k = parseFloat(this.value);
        kValue.textContent = k.toFixed(4);
        kInput.value = k;
        updateDisplay();
    });
    
    kInput.addEventListener('input', function() {
        let val = parseFloat(this.value);
        if (val < 0.00001) val = 0.00001;
        if (val > 1) val = 1;
        k = val;
        kSlider.value = k;
        kValue.textContent = k.toFixed(4);
        updateDisplay();
    });
    
    // Space Time slider
    const tauSlider = document.getElementById('tau-slider');
    const tauValue = document.getElementById('tau-value');
    const tauInput = document.getElementById('tau-input');
    
    tauSlider.addEventListener('input', function() {
        tau = parseFloat(this.value);
        tauValue.textContent = tau.toFixed(2);
        tauInput.value = tau;
        updateDisplay();
    });
    
    tauInput.addEventListener('input', function() {
        let val = parseFloat(this.value);
        if (val < 0.01) val = 0.01;
        tau = val;
        tauSlider.value = Math.min(tau, 100);
        tauValue.textContent = tau.toFixed(2);
        updateDisplay();
    });
    
    // Animate button
    document.getElementById('animate-btn').addEventListener('click', animateFlow);
    
    // Initialize
    initChart();
    updateDisplay();
});