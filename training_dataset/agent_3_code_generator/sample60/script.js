document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const sliders = {
        I0: document.getElementById('I0-slider'),
        alpha: document.getElementById('alpha-slider'),
        L: document.getElementById('L-slider')
    };
    const showCurveCheck = document.getElementById('show-curve');

    const displays = {
        I0: document.getElementById('I0-val'),
        alpha: document.getElementById('alpha-val'),
        L: document.getElementById('L-val'),
        I: document.getElementById('I-result'),
        trans: document.getElementById('trans-percent')
    };

    const canvas = document.getElementById('opticsCanvas');
    const ctx = canvas.getContext('2d');

    // --- State ---
    let params = {
        I0: parseFloat(sliders.I0.value),
        alpha: parseFloat(sliders.alpha.value),
        L: parseFloat(sliders.L.value)
    };
    let photons = [];

    // --- Chart Setup ---
    const decayChart = new Chart(document.getElementById('decayChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [{
                label: 'Intensity Profile',
                data: [],
                borderColor: '#00ff9d',
                backgroundColor: 'rgba(0, 255, 157, 0.1)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4
            }, {
                label: 'Output',
                data: [],
                backgroundColor: '#fff',
                borderColor: '#fff',
                pointRadius: 5,
                type: 'scatter'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: { display: true, text: 'Distance (m)', color: '#888' },
                    grid: { color: '#333' },
                    ticks: { color: '#888' },
                    min: 0, max: 10
                },
                y: {
                    title: { display: true, text: 'Intensity (W/m²)', color: '#888' },
                    grid: { color: '#333' },
                    ticks: { color: '#888' },
                    beginAtZero: true,
                    max: 10000
                }
            },
            plugins: { legend: { display: false } }
        }
    });

    // --- Core Logic ---
    function calculateIntensity(x) {
        return params.I0 * Math.exp(-params.alpha * x);
    }

    function update() {
        params.I0 = parseFloat(sliders.I0.value);
        params.alpha = parseFloat(sliders.alpha.value);
        params.L = parseFloat(sliders.L.value);

        displays.I0.textContent = params.I0;
        displays.alpha.textContent = params.alpha.toFixed(2);
        displays.L.textContent = params.L.toFixed(1);

        const I_out = calculateIntensity(params.L);
        const transPercent = (I_out / params.I0) * 100;

        displays.I.textContent = I_out.toLocaleString('en-US', { maximumFractionDigits: 0 });
        displays.trans.textContent = transPercent.toFixed(1);

        updateChart(I_out);
    }

    function updateChart(I_out) {
        const data = [];
        for(let x = 0; x <= 10; x += 0.2) {
            data.push({ x: x, y: calculateIntensity(x) });
        }
        decayChart.data.datasets[0].data = data;
        decayChart.data.datasets[1].data = [{ x: params.L, y: I_out }];
        decayChart.options.scales.y.max = 10500; // Fixed scale to see drop clearly
        decayChart.update('none');
    }

    // --- Animation System ---

    class Photon {
        constructor() {
            this.reset();
            // Start at random x to avoid "waves" of spawning
            this.x = Math.random() * canvas.width;
        }

        reset() {
            this.x = 0;
            // Beam thickness
            this.y = (canvas.height / 2) + (Math.random() - 0.5) * 80;
            this.speed = 5 + Math.random() * 3;
            this.opacity = 1;
        }

        update(mediumStart, pixelsPerMeter) {
            this.x += this.speed;

            // If inside medium, calculate opacity based on Beer-Lambert
            if (this.x > mediumStart) {
                const distanceInMediumPixels = this.x - mediumStart;
                const distanceInMeters = distanceInMediumPixels / pixelsPerMeter;
                
                // If we haven't exited the medium yet
                if (distanceInMeters <= params.L) {
                    // I/I0 = exp(-alpha * x)
                    // We map this ratio directly to opacity
                    this.opacity = Math.exp(-params.alpha * distanceInMeters);
                } else {
                    // We have exited the medium. 
                    // Opacity remains constant at the exit value (transmission)
                    this.opacity = Math.exp(-params.alpha * params.L);
                }
            } else {
                this.opacity = 1;
            }

            // Loop
            if (this.x > canvas.width) this.reset();
        }

        draw(ctx) {
            if (this.opacity < 0.01) return; // Optimization
            
            ctx.fillStyle = `rgba(0, 255, 157, ${this.opacity})`;
            ctx.beginPath();
            // Particle size
            ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }

    function animate() {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // --- 1. Draw The Absorbing Medium ---
        const pixelsPerMeter = canvas.width / 12; // 12 meters fit in view
        const mediumStart = 50; 
        const mediumWidth = params.L * pixelsPerMeter;

        // Visual style for the block
        const grad = ctx.createLinearGradient(mediumStart, 0, mediumStart + mediumWidth, 0);
        grad.addColorStop(0, "rgba(50, 50, 80, 0.5)");
        grad.addColorStop(1, "rgba(50, 50, 80, 0.8)"); // Gets darker/denser visually to imply depth?
        
        ctx.fillStyle = grad;
        ctx.strokeStyle = "#446";
        ctx.lineWidth = 1;
        ctx.fillRect(mediumStart, 30, mediumWidth, canvas.height - 60);
        ctx.strokeRect(mediumStart, 30, mediumWidth, canvas.height - 60);

        // Label for L
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "12px sans-serif";
        if (params.L > 0.5) {
            ctx.fillText(`L = ${params.L.toFixed(1)}m`, mediumStart + mediumWidth/2, canvas.height - 15);
        }

        // --- 2. Draw Theory Curve Overlay (Optional) ---
        if (showCurveCheck.checked) {
            ctx.beginPath();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.setLineDash([5, 5]);
            ctx.lineWidth = 2;
            
            const beamCenter = canvas.height / 2;
            const beamRadius = 40; // Visual radius of our particle beam

            // Draw envelope top
            ctx.moveTo(mediumStart, beamCenter - beamRadius);
            for(let x = 0; x <= mediumWidth; x+=5) {
                const distM = x / pixelsPerMeter;
                const ratio = Math.exp(-params.alpha * distM);
                // We visualize intensity curve as a "narrowing" or just plotting the ratio?
                // Let's plot the ratio 1.0 to 0.0 as a graph overlay on top of the beam
                // Actually, let's just draw the decay curve overlayed on the beam area
                const yOffset = beamRadius * ratio; 
                ctx.lineTo(mediumStart + x, beamCenter - yOffset);
            }
            ctx.stroke();
            
            // Draw envelope bottom
            ctx.beginPath();
            ctx.moveTo(mediumStart, beamCenter + beamRadius);
            for(let x = 0; x <= mediumWidth; x+=5) {
                const distM = x / pixelsPerMeter;
                const ratio = Math.exp(-params.alpha * distM);
                const yOffset = beamRadius * ratio; 
                ctx.lineTo(mediumStart + x, beamCenter + yOffset);
            }
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // --- 3. Draw Photons ---
        // Adjust particle count based on I0 slider for density effect
        const targetCount = Math.floor(params.I0 / 10); 
        
        // Add or remove particles to match target
        while(photons.length < targetCount) photons.push(new Photon());
        while(photons.length > targetCount) photons.pop();

        photons.forEach(p => {
            p.update(mediumStart, pixelsPerMeter);
            p.draw(ctx);
        });

        requestAnimationFrame(animate);
    }

    // --- Events ---
    Object.values(sliders).forEach(s => s.addEventListener('input', update));
    window.addEventListener('resize', resizeCanvas);
    
    // Init
    resizeCanvas();
    update();
    animate();
});