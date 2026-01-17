// DOM Elements
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

const n1Input = document.getElementById('n1');
const n2Input = document.getElementById('n2');
const theta1Input = document.getElementById('theta1');

const n1Val = document.getElementById('n1-val');
const n2Val = document.getElementById('n2-val');
const theta1Val = document.getElementById('theta1-val');

const theta2Result = document.getElementById('theta2-result');
const tirWarning = document.getElementById('tir-warning');

// State
let n1 = 1.0;
let n2 = 1.5;
let theta1Deg = 30;
let animationOffset = 0; // For animating the beam flow

// Resize handling
function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
});
resizeCanvas();

// Event Listeners
function updateState() {
    n1 = parseFloat(n1Input.value);
    n2 = parseFloat(n2Input.value);
    theta1Deg = parseFloat(theta1Input.value);

    // Update Text Displays
    n1Val.textContent = n1.toFixed(2);
    n2Val.textContent = n2.toFixed(2);
    theta1Val.textContent = theta1Deg.toFixed(1) + "°";

    calculateAndDraw();
}

n1Input.addEventListener('input', updateState);
n2Input.addEventListener('input', updateState);
theta1Input.addEventListener('input', updateState);

// Physics & Rendering Loop
function calculateAndDraw() {
    // 1. Physics Calculations
    const theta1Rad = theta1Deg * (Math.PI / 180);
    
    // Snell's Law: n1 * sin(theta1) = n2 * sin(theta2)
    // sin(theta2) = (n1/n2) * sin(theta1)
    const sinTheta2 = (n1 / n2) * Math.sin(theta1Rad);
    
    let isTIR = false;
    let theta2Rad = 0;

    if (Math.abs(sinTheta2) > 1.0) {
        isTIR = true;
    } else {
        theta2Rad = Math.asin(sinTheta2);
    }

    // Update Results UI
    if (isTIR) {
        theta2Result.textContent = "--";
        tirWarning.style.display = "flex";
    } else {
        const theta2Deg = theta2Rad * (180 / Math.PI);
        theta2Result.textContent = theta2Deg.toFixed(1) + "°";
        tirWarning.style.display = "none";
    }

    draw(theta1Rad, theta2Rad, isTIR);
}

function draw(theta1Rad, theta2Rad, isTIR) {
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rayLength = Math.max(w, h); // Ensure rays go off screen

    // Clear Canvas
    ctx.clearRect(0, 0, w, h);

    // --- Draw Media Backgrounds ---
    // Medium 1 (Top) - Opacity based on density (index)
    // We use a blue-ish base. Higher index = darker/more opaque.
    const alpha1 = (n1 - 1.0) / 2.0 * 0.5 + 0.1; 
    ctx.fillStyle = `rgba(135, 206, 235, ${alpha1})`; // SkyBlue
    ctx.fillRect(0, 0, w, cy);

    // Medium 2 (Bottom)
    const alpha2 = (n2 - 1.0) / 2.0 * 0.5 + 0.1;
    ctx.fillStyle = `rgba(0, 0, 139, ${alpha2})`; // DarkBlue
    ctx.fillRect(0, cy, w, h - cy);

    // --- Draw Interface & Normal ---
    
    // Interface (Horizontal)
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Normal (Vertical)
    ctx.beginPath();
    ctx.setLineDash([5, 5]);
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // --- Draw Light Rays ---
    // Light Source Color
    const rayColor = "#e74c3c"; // Red laser
    const shadowRayColor = "rgba(231, 76, 60, 0.4)"; // Faint reflection
    
    // 1. Incident Ray (From Top Left quadrant usually)
    // Start point calculation: x = cx - L*sin(theta), y = cy - L*cos(theta)
    const ix = cx - rayLength * Math.sin(theta1Rad);
    const iy = cy - rayLength * Math.cos(theta1Rad);

    drawLaser(ix, iy, cx, cy, rayColor);

    // 2. Transmitted / Refracted Ray OR TIR
    if (isTIR) {
        // Total Internal Reflection
        // Reflection Angle = Incident Angle
        // Goes to Top Right quadrant: x = cx + L*sin(theta), y = cy - L*cos(theta)
        const rx = cx + rayLength * Math.sin(theta1Rad);
        const ry = cy - rayLength * Math.cos(theta1Rad);
        
        drawLaser(cx, cy, rx, ry, rayColor);
    } else {
        // Refraction
        // Goes to Bottom Right quadrant: x = cx + L*sin(theta2), y = cy + L*cos(theta2)
        const tx = cx + rayLength * Math.sin(theta2Rad);
        const ty = cy + rayLength * Math.cos(theta2Rad);
        
        drawLaser(cx, cy, tx, ty, rayColor);

        // Optional: Draw a faint partial reflection even if not TIR (Fresnel reflection)
        // Physics realism: there is always some reflection.
        const rfx = cx + rayLength * Math.sin(theta1Rad);
        const rfy = cy - rayLength * Math.cos(theta1Rad);
        drawLaser(cx, cy, rfx, rfy, shadowRayColor, false);
    }

    // Draw Angles Arc
    drawAngleArc(cx, cy, -Math.PI/2 - theta1Rad, -Math.PI/2, 40, "θ1"); // Incident
    if (!isTIR) {
        drawAngleArc(cx, cy, Math.PI/2, Math.PI/2 - theta2Rad, 40, "θ2"); // Refracted
    }
}

// Helper: Draw animated laser beam
function drawLaser(x1, y1, x2, y2, color, animate = true) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    
    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset

    // Inner core
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // "Photon" Animation along the line
    if (animate) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const steps = 20; // spacing
        
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        
        // Move the dots based on time
        const phase = (Date.now() / 50) % steps;
        
        for (let i = 0; i < dist; i+= steps) {
            let t = (i + phase);
            if(t > dist) t -= dist;
            
            const ratio = t / dist;
            const px = x1 + dx * ratio;
            const py = y1 + dy * ratio;
            
            ctx.beginPath();
            ctx.arc(px, py, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

// Helper: Draw angle arcs
function drawAngleArc(cx, cy, startAngle, endAngle, radius, label) {
    ctx.beginPath();
    // In canvas arc, 0 is Right (3 o'clock). 
    // Normal is Up (-PI/2) and Down (PI/2).
    // Incident comes from Top-Left. Ray angle is relative to Vertical Normal.
    // Canvas geometry requires offset calculation. 
    
    // Simplified logic: Drawing arcs relative to the Normal (Y-axis)
    // Incident is in Upper-Left. 
    // We measure FROM Normal TO Ray.
    // Normal Up is -90deg (-PI/2). Ray is (-90 - theta).
    
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Text Label
    const midAngle = (startAngle + endAngle) / 2;
    const tx = cx + (radius + 15) * Math.cos(midAngle);
    const ty = cy + (radius + 15) * Math.sin(midAngle);
    ctx.fillStyle = "white";
    ctx.font = "12px Arial";
    ctx.fillText(label, tx - 5, ty + 5);
}

// Animation Loop
function animate() {
    updateState(); // Re-calculates and calls draw
    requestAnimationFrame(animate);
}

// Start
animate();