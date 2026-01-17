document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    const ui = {
        N: document.getElementById('in-N'),
        valN: document.getElementById('val-N'),
        btnStart: document.getElementById('btn-start'),
        btnReset: document.getElementById('btn-reset'),
        outPi: document.getElementById('out-pi'),
        outIn: document.getElementById('out-inside'),
        outTot: document.getElementById('out-total'),
        outErr: document.getElementById('out-error'),
        boardCanvas: document.getElementById('boardCanvas'),
        graphCanvas: document.getElementById('graphCanvas')
    };

    const ctxBoard = ui.boardCanvas.getContext('2d');
    const ctxGraph = ui.graphCanvas.getContext('2d');

    // Simulation State
    let state = {
        targetN: 10000,
        currentN: 0,
        insideCount: 0,
        isRunning: false,
        history: [], // For graph: [{n, pi}]
        animId: null
    };

    // --- Initialization ---
    function init() {
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        ui.N.addEventListener('input', (e) => {
            state.targetN = parseInt(e.target.value);
            ui.valN.textContent = state.targetN;
        });

        ui.btnStart.addEventListener('click', toggleSim);
        ui.btnReset.addEventListener('click', resetSim);

        drawBoardBackground();
        drawGraph();
    }

    function resizeCanvases() {
        // Handle High DPI scaling
        [ui.boardCanvas, ui.graphCanvas].forEach(cvs => {
            const rect = cvs.parentElement.getBoundingClientRect();
            cvs.width = rect.width;
            cvs.height = rect.height;
        });
        
        // Redraw static elements if paused
        if (!state.isRunning) {
            drawBoardBackground(); // This clears dots if we resize, simpler than repainting
            drawGraph();
            if(state.currentN > 0) resetSim(); // Force reset on resize to keep visuals clean
        }
    }

    // --- Logic ---

    function toggleSim() {
        if (state.isRunning) {
            state.isRunning = false;
            cancelAnimationFrame(state.animId);
            ui.btnStart.textContent = "Resume";
        } else {
            if (state.currentN >= state.targetN) resetSim();
            state.isRunning = true;
            ui.btnStart.textContent = "Pause";
            ui.btnStart.classList.replace('primary', 'secondary');
            loop();
        }
    }

    function resetSim() {
        state.isRunning = false;
        state.currentN = 0;
        state.insideCount = 0;
        state.history = [];
        cancelAnimationFrame(state.animId);
        
        ui.btnStart.textContent = "Run Simulation";
        ui.btnStart.classList.replace('secondary', 'primary');
        
        updateStats(0, 0);
        drawBoardBackground(); // Clears board
        drawGraph();
    }

    function loop() {
        if (!state.isRunning) return;

        const width = ui.boardCanvas.width;
        const height = ui.boardCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 10; // Margin

        // Determine batch size (speed)
        // We want the whole sim to take about 2-3 seconds regardless of N
        // But capped at min/max speeds
        const remaining = state.targetN - state.currentN;
        let batchSize = Math.ceil(state.targetN / 120); 
        batchSize = Math.min(batchSize, remaining);

        // Process Batch
        for (let i = 0; i < batchSize; i++) {
            // Generate Random Point in Unit Square [-1, 1]
            const x = (Math.random() * 2) - 1; 
            const y = (Math.random() * 2) - 1;
            
            // Check distance from origin
            const distSq = x*x + y*y;
            const isInside = distSq <= 1;

            if (isInside) state.insideCount++;
            state.currentN++;

            // Draw Point immediately
            // Map [-1, 1] to Canvas Coordinates
            const drawX = centerX + (x * radius);
            const drawY = centerY - (y * radius); // Flip Y for canvas

            ctxBoard.fillStyle = isInside ? '#10b981' : '#ef4444';
            ctxBoard.fillRect(drawX, drawY, 2, 2); // 2x2 pixel dot
        }

        // Calculate Pi
        const piHat = 4 * (state.insideCount / state.currentN);
        
        // Record history for graph (throttle to save memory/drawing)
        if (state.currentN % Math.ceil(state.targetN / 200) === 0 || state.currentN === state.targetN) {
            state.history.push({ n: state.currentN, val: piHat });
        }

        updateStats(piHat, state.currentN);
        drawGraph();

        // Check End Condition
        if (state.currentN >= state.targetN) {
            state.isRunning = false;
            ui.btnStart.textContent = "Finished";
            ui.btnStart.classList.replace('secondary', 'primary');
        } else {
            state.animId = requestAnimationFrame(loop);
        }
    }

    function updateStats(pi, n) {
        ui.outIn.textContent = state.insideCount.toLocaleString();
        ui.outTot.textContent = n.toLocaleString();
        ui.outPi.textContent = pi.toFixed(5);
        ui.outErr.textContent = Math.abs(Math.PI - pi).toFixed(5);
    }

    // --- Visualization ---

    function drawBoardBackground() {
        const w = ui.boardCanvas.width;
        const h = ui.boardCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2 - 10;

        ctxBoard.clearRect(0, 0, w, h);

        // Draw Square Boundary
        ctxBoard.strokeStyle = '#cbd5e1';
        ctxBoard.lineWidth = 2;
        ctxBoard.strokeRect(cx - r, cy - r, r*2, r*2);

        // Draw Circle Boundary
        ctxBoard.beginPath();
        ctxBoard.arc(cx, cy, r, 0, Math.PI * 2);
        ctxBoard.strokeStyle = '#3b82f6';
        ctxBoard.stroke();
    }

    function drawGraph() {
        const ctx = ctxGraph;
        const w = ui.graphCanvas.width;
        const h = ui.graphCanvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // Margins
        const pad = {l: 40, r: 10, t: 10, b: 20};
        const gw = w - pad.l - pad.r;
        const gh = h - pad.t - pad.b;

        // Draw Real Pi Line (Reference)
        const piY = gh - ((Math.PI - 2) / 2) * gh + pad.t; // Mapping 2.0 to 4.0 range
        
        // Helper: Map Y (Value 2.0 to 4.0)
        const mapY = (val) => {
             // Clamp range visually between 2.5 and 3.5 usually covers it, 
             // but let's do 2.0 to 4.0 to be safe
             const minV = 2.5; 
             const maxV = 3.8;
             const norm = (val - minV) / (maxV - minV);
             return (h - pad.b) - (norm * gh);
        };
        
        const mapX = (n) => pad.l + (n / state.targetN) * gw;

        // Draw Reference Line (PI)
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([5, 5]);
        const yRef = mapY(Math.PI);
        ctx.moveTo(pad.l, yRef);
        ctx.lineTo(w - pad.r, yRef);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Label PI
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.fillText("π (3.14159)", pad.l + 5, yRef - 5);

        // Draw History Line
        if (state.history.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            
            state.history.forEach((pt, i) => {
                const x = mapX(pt.n);
                // Clamp Y to stay in graph
                let val = Math.max(2.5, Math.min(3.8, pt.val));
                const y = mapY(val);
                
                if (i===0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        }
    }

    init();
});