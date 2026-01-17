document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    // We use fixed scales to ensure "Physics" are visible. 
    // e.g., if Demand doubles, the slope MUST look twice as steep.
    const SCALE = {
        max_Q_view: 2000,      // Y-axis max for Inventory Graph
        max_Cost_view: 3000,   // Y-axis max for Cost Graph
        pixels_per_year: 400   // X-axis speed for Inventory
    };

    // --- State ---
    const params = { D: 1000, S: 50, H: 2.5 };
    let Qstar = 0;
    let minTotalCost = 0;

    // Animation State
    let timeOffset = 0;
    let animId;

    // --- DOM ---
    const ui = {
        D: document.getElementById('in-D'),
        S: document.getElementById('in-S'),
        H: document.getElementById('in-H'),
        valD: document.getElementById('val-D'),
        valS: document.getElementById('val-S'),
        valH: document.getElementById('val-H'),
        resQ: document.getElementById('res-Q'),
        resTC: document.getElementById('res-TC')
    };

    const costCanvas = document.getElementById('costCanvas');
    const invCanvas = document.getElementById('invCanvas');
    const ctxCost = costCanvas.getContext('2d');
    const ctxInv = invCanvas.getContext('2d');

    // --- Initialization ---
    function init() {
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        // Bind Inputs
        ['D', 'S', 'H'].forEach(key => {
            ui[key].addEventListener('input', (e) => {
                params[key] = parseFloat(e.target.value);
                updateModel();
            });
        });

        updateModel();
        loop();
    }

    function resizeCanvases() {
        // High DPI scaling
        [costCanvas, invCanvas].forEach(cvs => {
            const rect = cvs.parentElement.getBoundingClientRect();
            cvs.width = rect.width * 2;  // Retina
            cvs.height = rect.height * 2;
            cvs.style.width = rect.width + 'px';
            cvs.style.height = rect.height + 'px';
        });
    }

    // --- Math & Update ---
    function updateModel() {
        // Update UI Text
        ui.valD.textContent = params.D;
        ui.valS.textContent = params.S;
        ui.valH.textContent = params.H;

        // EOQ Calculation
        // Q* = sqrt(2DS / H)
        Qstar = Math.sqrt((2 * params.D * params.S) / params.H);
        
        // Cost Calculation at Q*
        const holding = (Qstar / 2) * params.H;
        const setup = (params.D / Qstar) * params.S;
        minTotalCost = holding + setup;

        ui.resQ.textContent = Qstar.toFixed(2);
        ui.resTC.textContent = minTotalCost.toFixed(2);
    }

    // --- Drawing Engine ---
    function loop() {
        drawCostCurve();
        drawInventoryFlow();
        requestAnimationFrame(loop);
    }

    // 1. Draw The Optimization Problem (Cost Curves)
    function drawCostCurve() {
        const ctx = ctxCost;
        const w = costCanvas.width;
        const h = costCanvas.height;
        
        ctx.clearRect(0, 0, w, h);
        
        // Padding
        const pad = { l: 60, r: 20, t: 20, b: 40 };
        const graphW = w - pad.l - pad.r;
        const graphH = h - pad.t - pad.b;

        // Dynamic Scaling for Cost View based on current values to keep curve centered
        // We center the view roughly around Q* (x-axis) and MinCost (y-axis)
        // But we want smooth transitions, so we dampen it or use fixed ranges if possible.
        // Let's use a semi-fixed range based on slider maxes to show movement.
        const maxX = 2500; // Q axis
        const maxY = 5000; // Cost axis

        // Draw Axes
        ctx.beginPath();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.moveTo(pad.l, pad.t);
        ctx.lineTo(pad.l, h - pad.b); // Y
        ctx.lineTo(w - pad.r, h - pad.b); // X
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Order Quantity (Q)", w/2 + pad.l/2, h - 10);
        ctx.save();
        ctx.translate(20, h/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText("Cost", 0, 0);
        ctx.restore();

        // Helper to map coordinates
        const mapX = (q) => pad.l + (q / maxX) * graphW;
        const mapY = (c) => (h - pad.b) - (c / maxY) * graphH;

        // Plot Functions
        ctx.lineWidth = 3;

        // Holding Cost: Linear (H * Q/2)
        ctx.beginPath();
        ctx.strokeStyle = '#ea580c'; // Orange
        for(let q=0; q<=maxX; q+=10) {
            let c = (q/2) * params.H;
            if (q===0) ctx.moveTo(mapX(q), mapY(c));
            else ctx.lineTo(mapX(q), mapY(c));
        }
        ctx.stroke();

        // Setup Cost: Hyperbolic (S * D/Q)
        ctx.beginPath();
        ctx.strokeStyle = '#16a34a'; // Green
        for(let q=50; q<=maxX; q+=10) {
            let c = (params.D / q) * params.S;
            if (c > maxY) continue; // Clip
            if (q===50) ctx.moveTo(mapX(q), mapY(c));
            else ctx.lineTo(mapX(q), mapY(c));
        }
        ctx.stroke();

        // Total Cost: Sum
        ctx.beginPath();
        ctx.strokeStyle = '#0f172a'; // Dark
        ctx.lineWidth = 4;
        for(let q=50; q<=maxX; q+=10) {
            let c = ((q/2) * params.H) + ((params.D / q) * params.S);
            if (c > maxY) continue;
            // Draw curve
            if(q===50) ctx.moveTo(mapX(q), mapY(c));
            else ctx.lineTo(mapX(q), mapY(c));
        }
        ctx.stroke();

        // Mark Q* (The Solution)
        const optX = mapX(Qstar);
        const optY = mapY(minTotalCost);

        ctx.beginPath();
        ctx.fillStyle = '#2563eb';
        ctx.arc(optX, optY, 8, 0, Math.PI*2);
        ctx.fill();

        // Draw drop line
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.moveTo(optX, optY);
        ctx.lineTo(optX, h - pad.b);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 2. Draw Inventory Dynamics (Sawtooth)
    function drawInventoryFlow() {
        const ctx = ctxInv;
        const w = invCanvas.width;
        const h = invCanvas.height;

        ctx.clearRect(0, 0, w, h);

        const pad = { l: 60, r: 20, t: 20, b: 40 };
        const graphH = h - pad.t - pad.b;

        // FIXED SCALES (This is crucial for the "Proper" representation)
        // We do NOT change these based on inputs.
        const scaleY = graphH / SCALE.max_Q_view; // Pixels per unit
        
        // Time Scaling
        // We want Slope = Demand. 
        // In pixels: Slope = (dy pixels) / (dx pixels)
        // dy = units * scaleY
        // dx = years * pixels_per_year
        // We want visual slope to correspond to D.
        // Actually, for animation, we just need cycle width to be consistent with D.
        // Cycle Time T = Q / D.
        // Cycle Width (px) = T * pixels_per_year = (Q/D) * pixels_per_year
        const cycleWidthPx = (Qstar / params.D) * SCALE.pixels_per_year;

        // Draw Axes
        ctx.beginPath();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.moveTo(pad.l, pad.t);
        ctx.lineTo(pad.l, h - pad.b);
        ctx.lineTo(w - pad.r, h - pad.b);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("Time", w/2 + pad.l/2, h - 10);
        ctx.save();
        ctx.translate(20, h/2);
        ctx.rotate(-Math.PI/2);
        ctx.fillText("Inventory Level", 0, 0);
        ctx.restore();

        // Animation Increment
        // We move 2 pixel per frame. 
        timeOffset = (timeOffset + 2) % cycleWidthPx;

        // Draw Sawtooth
        ctx.beginPath();
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';

        let x = pad.l - timeOffset;
        
        // If offset pushes first point offscreen, backtrack one cycle
        if (x > pad.l) x -= cycleWidthPx;

        const floorY = h - pad.b;
        const peakY = floorY - (Qstar * scaleY);

        // Draw enough cycles to fill screen
        while (x < w) {
            // Replenish (Vertical up)
            ctx.moveTo(x, floorY);
            ctx.lineTo(x, peakY);
            
            // Deplete (Diagonal down)
            ctx.lineTo(x + cycleWidthPx, floorY);
            
            x += cycleWidthPx;
        }

        // Clip to graph area
        ctx.save();
        ctx.beginPath();
        ctx.rect(pad.l, 0, w, h);
        ctx.clip();
        ctx.stroke();
        ctx.restore();

        // Draw Q* Line (Max Inventory)
        ctx.beginPath();
        ctx.strokeStyle = '#94a3b8';
        ctx.setLineDash([5, 5]);
        ctx.moveTo(pad.l, peakY);
        ctx.lineTo(w - pad.r, peakY);
        ctx.stroke();
        
        ctx.fillStyle = '#2563eb';
        ctx.fillText("Q*", pad.l - 20, peakY + 5);
    }

    init();
});