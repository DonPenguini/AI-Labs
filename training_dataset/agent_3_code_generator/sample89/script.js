document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const canvas = document.getElementById('amortChart');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('hover-tooltip');
    
    // Inputs
    const inputs = {
        p: { num: document.getElementById('input-p'), range: document.getElementById('range-p') },
        r: { num: document.getElementById('input-r'), range: document.getElementById('range-r') },
        t: { num: document.getElementById('input-t'), range: document.getElementById('range-t') }
    };
    
    // Outputs
    const outPmt = document.getElementById('out-pmt');
    const outTotalInt = document.getElementById('out-total-int');
    const outTotalCost = document.getElementById('out-total-cost');
    
    // Animation
    const btnAnimate = document.getElementById('btn-animate');
    const progressBar = document.getElementById('progress-bar');

    // State
    let schedule = [];
    let metrics = {};
    let animationId = null;
    let animationFrame = 0; // Current month being animated
    let isAnimating = false;

    // --- Core Logic ---

    function calculateLoan() {
        const P = parseFloat(inputs.p.num.value);
        const annualRate = parseFloat(inputs.r.num.value) / 100;
        const years = parseFloat(inputs.t.num.value);
        
        const r_m = annualRate / 12;
        const n = Math.round(years * 12);
        
        // PMT Formula: P * r(1+r)^n / ((1+r)^n - 1)
        let pmt = 0;
        if (r_m === 0) {
            pmt = P / n;
        } else {
            pmt = P * (r_m * Math.pow(1 + r_m, n)) / (Math.pow(1 + r_m, n) - 1);
        }

        // Generate Schedule
        schedule = [];
        let balance = P;
        let totalInterest = 0;

        for (let i = 1; i <= n; i++) {
            const interestPayment = balance * r_m;
            let principalPayment = pmt - interestPayment;
            
            // Handle last month rounding
            if (balance - principalPayment < 0.01) {
                principalPayment = balance;
                balance = 0;
            } else {
                balance -= principalPayment;
            }

            totalInterest += interestPayment;

            schedule.push({
                month: i,
                interest: interestPayment,
                principal: principalPayment,
                balance: balance,
                totalPaid: i * pmt
            });

            if (balance <= 0) break;
        }

        metrics = {
            pmt: pmt,
            totalInterest: totalInterest,
            totalCost: P + totalInterest,
            n: n
        };

        updateDisplays();
        drawChart();
    }

    function updateDisplays() {
        const fmt = (num) => num.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        
        outPmt.textContent = fmt(metrics.pmt);
        outTotalInt.textContent = fmt(metrics.totalInterest);
        outTotalCost.textContent = fmt(metrics.totalCost);
    }

    // --- Visualization ---

    function drawChart(animateUntilIndex = null) {
        // Handle canvas sizing
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const w = canvas.width;
        const h = canvas.height;
        const padding = { top: 20, right: 50, bottom: 40, left: 60 };

        ctx.clearRect(0, 0, w, h);

        if (schedule.length === 0) return;

        const maxIndex = animateUntilIndex !== null ? animateUntilIndex : schedule.length;
        const dataToDraw = schedule; // We draw the full axis structure, but maybe limit filled bars

        // Scales
        const maxBalance = schedule[0].balance + schedule[0].principal; // Should be Principal
        const maxPayment = metrics.pmt * 1.2; // Add some headroom
        const xStep = (w - padding.left - padding.right) / schedule.length;
        
        const mapX = (i) => padding.left + (i * xStep);
        const mapY_Balance = (val) => h - padding.bottom - ((val / maxBalance) * (h - padding.top - padding.bottom));
        const mapY_Payment = (val) => h - padding.bottom - ((val / maxPayment) * (h - padding.top - padding.bottom)); // Separate scale for bars if we wanted, but let's normalize bars to fit nicely at bottom

        // Let's use a dual axis conceptualization visually:
        // 1. Balance Line uses Full Height
        // 2. Bars use bottom 40% of height for better visibility
        const barHeightMax = (h - padding.top - padding.bottom) * 0.4;
        const mapY_Bar = (val) => h - padding.bottom - ((val / metrics.pmt) * barHeightMax);


        // 1. Draw Axis & Grid
        ctx.beginPath();
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        // Bottom Line
        ctx.moveTo(padding.left, h - padding.bottom);
        ctx.lineTo(w - padding.right, h - padding.bottom);
        // Left Line
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, h - padding.bottom);
        ctx.stroke();

        // 2. Draw Bars (Stacked Principal + Interest)
        const barWidth = Math.max(1, xStep + 0.5); // Ensure no gaps

        for (let i = 0; i < maxIndex; i++) {
            const d = schedule[i];
            const x = mapX(i);
            
            // Interest (Bottom Layer)
            // Actually, usually Principal is on bottom for stack, but Interest is high early.
            // Let's put Interest on top (Red) and Principal on bottom (Green) so "Equity" grows from bottom?
            // Standard is often Interest on bottom. Let's do:
            // Top: Interest (Red), Bottom: Principal (Green)
            
            const yBase = h - padding.bottom;
            const hPrincipal = (d.principal / metrics.pmt) * barHeightMax;
            const hInterest = (d.interest / metrics.pmt) * barHeightMax;

            // Draw Principal (Green)
            ctx.fillStyle = '#10b981';
            ctx.fillRect(x, yBase - hPrincipal, barWidth, hPrincipal);

            // Draw Interest (Red) on top of Principal
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x, yBase - hPrincipal - hInterest, barWidth, hInterest);
        }

        // 3. Draw Balance Line (Blue)
        ctx.beginPath();
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        
        // Start at (0, Initial Principal)
        ctx.moveTo(padding.left, mapY_Balance(schedule[0].balance + schedule[0].principal));

        for (let i = 0; i < maxIndex; i++) {
            const x = mapX(i) + (barWidth/2);
            const y = mapY_Balance(schedule[i].balance);
            ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px sans-serif';
        
        // X-axis labels (Years)
        const yearStep = Math.max(1, Math.round(schedule.length / 12 / 5)); // Show ~5 labels
        for(let i=0; i<=schedule.length; i+= (yearStep * 12)) {
            const x = mapX(i);
            if(x < w - padding.right) {
                ctx.fillText(`Y${i/12}`, x, h - padding.bottom + 15);
            }
        }
    }

    // --- Animation ---

    function animate() {
        if (!isAnimating) return;
        
        animationFrame += Math.max(1, Math.floor(schedule.length / 100)); // Speed based on length

        if (animationFrame >= schedule.length) {
            animationFrame = schedule.length;
            isAnimating = false;
            btnAnimate.textContent = "Re-Animate";
            btnAnimate.disabled = false;
        } else {
            requestAnimationFrame(animate);
        }

        drawChart(animationFrame);
        
        // Update Progress Bar
        const pct = (animationFrame / schedule.length) * 100;
        progressBar.style.width = `${pct}%`;
    }

    btnAnimate.addEventListener('click', () => {
        isAnimating = true;
        animationFrame = 0;
        btnAnimate.disabled = true;
        btnAnimate.textContent = "Simulating...";
        animate();
    });

    // --- Interactivity (Sync Inputs) ---

    function syncInputs(source, target, type) {
        target.value = source.value;
        calculateLoan();
        // Reset animation state
        isAnimating = false;
        btnAnimate.disabled = false;
        btnAnimate.textContent = "Animate Payments";
        progressBar.style.width = '0%';
    }

    Object.keys(inputs).forEach(key => {
        const i = inputs[key];
        i.num.addEventListener('input', () => syncInputs(i.num, i.range, key));
        i.range.addEventListener('input', () => syncInputs(i.range, i.num, key));
    });

    // --- Tooltip ---
    canvas.addEventListener('mousemove', (e) => {
        if(isAnimating) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        
        // Find Index
        const paddingLeft = 60;
        const w = canvas.width - 110; // width minus pads
        const xStep = w / schedule.length;
        
        let index = Math.floor((x - paddingLeft) / xStep);
        if (index < 0) index = 0;
        if (index >= schedule.length) index = schedule.length - 1;

        const d = schedule[index];
        
        tooltip.style.left = `${e.clientX - rect.left}px`; // position relative to canvas container
        tooltip.style.top = `${e.clientY - rect.top}px`;
        tooltip.classList.remove('hidden');
        
        tooltip.innerHTML = `
            <strong>Month ${d.month} (Year ${(d.month/12).toFixed(1)})</strong><br>
            Principal Paid: $${d.principal.toFixed(2)}<br>
            Interest Paid: $${d.interest.toFixed(2)}<br>
            Remaining Balance: $${d.balance.toFixed(2)}
        `;
    });

    canvas.addEventListener('mouseleave', () => {
        tooltip.classList.add('hidden');
    });

    // Handle Window Resize
    window.addEventListener('resize', () => {
        drawChart(isAnimating ? animationFrame : null);
    });

    // Init
    calculateLoan();
});