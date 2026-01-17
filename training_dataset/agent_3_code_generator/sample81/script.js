document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & State ---
    const lambdaInput = document.getElementById('lambdaInput');
    const wInput = document.getElementById('wInput');
    const lambdaDisplay = document.getElementById('lambdaVal');
    const wDisplay = document.getElementById('wVal');
    const mathWipDisplay = document.getElementById('mathWip');
    const countWipDisplay = document.getElementById('countWip');
    const systemBox = document.getElementById('systemBox');

    let state = {
        lambda: parseFloat(lambdaInput.value), // Items per second
        W: parseFloat(wInput.value),           // Seconds to traverse
        items: [],                             // Array of active item objects
        lastSpawnTime: 0,                      // Timestamp
        accumulatedTime: 0                     // For precise spawning
    };

    // --- Core Update Loop ---
    function update(timestamp) {
        if (!state.lastSpawnTime) state.lastSpawnTime = timestamp;
        const dt = (timestamp - state.lastSpawnTime) / 1000; // Delta time in seconds
        state.lastSpawnTime = timestamp;

        // 1. Update Parameters (in case slider moved)
        updateDisplays();

        // 2. Spawn Logic
        // We accumulate time to handle partial frames correctly
        state.accumulatedTime += dt;
        const spawnInterval = 1 / state.lambda;

        while (state.accumulatedTime >= spawnInterval) {
            spawnItem();
            state.accumulatedTime -= spawnInterval;
        }

        // 3. Move Items
        // Progress (0 to 1) = (dt / W)
        // If W is small, speed is high.
        const speed = dt / state.W;
        
        // Filter out items that have finished (progress >= 1)
        // We use a backwards loop or filter to remove safely
        for (let i = state.items.length - 1; i >= 0; i--) {
            let itemObj = state.items[i];
            itemObj.progress += speed;

            // Update DOM Position
            // 0% is left edge, 100% is right edge
            // We subtract half item width (handled in CSS transform) to center it
            if (itemObj.element) {
                itemObj.element.style.left = `${itemObj.progress * 100}%`;
            }

            // Remove if finished
            if (itemObj.progress >= 1) {
                if (itemObj.element) itemObj.element.remove();
                state.items.splice(i, 1);
            }
        }

        // 4. Update Stats
        updateStats();

        requestAnimationFrame(update);
    }

    // --- Helper Functions ---

    function spawnItem() {
        const itemEl = document.createElement('div');
        itemEl.classList.add('item');
        
        // Visual Variation: stagger vertical position slightly to avoid perfect overlap
        // using a sine wave based on time or just random
        const verticalOffset = 50 + (Math.random() * 40 - 20); // 30% to 70% top
        itemEl.style.top = `${verticalOffset}%`;
        
        // Start at left
        itemEl.style.left = '0%';

        systemBox.appendChild(itemEl);

        state.items.push({
            element: itemEl,
            progress: 0
        });
    }

    function updateDisplays() {
        state.lambda = parseFloat(lambdaInput.value);
        state.W = parseFloat(wInput.value);

        lambdaDisplay.textContent = state.lambda.toFixed(1);
        wDisplay.textContent = state.W.toFixed(1);
    }

    function updateStats() {
        // Theoretical L
        const theoreticalL = state.lambda * state.W;
        mathWipDisplay.textContent = theoreticalL.toFixed(2);

        // Actual Visual L
        countWipDisplay.textContent = state.items.length;
    }

    // --- Initialization ---
    requestAnimationFrame(update);
});