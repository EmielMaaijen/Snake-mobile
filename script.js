document.addEventListener('DOMContentLoaded', () => {
    // DOM Elementen
    const gameContainer = document.querySelector('.game-container');
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const overlays = document.querySelectorAll('.game-overlay');
    const scoreElement = document.getElementById('score');
    const startScreen = document.getElementById('startScreen');
    const instructionsScreen = document.getElementById('instructionsScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const finalScoreElement = document.getElementById('finalScore');
    const showInstructionsButton = document.getElementById('showInstructionsButton');
    const startGameButton = document.getElementById('startGameButton');
    const restartButton = document.getElementById('restartButton');
    const timerElement = document.getElementById('timer');

    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    // Spelinstellingen
    let gridSize;
    const tileCountX = 36;
    const tileCountY = 36;
    const gameSpeed = 80;

    // Power-up
    let isPoweredUp = false;
    let powerUpTimer = 0;
    const POWERUP_DURATION = 120;

    const foodImage = new Image();
    foodImage.src = 'food.png';
    foodImage.onerror = () => alert("food.png niet gevonden!");

    // Spelvariabelen
    let snake, food, score, gameInterval, isGameOver;
    let gameMap = [];
    let currentDirection = { x: 0, y: 0 };
    let desiredDirection = { x: 0, y: 0 };
    let gameTimerInterval, elapsedTime = 0;

    function setupCanvasAndGame() {
        const header = document.querySelector('.header');
        if (!header) {
            setTimeout(setupCanvasAndGame, 50); 
            return;
        }

        const headerHeight = header.offsetHeight;
        const controlsHeight = document.getElementById('mobileControls').offsetHeight;
        const containerPadding = 40;

        let availableWidth = window.innerWidth - containerPadding;
        let availableHeight = window.innerHeight - headerHeight - containerPadding;
        
        if (getComputedStyle(document.getElementById('mobileControls')).display !== 'none') {
            availableHeight -= controlsHeight;
        }

        const ratioX = availableWidth / tileCountX;
        const ratioY = availableHeight / tileCountY;
        
        gridSize = Math.floor(Math.min(ratioX, ratioY));
        
        canvas.width = tileCountX * gridSize;
        canvas.height = tileCountY * gridSize;

        createGridPatternMap();

        const canvasTopOffset = canvas.offsetTop;
        const canvasLeftOffset = canvas.offsetLeft;
        overlays.forEach(overlay => {
            overlay.style.top = `${canvasTopOffset}px`;
            overlay.style.left = `${canvasLeftOffset}px`;
            overlay.style.width = `${canvas.width}px`;
            overlay.style.height = `${canvas.height}px`;
        });
        
        let startPos = findSafeSpot();
        if (!startPos) {
            alert("Fout: Geen veilige startplek gevonden in de map!");
            return;
        }
        snake = [startPos];
        
        food = generateFood();
        score = 0;
        isGameOver = false;
        isPoweredUp = false;
        
        currentDirection = { x: 0, y: 0 };
        desiredDirection = { x: 0, y: 0 };
        
        scoreElement.textContent = score;
        if (finalScoreElement) finalScoreElement.textContent = score;

        clearInterval(gameTimerInterval);
        clearInterval(gameInterval);
        gameInterval = null;
        elapsedTime = 0;
        if(timerElement) timerElement.textContent = formatTime(elapsedTime);
        
        gameOverScreen.classList.add('hidden');
        instructionsScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        draw();
    }
    
    function createGridPatternMap() {
        gameMap = [];
        const isRail = (x, y) => ((x - 1) % 3 === 0) || ((y - 1) % 3 === 0);

        for (let y = 0; y < tileCountY; y++) {
            gameMap[y] = [];
            for (let x = 0; x < tileCountX; x++) {
                const isBorder = (x === 0 || x === tileCountX - 1 || y === 0 || y === tileCountY - 1);
                if (isRail(x, y) && !isBorder) {
                    let exits = { u: 0, d: 0, l: 0, r: 0 };
                    if (y > 0 && isRail(x, y - 1) && !(y - 1 === 0)) exits.u = 1;
                    if (y < tileCountY - 1 && isRail(x, y + 1) && !(y + 1 === tileCountY - 1)) exits.d = 1;
                    if (x > 0 && isRail(x - 1, y) && !(x - 1 === 0)) exits.l = 1;
                    if (x < tileCountX - 1 && isRail(x + 1, y) && !(x + 1 === tileCountX - 1)) exits.r = 1;
                    gameMap[y][x] = exits;
                } else {
                    gameMap[y][x] = { u: 0, d: 0, l: 0, r: 0 };
                }
            }
        }
    }

    function findSafeSpot(spotsToAvoid = []) {
        for (let y = 0; y < tileCountY; y++) {
            for (let x = 0; x < tileCountX; x++) {
                const tile = gameMap[y][x];
                if (tile.u || tile.d || tile.l || tile.r) {
                    if (!spotsToAvoid.some(spot => spot.x === x && spot.y === y)) {
                        return { x, y };
                    }
                }
            }
        }
        return null;
    }

    function startGame() {
        if (gameInterval) return;
        
        instructionsScreen.classList.add('hidden');
        startScreen.classList.add('hidden');
        
        gameInterval = setInterval(gameLoop, gameSpeed);

        clearInterval(gameTimerInterval);
        gameTimerInterval = setInterval(() => {
            elapsedTime++;
            if(timerElement) timerElement.textContent = formatTime(elapsedTime);
        }, 1000);
    }
    
    function gameLoop() {
        update();
        if (isGameOver) {
            clearInterval(gameInterval);
            clearInterval(gameTimerInterval);
            if (finalScoreElement) finalScoreElement.textContent = score;
            gameOverScreen.classList.remove('hidden');
            return;
        }
        draw();
    }
    
    function update() {
        if (currentDirection.x === 0 && currentDirection.y === 0) {
            if (desiredDirection.x !== 0 || desiredDirection.y !== 0) {
                 const head = snake[0];
                 const startTile = gameMap[head.y][head.x];
                 if ((desiredDirection.y === -1 && startTile.u) || (desiredDirection.y === 1 && startTile.d) || (desiredDirection.x === -1 && startTile.l) || (desiredDirection.x === 1 && startTile.r)) {
                    currentDirection = desiredDirection;
                 }
            }
            if (currentDirection.x === 0 && currentDirection.y === 0) {
                return;
            }
        }
        if (isPoweredUp) {
            powerUpTimer--;
            if (powerUpTimer <= 0) {
                isPoweredUp = false;
            }
        }
        const head = snake[0];
        const currentTile = gameMap[head.y][head.x];
        let canMoveDesired = false;
        if (desiredDirection.y === -1 && currentTile.u) canMoveDesired = true;
        else if (desiredDirection.y === 1 && currentTile.d) canMoveDesired = true;
        else if (desiredDirection.x === -1 && currentTile.l) canMoveDesired = true;
        else if (desiredDirection.x === 1 && currentTile.r) canMoveDesired = true;
        if (canMoveDesired) {
            currentDirection.x = desiredDirection.x;
            currentDirection.y = desiredDirection.y;
        }
        const nextHead = { x: head.x + currentDirection.x, y: head.y + currentDirection.y };
        const nextTile = gameMap[nextHead.y]?.[nextHead.x];
        if (!nextTile) { isGameOver = true; return; }
        if (currentDirection.y === -1 && !nextTile.d) { isGameOver = true; return; }
        if (currentDirection.y === 1 && !nextTile.u) { isGameOver = true; return; }
        if (currentDirection.x === -1 && !nextTile.r) { isGameOver = true; return; }
        if (currentDirection.x === 1 && !nextTile.l) { isGameOver = true; return; }
        for (let i = 0; i < snake.length; i++) { 
            if (nextHead.x === snake[i].x && nextHead.y === snake[i].y) { 
                isGameOver = true; return; 
            } 
        }
        snake.unshift(nextHead);
        if (food && nextHead.x === food.x && nextHead.y === food.y) {
            score++;
            scoreElement.textContent = score;
            food = generateFood();
            isPoweredUp = true;
            powerUpTimer = POWERUP_DURATION;
        } else {
            snake.pop();
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let snakeColor = '#4CAF50';
        if (isPoweredUp) {
            const ratio = Math.min(score / 50, 1);
            const greenValue = 165 - (165 * ratio);
            snakeColor = `rgb(255, ${Math.floor(greenValue)}, 0)`;
        }
        if (snake && snake.length > 0) {
            ctx.beginPath();
            ctx.moveTo(snake[0].x * gridSize + gridSize / 2, snake[0].y * gridSize + gridSize / 2);
            for (let i = 1; i < snake.length; i++) {
                ctx.lineTo(snake[i].x * gridSize + gridSize / 2, snake[i].y * gridSize + gridSize / 2);
            }
            const snakeWidth = Math.max(5, gridSize - 5);
            ctx.strokeStyle = snakeColor;
            ctx.lineWidth = snakeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            const head = snake[0];
            const headCenterX = head.x * gridSize + gridSize / 2;
            const headCenterY = head.y * gridSize + gridSize / 2;
            const headRadius = snakeWidth / 2;
            ctx.fillStyle = snakeColor;
            ctx.beginPath();
            ctx.arc(headCenterX, headCenterY, headRadius, 0, Math.PI * 2);
            ctx.fill();
            let eyeOffsetX = 0, eyeOffsetY = 0;
            const eyeOffsetAmount = 5;
            if (currentDirection.x === 1) eyeOffsetX = eyeOffsetAmount;
            if (currentDirection.x === -1) eyeOffsetX = -eyeOffsetAmount;
            if (currentDirection.y === 1) eyeOffsetY = eyeOffsetAmount;
            if (currentDirection.y === -1) eyeOffsetY = -eyeOffsetAmount;
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY - 4, 4, 0, Math.PI * 2);
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY + 4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY - 4, 2, 0, Math.PI * 2);
            ctx.arc(headCenterX + eyeOffsetX, headCenterY + eyeOffsetY + 4, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        if (food) {
            const foodSizeFactor = 1.25;
            const foodSize = gridSize * foodSizeFactor;
            const offset = (foodSize - gridSize) / 2;
            ctx.drawImage(foodImage, food.x * gridSize - offset, food.y * gridSize - offset, foodSize, foodSize);
        }
    }
    
    function generateFood() {
        const safeSpots = [];
        for (let y = 0; y < tileCountY; y++) {
            for (let x = 0; x < tileCountX; x++) {
                const tile = gameMap[y][x];
                if (tile.u || tile.d || tile.l || tile.r) {
                    if (!snake.some(seg => seg.x === x && seg.y === y)) {
                        safeSpots.push({x, y});
                    }
                }
            }
        }
        if (safeSpots.length > 0) {
            return safeSpots[Math.floor(Math.random() * safeSpots.length)];
        }
        isGameOver = true;
        return null;
    }

    function formatTime(totalSeconds) {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    showInstructionsButton.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        instructionsScreen.classList.remove('hidden');
    });

    startGameButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', setupCanvasAndGame);
    
    window.addEventListener('resize', () => {
        setTimeout(setupCanvasAndGame, 100);
    });

    const handleKeyDown = (e) => {
        if (isGameOver) return;
        if (!gameInterval && instructionsScreen.classList.contains('hidden') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            startGame();
        }
        switch (e.key) {
            case 'ArrowUp': if (currentDirection.y !== 1) desiredDirection = { x: 0, y: -1 }; break;
            case 'ArrowDown': if (currentDirection.y !== -1) desiredDirection = { x: 0, y: 1 }; break;
            case 'ArrowLeft': if (currentDirection.x !== 1) desiredDirection = { x: -1, y: 0 }; break;
            case 'ArrowRight': if (currentDirection.x !== -1) desiredDirection = { x: 1, y: 0 }; break;
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    const handleTouch = (direction) => {
        if (isGameOver) return;
        if (!gameInterval) {
            startGame();
        }
        
        const newDirection = direction();
        if ((newDirection.y !== 0 && currentDirection.y !== -newDirection.y) || 
            (newDirection.x !== 0 && currentDirection.x !== -newDirection.x)) {
            desiredDirection = newDirection;
        }
    };

    btnUp.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(() => ({ x: 0, y: -1 })); });
    btnDown.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(() => ({ x: 0, y: 1 })); });
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(() => ({ x: -1, y: 0 })); });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); handleTouch(() => ({ x: 1, y: 0 })); });

    setTimeout(setupCanvasAndGame, 100);
});
