const COLS = 8;
const ROWS = 14;
const TOTAL_PIECES = COLS * ROWS;

const IMAGE_URL = 'img/imgOne.jpg'; 
let pieces = [];
let selectedTile = null;
let audioStarted = false;

const board = document.getElementById('board');
const songOne = document.getElementById('songOne');
const songTwo = document.getElementById('songTwo');
const playPauseBtn = document.getElementById('play-pause-btn');
const seekSlider = document.getElementById('seek-slider');
const volumeSlider = document.getElementById('volume-slider');
const lockedCountEl = document.getElementById('locked-count');
const finalImage = document.getElementById('final-image');

let activeSong = songOne;
let isSeeking = false;

// Web Audio API para sonido de encaje mágico sintetizado
function playSnapSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.12);
        
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
}

songOne.volume = 0.4;
songTwo.volume = 0.4;

document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

// Control de Play / Pausa
function togglePlay() {
    if (playPauseBtn.disabled) return;

    if (activeSong.paused) {
        activeSong.play().then(() => {
            playPauseBtn.innerHTML = '❚❚';
            audioStarted = true;
        }).catch(() => {});
    } else {
        activeSong.pause();
        playPauseBtn.innerHTML = '▶';
    }
}

playPauseBtn.addEventListener('click', togglePlay);

volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    songOne.volume = val;
    songTwo.volume = val;
});

function syncSeekSlider() {
    const duration = activeSong.duration;
    if (!duration || Number.isNaN(duration)) return;
    seekSlider.value = (activeSong.currentTime / duration) * 100;
}

seekSlider.addEventListener('pointerdown', () => { 
    if (!seekSlider.disabled) isSeeking = true; 
});
seekSlider.addEventListener('pointerup', () => { isSeeking = false; });

seekSlider.addEventListener('input', (e) => {
    if (seekSlider.disabled) return;
    const duration = activeSong.duration;
    if (!duration || Number.isNaN(duration)) return;
    const percent = parseFloat(e.target.value) / 100;
    activeSong.currentTime = duration * percent;
});

songOne.addEventListener('timeupdate', () => {
    if (!isSeeking && activeSong === songOne) syncSeekSlider();
});

songTwo.addEventListener('timeupdate', () => {
    if (!isSeeking && activeSong === songTwo) syncSeekSlider();
});

function startFirstSong() {
    if (!audioStarted && songOne.paused) {
        songOne.play().then(() => {
            playPauseBtn.innerHTML = '❚❚';
            audioStarted = true;
            syncSeekSlider();
        }).catch(() => {});
    }
}

function shuffleArray(array) {
    let shuffled = [...array];
    let isAnyInCorrectPlace = true;

    while (isAnyInCorrectPlace) {
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        isAnyInCorrectPlace = shuffled.some((val, idx) => val === idx);
    }
    return shuffled;
}

function initPuzzle() {
    let indices = Array.from({length: TOTAL_PIECES}, (_, i) => i);
    let shuffled = shuffleArray(indices);

    shuffled.forEach((correctIndex, currentPos) => {
        const tile = document.createElement('div');
        tile.classList.add('tile');
        tile.dataset.correctIndex = correctIndex;
        tile.dataset.currentPos = currentPos;

        const col = correctIndex % COLS;
        const row = Math.floor(correctIndex / COLS);
        
        const xPos = (col / (COLS - 1)) * 100;
        const yPos = (row / (ROWS - 1)) * 100;

        tile.style.backgroundImage = `url('${IMAGE_URL}')`;
        tile.style.backgroundSize = `${COLS * 100}% ${ROWS * 100}%`;
        tile.style.backgroundPosition = `${xPos}% ${yPos}%`;

        setupInteraction(tile);

        board.appendChild(tile);
        pieces.push(tile);
    });

    checkAndLockTiles(false);
}

function setupInteraction(tile) {
    let startX, startY;
    let activeTile = null;
    let isDragging = false;

    tile.addEventListener('pointerdown', (e) => {
        if (tile.classList.contains('locked')) return;
        startFirstSong();
        
        activeTile = tile;
        startX = e.clientX;
        startY = e.clientY;
        isDragging = false;

        activeTile.setPointerCapture(e.pointerId);
    });

    tile.addEventListener('pointermove', (e) => {
        if (!activeTile || activeTile.classList.contains('locked')) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
            isDragging = true;
            activeTile.classList.add('dragging');
            activeTile.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
        }
    });

    tile.addEventListener('pointerup', (e) => {
        if (!activeTile) return;

        activeTile.releasePointerCapture(e.pointerId);
        activeTile.classList.remove('dragging');
        activeTile.style.transform = '';

        if (isDragging) {
            activeTile.style.visibility = 'hidden';
            const targetEl = document.elementFromPoint(e.clientX, e.clientY);
            activeTile.style.visibility = 'visible';

            if (targetEl && targetEl.classList.contains('tile') && !targetEl.classList.contains('locked') && targetEl !== activeTile) {
                swapTiles(activeTile, targetEl);
            }

            if (selectedTile) {
                selectedTile.classList.remove('selected');
                selectedTile = null;
            }
        } else {
            handleTap(activeTile);
        }

        activeTile = null;
    });
}

function handleTap(tile) {
    if (tile.classList.contains('locked')) return;

    if (!selectedTile) {
        selectedTile = tile;
        tile.classList.add('selected');
    } else if (selectedTile === tile) {
        selectedTile.classList.remove('selected');
        selectedTile = null;
    } else {
        swapTiles(selectedTile, tile);
        selectedTile.classList.remove('selected');
        selectedTile = null;
    }
}

function swapTiles(tile1, tile2) {
    const bg1 = tile1.style.backgroundPosition;
    const idx1 = tile1.dataset.correctIndex;

    tile1.style.backgroundPosition = tile2.style.backgroundPosition;
    tile1.dataset.correctIndex = tile2.dataset.correctIndex;

    tile2.style.backgroundPosition = bg1;
    tile2.dataset.correctIndex = idx1;

    checkAndLockTiles(true);
}

function checkAndLockTiles(playSound = true) {
    let newlyLocked = false;
    let currentLockedCount = 0;

    pieces.forEach(tile => {
        if (tile.dataset.correctIndex == tile.dataset.currentPos) {
            if (!tile.classList.contains('locked')) {
                tile.classList.add('locked');
                newlyLocked = true;
            }
            currentLockedCount++;
        }
    });

    if (lockedCountEl) {
        lockedCountEl.innerText = currentLockedCount;
    }

    if (newlyLocked && playSound) {
        playSnapSound();
    }

    if (currentLockedCount === TOTAL_PIECES) {
        triggerWinTransition();
    }
}

function createStars() {
    const starsContainer = document.getElementById('stars-container');
    const numStars = 60;
    
    for (let i = 0; i < numStars; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        const size = Math.random() * 3 + 1;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        
        star.style.top = `${Math.random() * 100}%`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.animationDuration = `${Math.random() * 3 + 2}s`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        
        starsContainer.appendChild(star);
    }
}

function startPetalsEffect() {
    const petalsContainer = document.getElementById('petals-container');
    const numberOfPetals = 35;

    for (let i = 0; i < numberOfPetals; i++) {
        const petal = document.createElement('div');
        petal.classList.add('petal');
        
        const width = Math.random() * 12 + 10;
        const height = width * 1.5;
        petal.style.width = `${width}px`;
        petal.style.height = `${height}px`;
        
        petal.style.left = `${Math.random() * 100}%`;
        petal.style.animationDuration = `${Math.random() * 3 + 4}s`;
        petal.style.animationDelay = `${Math.random() * 5}s`;

        petalsContainer.appendChild(petal);
    }
}

// Transición de la Pantalla de Victoria + Efecto Pintura Sincronizado
function triggerWinTransition() {
    setTimeout(() => {
        const flowerOverlay = document.getElementById('flower-overlay');
        flowerOverlay.classList.add('blooming');

        setTimeout(() => {
            // 1. Bloquear controles de Play/Pausa y Seeker
            playPauseBtn.disabled = true;
            seekSlider.disabled = true;

            // 2. Cambiar a Canción 2
            const currentVol = volumeSlider.value;
            songOne.pause();
            songOne.currentTime = 0;

            activeSong = songTwo;
            songTwo.volume = currentVol;

            // 4. Iniciar música y ajustar duración del pintado
            songTwo.play().then(() => {
                playPauseBtn.innerHTML = '❚❚';
                syncSeekSlider();
            }).catch(() => {});

            // Asignar duración exacta a la animación CSS de pintura
            finalImage.classList.add('paint-active');

            // 5. Escuchar el final de la canción para desbloquear controles
            songTwo.addEventListener('ended', () => {
                playPauseBtn.disabled = false;
                seekSlider.disabled = false;
                playPauseBtn.innerHTML = '▶';
            }, { once: true });

            // 6. Cambiar a vista de victoria en el DOM
            document.getElementById('game-section').style.display = 'none';
            document.body.classList.add('win-mode');
            
            const winScreen = document.getElementById('win-screen');
            winScreen.style.display = 'flex';
            window.scrollTo(0, 0);

            createStars();
            startPetalsEffect();

            setTimeout(() => {
                flowerOverlay.style.display = 'none';
            }, 300);

        }, 500);
    }, 200);
}

initPuzzle();