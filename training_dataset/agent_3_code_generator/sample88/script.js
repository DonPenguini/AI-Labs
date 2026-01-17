document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    const ui = {
        S: document.getElementById('in-S'),
        K: document.getElementById('in-K'),
        r: document.getElementById('in-r'),
        sigma: document.getElementById('in-sigma'),
        T: document.getElementById('in-T'),
        
        valS: document.getElementById('val-S'),
        valK: document.getElementById('val-K'),
        valR: document.getElementById('val-r'),
        valSigma: document.getElementById('val-sigma'),
        valT: document.getElementById('val-T'),

        outD1: document.getElementById('out-d1'),
        outD2: document.getElementById('out-d2'),
        outNd2: document.getElementById('out-Nd2')
    };

    const cvsBell = document.getElementById('bellCanvas');
    const cvsPath = document.getElementById('pathCanvas');
    const ctxBell = cvsBell.getContext('2d');
    const ctxPath = cvsPath.getContext('2d');

    // Parameters State
    let params = { S: 100, K: 100, r: 0.05, sigma: 0.2, T: 1.0 };
    
    // Path Simulation State (Fixed Seed)
    const NUM_PATHS = 40;
    const NUM_STEPS = 50;
    // We pre-generate Z-scores (Normal Randoms) so paths "morph" instead of flicker
    // This makes the slider effect much easier to understand.
    const pathZScores = []; 

    function init() {
        // Generate fixed random noise once
        for(let i=0; i<NUM_PATHS; i++) {
            let path = [];
            for(let t=0; t<NUM_STEPS; t++) {
                // Box-Muller transform for standard normal distribution
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
                path.push(z);
            }
            pathZScores.push(path);
        }

        resize();
        window.addEventListener('resize', resize);
        
        // Bind Inputs
        ['S', 'K', 'r', 'sigma', 'T'].forEach(k => {
            ui[k].addEventListener('input', (e) => {
                params[k] = parseFloat(e.target.value);
                update();
            });
        });

        update();
        animate();
    }

    function resize() {
        // Handle High DPI (Retina) Displays
        const dpr = window.devicePixelRatio || 1;
        
        [cvsBell, cvsPath].forEach(c => {
            const rect = c.parentElement.getBoundingClientRect();
            // Set actual pixel count
            c.width = rect.width * dpr;
            c.height = rect.height * dpr;
            // Normalize scale
            const ctx = c.getContext('2d');
            ctx.scale(dpr, dpr);
        });
        
        drawBell(); // Redraw immediately on resize
    }

    function update() {
        // Update Text Labels
        ui.valS.textContent = params.S;
        ui.valK.textContent = params.K;
        ui.valR.textContent = (params.r * 100).toFixed(0) + '%';
        ui.valSigma.textContent = (params.sigma * 100).toFixed(0) + '%';
        ui.valT.textContent = params.T + ' Yr';

        // 1. Calculate Black-Scholes d1, d2
        const numer = Math.log(params.S / params.K) + (params.r + 0.5 * params.sigma**2) * params.T;
        const denom = params.sigma * Math.sqrt(params.T);
        
        const d1 = numer / denom;
        const d2 = d1 - denom;

        // 2. CDF N(d2)
        const Nd2 = cumulativeNormal(d2);

        // Update UI
        ui.outD1.textContent = d1.toFixed(3);
        ui.outD2.textContent = d2.toFixed(3);
        ui.outNd2.textContent = (Nd2 * 100).toFixed(2) + '%';
        
        // Trigger Redraws
        drawBell(d1, d2);
    }

    // --- Drawing Logic: Standard Normal ---
    function drawBell(d1, d2) {
        // Safe check if d1/d2 not calculated yet
        if(d1 === undefined) return;

        // Get layout dimensions (logical pixels)
        const w = cvsBell.width / (window.devicePixelRatio || 1);
        const h = cvsBell.height / (window.devicePixelRatio || 1);
        
        ctxBell.clearRect(0, 0, w, h);

        // Coordinate Mapping: Z from -4 to 4
        const pad = {l: 20, r: 20, t: 20, b: 30};
        const gw = w - pad.l - pad.r;
        const gh = h - pad.t - pad.b;

        const mapX = (z) => pad.l + ((z + 4) / 8) * gw;
        const mapY = (y) => (h - pad.b) - (y / 0.45) * gh; // Max height ~0.4

        // Draw Axes
        ctxBell.strokeStyle = '#cbd5e1';
        ctxBell.lineWidth = 1;
        ctxBell.beginPath();
        ctxBell.moveTo(pad.l, h - pad.b);
        ctxBell.lineTo(w - pad.r, h - pad.b); // X axis
        ctxBell.stroke();

        // Draw Bell Curve
        ctxBell.beginPath();
        ctxBell.strokeStyle = '#64748b';
        ctxBell.lineWidth = 2;
        for(let z = -4; z <= 4; z += 0.05) {
            const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
            const x = mapX(z);
            const y = mapY(pdf);
            if(z === -4) ctxBell.moveTo(x, y);
            else ctxBell.lineTo(x, y);
        }
        ctxBell.stroke();

        // Shade N(d2) Area
        ctxBell.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctxBell.beginPath();
        ctxBell.moveTo(mapX(-4), h - pad.b);
        for(let z = -4; z <= d2; z += 0.05) {
             const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z);
             ctxBell.lineTo(mapX(z), mapY(pdf));
        }
        // Close shape at d2
        const pdfD2 = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * d2 * d2);
        ctxBell.lineTo(mapX(d2), mapY(pdfD2));
        ctxBell.lineTo(mapX(d2), h - pad.b);
        ctxBell.fill();

        // Draw d1 Line (Blue)
        const x1 = mapX(d1);
        ctxBell.strokeStyle = '#3b82f6';
        ctxBell.lineWidth = 2;
        ctxBell.beginPath();
        ctxBell.setLineDash([4, 2]);
        ctxBell.moveTo(x1, h - pad.b);
        ctxBell.lineTo(x1, pad.t);
        ctxBell.stroke();
        ctxBell.setLineDash([]);
        ctxBell.fillStyle = '#3b82f6';
        ctxBell.font = 'bold 12px sans-serif';
        ctxBell.fillText('d1', x1 + 4, pad.t + 10);

        // Draw d2 Line (Green)
        const x2 = mapX(d2);
        ctxBell.strokeStyle = '#10b981';
        ctxBell.beginPath();
        ctxBell.moveTo(x2, h - pad.b);
        ctxBell.lineTo(x2, pad.t + 20);
        ctxBell.stroke();
        ctxBell.fillStyle = '#10b981';
        ctxBell.fillText('d2', x2 - 20, pad.t + 30);
    }

    // --- Drawing Logic: Paths Animation ---
    function drawPaths() {
        const w = cvsPath.width / (window.devicePixelRatio || 1);
        const h = cvsPath.height / (window.devicePixelRatio || 1);

        ctxPath.clearRect(0, 0, w, h);

        const pad = {l: 40, r: 10, t: 20, b: 30};
        const gw = w - pad.l - pad.r;
        const gh = h - pad.t - pad.b;

        // Auto-Scale Y Axis: Center on Strike K, +/- 3 Sigma (approx)
        // Volatility impacts range: Range ~ S * exp(sigma * sqrt(T) * 3)
        // We use a looser bound to keep visuals stable-ish
        const rangeMult = Math.exp(params.sigma * Math.sqrt(params.T) * 2.5);
        const maxP = params.S * rangeMult;
        const minP = params.S / rangeMult;
        
        const mapX = (step) => pad.l + (step / NUM_STEPS) * gw;
        const mapY = (price) => (h - pad.b) - ((price - minP) / (maxP - minP)) * gh;

        // Draw Strike Line
        const yK = mapY(params.K);
        ctxPath.beginPath();
        ctxPath.strokeStyle = '#ef4444';
        ctxPath.setLineDash([5, 5]);
        ctxPath.moveTo(pad.l, yK);
        ctxPath.lineTo(w - pad.r, yK);
        ctxPath.stroke();
        ctxPath.setLineDash([]);

        // Draw Paths
        const dt = params.T / NUM_STEPS;
        const drift = (params.r - 0.5 * params.sigma**2) * dt;
        const vol = params.sigma * Math.sqrt(dt);

        pathZScores.forEach((zPath) => {
            let S = params.S;
            
            ctxPath.beginPath();
            ctxPath.moveTo(mapX(0), mapY(S));

            for(let t=0; t<NUM_STEPS; t++) {
                // S_t = S_{t-1} * exp(drift + vol * Z)
                S = S * Math.exp(drift + vol * zPath[t]);
                ctxPath.lineTo(mapX(t+1), mapY(S));
            }

            // Color based on expiry
            if(S > params.K) ctxPath.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // Green
            else ctxPath.strokeStyle = 'rgba(239, 68, 68, 0.2)'; // Red
            
            ctxPath.lineWidth = 1;
            ctxPath.stroke();
        });
    }

    function animate() {
        drawPaths();
        requestAnimationFrame(animate);
    }

    // Helper: Standard Normal CDF
    function cumulativeNormal(x) {
        var t = 1 / (1 + .2316419 * Math.abs(x));
        var d = .3989423 * Math.exp(-x * x / 2);
        var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (x > 0) prob = 1 - prob;
        return prob;
    }

    init();
});