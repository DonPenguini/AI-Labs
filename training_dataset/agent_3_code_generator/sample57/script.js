document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');

    // Inputs & Outputs
    const depthSlider = document.getElementById('depthSlider');
    const valH = document.getElementById('val_h');
    const outC = document.getElementById('out_c');
    const outKmh = document.getElementById('out_kmh');

    // Constants
    const g = 9.81;

    // Simulation State
    let h = 50; // meters
    let c = 0;  // m/s
    let wavePhase = 0;
    
    // Wave Visual Parameters
    let waveAmplitude = 10; 
    let waveLength = 200; // visual pixels

    function resizeCanvas() {
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function updatePhysics() {
        // Get input
        h = parseFloat(depthSlider.value);
        
        // Update UI
        valH.textContent = h.toFixed(1);

        // Calculate Celerity: c = sqrt(g * h)
        c = Math.sqrt(g * h);

        // Update Results
        outC.textContent = c.toFixed(2);
        outKmh.textContent = (c * 3.6).toFixed(1); // Convert m/s to km/h
    }

    function draw() {
        // Clear background (Sky)
        // Create a nice gradient for the sky
        let skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, "#87CEEB"); // Sky Blue
        skyGradient.addColorStop(1, "#E0F7FA"); // Light Cyan
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Determine Visual Water Level
        // We want to visualize the depth change, but 0.1m to 200m is a huge range.
        // We will map 0-200m to 10%-80% of canvas height linearly for visual feedback.
        
        const maxVisualDepth = canvas.height * 0.8;
        const minVisualDepth = canvas.height * 0.1;
        const maxInputH = 200;
        
        // Calculate visual height of the water column
        // Linear mapping for simplicity of "more h = more water"
        const visualWaterHeight = minVisualDepth + (h / maxInputH) * (maxVisualDepth - minVisualDepth);
        
        const waterSurfaceY = canvas.height - visualWaterHeight;

        // Draw Seabed
        ctx.fillStyle = "#8B4513"; // Brown
        ctx.fillRect(0, canvas.height - 10, canvas.width, 10);
        
        // Draw Depth Marker Line (Visual aid)
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.moveTo(canvas.width - 50, waterSurfaceY);
        ctx.lineTo(canvas.width - 50, canvas.height);
        ctx.stroke();
        
        // Label Depth
        ctx.fillStyle = "#333";
        ctx.font = "12px Arial";
        ctx.fillText(`h = ${h}m`, canvas.width - 90, canvas.height / 2 + waterSurfaceY/2);

        // Draw Water with Waves
        ctx.beginPath();
        ctx.moveTo(0, canvas.height); // Start bottom left
        ctx.lineTo(0, waterSurfaceY); // Go to surface start

        // Draw sine wave for surface
        // c determines the speed of phase change
        // We scale c down to make it viewable on screen pixels
        // Visual speed factor:
        const visualSpeedFactor = 0.05; 
        
        // Increment phase based on Celerity
        wavePhase -= c * visualSpeedFactor; 

        for (let x = 0; x <= canvas.width; x += 5) {
            // y = MeanLevel + Amplitude * sin(kx + phase)
            let y = waterSurfaceY + Math.sin((x * 2 * Math.PI / waveLength) + wavePhase) * waveAmplitude;
            ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height); // Bottom right
        ctx.closePath();

        // Water Gradient
        let waterGradient = ctx.createLinearGradient(0, waterSurfaceY, 0, canvas.height);
        waterGradient.addColorStop(0, "rgba(52, 152, 219, 0.8)"); // Surface Blue
        waterGradient.addColorStop(1, "rgba(41, 128, 185, 1)");   // Deep Blue
        ctx.fillStyle = waterGradient;
        ctx.fill();

        // Draw a visual "particle" or floating object to emphasize motion speed
        drawFloatingObject(waterSurfaceY);
        
        requestAnimationFrame(draw);
    }

    function drawFloatingObject(surfaceBaseY) {
        // Draw a simple boat/buoy that bobs on the wave
        // It stays in the center horizontally (x = canvas.width/2)
        // But moves vertically with the wave math
        const boatX = canvas.width / 2;
        const boatY = surfaceBaseY + Math.sin((boatX * 2 * Math.PI / waveLength) + wavePhase) * waveAmplitude;

        ctx.fillStyle = "#e74c3c"; // Red Buoy
        ctx.beginPath();
        ctx.arc(boatX, boatY, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw speed arrow
        // Arrow length proportional to c
        const arrowLen = c * 3; // Scaling factor
        ctx.strokeStyle = "#c0392b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boatX, boatY - 15);
        ctx.lineTo(boatX + arrowLen, boatY - 15);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(boatX + arrowLen, boatY - 15);
        ctx.lineTo(boatX + arrowLen - 5, boatY - 18);
        ctx.lineTo(boatX + arrowLen - 5, boatY - 12);
        ctx.fill();
        
        // Speed Text above arrow
        ctx.fillStyle = "#c0392b";
        ctx.font = "bold 11px Arial";
        ctx.fillText("V = " + c.toFixed(1) + " m/s", boatX, boatY - 25);
    }

    // Initialize
    depthSlider.addEventListener('input', updatePhysics);
    updatePhysics();
    draw();
});