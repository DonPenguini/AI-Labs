document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const l0Input = document.getElementById('l0-input');
    const vInput = document.getElementById('v-input');
    
    const l0Display = document.getElementById('l0-value');
    const vDisplay = document.getElementById('v-value');
    const factorDisplay = document.getElementById('factor-value');
    const lDisplay = document.getElementById('l-value');
    
    const rodRest = document.getElementById('rod-rest');
    const rodMoving = document.getElementById('rod-moving');
    const scene = document.querySelector('.scene');

    // Constants
    const C = 3e8; // Speed of light (m/s) - Conceptual use
    
    // Animation State
    let animationId;
    let positionX = 0;
    let lastTime = 0;

    function calculateValues() {
        const l0 = parseFloat(l0Input.value); // meters (conceptual)
        const vRatio = parseFloat(vInput.value); // v/c
        
        // Lorentz Factor calculation: sqrt(1 - v^2/c^2)
        // Since input is already v/c, we just square the input
        const betaSquared = vRatio * vRatio;
        const contractionFactor = Math.sqrt(1 - betaSquared);
        
        const lContracted = l0 * contractionFactor;

        return {
            l0,
            vRatio,
            contractionFactor,
            lContracted
        };
    }

    function updateUI() {
        const { l0, vRatio, contractionFactor, lContracted } = calculateValues();

        // Update Text Displays
        l0Display.textContent = l0.toFixed(0);
        vDisplay.textContent = vRatio.toFixed(3);
        factorDisplay.textContent = contractionFactor.toFixed(3);
        lDisplay.textContent = lContracted.toFixed(2);

        // Update Visuals
        // We map 1 meter to X pixels. Let's say max width (100m) takes up 80% of container
        const containerWidth = scene.clientWidth;
        const maxInputL = 100;
        const pixelScale = (containerWidth * 0.8) / maxInputL;

        const widthRestPx = l0 * pixelScale;
        const widthMovingPx = lContracted * pixelScale;

        rodRest.style.width = `${widthRestPx}px`;
        rodMoving.style.width = `${widthMovingPx}px`;
        
        // Center the rest rod
        rodRest.style.left = `${(containerWidth - widthRestPx) / 2}px`;
    }

    function animate(timestamp) {
        if (!lastTime) lastTime = timestamp;
        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        const { vRatio, lContracted } = calculateValues();
        
        // Determine container width for wrapping
        const containerWidth = scene.clientWidth;
        
        // Calculate speed in pixels per frame
        // Visual speed needs to be artificially scaled to be viewable.
        // If v=0, speed=0. If v=c, speed is fast but viewable.
        // Let's say max speed is 500 pixels per second.
        const visualSpeedScale = 300; 
        const velocityPxPerSec = vRatio * visualSpeedScale;
        
        // Update position
        positionX += (velocityPxPerSec * (deltaTime / 1000));

        // Get current width of moving rod (in pixels) for wrapping logic
        const maxInputL = 100;
        const pixelScale = (containerWidth * 0.8) / maxInputL;
        const currentRodWidth = lContracted * pixelScale;

        // Wrap around logic
        if (positionX > containerWidth) {
            positionX = -currentRodWidth;
        }

        // Apply transform
        rodMoving.style.transform = `translateX(${positionX}px)`;

        animationId = requestAnimationFrame(animate);
    }

    // Event Listeners
    l0Input.addEventListener('input', updateUI);
    vInput.addEventListener('input', updateUI);

    // Handle Window Resize to keep scaling correct
    window.addEventListener('resize', updateUI);

    // Initialize
    updateUI();
    animationId = requestAnimationFrame(animate);
});