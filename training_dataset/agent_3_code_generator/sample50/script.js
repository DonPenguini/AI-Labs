document.addEventListener('DOMContentLoaded', () => {
    // --- Constants ---
    const MAX_ITER = 100;
    const TOLERANCE = 1e-6;

    // --- DOM Refs ---
    const inputs = {
        IL: document.getElementById('IL'),
        I0_log: document.getElementById('I0_log'),
        n: document.getElementById('n'),
        Vt: document.getElementById('Vt'),
        Rs: document.getElementById('Rs'),
        Rp_log: document.getElementById('Rp_log'),
        V_op: document.getElementById('V_op')
    };

    const displays = {
        IL: document.getElementById('IL-val'),
        I0: document.getElementById('I0-val'),
        n: document.getElementById('n-val'),
        Vt: document.getElementById('Vt-val'),
        Rs: document.getElementById('Rs-val'),
        Rp: document.getElementById('Rp-val'),
        V_op: document.getElementById('V_op-val'),
        opI: document.getElementById('op-I'),
        opP: document.getElementById('op-P'),
        isc: document.getElementById('res-isc'),
        voc: document.getElementById('res-voc'),
        pmp: document.getElementById('res-pmp'),
        ff: document.getElementById('res-ff')
    };

    const simBulb = document.getElementById('simBulb');
    const animCanvas = document.getElementById('animCanvas');
    const ctx = animCanvas.getContext('2d');
    
    // Static Elements for Coordinate Mapping
    const elSun = document.querySelector('.sim-sun');
    const elPanel = document.querySelector('.sim-panel');
    const elBulb = document.querySelector('.sim-bulb');

    let params = {};
    let simResults = { Voc: 0, Isc: 0, Pmp: 0, currentOpI: 0, currentOpP: 0 };

    // --- Physics Solver (Newton-Raphson) ---
    function solveCurrent(V, p) {
        let I = p.IL; // Initial guess
        for (let i = 0; i < MAX_ITER; i++) {
            const V_diode = V + I * p.Rs;
            const V_th = p.n * p.Vt;
            const exp_term = Math.exp(V_diode / V_th);
            const f = p.IL - p.I0 * (exp_term - 1) - V_diode / p.Rp - I;
            const df = -p.I0 * exp_term * (p.Rs / V_th) - (p.Rs / p.Rp) - 1;
            
            if (Math.abs(df) < 1e-9) break;
            const delta = f / df;
            I -= delta;
            if (Math.abs(delta) < TOLERANCE) return I;
        }
        return I;
    }

    // --- Main Logic ---
    function readParams() {
        params = {
            IL: parseFloat(inputs.IL.value),
            I0: Math.pow(10, parseFloat(inputs.I0_log.value)),
            n: parseFloat(inputs.n.value),
            Vt: parseFloat(inputs.Vt.value),
            Rs: parseFloat(inputs.Rs.value),
            Rp: Math.pow(10, parseFloat(inputs.Rp_log.value)),
            V_op: parseFloat(inputs.V_op.value)
        };
        
        // Update text
        displays.IL.textContent = params.IL.toFixed(1);
        displays.I0.textContent = params.I0.toExponential(2);
        displays.n.textContent = params.n.toFixed(2);
        displays.Vt.textContent = params.Vt.toFixed(3);
        displays.Rs.textContent = params.Rs.toFixed(3);
        displays.Rp.textContent = params.Rp.toFixed(0);
        displays.V_op.textContent = params.V_op.toFixed(1);
    }

    function calculateCurves() {
        readParams();
        const dataIV = [];
        const dataPV = [];
        
        // Calculate ISC
        simResults.Isc = solveCurrent(0, params);
        
        // Calculate VOC
        let v_scan = 0, i_scan = simResults.Isc;
        while(i_scan > 0 && v_scan < 100) {
            v_scan += 0.5;
            i_scan = solveCurrent(v_scan, params);
        }
        simResults.Voc = v_scan; 
        inputs.V_op.max = (simResults.Voc * 1.1).toFixed(1);

        // Generate Plot Data
        let maxP = 0;
        for(let v = 0; v < simResults.Voc * 1.1; v+= (simResults.Voc/50)) {
            const I = solveCurrent(v, params);
            if(I < -0.5) break; 
            const P = v * I;
            dataIV.push({x: v, y: Math.max(0, I)});
            dataPV.push({x: v, y: Math.max(0, P)});
            if(P > maxP) maxP = P;
        }
        simResults.Pmp = maxP;

        // Operating Point
        simResults.currentOpI = Math.max(0, solveCurrent(params.V_op, params));
        simResults.currentOpP = params.V_op * simResults.currentOpI;

        // Display Results
        displays.isc.textContent = simResults.Isc.toFixed(2) + " A";
        displays.voc.textContent = simResults.Voc.toFixed(2) + " V";
        displays.pmp.textContent = simResults.Pmp.toFixed(2) + " W";
        
        const ff = (simResults.Voc * simResults.Isc) > 0 ? (simResults.Pmp / (simResults.Voc * simResults.Isc) * 100) : 0;
        displays.ff.textContent = ff.toFixed(1) + " %";

        displays.opI.textContent = simResults.currentOpI.toFixed(2) + " A";
        displays.opP.textContent = simResults.currentOpP.toFixed(2) + " W";

        // Update Chart
        ivChart.data.datasets[0].data = dataIV;
        ivChart.data.datasets[1].data = dataPV;
        ivChart.data.datasets[2].data = [{x: params.V_op, y: simResults.currentOpI}];
        ivChart.update('none');
    }

    // --- Chart Setup ---
    const ivChart = new Chart(document.getElementById('ivChart').getContext('2d'), {
        type: 'line',
        data: {
            datasets: [
                { label: 'Current (A)', borderColor: '#3498db', data: [], yAxisID: 'y', pointRadius: 0, borderWidth: 2 },
                { label: 'Power (W)', borderColor: '#e67e22', data: [], yAxisID: 'y1', pointRadius: 0, borderWidth: 2, borderDash: [5,5] },
                { label: 'Op Point', borderColor: 'red', backgroundColor: 'red', data: [], pointRadius: 6, type: 'scatter' }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { type: 'linear', position: 'bottom', title: {display:true, text:'Voltage (V)'} },
                y: { type: 'linear', position: 'left', title: {display:true, text:'Current (A)'}, min: 0 },
                y1: { type: 'linear', position: 'right', title: {display:true, text:'Power (W)'}, min: 0, grid: {drawOnChartArea: false} }
            }
        }
    });

    // --- Animation Logic ---
    let particles = { photons: [], electrons: [] };
    
    // Helper: Get center coordinates of an element relative to canvas
    function getCoords(el) {
        const rect = el.getBoundingClientRect();
        const canvasRect = animCanvas.getBoundingClientRect();
        return {
            x: rect.left - canvasRect.left + rect.width / 2,
            y: rect.top - canvasRect.top + rect.height / 2,
            w: rect.width,
            h: rect.height,
            top: rect.top - canvasRect.top,
            bottom: rect.bottom - canvasRect.top
        };
    }

    class Photon {
        constructor(sun, panel) {
            this.x = sun.x + (Math.random() - 0.5) * (sun.w * 0.5);
            this.y = sun.y;
            this.tx = panel.x + (Math.random() - 0.5) * (panel.w * 0.8);
            this.ty = panel.y + (Math.random() - 0.5) * (panel.h * 0.5);
            this.speed = 3 + Math.random();
            this.active = true;
        }
        update() {
            const dx = this.tx - this.x;
            const dy = this.ty - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < this.speed) {
                this.active = false;
                // Spawn electron if photon hits panel and current > 0
                if(simResults.currentOpI > 0.05) {
                    particles.electrons.push(new Electron(this.tx, this.ty));
                }
            } else {
                this.x += (dx/dist) * this.speed;
                this.y += (dy/dist) * this.speed;
            }
        }
        draw(ctx) {
            ctx.fillStyle = "#f1c40f";
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI*2);
            ctx.fill();
        }
    }

    class Electron {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.state = 0; // 0: Panel->WireTop, 1: Across Top, 2: Down Bulb, 3: Return
            this.speed = 2 + (simResults.currentOpI / 5); // Speed scales with current
            this.active = true;
        }
        update(coords) {
            const wireYTop = coords.bulb.top - 10; // Slightly above bulb center
            const wireYBot = coords.bulb.bottom + 10;
            const panelRight = coords.panel.x + coords.panel.w/2;
            const bulbX = coords.bulb.x;

            if(this.state === 0) {
                // Move Up out of panel
                this.y -= this.speed;
                if(this.y < wireYTop) { this.y = wireYTop; this.state = 1; }
            } else if(this.state === 1) {
                // Move Right to bulb
                this.x += this.speed * 1.5;
                if(this.x > bulbX) { this.x = bulbX; this.state = 2; }
            } else if(this.state === 2) {
                // Move Down through bulb
                this.y += this.speed;
                if(this.y > wireYBot) { this.y = wireYBot; this.state = 3; }
            } else if(this.state === 3) {
                // Move Left back to panel
                this.x -= this.speed * 1.5;
                if(this.x < panelRight) {
                    this.active = false; // Circuit complete
                }
            }
        }
        draw(ctx) {
            ctx.fillStyle = "#3498db";
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI*2);
            ctx.fill();
        }
    }

    function animate() {
        // Handle Canvas Resize
        if(animCanvas.width !== animCanvas.offsetWidth || animCanvas.height !== animCanvas.offsetHeight) {
            animCanvas.width = animCanvas.offsetWidth;
            animCanvas.height = animCanvas.offsetHeight;
        }
        ctx.clearRect(0, 0, animCanvas.width, animCanvas.height);

        // Get Current Positions of HTML Elements
        const coords = {
            sun: getCoords(elSun),
            panel: getCoords(elPanel),
            bulb: getCoords(elBulb)
        };

        // Spawn Photons based on IL intensity
        const spawnRate = params.IL / 100; // Normalized
        if(Math.random() < spawnRate) {
            particles.photons.push(new Photon(coords.sun, coords.panel));
        }

        // Update & Draw Photons
        particles.photons.forEach(p => p.update());
        particles.photons = particles.photons.filter(p => p.active);
        particles.photons.forEach(p => p.draw(ctx));

        // Update & Draw Electrons
        particles.electrons.forEach(e => e.update(coords));
        particles.electrons = particles.electrons.filter(e => e.active);
        particles.electrons.forEach(e => e.draw(ctx));
        
        // Safety cap
        if(particles.electrons.length > 200) particles.electrons.splice(0, 50);

        // Bulb Glow Effect
        const powerRatio = simResults.Pmp > 0 ? (simResults.currentOpP / simResults.Pmp) : 0;
        simBulb.style.boxShadow = `0 0 ${powerRatio * 40}px ${powerRatio * 10}px rgba(255, 255, 0, ${0.2 + powerRatio * 0.8})`;
        simBulb.style.backgroundColor = `rgba(255, 255, ${255 - powerRatio*100}, 1)`;

        requestAnimationFrame(animate);
    }

    // --- Init ---
    Object.values(inputs).forEach(inp => inp.addEventListener('input', calculateCurves));
    calculateCurves();
    animate();
});