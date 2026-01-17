document.addEventListener('DOMContentLoaded', () => {
    // Inputs
    const sliders = {
        V: document.getElementById('V-slider'),
        A: document.getElementById('A-slider'),
        rho: document.getElementById('rho-slider'),
        Cp: document.getElementById('Cp-slider')
    };

    // Value Displays
    const displays = {
        V: document.getElementById('V-val'),
        A: document.getElementById('A-val'),
        rho: document.getElementById('rho-val'),
        Cp: document.getElementById('Cp-val'),
        radius: document.getElementById('radius-val'),
        P: document.getElementById('P-result'),
        windMeter: document.getElementById('wind-meter')
    };

    // Visualization Canvas
    const canvas = document.getElementById('turbineCanvas');
    const ctx = canvas.getContext('2d');

    // State Variables
    let params = {
        V: parseFloat(sliders.V.value),
        A: parseFloat(sliders.A.value),
        rho: parseFloat(sliders.rho.value),
        Cp: parseFloat(sliders.Cp.value)
    };

    let turbineAngle = 0;
    let windParticles = [];

    // --- Chart Setup (Chart.js) ---
    const chartCtx = document.getElementById('powerCurveChart').getContext('2d');
    const powerChart = new Chart(chartCtx, {
        type: 'line',
        data: {
            labels: [], // Wind speeds 0-30
            datasets: [{
                label: 'Power Curve (kW)',
                data: [],
                borderColor: '#2980b9',
                backgroundColor: 'rgba(41, 128, 185, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }, {
                label: 'Current Operating Point',
                data: [],
                backgroundColor: '#e74c3c',
                borderColor: '#e74c3c',
                pointRadius: 6,
                pointHoverRadius: 8,
                type: 'scatter'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Wind Speed (m/s)' },
                    min: 0,
                    max: 30
                },
                y: {
                    title: { display: true, text: 'Power (kW)' },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.raw.y ? `Power: ${context.raw.y.toFixed(2)} kW` : '';
                        }
                    }
                }
            }
        }
    });

    // --- Core Logic ---

    function calculatePower(V, A, rho, Cp) {
        // P = 0.5 * rho * A * Cp * V^3
        // Result is in Watts. Convert to kW for display.
        const watts = 0.5 * rho * A * Cp * Math.pow(V, 3);
        return watts / 1000; // kW
    }

    function updateSimulation() {
        // Read Inputs
        params.V = parseFloat(sliders.V.value);
        params.A = parseFloat(sliders.A.value);
        params.rho = parseFloat(sliders.rho.value);
        params.Cp = parseFloat(sliders.Cp.value);

        // Calculate Radius (Area = pi * r^2  => r = sqrt(A/pi))
        const radius = Math.sqrt(params.A / Math.PI);

        // Update Text
        displays.V.textContent = params.V.toFixed(1);
        displays.A.textContent = params.A.toFixed(0);
        displays.rho.textContent = params.rho.toFixed(3);
        displays.Cp.textContent = params.Cp.toFixed(2);
        displays.radius.textContent = radius.toFixed(1);
        displays.windMeter.textContent = `Wind: ${params.V.toFixed(1)} m/s`;

        // Calculate Current Power
        const currentPowerKW = calculatePower(params.V, params.A, params.rho, params.Cp);
        displays.P.textContent = currentPowerKW.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        // Update Chart Data
        updateChart(currentPowerKW);
    }

    function updateChart(currentP) {
        // Generate curve for V from 0 to 30 based on CURRENT A, rho, Cp
        const curveData = [];
        for (let v = 0; v <= 30; v += 1) {
            curveData.push({
                x: v,
                y: calculatePower(v, params.A, params.rho, params.Cp)
            });
        }

        powerChart.data.datasets[0].data = curveData;
        powerChart.data.datasets[1].data = [{ x: params.V, y: currentP }];
        
        // Dynamically adjust Y scale max to prevent flat lines if power is huge
        // Or keep it steady if changes are small. 
        // For simplicity, we let Chart.js auto-scale, but ensure 0 is baseline.
        powerChart.update('none'); // 'none' mode prevents full re-animation on every slider drag
    }

    // --- Animation System ---

    class WindParticle {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.reset();
        }

        reset() {
            this.x = Math.random() * this.width;
            this.y = Math.random() * (this.height * 0.7); // Only in sky
            this.speed = Math.random() * 2 + 1; // Base variance
            this.length = Math.random() * 20 + 10;
        }

        update(windSpeed) {
            // Speed scaling factor
            this.x += this.speed + (windSpeed * 0.5); 
            
            if (this.x > this.width) {
                this.x = -this.length;
                this.y = Math.random() * (this.height * 0.7);
            }
        }

        draw(ctx) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            ctx.lineWidth = 2;
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.length, this.y);
            ctx.stroke();
        }
    }

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        
        // Reset particles on resize
        windParticles = [];
        for(let i=0; i<30; i++) {
            windParticles.push(new WindParticle(canvas.width, canvas.height));
        }
    }

    function drawTurbine() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width * 0.7; // Position turbine on the right
        const groundHeight = canvas.height * 0.2;
        const towerBaseY = canvas.height - groundHeight;
        const towerTopY = canvas.height * 0.4;
        
        // 1. Draw Background Elements (Hills, etc already in CSS gradient, maybe add detail?)
        
        // 2. Draw Wind Particles
        // Visual density increases with rho slightly (optional, but nice detail)
        windParticles.forEach(p => {
            p.update(params.V);
            p.draw(ctx);
        });

        // 3. Draw Tower
        ctx.fillStyle = "#ecf0f1";
        ctx.beginPath();
        ctx.moveTo(centerX - 5, towerBaseY); // Base Left
        ctx.lineTo(centerX + 5, towerBaseY); // Base Right
        ctx.lineTo(centerX + 2, towerTopY);  // Top Right
        ctx.lineTo(centerX - 2, towerTopY);  // Top Left
        ctx.fill();

        // 4. Calculate Turbine Visual Scale
        // Map Area (1 - 10000) to a reasonable pixel radius (20px - 120px)
        // Using Log scale for visual sanity
        const minPx = 30;
        const maxPx = 130;
        const minA = 1;
        const maxA = 10000;
        // Log mapping: ratio = log(A) / log(maxA) roughly
        const logA = Math.log(params.A);
        const logMin = Math.log(minA);
        const logMax = Math.log(maxA);
        const scale = (logA - logMin) / (logMax - logMin);
        const bladeLength = minPx + scale * (maxPx - minPx);

        // 5. Draw Blades
        ctx.save();
        ctx.translate(centerX, towerTopY);
        
        // Rotation speed depends on Wind Speed V
        // Note: Realistically, RPM saturates, but for viz, V proportionality is good
        // Also if V=0, no rotation.
        const rotationSpeed = params.V * 0.02; 
        turbineAngle += rotationSpeed;
        
        ctx.rotate(turbineAngle);

        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#bdc3c7";
        ctx.lineWidth = 1;

        // Draw 3 blades
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            // Simple blade shape
            ctx.quadraticCurveTo(10, -bladeLength/2, 0, -bladeLength);
            ctx.quadraticCurveTo(-10, -bladeLength/2, 0, 0);
            ctx.fill();
            ctx.stroke();
            ctx.rotate((2 * Math.PI) / 3); // Rotate 120 degrees
        }
        
        // Hub
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, 2 * Math.PI);
        ctx.fillStyle = "#bdc3c7";
        ctx.fill();

        ctx.restore();

        requestAnimationFrame(drawTurbine);
    }

    // --- Events ---
    Object.values(sliders).forEach(s => s.addEventListener('input', updateSimulation));
    window.addEventListener('resize', resizeCanvas);

    // --- Init ---
    resizeCanvas();
    updateSimulation();
    drawTurbine();
});