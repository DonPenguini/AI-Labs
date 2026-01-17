document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const canvas = document.getElementById('pumpCanvas');
    const ctx = canvas.getContext('2d');

    const inputs = {
        N: document.getElementById('speed'),
        Nref: document.getElementById('ref_speed'),
        Qref: document.getElementById('ref_flow'),
        Href: document.getElementById('ref_head'),
        Pref: document.getElementById('ref_power')
    };

    const displays = {
        N: document.getElementById('val_speed'),
        Nref: document.getElementById('val_ref_speed'),
        Qref: document.getElementById('val_ref_flow'),
        Href: document.getElementById('val_ref_head'),
        Pref: document.getElementById('val_ref_power'),
        outQ: document.getElementById('out_Q'),
        outH: document.getElementById('out_H'),
        outP: document.getElementById('out_P')
    };

    // --- State ---
    let params = {
        N: 3000,
        Nref: 1500,
        Qref: 1.5,
        Href: 50,
        Pref: 5000
    };

    let rotationAngle = 0;
    
    // --- Resize Canvas ---
    function resizeCanvas() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // --- Calculation Logic ---
    function calculate() {
        // 1. Read Inputs
        params.N = parseFloat(inputs.N.value);
        params.Nref = parseFloat(inputs.Nref.value);
        params.Qref = parseFloat(inputs.Qref.value);
        params.Href = parseFloat(inputs.Href.value);
        params.Pref = parseFloat(inputs.Pref.value);

        // 2. Update Displays
        displays.N.textContent = params.N;
        displays.Nref.textContent = params.Nref;
        displays.Qref.textContent = params.Qref.toFixed(2);
        displays.Href.textContent = params.Href.toFixed(1);
        displays.Pref.textContent = params.Pref.toFixed(0);

        // 3. Apply Affinity Laws
        // Ratio
        const ratio = params.N / params.Nref;

        // Flow ~ N (Linear)
        const Q = params.Qref * ratio;
        
        // Head ~ N^2 (Quadratic)
        const H = params.Href * Math.pow(ratio, 2);
        
        // Power ~ N^3 (Cubic)
        const P = params.Pref * Math.pow(ratio, 3);

        // 4. Update Outputs
        displays.outQ.textContent = Q.toFixed(3);
        displays.outH.textContent = H.toFixed(2);
        
        // Format Power (W to kW if > 1000)
        if (P >= 1000) {
            displays.outP.textContent = (P / 1000).toFixed(2);
            displays.outP.nextElementSibling.textContent = "kW";
        } else {
            displays.outP.textContent = P.toFixed(1);
            displays.outP.nextElementSibling.textContent = "W";
        }

        return { ratio, Q, H, P };
    }

    // --- Visualization Functions ---
    
    function drawImpeller(ctx, x, y, size, angle, speedRatio) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        ctx.strokeStyle = '#dfe6e9';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Draw hub
        ctx.fillStyle = '#636e72';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Draw blades
        const numBlades = 6;
        for (let i = 0; i < numBlades; i++) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / numBlades) * i);
            
            ctx.beginPath();
            ctx.moveTo(size * 0.2, 0);
            // Curve the blade
            ctx.quadraticCurveTo(size * 0.5, size * 0.2, size, size * 0.1);
            ctx.stroke();
            ctx.restore();
        }

        ctx.restore();

        // Draw Casing Hint (Static circle)
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, size + 10, 0, Math.PI * 2);
        ctx.stroke();
        
        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`RPM: ${params.N}`, x, y + size + 30);
    }

    function drawBarChart(ctx, x, y, width, height, ratio) {
        // This chart visualizes the GROWTH factors
        // Base = Reference (1.0 scale)
        // Bars show the multipliers: ratio, ratio^2, ratio^3

        const barWidth = width / 4;
        const spacing = width / 8;
        const floorY = y + height;
        
        // Max Scale calculation for y-axis
        // If ratio is 2 (double speed), power is 8x. We need dynamic scaling.
        // Let's cap visual max at ratio=2.5 -> Power=15.6x roughly, 
        // but for usability, we scale based on current max value.
        
        const r1 = ratio;
        const r2 = ratio * ratio;
        const r3 = ratio * ratio * ratio;
        
        let maxVal = Math.max(1.5, r1, r2, r3); // Ensure at least 1.5x space
        
        const scaleY = (val) => {
            return (val / maxVal) * (height - 30); // Leave room for labels
        };

        // Draw Axis
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, floorY);
        ctx.lineTo(x + width, floorY); // X axis
        ctx.stroke();

        // Reference Line (Ratio = 1.0)
        const refY = floorY - scaleY(1.0);
        ctx.strokeStyle = '#555';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, refY);
        ctx.lineTo(x + width, refY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#aaa';
        ctx.font = '10px sans-serif';
        ctx.fillText('Ref (1.0x)', x + width + 5, refY + 3);

        // Helper to draw bar
        const drawBar = (index, val, color, label) => {
            const bx = x + spacing + index * (barWidth + spacing);
            const bh = scaleY(val);
            const by = floorY - bh;

            ctx.fillStyle = color;
            ctx.fillRect(bx, by, barWidth, bh);
            
            // Text Value
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(val.toFixed(2) + 'x', bx + barWidth/2, by - 5);
            
            // Label
            ctx.fillStyle = '#ccc';
            ctx.font = '11px sans-serif';
            ctx.fillText(label, bx + barWidth/2, floorY + 15);
        };

        drawBar(0, r1, '#00cec9', 'Flow');
        drawBar(1, r2, '#fdcb6e', 'Head');
        drawBar(2, r3, '#ff7675', 'Power');
    }

    // --- Animation Loop ---
    function animate() {
        const { ratio } = calculate();
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Layout: Pump on Left, Chart on Right (if wide enough)
        // Or Pump Top, Chart Bottom
        
        const w = canvas.width;
        const h = canvas.height;
        const isWide = w > 600;

        let pumpX = isWide ? w * 0.25 : w / 2;
        let pumpY = isWide ? h / 2 : h * 0.3;
        let pumpSize = Math.min(w, h) * (isWide ? 0.25 : 0.15);

        // 1. Draw Pump
        // Update rotation based on Speed (N)
        // Base speed factor
        const speedFactor = 0.005; // rad per frame per RPM (arbitrary visual scale)
        rotationAngle += params.N * 0.002; 
        
        drawImpeller(ctx, pumpX, pumpY, pumpSize, rotationAngle, ratio);

        // 2. Draw Scaling Chart
        let chartX = isWide ? w * 0.55 : 50;
        let chartY = isWide ? h * 0.2 : h * 0.6;
        let chartW = isWide ? w * 0.4 : w - 100;
        let chartH = isWide ? h * 0.6 : h * 0.35;

        drawBarChart(ctx, chartX, chartY, chartW, chartH, ratio);

        requestAnimationFrame(animate);
    }

    // --- Listeners ---
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', calculate);
    });

    // Start
    animate();
});