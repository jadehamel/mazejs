        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const CELL_SIZE = 80;
        const MAZE_WIDTH = 50;
        const MAZE_HEIGHT = 50;
        const PLAYER_SIZE = 30;
        const ENEMY_SIZE = 30;
        const OBJECT_SIZE = 20;
        const ENEMY_COUNT = 20;
        const DOOR_COUNT = 15;
        const COLLECTIBLES_COUNT = 400;

        let player, enemies, objects, maze, doors;
        let score = 0;
        let level = 1;
        let lives = 3;
        let cameraX = 0;
        let cameraY = 0;

        class Entity {
            constructor(x, y, size, color) {
                this.x = x;
                this.y = y;
                this.size = size;
                this.color = color;
                this.angle = 0;
                this.velocity = { x: 0, y: 0 };
            }

            draw() {
                ctx.save();
                ctx.translate(this.x - cameraX, this.y - cameraY);
                ctx.rotate(this.angle);
                
                // Draw shadow
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.beginPath();
                ctx.ellipse(0, this.size/2, this.size/2, this.size/4, 0, 0, Math.PI * 2);
                ctx.fill();

                // Draw arrow
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.moveTo(this.size/2, 0);
                ctx.lineTo(-this.size/2, -this.size/2);
                ctx.lineTo(-this.size/2, this.size/2);
                ctx.closePath();
                ctx.fill();

                ctx.restore();
            }

            update() {
                this.x += this.velocity.x;
                this.y += this.velocity.y;
                this.velocity.x *= 0.9;
                this.velocity.y *= 0.9;
            }
        }

class Player extends Entity {
    constructor(x, y) {
        super(x, y, PLAYER_SIZE, 'blue');
        this.speed = 0.5;
        this.maxSpeed = 3;
        this.dashSpeed = 6; // 3 times the max speed
        this.isDashing = false;
        this.dashDuration = 200; // 500 milliseconds (half a second)
        this.dashCooldown = 800; // 2 seconds cooldown
        this.lastDashTime = 0;
    }

    move(dx, dy) {
        let currentSpeed = this.isDashing ? this.dashSpeed : this.speed;
        let newVelocityX = this.velocity.x + dx * currentSpeed;
        let newVelocityY = this.velocity.y + dy * currentSpeed;
        
        // Cap the speed
        let speed = Math.sqrt(newVelocityX ** 2 + newVelocityY ** 2);
        let maxCurrentSpeed = this.isDashing ? this.dashSpeed : this.maxSpeed;
        if (speed > maxCurrentSpeed) {
            newVelocityX = (newVelocityX / speed) * maxCurrentSpeed;
            newVelocityY = (newVelocityY / speed) * maxCurrentSpeed;
        }

        // Check for collision before applying new velocity
        if (!isWall(this.x + newVelocityX, this.y)) {
            this.velocity.x = newVelocityX;
        } else {
            this.velocity.x = 0;
        }
        if (!isWall(this.x, this.y + newVelocityY)) {
            this.velocity.y = newVelocityY;
        } else {
            this.velocity.y = 0;
        }

        if (dx !== 0 || dy !== 0) {
            this.angle = Math.atan2(this.velocity.y, this.velocity.x);
        }
    }

    update(currentTime) {
        let newX = this.x + this.velocity.x;
        let newY = this.y + this.velocity.y;

        if (!isWall(newX, newY)) {
            this.x = newX;
            this.y = newY;
        } else {
            // If we hit a wall, stop movement in that direction
            if (isWall(newX, this.y)) this.velocity.x = 0;
            if (isWall(this.x, newY)) this.velocity.y = 0;
        }

        this.velocity.x *= 0.9;
        this.velocity.y *= 0.9;

        if (this.isDashing && currentTime - this.lastDashTime > this.dashDuration) {
            this.isDashing = false;
        }

        updateCamera();
    }

    dash(currentTime) {
        if (!this.isDashing && currentTime - this.lastDashTime > this.dashCooldown) {
            this.isDashing = true;
            this.lastDashTime = currentTime;
        }
    }

    draw(currentTime) {
        super.draw();
        
        // Draw dash cooldown indicator
        let cooldownProgress = Math.min((currentTime - this.lastDashTime) / this.dashCooldown, 1);
        ctx.fillStyle = `rgba(0, 255, 0, ${1 - cooldownProgress})`;
        ctx.beginPath();
        ctx.arc(this.x - cameraX, this.y - cameraY, this.size / 2 + 5, 0, Math.PI * 2 * cooldownProgress);
        ctx.fill();
    }
}

        class Enemy extends Entity {
            constructor(x, y) {
                super(x, y, ENEMY_SIZE, 'red');
                this.speed = 1.5;                             // this sets enemy speed.
                this.pathfindingCooldown = 0;
            }

            update() {
                super.update();
                
                if (this.canSeePlayer()) {
                    let dx = player.x - this.x;
                    let dy = player.y - this.y;
                    let dist = Math.sqrt(dx*dx + dy*dy);
                    this.velocity.x = (dx / dist) * this.speed;
                    this.velocity.y = (dy / dist) * this.speed;
                } else if (this.pathfindingCooldown <= 0) {
                    this.findNewDirection();
                    this.pathfindingCooldown = 60;
                } else {
                    this.pathfindingCooldown--;
                }

                if (isWall(this.x + this.velocity.x, this.y + this.velocity.y)) {
                    this.findNewDirection();
                }

                this.angle = Math.atan2(this.velocity.y, this.velocity.x);
            }

            canSeePlayer() {
                let dx = player.x - this.x;
                let dy = player.y - this.y;
                let dist = Math.sqrt(dx*dx + dy*dy);

                if (dist > CELL_SIZE * 5) return false;

                let steps = Math.floor(dist / 5);
                for (let i = 0; i < steps; i++) {
                    let checkX = this.x + (dx * i) / steps;
                    let checkY = this.y + (dy * i) / steps;
                    if (isWall(checkX, checkY)) return false;
                }

                return true;
            }

            findNewDirection() {
                let angle = Math.random() * Math.PI * 2;
                this.velocity.x = Math.cos(angle) * this.speed;
                this.velocity.y = Math.sin(angle) * this.speed;
            }
        }

class Collectible {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = OBJECT_SIZE;
        this.color = this.getRandomColor();
    }

    getRandomColor() {
        const colors = [
            '#FFD700', // Gold
            '#C0C0C0', // Silver
            '#B87333', // Bronze
            '#E6E6FA', // Lavender
            '#00CED1', // Dark Turquoise
            '#FF69B4', // Hot Pink
            '#32CD32', // Lime Green
            '#FF4500', // Orange Red
            '#9370DB', // Medium Purple
            '#00FA9A'  // Medium Spring Green
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    draw() {
        ctx.save();
        ctx.translate(this.x - cameraX, this.y - cameraY);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(0, this.size/2, this.size/2, this.size/4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw chalice
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(-this.size/2, this.size/2);
        ctx.lineTo(-this.size/3, -this.size/4);
        ctx.quadraticCurveTo(-this.size/6, -this.size/2, 0, -this.size/2);
        ctx.quadraticCurveTo(this.size/6, -this.size/2, this.size/3, -this.size/4);
        ctx.lineTo(this.size/2, this.size/2);
        ctx.closePath();
        ctx.fill();

        // Add a shine effect
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(-this.size/4, -this.size/4, this.size/8, this.size/16, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

        function generateMaze() {
            let maze = new Array(MAZE_HEIGHT).fill().map(() => new Array(MAZE_WIDTH).fill(1));

            function carve(x, y) {
                maze[y][x] = 0;
                let directions = [[0, -1], [1, 0], [0, 1], [-1, 0]];
                directions.sort(() => Math.random() - 0.5);

                for (let [dx, dy] of directions) {
                    let nx = x + dx * 2, ny = y + dy * 2;
                    if (nx >= 0 && nx < MAZE_WIDTH && ny >= 0 && ny < MAZE_HEIGHT && maze[ny][nx] === 1) {
                        maze[y + dy][x + dx] = 0;
                        carve(nx, ny);
                    }
                }
            }

            carve(1, 1);
            maze[1][0] = 0; // entrance
            maze[MAZE_HEIGHT - 2][MAZE_WIDTH - 1] = 0; // exit

            return maze;
        }

       function placeDoors() {
    doors = [];
    let doorCount = 0;
    const maxAttempts = 1000; // Prevent infinite loop
    let attempts = 0;

    while (doorCount < DOOR_COUNT && attempts < maxAttempts) {
        let x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
        let y = Math.floor(Math.random() * (MAZE_HEIGHT - 2)) + 1;

        // Check if this wall connects two open spaces
        if (maze[y][x] === 1 && 
            (
                (maze[y-1][x] === 0 && maze[y+1][x] === 0) || // Vertical connection
                (maze[y][x-1] === 0 && maze[y][x+1] === 0)    // Horizontal connection
            )
        ) {
            maze[y][x] = 2; // 2 represents a door
            doors.push({x: x * CELL_SIZE, y: y * CELL_SIZE});
            doorCount++;
        }

        attempts++;
    }

    console.log(`Placed ${doorCount} doors after ${attempts} attempts`);
}

        function isWall(x, y) {
            let cellX = Math.floor(x / CELL_SIZE);
            let cellY = Math.floor(y / CELL_SIZE);
            return cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT || maze[cellY][cellX] === 1;
        }

    function initGame() {
    maze = generateMaze();
    placeDoors();
    player = new Player(CELL_SIZE * 1.5, CELL_SIZE * 1.5);
    enemies = [];
    objects = [];

    wallPattern = ctx.createPattern(createWallTexture(), 'repeat');

            for (let i = 0; i < ENEMY_COUNT; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * MAZE_WIDTH);
                    y = Math.floor(Math.random() * MAZE_HEIGHT);
                } while (maze[y][x] !== 0 || (x < 3 && y < 3));
                enemies.push(new Enemy((x + 0.5) * CELL_SIZE, (y + 0.5) * CELL_SIZE));
            }

            for (let i = 0; i < COLLECTIBLES_COUNT; i++) {
                let x, y;
                do {
                    x = Math.floor(Math.random() * MAZE_WIDTH);
                    y = Math.floor(Math.random() * MAZE_HEIGHT);
                } while (maze[y][x] !== 0);
                objects.push(new Collectible((x + 0.5) * CELL_SIZE, (y + 0.5) * CELL_SIZE));
            }

            updateCamera();
        }

        function updateCamera() {
            cameraX = player.x - canvas.width / 2;
            cameraY = player.y - canvas.height / 2;
            cameraX = Math.max(0, Math.min(cameraX, MAZE_WIDTH * CELL_SIZE - canvas.width));
            cameraY = Math.max(0, Math.min(cameraY, MAZE_HEIGHT * CELL_SIZE - canvas.height));
        }

function drawMaze() {
    for (let y = 0; y < MAZE_HEIGHT; y++) {
        for (let x = 0; x < MAZE_WIDTH; x++) {
            if (maze[y][x] === 1) {
                ctx.fillStyle = wallPattern;
                ctx.fillRect(x * CELL_SIZE - cameraX, y * CELL_SIZE - cameraY, CELL_SIZE, CELL_SIZE);
            } else if (maze[y][x] === 2) {
                // Draw door
                ctx.fillStyle = 'brown';
                ctx.fillRect(x * CELL_SIZE - cameraX, y * CELL_SIZE - cameraY, CELL_SIZE, CELL_SIZE);
                // Add a distinctive mark to make doors more visible
                ctx.fillStyle = 'gold';
                ctx.beginPath();
                ctx.arc(x * CELL_SIZE + CELL_SIZE/2 - cameraX, y * CELL_SIZE + CELL_SIZE/2 - cameraY, CELL_SIZE/4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

 function createWallTexture() {
    let textureCanvas = document.createElement('canvas');
    textureCanvas.width = CELL_SIZE;
    textureCanvas.height = CELL_SIZE;
    let textureCtx = textureCanvas.getContext('2d');

    textureCtx.fillStyle = '#444';
    textureCtx.fillRect(0, 0, CELL_SIZE, CELL_SIZE);

    for (let i = 0; i < 20; i++) {
        let x = Math.random() * CELL_SIZE;
        let y = Math.random() * CELL_SIZE;
        let radius = Math.random() * 5 + 2;
        let shade = Math.floor(Math.random() * 64) + 128;
        textureCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
        textureCtx.beginPath();
        textureCtx.arc(x, y, radius, 0, Math.PI * 2);
        textureCtx.fill();
    }

    return textureCanvas;
}

function update(currentTime) {
    player.update(currentTime);
    enemies.forEach(enemy => enemy.update());

    objects = objects.filter(obj => {
        let dx = obj.x - player.x;
        let dy = obj.y - player.y;
        if (dx * dx + dy * dy < (PLAYER_SIZE + OBJECT_SIZE) * (PLAYER_SIZE + OBJECT_SIZE) / 4) {
            score += 10;
            return false;
        }
        return true;
    });

    if (objects.length === 0) {
        alert(`Congratulations! You completed level ${level}. Your score is ${score}.`);
        level++;
        initGame();
    }

    enemies.forEach(enemy => {
        let dx = enemy.x - player.x;
        let dy = enemy.y - player.y;
        if (dx * dx + dy * dy < (PLAYER_SIZE + ENEMY_SIZE) * (PLAYER_SIZE + ENEMY_SIZE) / 4) {
            lives--;
            if (lives <= 0) {
                alert(`Game Over! Your final score is ${score}.`);
                score = 0;
                level = 1;
                lives = 3;
                initGame();
            } else {
                player.x = CELL_SIZE * 1.5;
                player.y = CELL_SIZE * 1.5;
            }
        }
    });
}

function draw(currentTime) {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMaze();
    objects.forEach(obj => obj.draw());
    player.draw(currentTime);
    enemies.forEach(enemy => enemy.draw());

    // Draw score and lives
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`SCORE: ${score.toString().padStart(6, '0')}`, 10, 30);
    
    for (let i = 0; i < lives; i++) {
        ctx.save();
        ctx.translate(200 + i * 40, 20);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = 'blue';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

        let keys = {};

        document.addEventListener('keydown', (e) => {
            keys[e.key.toLowerCase()] = true;

        });

        document.addEventListener('keyup', (e) => {
            keys[e.key.toLowerCase()] = false;
        });

function handleInput(currentTime) {
    if (keys['w'] || keys['arrowup']) player.move(0, -1);
    if (keys['s'] || keys['arrowdown']) player.move(0, 1);
    if (keys['a'] || keys['arrowleft']) player.move(-1, 0);
    if (keys['d'] || keys['arrowright']) player.move(1, 0);
    if (keys[' ']) player.dash(currentTime);
}


   function gameLoop(currentTime) {
     handleInput(currentTime);
     update(currentTime);
     draw();
     requestAnimationFrame(gameLoop);
}

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            updateCamera();
        });

        initGame();
        gameLoop();
// Start the game loop
requestAnimationFrame(gameLoop);