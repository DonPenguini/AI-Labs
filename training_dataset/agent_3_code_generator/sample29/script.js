document.addEventListener('DOMContentLoaded', () => {
    // 1. Select DOM elements
    const inputs = {
        Qin: document.getElementById('Qin'),
        Ua: document.getElementById('Ua'),
        Tc: document.getElementById('Tc'),
        Hr: document.getElementById('Hr'),
        rV: document.getElementById('rV'),
        rho: document.getElementById('rho'),
        Cp: document.getElementById('Cp'),
        V: document.getElementById('V'),
        T: document.getElementById('T')
    };

    const displays = {
        Qin: document.getElementById('val-Qin'),
        Ua: document.getElementById('val-Ua'),
        Tc: document.getElementById('val-Tc'),
        Hr: document.getElementById('val-Hr'),
        rV: document.getElementById('val-rV'),
        rho: document.getElementById('val-rho'),
        Cp: document.getElementById('val-Cp'),
        V: document.getElementById('val-V'),
        T: document.getElementById('val-T')
    };

    const outputs = {
        dTdt: document.getElementById('output-dTdt'),
        statReaction: document.getElementById('stat-reaction'),
        statTransfer: document.getElementById('stat-transfer'),
        statNet: document.getElementById('stat-net')
    };

    const visuals = {
        liquid: document.getElementById('liquid'),
        jacket: document.querySelector('.jacket'),
        bubbles: document.querySelector('.bubbles'),
        arrowQin: document.getElementById('arrow-qin'),
        arrowLoss: document.getElementById('arrow-loss')
    };

    // 2. Helper to get values
    const getVal = (key) => parseFloat(inputs[key].value);

    // 3. Color Interpolation Logic (Blue to Red)
    function getColorForTemp(temp) {
        // Map 250K to 600K
        const minT = 250;
        const maxT = 600;
        const ratio = Math.max(0, Math.min(1, (temp - minT) / (maxT - minT)));
        
        // Simple interpolation between Blue (0, 0, 255) and Red (255, 0, 0)
        // Using HSL for better transition: Blue (240) -> Red (0)
        const hue = 240 - (ratio * 240);
        return `hsl(${hue}, 70%, 50%)`;
    }

    function getColorForCoolant(temp) {
        // Similar mapping for jacket border
        const minT = 250;
        const maxT = 500;
        const ratio = Math.max(0, Math.min(1, (temp - minT) / (maxT - minT)));
        const hue = 240 - (ratio * 240);
        return `hsl(${hue}, 60%, 70%)`; // Lighter pastel
    }

    // 4. Calculation Function
    function updateSimulation() {
        // Fetch current values
        const params = {
            Qin: getVal('Qin'),
            Ua: getVal('Ua'),
            Tc: getVal('Tc'),
            Hr: getVal('Hr'),
            rV: getVal('rV'),
            rho: getVal('rho'),
            Cp: getVal('Cp'),
            V: getVal('V'),
            T: getVal('T')
        };

        // Update Text Displays
        for (const key in params) {
            displays[key].textContent = params[key];
        }

        // --- Core Calculation ---
        // Formula: dTdt = (Qin - Ua*(T - Tc) + Hr*rV) / (rho*Cp*V)
        
        const heatTransferTerm = params.Ua * (params.T - params.Tc); // Positive if T > Tc (Heat Loss)
        const reactionHeatTerm = params.Hr * params.rV;
        const numerator = params.Qin - heatTransferTerm + reactionHeatTerm;
        const denominator = params.rho * params.Cp * params.V;

        let dTdt = 0;
        if (denominator > 0) {
            dTdt = numerator / denominator;
        }

        // --- Update Output Display ---
        outputs.dTdt.textContent = dTdt.toFixed(4);
        
        // Update Status Bar
        outputs.statReaction.textContent = reactionHeatTerm.toFixed(0) + " W";
        outputs.statTransfer.textContent = (-heatTransferTerm).toFixed(0) + " W"; // Negative of loss = gain
        outputs.statNet.textContent = numerator.toFixed(0) + " W";

        // Style the Slope text (Red if heating, Blue if cooling)
        if (dTdt > 0.0001) outputs.dTdt.style.color = "#e74c3c"; // Red
        else if (dTdt < -0.0001) outputs.dTdt.style.color = "#3498db"; // Blue
        else outputs.dTdt.style.color = "#333";

        // --- Update Visuals ---

        // 1. Liquid Color based on T
        visuals.liquid.style.backgroundColor = getColorForTemp(params.T);

        // 2. Jacket Color based on Tc
        visuals.jacket.style.borderColor = getColorForCoolant(params.Tc);

        // 3. Bubbles (Reaction Intensity)
        // Opacity based on magnitude of reaction heat
        const reactionMag = Math.abs(reactionHeatTerm);
        const maxReaction = 500000 * 10; // Approx max possible
        const bubbleOpacity = Math.min(1, reactionMag / (maxReaction * 0.1)); // Scale it so it's visible earlier
        visuals.bubbles.style.opacity = bubbleOpacity;

        // 4. Qin Arrow
        if (Math.abs(params.Qin) > 100) {
            visuals.arrowQin.classList.remove('hidden');
            if (params.Qin > 0) {
                // Heat Entering (Red arrow pointing down)
                visuals.arrowQin.innerHTML = `<span class="arrow-label">Qin</span> <i class="fas fa-long-arrow-alt-down" style="color:red"></i>`;
            } else {
                // Heat Leaving (Blue arrow pointing up)
                visuals.arrowQin.innerHTML = `<span class="arrow-label">Qin</span> <i class="fas fa-long-arrow-alt-up" style="color:blue"></i>`;
            }
        } else {
            visuals.arrowQin.classList.add('hidden');
        }

        // 5. Heat Transfer Arrow (Ua term)
        // Term is Ua(T-Tc). If T > Tc, heat flows OUT. If T < Tc, heat flows IN.
        if (params.Ua > 0 && Math.abs(params.T - params.Tc) > 1) {
            visuals.arrowLoss.classList.remove('hidden');
            if (params.T > params.Tc) {
                // T is hotter, Heat leaving reactor (Arrow pointing out right)
                visuals.arrowLoss.innerHTML = `<i class="fas fa-long-arrow-alt-right" style="color:orange"></i>`;
                visuals.arrowLoss.style.right = "5%"; // Move to outside wall
            } else {
                // T is cooler, Heat entering from jacket (Arrow pointing in left)
                visuals.arrowLoss.innerHTML = `<i class="fas fa-long-arrow-alt-left" style="color:orange"></i>`;
                visuals.arrowLoss.style.right = "15%"; // Move to inside wall
            }
        } else {
            visuals.arrowLoss.classList.add('hidden');
        }
    }

    // 5. Event Listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updateSimulation);
    });

    // Initial Run
    updateSimulation();
});