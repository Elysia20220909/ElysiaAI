const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size to full screen
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

// Matrix characters (Katakana + Alphanumeric)
const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()';
const charArray = characters.split('');

const fontSize = 16;
const columns = canvas.width / fontSize;

// Array to track the y-position of each column
const drops = [];
for (let i = 0; i < columns; i++) {
    drops[i] = Math.random() * -100; // Randomize start to prevent "wave" look
}

function draw() {
    // Semi-transparent black to create trailing effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0F0'; // Matrix green
    ctx.font = fontSize + 'px monospace';

    for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Brighter head for the falling drops
        if (Math.random() > 0.95) {
            ctx.fillStyle = '#fff'; // White head
        } else {
            ctx.fillStyle = '#0F0'; // Normal green
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top after it reaches the bottom
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        drops[i]++;
    }
}

// Animation loop
function animate() {
    draw();
    requestAnimationFrame(animate);
}

animate();
