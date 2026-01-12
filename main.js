// script.js - Game Logic + Portfolio Interactions

// Game Variables (initialized after DOM loads)
let canvas, ctx;
let startBtn, pauseBtn, restartBtn, speedSelect;
let scoreDisplay, highScoreDisplay, levelDisplay, livesDisplay, powerDisplay, unlockMessage;

// Game state
let snake = [{x: 10, y: 10}];
let food = {x: 15, y: 15};
let direction = 'right';
let gameInterval = null;
let score = 0;
let highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;
let level = 1;
let lives = 3;
let power = '—';
let gameRunning = false;
let gameSpeed = 150; // milliseconds per frame; will be updated from UI

// Initialize game
function initGame() {
    // Cache DOM elements
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    startBtn = document.getElementById('startBtn');
    pauseBtn = document.getElementById('pauseBtn');
    restartBtn = document.getElementById('restartBtn');
    speedSelect = document.getElementById('speed');
    scoreDisplay = document.getElementById('score');
    highScoreDisplay = document.getElementById('high-score');
    levelDisplay = document.getElementById('level');
    livesDisplay = document.getElementById('lives');
    powerDisplay = document.getElementById('power');
    unlockMessage = document.getElementById('unlockMessage');

    // Initialize UI values
    highScoreDisplay.textContent = highScore;
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    livesDisplay.textContent = lives;
    powerDisplay.textContent = power;
    gameSpeed = parseInt(speedSelect.value) || gameSpeed;

    // Draw initial game state
    drawGame();

    // Event listeners for buttons
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', togglePause);
    restartBtn.addEventListener('click', restartGame);
    speedSelect.addEventListener('change', updateSpeed);

    // Keyboard controls (only for non-touch devices)
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0);
    if(!isTouchDevice) {
        document.addEventListener('keydown', changeDirection);
    } else {
        // On touch-only devices, hide/disable the game UI and show a notice
        const gameContainer = document.querySelector('.game-container');
        if(gameContainer) {
            const notice = document.createElement('div');
            notice.className = 'mobile-notice';
            notice.innerHTML = '<h3>Game unavailable</h3><p>The snake game requires a keyboard. Please open this site on a desktop or laptop to play.</p>';
            gameContainer.parentNode.insertBefore(notice, gameContainer);
            gameContainer.style.display = 'none';
        }
        if(startBtn) startBtn.disabled = true;
        if(pauseBtn) pauseBtn.disabled = true;
        if(restartBtn) restartBtn.disabled = true;
        if(speedSelect) speedSelect.disabled = true;
        if(unlockMessage) unlockMessage.style.display = 'block';
    }

    // Smooth scrolling for navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if(targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if(targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Form submission
    const messageForm = document.getElementById('messageForm');
    if(messageForm) {
        messageForm.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for your message! I will get back to you soon.');
            this.reset();
        });
    }

    // Check if portfolio should be unlocked
    checkPortfolioUnlock();
}

// Draw game elements
function drawGame() {
    // Clear canvas
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw snake
    snake.forEach((segment, index) => {
        if(index === 0) {
            // Snake head
            ctx.fillStyle = '#00dbde';
            ctx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
            
            // Draw eyes
            ctx.fillStyle = '#fff';
            if(direction === 'right') {
                ctx.fillRect(segment.x * 20 + 12, segment.y * 20 + 4, 4, 4);
                ctx.fillRect(segment.x * 20 + 12, segment.y * 20 + 14, 4, 4);
            } else if(direction === 'left') {
                ctx.fillRect(segment.x * 20 + 2, segment.y * 20 + 4, 4, 4);
                ctx.fillRect(segment.x * 20 + 2, segment.y * 20 + 14, 4, 4);
            } else if(direction === 'up') {
                ctx.fillRect(segment.x * 20 + 4, segment.y * 20 + 2, 4, 4);
                ctx.fillRect(segment.x * 20 + 14, segment.y * 20 + 2, 4, 4);
            } else if(direction === 'down') {
                ctx.fillRect(segment.x * 20 + 4, segment.y * 20 + 12, 4, 4);
                ctx.fillRect(segment.x * 20 + 14, segment.y * 20 + 12, 4, 4);
            }
        } else {
            // Snake body
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(segment.x * 20, segment.y * 20, 18, 18);
        }
    });
    
    // Draw food
    ctx.fillStyle = '#ff0066';
    ctx.beginPath();
    ctx.arc(food.x * 20 + 9, food.y * 20 + 9, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for(let x = 0; x <= canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for(let y = 0; y <= canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Generate food at random position
function generateFood() {
    let newFoodPosition;
    let foodOnSnake;
    
    do {
        foodOnSnake = false;
        newFoodPosition = {
            x: Math.floor(Math.random() * (canvas.width / 20)),
            y: Math.floor(Math.random() * (canvas.height / 20))
        };
        
        // Check if food would be on snake
        for(let segment of snake) {
            if(segment.x === newFoodPosition.x && segment.y === newFoodPosition.y) {
                foodOnSnake = true;
                break;
            }
        }
    } while(foodOnSnake);
    
    food = newFoodPosition;
}

// Change direction based on key press
function changeDirection(event) {
    if(!gameRunning) return;
    
    const key = event.key;
    const goingUp = direction === 'up';
    const goingDown = direction === 'down';
    const goingRight = direction === 'right';
    const goingLeft = direction === 'left';
    
    if((key === 'ArrowUp' || key === 'w' || key === 'W') && !goingDown) {
        direction = 'up';
    } else if((key === 'ArrowDown' || key === 's' || key === 'S') && !goingUp) {
        direction = 'down';
    } else if((key === 'ArrowRight' || key === 'd' || key === 'D') && !goingLeft) {
        direction = 'right';
    } else if((key === 'ArrowLeft' || key === 'a' || key === 'A') && !goingRight) {
        direction = 'left';
    }
}

// Update game speed
function updateSpeed() {
    // UI provides values in milliseconds per frame (higher = slower)
    gameSpeed = parseInt(speedSelect.value) || gameSpeed;
    if(gameRunning) {
        if(gameInterval) clearInterval(gameInterval);
        gameInterval = setInterval(gameLoop, gameSpeed);
    }
}

// Start the game
function startGame() {
    if(gameRunning) return;
    gameRunning = true;
    // Ensure any existing interval is cleared
    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, gameSpeed);
}


// Toggle pause state
function togglePause() {
    if(!gameRunning) return;
    gameRunning = false;
    if(gameInterval) clearInterval(gameInterval);
}

// Restart the game
function restartGame() {
    if(gameInterval) clearInterval(gameInterval);
    snake = [{x: 10, y: 10}];
    direction = 'right';
    score = 0;
    level = 1;
    lives = 3;
    power = '—';
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    livesDisplay.textContent = lives;
    powerDisplay.textContent = power;
    generateFood();
    drawGame();
    gameRunning = false;
}

// Main game loop
function gameLoop() {
    // Move snake
    const head = {...snake[0]};
    if(direction === 'right') head.x += 1;
    else if(direction === 'left') head.x -= 1;
    else if(direction === 'up') head.y -= 1;
    else if(direction === 'down') head.y += 1;

    // Check for wall collisions
    if(head.x < 0 || head.x >= canvas.width / 20 || head.y < 0 || head.y >= canvas.height / 20) {
        lives -= 1;
        livesDisplay.textContent = lives;
        if(lives <= 0) {
            alert('Game Over! Your final score: ' + score);
            if(score > highScore) {
                highScore = score;
                localStorage.setItem('snakeHighScore', highScore);
                highScoreDisplay.textContent = highScore;
            }
            restartGame();
            return;
        } else {
            // Reset snake position
            snake = [{x: 10, y: 10}];
            direction = 'right';
            return;
        }
    }

    // Check for self-collision
    for(let i = 1; i < snake.length; i++) {
        if(head.x === snake[i].x && head.y === snake[i].y) {
            lives -= 1;
            livesDisplay.textContent = lives;
            if(lives <= 0) {
                alert('Game Over! Your final score: ' + score);
                if(score > highScore) {
                    highScore = score;
                    localStorage.setItem('snakeHighScore', highScore);
                    highScoreDisplay.textContent = highScore;
                }
                restartGame();
                return;
            } else {
                // Reset snake position
                snake = [{x: 10, y: 10}];
                direction = 'right';
                return;
            }
        }
    }

    // Add new head to snake
    snake.unshift(head);

    // Check for food collision
    if(head.x === food.x && head.y === food.y) {
        score += 10;
        scoreDisplay.textContent = score;
        generateFood();

        // Level up every 50 points
        if(score % 50 === 0) {
            level += 1;
            levelDisplay.textContent = level;
            // make game slightly faster by decreasing interval (ms), clamp to minimum
            gameSpeed = Math.max(40, gameSpeed - 15);
            if(gameRunning) {
                if(gameInterval) clearInterval(gameInterval);
                gameInterval = setInterval(gameLoop, gameSpeed);
            }
        }

        // Update power-up status
        if(score >= 100) {
            power = 'Speed Boost';
        } else if(score >= 50) {
            power = 'Extra Life';
        } else {
            power = '—';
        }
        powerDisplay.textContent = power;
    } else{
        // Remove tail segment
        snake.pop();
    }

    // Redraw game
    drawGame();
}

// Check if portfolio should be unlocked
function checkPortfolioUnlock() {
    const unlockSection = document.getElementById('portfolioUnlock');
    const hs = parseInt(localStorage.getItem('snakeHighScore')) || 0;
    if(unlockSection) {
        if(hs >= 50) {
            unlockSection.style.display = 'none';
        } else {
            // leave display to CSS; show message in unlockMessage if present
            if(unlockMessage) unlockMessage.style.display = 'block';
            if(unlockMessage) unlockMessage.textContent = 'Achieve a high score of 50 to unlock the portfolio section!';
        }
    } else {
        if(unlockMessage) {
            if(hs >= 50) unlockMessage.style.display = 'none';
            else {
                unlockMessage.style.display = 'block';
                unlockMessage.textContent = 'Achieve a high score of 50 to unlock the portfolio section!';
            }
        }
    }
}

// Initialize the game on page load
window.addEventListener('load', initGame);