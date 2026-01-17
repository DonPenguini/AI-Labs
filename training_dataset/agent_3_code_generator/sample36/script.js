// Global variables
let L1 = 1.0;
let L2 = 1.0;
let m1 = 1.0;
let m2 = 1.0;
const g = 9.81;

let frequencyChart = null;
let timeChart = null;
let animationId = null;
let currentMode = 'mode1';
let time = 0;

// Calculate natural frequencies using linearized equations
function calculateFrequencies(l1, l2, m1Val, m2Val) {
    // For small angles, the equations of motion become linear
    // The characteristic equation gives two natural frequencies
    
    // Matrix coefficients for linearized system
    const M = m1Val + m2Val;
    const mu = m2Val / M;
    
    // Simplified calculation for natural frequencies
    const omega1_sq = (g / l1) * (1 - mu / 2);
    const omega2_sq = (g / l1) * (1 + mu * (1 + l1 / l2));
    
    // More accurate eigenvalue calculation
    const A = g * (M / m1Val) / l1;
    const B = g / l2;
    const C = g * m2Val / (m1Val * l1);
    
    const sum = A + B;
    const prod = A * B - C * (g / l2);
    const discriminant = sum * sum - 4 * prod;
    
    let omega1, omega2;
    if (discriminant >= 0) {
        omega1 = Math.sqrt((sum - Math.sqrt(discriminant)) / 2);
        omega2 = Math.sqrt((sum + Math.sqrt(discriminant)) / 2);
    } else {
        omega1 = Math.sqrt(omega1_sq);
        omega2 = Math.sqrt(omega2_sq);
    }
    
    const freq1 = omega1 / (2 * Math.PI);
    const freq2 = omega2 / (2 * Math.PI);
    const ratio = omega2 / omega1;
    
    return { omega1, omega2, freq1, freq2, ratio };
}

// Update all displays
function updateDisplay() {
    const result = calculateFrequencies(L1, L2, m1, m2);
    
    // Update result displays
    document.getElementById('omega1').textContent = result.omega1.toFixed(3) + ' rad/s';
    document.getElementById('omega2').textContent = result.omega2.toFixed(3) + ' rad/s';
    document.getElementById('freq1').textContent = result.freq1.toFixed(3);
    document.getElementById('freq2').textContent = result.freq2.toFixed(3);
    document.getElementById('ratio').textContent = result.ratio.toFixed(3);
    
    // Update charts
    updateFrequencyChart();
    updateTimeChart();
}

// Generate frequency vs parameter data
function generateFrequencyData() {
    const points = 50;
    const ratios = [];
    const omega1Data = [];
    const omega2Data = [];
    
    // Vary mass ratio while keeping other parameters constant
    for (let i = 0; i <= points; i++) {
        const m2Var = 0.1 + (4.9 * i) / points;
        const result = calculateFrequencies(L1, L2, m1, m2Var);
        ratios.push((m2Var / m1).toFixed(2));
        omega1Data.push(result.omega1);
        omega2Data.push(result.omega2);
    }
    
    return { ratios, omega1Data, omega2Data };
}

// Generate time response data
function generateTimeData() {
    const result = calculateFrequencies(L1, L2, m1, m2);
    const duration = 10; // seconds
    const points = 200;
    const dt = duration / points;
    
    const times = [];
    const theta1Data = [];
    const theta2Data = [];
    
    // Initial conditions (small angles in radians)
    const theta1_0 = 0.2; // 0.2 radians ≈ 11.5 degrees
    const theta2_0 = 0.1;
    
    for (let i = 0; i <= points; i++) {
        const t = i * dt;
        times.push(t.toFixed(2));
        
        let theta1, theta2;
        
        if (currentMode === 'mode1') {
            // Mode 1: in-phase oscillation
            theta1 = theta1_0 * Math.cos(result.omega1 * t);
            theta2 = theta1_0 * Math.cos(result.omega1 * t);
        } else if (currentMode === 'mode2') {
            // Mode 2: out-of-phase oscillation
            theta1 = theta1_0 * Math.cos(result.omega2 * t);
            theta2 = -theta1_0 * Math.cos(result.omega2 * t);
        } else {
            // Mixed mode
            theta1 = theta1_0 * Math.cos(result.omega1 * t) + 0.1 * Math.cos(result.omega2 * t);
            theta2 = theta2_0 * Math.cos(result.omega1 * t) - 0.1 * Math.cos(result.omega2 * t);
        }
        
        theta1Data.push(theta1);
        theta2Data.push(theta2);
    }
    
    return { times, theta1Data, theta2Data };
}

// Initialize frequency chart
function initFrequencyChart() {
    const ctx = document.getElementById('frequencyChart').getContext('2d');
    const data = generateFrequencyData();
    
    frequencyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.ratios,
            datasets: [
                {
                    label: 'ω₁ (Mode 1)',
                    data: data.omega1Data,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'ω₂ (Mode 2)',
                    data: data.omega2Data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(3) + ' rad/s';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Mass Ratio (m₂/m₁)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Angular Frequency (rad/s)'
                    },
                    beginAtZero: false
                }
            }
        }
    });
}

// Initialize time chart
function initTimeChart() {
    const ctx = document.getElementById('timeChart').getContext('2d');
    const data = generateTimeData();
    
    timeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.times,
            datasets: [
                {
                    label: 'θ₁ (Upper Pendulum)',
                    data: data.theta1Data,
                    borderColor: '#d97706',
                    backgroundColor: 'rgba(217, 119, 6, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'θ₂ (Lower Pendulum)',
                    data: data.theta2Data,
                    borderColor: '#7c3aed',
                    backgroundColor: 'rgba(124, 58, 237, 0.1)',
                    borderWidth: 2,
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
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(3) + ' rad';
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Time (s)'
                    },
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Angular Displacement (rad)'
                    }
                }
            }
        }
    });
}

// Update charts
function updateFrequencyChart() {
    if (frequencyChart) {
        const data = generateFrequencyData();
        frequencyChart.data.labels = data.ratios;
        frequencyChart.data.datasets[0].data = data.omega1Data;
        frequencyChart.data.datasets[1].data = data.omega2Data;
        frequencyChart.update('none');
    }
}

function updateTimeChart() {
    if (timeChart) {
        const data = generateTimeData();
        timeChart.data.labels = data.times;
        timeChart.data.datasets[0].data = data.theta1Data;
        timeChart.data.datasets[1].data = data.theta2Data;
        timeChart.update('none');
    }
}

// Pendulum animation
function drawPendulum() {
    const canvas = document.getElementById('pendulumCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Origin point
    const originX = width / 2;
    const originY = 100;
    
    // Scale for visualization
    const scale = 80;
    
    // Calculate angles based on current mode and time
    const result = calculateFrequencies(L1, L2, m1, m2);
    let theta1, theta2;
    
    const amplitude = 0.3; // radians
    
    if (currentMode === 'mode1') {
        theta1 = amplitude * Math.cos(result.omega1 * time);
        theta2 = amplitude * Math.cos(result.omega1 * time);
    } else if (currentMode === 'mode2') {
        theta1 = amplitude * Math.cos(result.omega2 * time);
        theta2 = -amplitude * Math.cos(result.omega2 * time);
    } else {
        theta1 = amplitude * Math.cos(result.omega1 * time) + 0.15 * Math.cos(result.omega2 * time);
        theta2 = 0.2 * Math.cos(result.omega1 * time) - 0.15 * Math.cos(result.omega2 * time);
    }
    
    // Position of mass 1
    const x1 = originX + L1 * scale * Math.sin(theta1);
    const y1 = originY + L1 * scale * Math.cos(theta1);
    
    // Position of mass 2
    const x2 = x1 + L2 * scale * Math.sin(theta2);
    const y2 = y1 + L2 * scale * Math.cos(theta2);
    
    // Draw ceiling
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX - 30, originY);
    ctx.lineTo(originX + 30, originY);
    ctx.stroke();
    
    // Draw pivot point
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.arc(originX, originY, 6, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw rod 1
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    
    // Draw mass 1
    const radius1 = 10 + m1 * 5;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(x1, y1, radius1, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw rod 2
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw mass 2
    const radius2 = 10 + m2 * 5;
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.arc(x2, y2, radius2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw trail
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 50; i++) {
        const t = time - i * 0.05;
        let th1, th2;
        
        if (currentMode === 'mode1') {
            th1 = amplitude * Math.cos(result.omega1 * t);
            th2 = amplitude * Math.cos(result.omega1 * t);
        } else if (currentMode === 'mode2') {
            th1 = amplitude * Math.cos(result.omega2 * t);
            th2 = -amplitude * Math.cos(result.omega2 * t);
        } else {
            th1 = amplitude * Math.cos(result.omega1 * t) + 0.15 * Math.cos(result.omega2 * t);
            th2 = 0.2 * Math.cos(result.omega1 * t) - 0.15 * Math.cos(result.omega2 * t);
        }
        
        const tx1 = originX + L1 * scale * Math.sin(th1);
        const ty1 = originY + L1 * scale * Math.cos(th1);
        const tx2 = tx1 + L2 * scale * Math.sin(th2);
        const ty2 = ty1 + L2 * scale * Math.cos(th2);
        
        if (i === 0) {
            ctx.moveTo(tx2, ty2);
        } else {
            ctx.lineTo(tx2, ty2);
        }
    }
    ctx.stroke();
}

// Animation loop
function animate() {
    drawPendulum();
    time += 0.03;
    animationId = requestAnimationFrame(animate);
}

// Start animation
function startAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    time = 0;
    animate();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // L1 slider
    const l1Slider = document.getElementById('l1-slider');
    const l1Value = document.getElementById('l1-value');
    
    l1Slider.addEventListener('input', function() {
        L1 = parseFloat(this.value);
        l1Value.textContent = L1.toFixed(2);
        updateDisplay();
    });
    
    // L2 slider
    const l2Slider = document.getElementById('l2-slider');
    const l2Value = document.getElementById('l2-value');
    
    l2Slider.addEventListener('input', function() {
        L2 = parseFloat(this.value);
        l2Value.textContent = L2.toFixed(2);
        updateDisplay();
    });
    
    // m1 slider
    const m1Slider = document.getElementById('m1-slider');
    const m1Value = document.getElementById('m1-value');
    
    m1Slider.addEventListener('input', function() {
        m1 = parseFloat(this.value);
        m1Value.textContent = m1.toFixed(2);
        updateDisplay();
    });
    
    // m2 slider
    const m2Slider = document.getElementById('m2-slider');
    const m2Value = document.getElementById('m2-value');
    
    m2Slider.addEventListener('input', function() {
        m2 = parseFloat(this.value);
        m2Value.textContent = m2.toFixed(2);
        updateDisplay();
    });
    
    // Mode buttons
    const modeBtns = document.querySelectorAll('.mode-btn');
    modeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            modeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.mode;
            time = 0;
            updateTimeChart();
        });
    });
    
    // Animate button
    document.getElementById('animate-btn').addEventListener('click', startAnimation);
    
    // Initialize
    initFrequencyChart();
    initTimeChart();
    updateDisplay();
    startAnimation();
});