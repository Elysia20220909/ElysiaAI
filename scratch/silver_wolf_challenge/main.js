const BASE_SCORE = 1024;
let currentScore = BASE_SCORE;
let gameTime = 5.0;
let isPlaying = false;
let autoTapInterval = null;

// DOM Elements
const screens = {
    start: document.getElementById('start-screen'),
    countdown: document.getElementById('countdown-screen'),
    play: document.getElementById('play-screen'),
    result: document.getElementById('result-screen')
};

const elements = {
    btnStart: document.getElementById('btn-start'),
    btnRestart: document.getElementById('btn-restart'),
    tapTarget: document.getElementById('tap-target'),
    scoreDisplay: document.getElementById('game-score'),
    timerDisplay: document.getElementById('game-timer'),
    countdownDisplay: document.getElementById('countdown-timer'),
    finalScore: document.getElementById('final-score'),
    tokenText: document.getElementById('result-token'),
    defeatMode: document.getElementById('defeat-mode')
};

// State Management
function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
}

// Game Logic
function startGame() {
    currentScore = BASE_SCORE;
    gameTime = 5.0;
    elements.scoreDisplay.textContent = currentScore;
    elements.timerDisplay.textContent = gameTime.toFixed(2);
    
    showScreen('countdown');
    let count = 3;
    elements.countdownDisplay.textContent = count;
    
    const interval = setInterval(() => {
        count--;
        if (count > 0) {
            elements.countdownDisplay.textContent = count;
        } else {
            clearInterval(interval);
            beginPlay();
        }
    }, 1000);
}

function beginPlay() {
    isPlaying = true;
    showScreen('play');
    
    // Check for Defeat Mode (Auto-tap)
    if (elements.defeatMode.checked) {
        console.log("DEFEAT MODE ACTIVATED: SYSTEM BYPASSED.");
        autoTapInterval = setInterval(() => {
            if (isPlaying) {
                elements.tapTarget.classList.toggle('is-tapping');
                handleTap();
            }
        }, 30); // ~33 taps per second - more balanced visual/performance
    }

    const startTimestamp = performance.now();
    const gameDuration = 5000;

    function update() {
        if (!isPlaying) return;
        
        const elapsed = performance.now() - startTimestamp;
        const remaining = Math.max(0, (gameDuration - elapsed) / 1000);
        
        elements.timerDisplay.textContent = remaining.toFixed(2);
        
        if (remaining <= 0) {
            endGame();
        } else {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

function handleTap() {
    if (!isPlaying) return;
    currentScore++;
    elements.scoreDisplay.textContent = currentScore;
    
    // Visual feedback for tap
    createRipple();
}

function createRipple() {
    const container = elements.tapTarget.querySelector('.ripple-container');
    // Limit ripples to prevent DOM bloat
    if (container.children.length > 10) return;

    const ripple = document.createElement('div');
    ripple.className = 'ripple';
    container.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 500);
}

function endGame() {
    isPlaying = false;
    if (autoTapInterval) {
        clearInterval(autoTapInterval);
        autoTapInterval = null;
        elements.tapTarget.classList.remove('is-tapping');
    }
    
    showScreen('result');
    elements.finalScore.textContent = currentScore;
    
    // Generate dummy JWT
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(JSON.stringify({
        score: currentScore,
        gameId: Math.random().toString(36).substring(7),
        iat: Math.floor(Date.now() / 1000),
        defeated: elements.defeatMode.checked
    }));
    const signature = "REDACTED_SIGNATURE_" + Math.random().toString(36).substring(2, 10);
    
    elements.tokenText.textContent = `${header}.${payload}.${signature}`;
}

// Event Listeners
elements.btnStart.addEventListener('click', startGame);
elements.btnRestart.addEventListener('click', () => showScreen('start'));
elements.tapTarget.addEventListener('mousedown', handleTap);
elements.tapTarget.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleTap();
});

// Keyboard support (Space/Enter)
window.addEventListener('keydown', (e) => {
    if (isPlaying && (e.code === 'Space' || e.code === 'Enter')) {
        handleTap();
    }
});
