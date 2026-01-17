// Full Adder Simulator Logic
class FullAdder {
    constructor() {
        this.A = 0;
        this.B = 0;
        this.Cin = 0;
        this.Sum = 0;
        this.Cout = 0;
        
        this.initializeElements();
        this.attachEventListeners();
        this.generateTruthTable();
        this.updateCircuit();
    }
    
    initializeElements() {
        this.inputA = document.getElementById('inputA');
        this.inputB = document.getElementById('inputB');
        this.inputCin = document.getElementById('inputCin');
        this.sumDisplay = document.getElementById('sumDisplay');
        this.coutDisplay = document.getElementById('coutDisplay');
        
        // Wire elements
        this.wires = {
            lineA: document.getElementById('lineA'),
            lineB: document.getElementById('lineB'),
            lineCin: document.getElementById('lineCin'),
            xor1Out: document.getElementById('xor1Out'),
            sumOut: document.getElementById('sumOut'),
            and1Out: document.getElementById('and1Out'),
            coutOut: document.getElementById('coutOut')
        };
    }
    
    attachEventListeners() {
        this.inputA.addEventListener('change', () => this.handleInputChange('A'));
        this.inputB.addEventListener('change', () => this.handleInputChange('B'));
        this.inputCin.addEventListener('change', () => this.handleInputChange('Cin'));
    }
    
    handleInputChange(input) {
        // Update value
        this[input] = this[`input${input}`].checked ? 1 : 0;
        
        // Update toggle display
        const label = this[`input${input}`].nextElementSibling;
        const valueSpan = label.querySelector('.toggle-value');
        valueSpan.textContent = this[input];
        
        // Animate toggle
        label.style.transform = 'scale(1.1)';
        setTimeout(() => {
            label.style.transform = 'scale(1)';
        }, 200);
        
        // Calculate and update circuit
        this.calculate();
        this.updateCircuit();
        this.highlightTruthTableRow();
    }
    
    calculate() {
        // Sum = A XOR B XOR Cin
        this.Sum = this.A ^ this.B ^ this.Cin;
        
        // Cout = (A AND B) OR (A AND Cin) OR (B AND Cin)
        this.Cout = (this.A & this.B) | (this.A & this.Cin) | (this.B & this.Cin);
        
        // Update output displays
        this.updateOutputDisplay(this.sumDisplay, this.Sum);
        this.updateOutputDisplay(this.coutDisplay, this.Cout);
    }
    
    updateOutputDisplay(element, value) {
        element.textContent = value;
        
        if (value === 1) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
        
        // Animate output change
        element.style.transform = 'scale(1.15)';
        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 300);
    }
    
    updateCircuit() {
        // Calculate intermediate values
        const xor1 = this.A ^ this.B;  // A XOR B
        const and1 = this.A & this.B;  // A AND B
        
        // Update wire states with animation
        this.updateWire('lineA', this.A);
        this.updateWire('lineB', this.B);
        this.updateWire('lineCin', this.Cin);
        
        setTimeout(() => {
            this.updateWire('xor1Out', xor1);
            this.updateWire('and1Out', and1);
        }, 150);
        
        setTimeout(() => {
            this.updateWire('sumOut', this.Sum);
            this.updateWire('coutOut', this.Cout);
        }, 300);
    }
    
    updateWire(wireId, active) {
        const wire = this.wires[wireId];
        if (!wire) return;
        
        if (active === 1) {
            wire.classList.add('active');
        } else {
            wire.classList.remove('active');
        }
    }
    
    generateTruthTable() {
        const tbody = document.getElementById('truthTableBody');
        tbody.innerHTML = '';
        
        // Generate all 8 combinations (2^3)
        for (let i = 0; i < 8; i++) {
            const a = (i >> 2) & 1;
            const b = (i >> 1) & 1;
            const cin = i & 1;
            
            const sum = a ^ b ^ cin;
            const cout = (a & b) | (a & cin) | (b & cin);
            
            const row = document.createElement('tr');
            row.dataset.a = a;
            row.dataset.b = b;
            row.dataset.cin = cin;
            
            row.innerHTML = `
                <td>${a}</td>
                <td>${b}</td>
                <td>${cin}</td>
                <td style="color: #38a169; font-weight: bold;">${sum}</td>
                <td style="color: #5a67d8; font-weight: bold;">${cout}</td>
            `;
            
            tbody.appendChild(row);
        }
    }
    
    highlightTruthTableRow() {
        const rows = document.querySelectorAll('#truthTableBody tr');
        
        rows.forEach(row => {
            const a = parseInt(row.dataset.a);
            const b = parseInt(row.dataset.b);
            const cin = parseInt(row.dataset.cin);
            
            if (a === this.A && b === this.B && cin === this.Cin) {
                row.classList.add('highlight');
                
                // Scroll to row if not visible
                row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Remove highlight after animation
                setTimeout(() => {
                    row.classList.remove('highlight');
                }, 1500);
            }
        });
    }
}

// Initialize the full adder when page loads
document.addEventListener('DOMContentLoaded', () => {
    new FullAdder();
});