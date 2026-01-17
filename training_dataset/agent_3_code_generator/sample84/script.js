document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    const ui = {
        n: document.getElementById('in-n'),
        s: document.getElementById('in-s'),
        valN: document.getElementById('val-n'),
        valS: document.getElementById('val-s'),
        btnStart: document.getElementById('btn-start'),
        btnReset: document.getElementById('btn-reset'),
        statTheoRMS: document.getElementById('stat-theo-rms'),
        statCurrDist: document.getElementById('stat-curr-dist'),
        statTheoVar: document.getElementById('stat-theo-var'),
        canvas: document.getElementById('walkCanvas')
    };

    const ctx = ui.canvas.getContext('2d');
    
    // State
    let state = {
        n: 1000,
        s: 1.0,
        path: [], // Array of {x, y}
        currentStep: 0,
        isRunning: false,
        animationId: null
    };

    // --- Initialization ---
    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        ui.n.addEventListener('input', updateParams);
        ui.s.addEventListener('input', updateParams);
        
        ui.btnStart.addEventListener('click', toggleSimulation);
        ui.btnReset.addEventListener('click', resetSimulation);

        updateParams();
        drawScene(); // Initial empty draw
    }

    function updateParams() {
        state.n = parseInt(ui.n.value);
        state.s = parseFloat(ui.s.value);
        
        ui.valN.textContent = state.n;
        ui.valS.textContent = state.s.toFixed(1);

        // Update Theoretical Stats
        // Formula: RMS = s * sqrt(2 * n)
        const rms = state.s * Math.sqrt(2 * state.n);
        // Formula: Var = n * s^2 (Per axis variance assumption based on prompt consistency)
        const variance = state.n * Math.pow(state.s, 2);

        ui.statTheoRMS.textContent = rms.toFixed(2);
        ui.statTheoVar.textContent = variance.toFixed(2);

        // If we change params while not running, reset visualization to be safe
        if (!state.isRunning && state.currentStep === 0) {
            drawScene();
        }
    }

    function resizeCanvas() {
        const rect = ui.canvas.parentElement.getBoundingClientRect();
        ui.canvas.width = rect.width;
        ui.canvas.height = rect.height;
        if (!state.isRunning) drawScene();
    }

    // --- Simulation Logic ---

    function resetSimulation() {
        stopAnimation();
        state.path = [];
        state.currentStep = 0;
        state.isRunning = false;
        ui.btnStart.textContent = "Start Simulation";
        ui.btnStart.classList.remove('secondary');
        ui.btnStart.classList.add('primary');
        ui.statCurrDist.textContent = "0.00";
        drawScene();
    }

    function toggleSimulation() {
        if (state.isRunning) {
            // Pause
            state.isRunning = false;
            stopAnimation();
            ui.btnStart.textContent = "Resume";
        } else {
            // Start
            if (state.currentStep >= state.n) {
                // If already finished, clear first
                resetSimulation();
                // Need to force start after reset
                state.isRunning = true;
                ui.btnStart.textContent = "Pause";
                ui.btnStart.classList.remove('primary');
                ui.btnStart.classList.add('secondary');
                loop();
            } else {
                state.isRunning = true;
                ui.btnStart.textContent = "Pause";
                ui.btnStart.classList.remove('primary');
                ui.btnStart.classList.add('secondary');
                loop();
            }
        }
    }

    function stopAnimation() {
        if (state.animationId) cancelAnimationFrame(state.animationId);
    }

    // --- Core Math: The Walk ---
    function takeSteps(count) {
        if (state.path.length === 0) {
            state.path.push({x: 0, y: 0});
        }

        let lastPos = state.path[state.path.length - 1];

        for (let i = 0; i < count; i++) {
            if (state.currentStep >= state.n) break;

            // Mathematical Model for Prompt:
            // "Variance = n*s^2" per axis implies step var = s^2.
            // "RMS = sqrt(2n)*s" implies total MSD = 2ns^2.
            // To achieve this, we take a step of +/- s in X AND +/- s in Y simultaneously.
            // dx = s * coinflip, dy = s * coinflip.
            
            const dx = (Math.random() < 0.5 ? -1 : 1) * state.s;
            const dy = (Math.random() < 0.5 ? -1 : 1) * state.s;

            const newPos = {
                x: lastPos.x + dx,
                y: lastPos.y + dy
            };

            state.path.push(newPos);
            lastPos = newPos;
            state.currentStep++;
        }
    }

    // --- Rendering ---
    function loop() {
        if (!state.isRunning) return;

        // Speed: Calculate how many steps to take per frame to finish in ~3 seconds max
        // or a minimum speed for very low N.
        const speed = Math.max(1, Math.ceil(state.n / 180)); 
        
        takeSteps(speed);
        drawScene();

        // Check completion
        if (state.currentStep >= state.n) {
            state.isRunning = false;
            ui.btnStart.textContent = "Restart";
            ui.btnStart.classList.add('primary');
            ui.btnStart.classList.remove('secondary');
        } else {
            state.animationId = requestAnimationFrame(loop);
        }
    }

    function drawScene() {
        const w = ui.canvas.width;
        const h = ui.canvas.height;
        const cx = w / 2;
        const cy = h / 2;

        ctx.clearRect(0, 0, w, h);

        // 1. Calculate Scale
        // We want the Theoretical RMS circle to fit comfortably.
        // RMS radius = s * sqrt(2n)
        // Let's make the view radius roughly 2.5x the RMS radius to accommodate outliers.
        const rmsRadius = state.s * Math.sqrt(2 * state.n);
        const maxViewRadius = rmsRadius * 2.5; 
        
        // Scale: pixels per unit distance
        // min dimension of canvas / 2 / maxViewRadius
        const scale = Math.min(w, h) / 2 / (maxViewRadius || 1); 

        // 2. Draw Grid/Axes
        ctx.beginPath();
        ctx.strokeStyle = "#e2e8f0";
        ctx.lineWidth = 1;
        // X Axis
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        // Y Axis
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.stroke();

        // 3. Draw Theoretical RMS Circle
        const pxRadius = rmsRadius * scale;
        ctx.beginPath();
        ctx.strokeStyle = "rgba(59, 130, 246, 0.4)"; // Blue low opacity
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.arc(cx, cy, pxRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label the circle
        ctx.fillStyle = "#3b82f6";
        ctx.font = "12px sans-serif";
        ctx.fillText("RMS Distance", cx + pxRadius + 5, cy);

        // 4. Draw Path
        if (state.path.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = "#64748b"; // Gray path
            ctx.lineWidth = 1;
            
            // Move to start
            ctx.moveTo(cx + state.path[0].x * scale, cy - state.path[0].y * scale);
            
            // Draw lines
            // Optimization: If N is huge, skip points? 
            // For N=10,000 standard drawing is usually fine on modern canvas.
            for (let i = 1; i < state.path.length; i++) {
                ctx.lineTo(cx + state.path[i].x * scale, cy - state.path[i].y * scale);
            }
            ctx.stroke();

            // 5. Draw Start Point
            ctx.beginPath();
            ctx.fillStyle = "black";
            ctx.arc(cx, cy, 3, 0, Math.PI * 2);
            ctx.fill();

            // 6. Draw Current Head
            const last = state.path[state.path.length - 1];
            const headX = cx + last.x * scale;
            const headY = cy - last.y * scale;

            ctx.beginPath();
            ctx.fillStyle = "#ef4444"; // Red
            ctx.shadowBlur = 5;
            ctx.shadowColor = "rgba(239, 68, 68, 0.5)";
            ctx.arc(headX, headY, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // 7. Update Distance Text
            const dist = Math.sqrt(last.x**2 + last.y**2);
            ui.statCurrDist.textContent = dist.toFixed(2);
        }
    }

    init();
});