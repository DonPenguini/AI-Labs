document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('pertCanvas');
    const ctx = canvas.getContext('2d');

    // Inputs
    const inputA = document.getElementById('input-a');
    const inputM = document.getElementById('input-m');
    const inputB = document.getElementById('input-b');

    // Display Values
    const valA = document.getElementById('val-a');
    const valM = document.getElementById('val-m');
    const valB = document.getElementById('val-b');
    const errorMsg = document.getElementById('error-msg');

    // Results
    const resTe = document.getElementById('res-te');
    const resVar = document.getElementById('res-var');
    const resStd = document.getElementById('res-std');

    // State
    let a = 20, m = 50, b = 80;
    
    // Canvas dimensions (set programmatically to match CSS resolution)
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 250;
    }
    window.addEventListener('resize', () => {
        resizeCanvas();
        draw();
    });
    resizeCanvas();

    function update() {
        // Read raw values
        let rawA = parseInt(inputA.value);
        let rawM = parseInt(inputM.value);
        let rawB = parseInt(inputB.value);

        // Logic Enforcement: a <= m <= b
        // We won't force sliders to move instantly to avoid UX fighting, 
        // but we will calculate based on sorted values or clamping for safety.
        
        // Strategy: Soft Constraint Enforcement
        // If M < A, push A down or M up? 
        // Let's enforce strictly:
        if (rawM < rawA) rawM = rawA;
        if (rawB < rawM) rawB = rawM;
        
        // Update variables
        a = rawA;
        m = rawM;
        b = rawB;

        // Update Slider Visuals (to match enforced constraints)
        // Check if we need to visually update the sliders to reflect the enforcement
        if(parseInt(inputM.value) < a) inputM.value = a;
        if(parseInt(inputB.value) < m) inputB.value = m;
        // Also check reverse
        if(parseInt(inputM.value) > b) inputM.value = b;
        if(parseInt(inputA.value) > m) inputA.value = m;

        // Re-read final enforced values for calculation
        a = parseInt(inputA.value);
        m = parseInt(inputM.value);
        b = parseInt(inputB.value);

        // Update Text Labels
        valA.textContent = a;
        valM.textContent = m;
        valB.textContent = b;

        // Calculations
        const te = (a + 4 * m + b) / 6;
        const variance = Math.pow((b - a) / 6, 2);
        const stdDev = Math.sqrt(variance);

        // Update Results
        resTe.textContent = te.toFixed(2);
        resVar.textContent = variance.toFixed(2);
        resStd.textContent = stdDev.toFixed(2);

        draw(te);
    }

    function draw(te) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Padding
        const padding = 40;
        const width = canvas.width - (padding * 2);
        const height = canvas.height - 50;
        const bottomY = canvas.height - 30;

        // Scale: Map 0-100 inputs to canvas width
        const scaleX = (val) => padding + (val / 100) * width;
        
        // Draw Axis
        ctx.beginPath();
        ctx.moveTo(padding, bottomY);
        ctx.lineTo(padding + width, bottomY);
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 1. Draw The Beta Distribution Curve
        // A simple visual approximation using a Bezier curve
        // Start (a, 0) -> Control Points -> End (b, 0)
        // Peak should be near m.
        
        const xA = scaleX(a);
        const xM = scaleX(m);
        const xB = scaleX(b);
        const xTe = scaleX(te);

        // Curve logic:
        // We simulate a bell curve that starts at A, peaks at M, ends at B.
        // Height of peak depends vaguely on width (narrower = taller), but for UI we limit it.
        const curveHeight = 150;
        
        ctx.beginPath();
        ctx.moveTo(xA, bottomY);
        
        // To make it look like a distribution, we use two Quadratic curves or one Cubic
        // A cubic bezier from A to B with control points pulling up towards M works well.
        // CP1 at (m, top), CP2 at (m, top) is simple but sharp.
        // Let's use weighted control points.
        
        ctx.bezierCurveTo(
            xA + (xM - xA) / 2, bottomY - curveHeight, // CP1
            xB - (xB - xM) / 2, bottomY - curveHeight, // CP2
            xB, bottomY
        );
        
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)'; // Light Blue Fill
        ctx.fill();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 2. Draw Vertical Markers
        drawMarker(xA, 'a', '#10b981', false);
        drawMarker(xM, 'm', '#f59e0b', false);
        drawMarker(xB, 'b', '#ef4444', false);
        drawMarker(xTe, 'te', '#6366f1', true); // Expected Time (Highlighted)

    }

    function drawMarker(x, label, color, isMain) {
        const bottomY = canvas.height - 30;
        const topY = isMain ? bottomY - 180 : bottomY - 40; // Te line is taller

        ctx.beginPath();
        ctx.moveTo(x, bottomY);
        ctx.lineTo(x, topY);
        ctx.strokeStyle = color;
        ctx.lineWidth = isMain ? 2 : 1;
        ctx.setLineDash(isMain ? [] : [5, 3]); // Dashed for a, m, b
        ctx.stroke();
        ctx.setLineDash([]);

        // Label bg
        ctx.fillStyle = color;
        if(isMain) {
            // Te Bubble
            ctx.beginPath();
            ctx.arc(x, topY, 4, 0, Math.PI*2);
            ctx.fill();
            
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("te", x, topY - 10);
        } else {
            // Small markers
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, bottomY + 15);
        }
    }

    // Initialize
    inputA.addEventListener('input', update);
    inputM.addEventListener('input', update);
    inputB.addEventListener('input', update);

    // Initial Trigger
    update();
});