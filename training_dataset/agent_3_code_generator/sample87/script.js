document.addEventListener('DOMContentLoaded', () => {
    // --- Canvas Setup ---
    const canvas = document.getElementById('llnCanvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    // --- UI Elements ---
    const inputSigma2 = document.getElementById('input-sigma2');
    const valSigma2 = document.getElementById('val-sigma2');
    const btnRestart = document.getElementById('btn-restart');
    const btnsSpeed = document.querySelectorAll('.btn-speed');
    
    // Stats Displays
    const dispN = document.getElementById('disp-n');
    const dispMean = document.getElementById('disp-mean');
    const dispTheoVar = document.getElementById('disp-theo-var');

    // --- Simulation State ---
    const MAX_N = 1000;
    let sigma2 = parseFloat(inputSigma2.value);
    let n = 0;
    let runningMean = 0;
    let sum = 0;
    let speedMultiplier = 1;
    let animationId;
    let history = []; // Stores {n, mean} for drawing

    // Resize handling
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
        canvas.width = width;
        canvas.height = height;
        if(n > 0) draw(); // Redraw if paused/static
    }
    window.addEventListener('resize', resize);
    resize();

    // --- Math Helpers ---

    // Box-Muller Transform for Normal Distribution
    function randomNormal(mean, variance) {
        let u = 0, v = 0;
        while(u === 0) u = Math.random(); 
        while(v === 0) v = Math.random();
        const stdDev = Math.sqrt(variance);
        const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return mean + (z * stdDev);
    }

    // --- Core Logic ---

    function resetSimulation() {
        cancelAnimationFrame(animationId);
        n = 0;
        sum = 0;
        runningMean = 0;
        history = [];
        sigma2 = parseFloat(inputSigma2.value);
        valSigma2.textContent = sigma2.toFixed(1);
        
        // Clear displays
        dispN.textContent = '0';
        dispMean.textContent = '--';
        dispTheoVar.textContent = '--';
        
        animate();
    }

    function update() {
        // Run loop based on speed
        // Speed 1 = 1 step/frame, Speed 20 = 20 steps/frame
        for(let i=0; i<speedMultiplier; i++) {
            if (n >= MAX_N) break;

            n++;
            
            // 1. Generate Sample
            const sample = randomNormal(0, sigma2); // Mean = 0
            
            // 2. Update Stats
            sum += sample;
            runningMean = sum / n;
            
            // 3. Store History for Graphing
            history.push(runningMean);
        }
    }

    function draw() {
        // 1. Clear Background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);

        // 2. Coordinate System
        // X-axis: 0 to MAX_N
        // Y-axis: -5 to 5 (Fixed range to show convergence)
        const maxY = 5;
        const scaleX = width / MAX_N;
        const centerY = height / 2;
        const scaleY = (height / 2) / maxY; // pixels per unit

        // Helper to map Y value to pixel Y
        const mapY = (val) => centerY - (val * scaleY);

        // 3. Draw Center Line (True Mean = 0)
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.strokeStyle = '#374151'; // Dark grey
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Draw Theoretical Bounds (Funnel)
        // Bound = +/- 2 * Standard Error
        // SE = sigma / sqrt(n)
        // Bound = +/- 2 * sqrt(sigma2 / n)
        
        ctx.beginPath();
        ctx.moveTo(0, mapY(3)); // Start wide roughly
        
        // Positive Bound
        for(let i=1; i<=MAX_N; i+=5) {
            const se = Math.sqrt(sigma2 / i);
            const bound = 2 * se; // 2 Sigma (95% confidence)
            ctx.lineTo(i * scaleX, mapY(bound));
        }
        
        // Negative Bound (Backwards to close shape)
        for(let i=MAX_N; i>=1; i-=5) {
            const se = Math.sqrt(sigma2 / i);
            const bound = -2 * se;
            ctx.lineTo(i * scaleX, mapY(bound));
        }
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Very faint blue
        ctx.fill();

        // 5. Draw Running Mean (The Path)
        if (history.length > 0) {
            ctx.beginPath();
            ctx.moveTo(0, centerY); // Start at 0,0
            
            // Optimization: Don't draw every single pixel if N is huge
            const step = Math.max(1, Math.floor(history.length / width)); 
            
            for(let i=0; i<history.length; i++) {
                const x = (i+1) * scaleX;
                const y = mapY(history[i]);
                ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = '#fbbf24'; // Amber
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw Head Dot
            const lastY = mapY(history[history.length-1]);
            const lastX = history.length * scaleX;
            ctx.beginPath();
            ctx.arc(lastX, lastY, 4, 0, Math.PI*2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        }
    }

    function animate() {
        if (n < MAX_N) {
            update();
            draw();
            
            // Update UI Text
            dispN.textContent = n;
            dispMean.textContent = runningMean.toFixed(4);
            // Theoretical Variance of Mean = sigma^2 / N
            const varMean = sigma2 / n;
            dispTheoVar.textContent = varMean.toFixed(4);

            animationId = requestAnimationFrame(animate);
        }
    }

    // --- Event Listeners ---
    
    inputSigma2.addEventListener('input', () => {
        resetSimulation();
    });

    btnRestart.addEventListener('click', resetSimulation);

    btnsSpeed.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            btnsSpeed.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Logic
            if(btn.dataset.speed === 'Max') {
                speedMultiplier = 100;
            } else {
                speedMultiplier = parseInt(btn.dataset.speed);
            }
        });
    });

    // Start
    resetSimulation();
});