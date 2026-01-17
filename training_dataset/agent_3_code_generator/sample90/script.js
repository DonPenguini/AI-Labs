document.addEventListener("DOMContentLoaded", () => {
    // --- Configuration ---
    const ui = {
        slider: document.getElementById('in-d1'),
        valLabel: document.getElementById('val-d1'),
        outDelta: document.getElementById('out-delta'),
        txtShares: document.getElementById('txt-shares'),
        liquid: document.getElementById('share-liquid'),
        
        pdfCanvas: document.getElementById('pdfCanvas'),
        cdfCanvas: document.getElementById('cdfCanvas')
    };

    const ctxPDF = ui.pdfCanvas.getContext('2d');
    const ctxCDF = ui.cdfCanvas.getContext('2d');

    // State
    let d1 = 0.0;
    let delta = 0.5;

    // --- Initialization ---
    function init() {
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);

        ui.slider.addEventListener('input', update);
        
        // Initial Draw
        update();
    }

    function resizeCanvases() {
        const dpr = window.devicePixelRatio || 1;
        
        [ui.pdfCanvas, ui.cdfCanvas].forEach(canvas => {
            const rect = canvas.parentElement.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx.scale(dpr, dpr);
        });
        
        draw();
    }

    // --- Core Logic ---
    function update() {
        // Read Input
        d1 = parseFloat(ui.slider.value);
        
        // Calculate Delta: N(d1)
        delta = cumulativeNormal(d1);

        // Update UI Text
        ui.valLabel.textContent = d1.toFixed(2);
        ui.outDelta.textContent = delta.toFixed(4);
        ui.txtShares.textContent = delta.toFixed(4);

        // Update Tank Animation
        // Convert 0-1 to percentage
        ui.liquid.style.height = `${delta * 100}%`;

        draw();
    }

    // Standard Normal CDF Approximation
    function cumulativeNormal(x) {
        var t = 1 / (1 + .2316419 * Math.abs(x));
        var d = .3989423 * Math.exp(-x * x / 2);
        var prob = d * t * (.3193815 + t * (-.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
        if (x > 0) prob = 1 - prob;
        return prob;
    }

    function draw() {
        drawPDF();
        drawCDF();
    }

    // --- Visualization 1: PDF (Bell Curve) ---
    function drawPDF() {
        const w = ui.pdfCanvas.width / (window.devicePixelRatio || 1);
        const h = ui.pdfCanvas.height / (window.devicePixelRatio || 1);
        const ctx = ctxPDF;

        ctx.clearRect(0, 0, w, h);

        const pad = { t: 20, b: 30, l: 10, r: 10 };
        const graphW = w - pad.l - pad.r;
        const graphH = h - pad.t - pad.b;

        // X Range: -4 to 4
        const mapX = (x) => pad.l + ((x + 4) / 8) * graphW;
        // Y Range: 0 to 0.45
        const mapY = (y) => (h - pad.b) - (y / 0.45) * graphH;

        // Draw Bell Curve Path
        ctx.beginPath();
        for (let x = -4; x <= 4; x += 0.05) {
            const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
            if (x === -4) ctx.moveTo(mapX(x), mapY(y));
            else ctx.lineTo(mapX(x), mapY(y));
        }
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Fill Area (Delta)
        // From -4 up to d1
        ctx.beginPath();
        ctx.moveTo(mapX(-4), h - pad.b); // Start bottom left
        for (let x = -4; x <= d1; x += 0.05) {
            const y = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
            ctx.lineTo(mapX(x), mapY(y));
        }
        // Exact d1 point
        const yD1 = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * d1 * d1);
        ctx.lineTo(mapX(d1), mapY(yD1));
        ctx.lineTo(mapX(d1), h - pad.b); // Drop down
        
        ctx.fillStyle = 'rgba(37, 99, 235, 0.3)';
        ctx.fill();

        // Draw d1 Line
        ctx.beginPath();
        ctx.moveTo(mapX(d1), h - pad.b);
        ctx.lineTo(mapX(d1), pad.t);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("-4", mapX(-4), h - 10);
        ctx.fillText("0", mapX(0), h - 10);
        ctx.fillText("4", mapX(4), h - 10);
        
        ctx.fillStyle = '#2563eb';
        ctx.fillText(`d1 = ${d1.toFixed(2)}`, mapX(d1), pad.t - 5);
    }

    // --- Visualization 2: CDF (S-Curve) ---
    function drawCDF() {
        const w = ui.cdfCanvas.width / (window.devicePixelRatio || 1);
        const h = ui.cdfCanvas.height / (window.devicePixelRatio || 1);
        const ctx = ctxCDF;

        ctx.clearRect(0, 0, w, h);

        const pad = { t: 20, b: 30, l: 30, r: 20 };
        const graphW = w - pad.l - pad.r;
        const graphH = h - pad.t - pad.b;

        const mapX = (x) => pad.l + ((x + 4) / 8) * graphW;
        const mapY = (y) => (h - pad.b) - y * graphH; // Y is 0 to 1

        // Draw Axes
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Grid lines
        [0, 0.5, 1].forEach(yVal => {
            const y = mapY(yVal);
            ctx.moveTo(pad.l, y);
            ctx.lineTo(w - pad.r, y);
        });
        ctx.stroke();

        // Draw S-Curve
        ctx.beginPath();
        for (let x = -4; x <= 4; x += 0.1) {
            const y = cumulativeNormal(x);
            if (x === -4) ctx.moveTo(mapX(x), mapY(y));
            else ctx.lineTo(mapX(x), mapY(y));
        }
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Current Point
        const cx = mapX(d1);
        const cy = mapY(delta);

        // Drop lines
        ctx.strokeStyle = '#2563eb';
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(pad.l, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, h - pad.b);
        ctx.stroke();
        ctx.setLineDash([]);

        // Dot
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#2563eb';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';
        ctx.fillText("1.0", pad.l - 5, mapY(1) + 3);
        ctx.fillText("0.5", pad.l - 5, mapY(0.5) + 3);
        ctx.fillText("0.0", pad.l - 5, mapY(0) + 3);
        
        ctx.save();
        ctx.translate(10, h/2);
        ctx.rotate(-Math.PI/2);
        ctx.textAlign = 'center';
        ctx.fillText("Delta", 0, 0);
        ctx.restore();
    }

    init();
});