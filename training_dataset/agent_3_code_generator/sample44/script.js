const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// Simulation State
const state = {
    // Inputs
    P: 300,
    CdA: 0.32,
    m: 80,
    Cr: 0.004,
    rho: 1.22,
    
    // Physics
    vCurrent: 0,    // m/s (Animated)
    vTarget: 0,     // m/s (Theoretical Limit)
    dist: 0,        // m (For animation scroll)
    accel: 0        // m/s^2
};

const g = 9.81;

// Bike Geometry (Fixed in local coordinates)
// Origin (0,0) is rear wheel hub
const bikeGeo = {
    wheelRadius: 28,
    wheelBase: 95,
    bb: { x: 35, y: 10 },
    seat: { x: 25, y: -55 },
    headTop: { x: 90, y: -50 }, // Top of headtube (stem base)
    headBot: { x: 86, y: -25 }, // Bottom of headtube
    forkDrop: { x: 95, y: 0 }   // Front axle
};

// DOM Elements
const ui = {
    inputs: {
        P: document.getElementById('p-input'),
        CdA: document.getElementById('cda-input'),
        m: document.getElementById('m-input'),
        Cr: document.getElementById('cr-input')
    },
    displays: {
        P: document.getElementById('val-p'),
        CdA: document.getElementById('val-cda'),
        m: document.getElementById('val-m'),
        Cr: document.getElementById('val-cr'),
        vCurr: document.getElementById('disp-v-curr'),
        vTarget: document.getElementById('disp-v-target'),
        pAero: document.getElementById('disp-p-aero'),
        status: document.getElementById('status-msg')
    },
    accelBar: document.getElementById('accel-bar')
};

let particles = [];

function init() {
    resize();
    window.addEventListener('resize', resize);
    
    // Bind Inputs
    Object.keys(ui.inputs).forEach(k => {
        ui.inputs[k].addEventListener('input', updateInputs);
    });

    // Init Wind Particles
    for(let i=0; i<30; i++) particles.push(createParticle());

    updateInputs();
    requestAnimationFrame(loop);
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function createParticle() {
    return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.6,
        len: 10 + Math.random() * 30,
        speedMod: 0.8 + Math.random() * 0.4
    };
}

// ----------------------------------------------------
// Physics Engine
// ----------------------------------------------------

// Solver for steady state velocity (Newton-Raphson)
function calculateTargetVelocity() {
    const { P, m, CdA, Cr, rho } = state;
    if (P <= 0) return 0;

    // f(v) = 0.5*rho*CdA*v^3 + Cr*m*g*v - P = 0
    let v = 10; 
    for(let i=0; i<15; i++) {
        const f = 0.5*rho*CdA*v**3 + Cr*m*g*v - P;
        const df = 1.5*rho*CdA*v**2 + Cr*m*g;
        if(Math.abs(df) < 1e-7) break;
        v -= f/df;
    }
    return Math.max(0, v);
}

function updateInputs() {
    state.P = parseFloat(ui.inputs.P.value);
    state.CdA = parseFloat(ui.inputs.CdA.value);
    state.m = parseFloat(ui.inputs.m.value);
    state.Cr = parseFloat(ui.inputs.Cr.value);

    // Update Text
    ui.displays.P.textContent = state.P;
    ui.displays.CdA.textContent = state.CdA.toFixed(2);
    ui.displays.m.textContent = state.m;
    ui.displays.Cr.textContent = state.Cr.toFixed(3);

    state.vTarget = calculateTargetVelocity();
    ui.displays.vTarget.textContent = (state.vTarget * 3.6).toFixed(1);
}

function updatePhysics(dt) {
    const { P, vCurrent, m, CdA, Cr, rho } = state;

    // Forces
    // 1. Propulsion: F = P/v (Clamp v to 1.0 to avoid singularity at start)
    // At very low speeds, torque limits force, but for simple power model:
    const vEff = Math.max(vCurrent, 1.0);
    const F_drive = (P > 0) ? P / vEff : 0;

    // 2. Resistance
    const F_aero = 0.5 * rho * CdA * vCurrent**2;
    const F_roll = Cr * m * g;
    const F_resist = F_aero + F_roll;

    // 3. Acceleration: a = F_net / m
    // Note: If P=0, brakes/friction apply
    let netForce = F_drive - F_resist;
    
    // Stop small oscillations near 0
    if (vCurrent < 0.1 && netForce < 0 && P === 0) {
        state.accel = 0;
        state.vCurrent = 0;
    } else {
        state.accel = netForce / m;
        state.vCurrent += state.accel * dt;
    }

    // Clamp speed
    if(state.vCurrent < 0) state.vCurrent = 0;

    // Update Distance for scrolling
    state.dist += state.vCurrent * dt * 15; // 15 = visual scale factor

    // Update UI Stats
    ui.displays.vCurr.textContent = (state.vCurrent * 3.6).toFixed(1);
    ui.displays.pAero.textContent = Math.round(F_aero * vCurrent); // Aero Power W
    
    // Status text
    const diff = state.vTarget - state.vCurrent;
    if(Math.abs(diff) < 0.1) ui.displays.status.textContent = "Steady State Reached";
    else if(diff > 0) ui.displays.status.textContent = "Accelerating...";
    else ui.displays.status.textContent = "Decelerating / Coasting...";

    // Accel bar visual
    const accelNorm = Math.min(Math.max(state.accel, 0), 2) / 2; // 0 to 2 m/s^2
    ui.accelBar.style.width = (accelNorm * 100) + "%";
}

// ----------------------------------------------------
// Drawing / IK
// ----------------------------------------------------

function loop(time) {
    const dt = 0.016; // Fixed step approx
    updatePhysics(dt);
    draw(time);
    requestAnimationFrame(loop);
}

function findJoint(p1, p2, r1, r2, forward) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const d = Math.sqrt(dx*dx + dy*dy);
    
    if (d > r1+r2 || d === 0) return { x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2 }; 

    const a = (r1*r1 - r2*r2 + d*d) / (2*d);
    const h = Math.sqrt(Math.max(0, r1*r1 - a*a));
    
    const x2 = p1.x + a * (dx/d);
    const y2 = p1.y + a * (dy/d);
    
    const rx = -dy * (h/d);
    const ry = dx * (h/d);

    return forward 
        ? { x: x2 - rx, y: y2 - ry }
        : { x: x2 + rx, y: y2 + ry };
}

function draw(time) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const roadY = canvas.height * 0.65;
    const scale = 1.0; // Draw scale

    // Background
    drawRoad(roadY);
    drawWind(roadY);

    // Bike & Rider Container
    ctx.save();
    const cx = canvas.width/2 - 50;
    const cy = roadY - bikeGeo.wheelRadius; 
    ctx.translate(cx, cy);

    drawBike(state.dist);
    drawRider(state.dist);

    ctx.restore();
}

function drawRoad(y) {
    ctx.fillStyle = "#475569";
    ctx.fillRect(0, y, canvas.width, canvas.height - y);
    
    // Stripes
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const offset = -(state.dist % 100);
    for(let i = offset; i < canvas.width; i+=100) {
        ctx.moveTo(i, y + 80);
        ctx.lineTo(i + 50, y + 80);
    }
    ctx.stroke();
}

function drawBike(dist) {
    const { wheelRadius, wheelBase, bb, seat, headTop, headBot, forkDrop } = bikeGeo;

    // Wheels
    const rot = dist / wheelRadius;
    drawWheel(0, 0, wheelRadius, rot);
    drawWheel(wheelBase, 0, wheelRadius, rot);

    // Frame (Static Geometry)
    ctx.strokeStyle = "#ef4444"; // Red
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    
    ctx.beginPath();
    ctx.moveTo(0, 0); // Rear Hub
    ctx.lineTo(bb.x, bb.y);
    ctx.lineTo(headBot.x, headBot.y);
    ctx.lineTo(headTop.x, headTop.y);
    ctx.lineTo(seat.x, seat.y);
    ctx.lineTo(bb.x, bb.y);
    ctx.moveTo(seat.x, seat.y);
    ctx.lineTo(0, 0); // Seat Stay
    ctx.stroke();

    // Fork
    ctx.strokeStyle = "#1e293b";
    ctx.beginPath();
    ctx.moveTo(headTop.x, headTop.y); // Stem
    ctx.lineTo(forkDrop.x, forkDrop.y); // Fork blade
    ctx.stroke();

    // Handlebars (Fixed to HeadTop)
    // Drawing a simple drop bar shape
    ctx.beginPath();
    ctx.moveTo(headTop.x, headTop.y);
    ctx.lineTo(headTop.x + 10, headTop.y); // Stem forward
    ctx.lineTo(headTop.x + 15, headTop.y + 15); // Drop curve
    ctx.stroke();
}

function drawRider(dist) {
    // Rider fits to bike geometry
    const { bb, seat, headTop } = bikeGeo;

    // 1. Hip Position (Fixed on seat)
    const hip = { x: seat.x + 5, y: seat.y - 10 };

    // 2. Hand Position (Fixed on drops/hoods)
    // Let's put hands on the "hoods" area, slightly forward of stem
    const hand = { x: headTop.x + 10, y: headTop.y - 5 };

    // 3. Shoulder Position (Variable based on CdA)
    // CdA range 0.15 (flat) to 0.7 (upright)
    // Map CdA to Torso Angle
    // 0.15 -> 0 deg (horizontal), 0.7 -> 60 deg
    const normCdA = Math.max(0, Math.min(1, (state.CdA - 0.15) / (0.6)));
    const torsoAngle = -Math.PI * 0.1 - (normCdA * Math.PI * 0.35); // Radians
    
    const torsoLen = 52;
    const shoulder = {
        x: hip.x + Math.sin(Math.abs(torsoAngle)) * torsoLen * 0.8 + 10, // heuristic x
        y: hip.y - Math.cos(Math.abs(torsoAngle)) * torsoLen
    };
    
    // Recalculate exact shoulder from Hip + Angle + Length
    // 0 deg = horizontal forward? No, let's just interpret visually.
    // Upright: Shoulder is high (y negative), X near hip.
    // Aero: Shoulder is low, X forward.
    shoulder.y = hip.y - 45 + (normCdA * 30); 
    shoulder.x = hip.x + 20 + ((1-normCdA) * 20);

    // --- Draw Far Side (Left) ---
    const crankL = 15;
    const angL = dist/12 + Math.PI;
    const pedalL = { 
        x: bb.x + Math.cos(angL)*crankL, 
        y: bb.y + Math.sin(angL)*crankL 
    };
    const kneeL = findJoint(hip, pedalL, 44, 42, true);
    const elbowL = findJoint(shoulder, hand, 32, 30, false);
    
    // Draw Left Leg/Arm
    ctx.strokeStyle = "#64748b"; // Darker
    ctx.lineWidth = 8;
    drawSegment(hip, kneeL);
    drawSegment(kneeL, pedalL);
    ctx.lineWidth = 6;
    drawSegment(shoulder, elbowL);
    drawSegment(elbowL, hand);

    // --- Draw Torso/Head ---
    ctx.strokeStyle = "#3b82f6"; // Blue
    ctx.lineWidth = 14;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(hip.x, hip.y);
    ctx.lineTo(shoulder.x, shoulder.y);
    ctx.stroke();

    // Head
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(shoulder.x + 5, shoulder.y - 10, 9, 0, Math.PI*2);
    ctx.fill();

    // --- Draw Near Side (Right) ---
    const angR = dist/12;
    const pedalR = { 
        x: bb.x + Math.cos(angR)*crankL, 
        y: bb.y + Math.sin(angR)*crankL 
    };
    const kneeR = findJoint(hip, pedalR, 44, 42, true);
    const elbowR = findJoint(shoulder, hand, 32, 30, false);

    ctx.strokeStyle = "#2563eb"; // Bright Blue Leg
    ctx.lineWidth = 9;
    drawSegment(hip, kneeR);
    drawSegment(kneeR, pedalR);

    ctx.strokeStyle = "#60a5fa"; // Light Blue Arm
    ctx.lineWidth = 7;
    drawSegment(shoulder, elbowR);
    drawSegment(elbowR, hand);
    
    // Glove
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(hand.x, hand.y, 4, 0, Math.PI*2);
    ctx.fill();
}

function drawSegment(p1, p2) {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
}

function drawWheel(x, y, r, ang) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.stroke();
    // Spokes
    ctx.lineWidth = 1;
    for(let i=0; i<3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.lineTo(0, r);
        ctx.stroke();
        ctx.rotate(Math.PI/3);
    }
    ctx.restore();
}

// Kick off once the DOM is ready (script is loaded at the end of the body)
init();

function drawWind(roadY) {
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 2;
    particles.forEach(p => {
        p.x -= (state.vCurrent * 3) * p.speedMod; // Scale wind speed
        if(p.x < -50) {
            p.x = canvas.width + 50;
            p.y = Math.random() * (roadY - 20);
        }
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y);
        ctx.stroke();
    });
}

function drawWind(roadY) {
    // Wind streaks move faster as speed rises to give a sense of motion
    const speed = 60 + state.vCurrent * 25; // px/s baseline + speed-driven
    ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
    ctx.lineWidth = 2;

    particles.forEach(p => {
        p.x -= speed * 0.016 * p.speedMod; // fixed timestep to match loop

        // Respawn when off screen
        if (p.x + p.len < 0) {
            p.x = canvas.width + Math.random() * 80;
            p.y = Math.random() * roadY * 0.8;
            p.len = 10 + Math.random() * 30;
        }

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.len, p.y);
        ctx.stroke();
    });
}