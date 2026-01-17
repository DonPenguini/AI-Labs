const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// DOM Elements
const inputs = {
    ua: document.getElementById('ua'),
    tin: document.getElementById('tin'),
    tout: document.getElementById('tout')
};
const displays = {
    ua: document.getElementById('val-ua'),
    tin: document.getElementById('val-tin'),
    tout: document.getElementById('val-tout'),
    q: document.getElementById('q-value'),
    status: document.getElementById('load-status'),
    card: document.querySelector('.result-card'),
    labelIn: document.getElementById('label-tin'),
    labelOut: document.getElementById('label-tout')
};

// State
let params = {
    ua: 200,
    tin: 24,
    tout: 35
};

// Animation State
let particles = [];
let lastTime = 0;

// Initialize
function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Listeners
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updateSim);
    });

    // Create initial particle pool
    for(let i=0; i<50; i++) {
        particles.push(createParticle());
    }

    updateSim();
    requestAnimationFrame(animate);
}

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function createParticle() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 0,
        size: Math.random() * 3 + 2,
        offset: Math.random() * 100
    };
}

// Core Logic
function updateSim() {
    // Read values
    params.ua = parseFloat(inputs.ua.value);
    params.tin = parseFloat(inputs.tin.value);
    params.tout = parseFloat(inputs.tout.value);

    // Update Text Displays
    displays.ua.textContent = params.ua;
    displays.tin.textContent = params.tin;
    displays.tout.textContent = params.tout;
    
    // Labels on canvas
    displays.labelIn.textContent = `Inside: ${params.tin}°C`;
    displays.labelOut.textContent = `Outside: ${params.tout}°C`;

    // Calculate Q
    // Note: Standard convention Q = UA * (Tout - Tin) for Gain
    // If Result is positive: Heat Gain (Cooling Load needed)
    // If Result is negative: Heat Loss (Heating Load needed)
    const deltaT = params.tout - params.tin;
    const Q = params.ua * deltaT;

    // Display Result
    displays.q.textContent = Math.abs(Q).toFixed(0);

    // Update UI Styles based on state
    if (Q > 0) {
        displays.status.textContent = "HEAT GAIN (Cooling Required)";
        displays.status.style.background = "#e74c3c"; // Red
        displays.card.style.borderLeftColor = "#e74c3c";
    } else if (Q < 0) {
        displays.status.textContent = "HEAT LOSS (Heating Required)";
        displays.status.style.background = "#3498db"; // Blue
        displays.card.style.borderLeftColor = "#3498db";
    } else {
        displays.status.textContent = "EQUILIBRIUM";
        displays.status.style.background = "#2ecc71"; // Green
        displays.card.style.borderLeftColor = "#2ecc71";
    }
}

// Helper: Get color from temperature
function getTempColor(temp) {
    // Map -30 (Deep Blue) to 50 (Deep Red)
    // 20 is approx neutral (Greenish/White)
    
    // Normalize -30 to 50 -> 0 to 1
    const tMin = -30;
    const tMax = 50;
    let norm = (temp - tMin) / (tMax - tMin);
    norm = Math.max(0, Math.min(1, norm));

    // Simple R,G,B interpolation
    // Cold (0, 0, 255) -> Hot (255, 0, 0)
    const r = Math.floor(norm * 255);
    const b = Math.floor((1 - norm) * 255);
    const g = Math.floor(100 - Math.abs(norm - 0.5) * 150); // Little green in middle
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Animation Loop
function animate(time) {
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Backgrounds (Temperatures)
    const wallX = canvas.width / 2;
    // Wall thickness visual varies slightly with UA (Inverse relationship conceptually, 
    // but usually higher UA means thinner insulation. Let's make wall width static 
    // but visualize insulation density or just keep it simple with colors).
    const wallWidth = 40; 

    const colorOut = getTempColor(params.tout);
    const colorIn = getTempColor(params.tin);

    // Outside (Left)
    ctx.fillStyle = colorOut;
    ctx.fillRect(0, 0, wallX - wallWidth/2, canvas.height);

    // Inside (Right)
    ctx.fillStyle = colorIn;
    ctx.fillRect(wallX + wallWidth/2, 0, canvas.width, canvas.height);

    // 2. Draw Wall
    ctx.fillStyle = "#95a5a6";
    ctx.fillRect(wallX - wallWidth/2, 0, wallWidth, canvas.height);
    
    // Wall texture/hatch
    ctx.strokeStyle = "#7f8c8d";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<canvas.height; i+=20) {
        ctx.moveTo(wallX - wallWidth/2, i);
        ctx.lineTo(wallX + wallWidth/2, i+20);
    }
    ctx.stroke();

    // 3. Draw Heat Flux (Particles)
    // Direction: Tout > Tin ? Left to Right : Right to Left
    const deltaT = params.tout - params.tin;
    
    // Speed proportional to Q (or UA * deltaT)
    // We log scale visual speed so it doesn't get too crazy
    const speedFactor = Math.log(Math.abs(params.ua * deltaT) + 1) * 2;
    const direction = deltaT > 0 ? 1 : -1;

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";

    if (Math.abs(deltaT) < 0.5) {
        // Equilibrium - No flow
        ctx.font = "20px Arial";
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.fillText("No Heat Transfer", wallX, canvas.height/2);
    } else {
        particles.forEach(p => {
            // Update Position
            p.x += speedFactor * direction;

            // Reset logic
            if (direction === 1) { // Moving Right
                if (p.x > canvas.width) p.x = -20;
            } else { // Moving Left
                if (p.x < -20) p.x = canvas.width + 20;
            }

            // Draw Arrow/Particle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            ctx.fill();
        });
        
        // Draw Main Arrow Overlay
        drawBigArrow(wallX, canvas.height/2, direction, Math.abs(deltaT));
    }

    requestAnimationFrame(animate);
}

function drawBigArrow(x, y, dir, magnitude) {
    ctx.save();
    ctx.translate(x, y);
    if (dir === -1) ctx.rotate(Math.PI);
    
    const scale = Math.min(1 + magnitude/20, 3); // Scale arrow by temp diff
    
    ctx.beginPath();
    ctx.moveTo(-30 * scale, -10 * scale);
    ctx.lineTo(0, -10 * scale);
    ctx.lineTo(0, -20 * scale);
    ctx.lineTo(30 * scale, 0);
    ctx.lineTo(0, 20 * scale);
    ctx.lineTo(0, 10 * scale);
    ctx.lineTo(-30 * scale, 10 * scale);
    ctx.closePath();
    
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.shadowBlur = 10;
    ctx.shadowColor = "white";
    ctx.fill();
    ctx.restore();
}

// Start
init();