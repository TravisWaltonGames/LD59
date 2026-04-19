"use strict";

// Global debug and timestamp
var frame = 0;
var secondsPassed = 0;
var oldTimeStamp = 0;
var fps = 0.0;
var debug = 0;

// Directions
const UP = 0
const RIGHT = 1
const DOWN = 2
const LEFT = 3
function flipDirection(d) {
    if (d == UP) return DOWN;
    if (d == DOWN) return UP;
    if (d == RIGHT) return LEFT;
    if (d == LEFT) return RIGHT;
    return LEFT + 1;
}

// Game states
const TITLE = 0
const INSTRUCTIONS1 = 1
const INSTRUCTIONS2 = 1.5
const PREPARE = 2
const RUNNING = 3
const DEAD = 4
const WIN = 5
const LEVEL = 6

// Phone Colours
const RED = 0
const GREEN = 1
const BLUE = 2

var startDeathTimer = 0;
// Pieces
const PIECE_EMPTY = 0;
const PIECE_TOPRIGHT = 1;
const PIECE_TOPLEFT = 2;
const PIECE_BOTTOMRIGHT = 3;
const PIECE_BOTTOMLEFT = 4;
const PIECE_NORIGHT = 5;
const PIECE_NOBOTTOM = 6;
const PIECE_NOLEFT = 7;
const PIECE_NOTOP = 8;
const PIECE_CROSS = 9;
const PIECE_HORIZONTAL = 10;
const PIECE_VERTICAL = 11;

// Get a reference to the canvas
// Leave it as a global
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// This removes a delay in wav playback
// I don't know why
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Load sounds
const phoneRing = new Audio('./Assets/PhoneRing.wav');
phoneRing.load();
phoneRing.volume = 1.0;

const electroSound = new Audio('./Assets/Electro.wav');
electroSound.load();

const titleSound = new Audio('./Assets/ld59-title.mp3');
titleSound.load();
titleSound.volume = 0.4;
const gameSound = new Audio('./Assets/ld59-game.mp3');
gameSound.load();
gameSound.volume = 0.4;
const deadSound = new Audio('./Assets/ld59-dead.mp3');
deadSound.load();
deadSound.volume = 0.4;



const _images = Object.create(null);

function loadImages(manifest) {
    const promises = [];

    for (const name in manifest) {
        const img = new Image();
        _images[name] = img;

        promises.push(new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(`Failed to load ${manifest[name]}`);
            img.src = manifest[name];
        }));
    }

    return Promise.all(promises);
}

function getImage(name) {
    const img = _images[name];
    if (!img) throw new Error(`Unknown image: ${name}`);
    return img;
}

// Draws an image with a frame at screen coordinates
class AnimImage {
    constructor(filename, xc, yc) {
        this.filename = filename

        this.frame = { width: xc, height: yc }
        this.size = { width: 0, height: 0 }
        this.img = getImage(filename);
        this.animFrame = 0;

        this.size = { width: this.img.width / this.frame.width, height: this.img.height / this.frame.height }
    }

    draw(x, y, flip, frame = this.animFrame) {
        var col = frame % this.size.width
        var row = Math.floor(frame / this.size.width)

        ctx.save();
        if (flip) {
            ctx.translate(x + this.frame.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(this.img, col * this.frame.width, row * this.size.height, this.frame.width, this.frame.height, 0, y - this.frame.height / 2, this.frame.width, this.frame.height);
        } else {
            ctx.drawImage(this.img, col * this.frame.width, row * this.frame.height, this.frame.width, this.frame.height, x - this.frame.width / 2, y - this.frame.height / 2, this.frame.width, this.frame.height);
        }
        ctx.restore();
    }
    nextFrame() {
        this.animFrame += 1;
        if (this.animFrame >= this.size.width * this.size.height) this.animFrame = 0;
    }
    resetAnimation() {
        this.animFrame = 0;
    }
}

// Globally available image data
const Images = {
    Pipes: "./Assets/PipeTiles.png",
    Background: "./Assets/Background.png",
    PhoneStarts: "./Assets/PhoneStarts.png",
    ElectroBoom: "./Assets/Shock.png",
    PressSpace: "./Assets/PressSpace.png",
    Digits: "./Assets/digits.png",
    Shute: "./Assets/Shute.png",
    Phone: "./Assets/PhoneSprite.png",
    FF: "./Assets/FF.png",
    // Screens
    Title: "./Assets/Title.png",
    YouWin: "./Assets/YouWin.png",
    YouDied: "./Assets/YouDied.png",
    Instructions1: "./Assets/Instruction2.png",
    Instructions2: "./Assets/Instruction3.png",
    NextLevel: "./Assets/NextLevel.png",
}

var titleImage = {}
var instructions1Image = {}
var instructions2Image = {}
var deadImage = {}
var winImage = {}
var levelImage = {}
var pressSpace = {}
var digitsImage = {}
var shuteImage = {}
var ffImage = {}
var phoneImage = {}

var pipes = {}



// Set up a function to check if a key is down
var keys = {};

window.addEventListener("keydown", (event) => {
    keys[event.code] = true;
});

window.addEventListener("keyup", (event) => {
    keys[event.code] = false;
});

function isKeyPressed(keyCode) {
    return !!keys[keyCode]; // Convert undefined to false
}

// Mouse and keyboard stuff
// Set up some globals, mx and my, that always contain the mouse location within the canvas
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

var mx = 0;
var my = 0;

var mxStart = 0;
var myStart = 0;
var mxStart = 0;
var mxEnd = 0;
var myEnd = 0;

var mouseDown = false;
var mouseChangeState = false;

canvas.addEventListener('mousedown', function (evt) {
    mxStart = mx;
    myStart = my;
    mouseDown = true;
    mouseChangeState = true;
}, false);

canvas.addEventListener('mouseup', function (evt) {
    mxEnd = mx;
    myEnd = my;
    mouseDown = false;
    mouseChangeState = true;
}, false);

canvas.addEventListener('mousemove', function (evt) {
    var mousePos = getMousePos(canvas, evt);
    mx = mousePos.x;
    my = mousePos.y;
}, false);





// Keep a list of sprite locations
var pipeGrid = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
];

var exits = [
    // [ UP, RIGHT, DOWN, LEFT ]
    [0, 0, 0, 0],
    [1, 1, 0, 0],
    [1, 0, 0, 1],
    [0, 1, 1, 0],
    [0, 0, 1, 1],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [1, 1, 1, 0],
    [0, 1, 1, 1],
    [1, 1, 1, 1],
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 0, 0, 0]
];

var nextQueue = [1, 2, 3];
var queueAnimation = 0;

var highlight = { x: 0, y: 0 };

const GXO = 64;
const GYO = 64;

var background = {};
var phoneStarts = {}
var electroBoom = {}

function getElectricColor(i) {
    if (i > 0.8) return "#ffffff20";  
    if (i > 0.5) return "#aeefff20";  
    if (i > 0.3) return "#5bd1ff20";  
    if (i > 0.1) return "#1e90ff20";  
    return "#000000";                
}


class SignalPath {
    constructor(left, right, colour) {
        this.start = right
        this.end = left
        this.colour = colour
        this.tiles = [{
            x: right.x,
            y: right.y,
            rx: right.x * 64 + GXO,
            ry: right.y * 64 + GYO,
            atMiddle: false,
            currentTile: pipeGrid[right.y][right.x],
            pixels: [
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
            ]
        }];
        this.firstStep = true;

        this.tiles[0].direction = LEFT;
    }

    draw() {
        var i = 0;

        for (const t of this.tiles) {
            for (var x = 0; x < t.pixels[0].length; x++) {
                for (var y = 0; y < t.pixels.length; y++) {
                    if (t.pixels[y][x] != 0) {

                        const time = frame * 0.5;
                        const wave = Math.sin(time - i * 0.5);

                        // add randomness (flicker)
                        const noise = Math.random() * 0.5;

                        const intensity = Math.max(0, wave + noise);
                        var sz = 64.0 / 7;
                        ctx.fillStyle = "blue";
                        ctx.fillRect(t.rx + x * sz, t.ry + y * sz, sz, sz);
                        ctx.fillStyle = getElectricColor(intensity);
                        ctx.fillRect(t.rx + x * sz, t.ry + y * sz, sz, sz);
                    }
                }
            }
        }
    }

    step() {
        if (this.firstStep) {
            this.firstStep = false;
            this.tiles[0].currentTile = pipeGrid[this.tiles[0].y][this.tiles[0].x]
            if (exits[this.tiles[0].currentTile][RIGHT] != 1) {
                const tile = this.tiles.at(-1);
                return { next: 0, x: tile.rx + 32, y: tile.ry + 32, xt: tile.x, yt: tile.y, desy: this.end.y };

            }

        }

        const tile = this.tiles.at(-1);

        var ret = { next: tile.currentTile, x: tile.rx + 32, y: tile.ry + 32, xt: tile.x, yt: tile.y, desy: this.end.y };

        var done = false;

        switch (tile.direction) {
            case LEFT:
                var next = 6;
                for (var n = 0; n < 7; n++) {
                    if (tile.pixels[3][n] == 1) {
                        next = n - 1;
                        break;
                    }
                }
                if (next == -1) { done = true; next = 0 }
                tile.pixels[3][next] = 1;
                //tile.pixels[4][next] = 1;
                break;
            case RIGHT:
                var next = 0;
                for (var n = 6; n >= 0; n--) {
                    if (tile.pixels[3][n] == 1) {
                        next = n + 1;
                        break;
                    }
                }
                if (next == 7) { done = true; next = 6 }
                tile.pixels[3][next] = 1;
                // tile.pixels[4][next] = 1;
                break;
            case UP:
                var next = 6;
                for (var n = 0; n < 7; n++) {
                    if (tile.pixels[n][3] == 1) {
                        next = n - 1;
                        break;
                    }
                }
                if (next == -1) { done = true; next = 0 }

                tile.pixels[next][3] = 1;
                //  tile.pixels[next][4] = 1;
                break;
            case DOWN:
                var next = 0;
                for (var n = 6; n >= 0; n--) {
                    if (tile.pixels[n][3] == 1) {
                        next = n + 1;
                        break;
                    }
                }
                if (next == 7) { done = true; next = 6 }
                tile.pixels[next][3] = 1;
                // tile.pixels[next][4] = 1;
                break;
        }

        // IF we're at the middle, switch direction
        if (tile.atMiddle == false &&
            (tile.pixels[3][3] == 1 /*+ tile.pixels[3][4] + tile.pixels[4][3] + tile.pixels[4][4] == 4)*/)) {
            switch (tile.direction) {
                case LEFT:
                    tile.direction = [0, UP, 0, DOWN, 0, 0, LEFT, UP, LEFT, LEFT, LEFT, 0][tile.currentTile];
                    break;
                case RIGHT:
                    tile.direction = [0, 0, UP, 0, DOWN, DOWN, RIGHT, 0, RIGHT, RIGHT, RIGHT, 0][tile.currentTile];
                    break;
                case UP:
                    tile.direction = [0, 0, 0, RIGHT, LEFT, UP, 0, UP, LEFT, UP, 0, UP][tile.currentTile];
                    break;
                case DOWN:
                    tile.direction = [0, RIGHT, LEFT, 0, 0, DOWN, RIGHT, DOWN, 0, DOWN, 0, DOWN][tile.currentTile];
                    break;
            }
            tile.atMiddle = true;
        }
        // If we're at the end, next tile
        if (done) {
            const tile = this.tiles.at(-1);
            var nextTile = {
                x: tile.x,
                y: tile.y,
                rx: tile.rx,
                ry: tile.ry,
                atMiddle: false,
                currentTile: pipeGrid[0][0],
                direction: tile.direction,
                pixels: [
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                    [0, 0, 0, 0, 0, 0, 0, 0],
                ]
            }
            switch (tile.direction) {
                case LEFT:
                    nextTile.x = tile.x - 1;
                    nextTile.rx = nextTile.rx - 64;
                    break;
                case RIGHT:
                    nextTile.x = tile.x + 1;
                    nextTile.rx = nextTile.rx + 64;
                    break;
                case UP:
                    nextTile.y = tile.y - 1;
                    nextTile.ry = nextTile.ry - 64;
                    break;
                case DOWN:
                    nextTile.y = tile.y + 1;
                    nextTile.ry = nextTile.ry + 64;
                    break;
            }


            if (nextTile.y < 0 || nextTile.x < 0 || nextTile.y > 5 || nextTile.x > 7
                || pipeGrid[nextTile.y][nextTile.x] == 0
                || exits[pipeGrid[nextTile.y][nextTile.x]][flipDirection(tile.direction)] != 1
            ) {
                ret.next = 0;
                ret.xt = nextTile.x;
                ret.yt = nextTile.y;
            } else {
                nextTile.currentTile = pipeGrid[nextTile.y][nextTile.x];
                this.tiles.push(nextTile);
                ret.next = nextTile.currentTile;
                this.step();
            }
        }
        return ret;
    }
}

function drawGridAt(xo, yo, overlay) {
    var plus = 0
    if (overlay) { plus = 56; }
    for (var x = 0; x < pipeGrid[0].length; x++) {
        for (var y = 0; y < pipeGrid.length; y++) {
            pipes.draw(xo + x * 64, yo + y * 64, false, pipeGrid[y][x] + plus);
        }
    }
}

function drawQueueAt(xo, yo) {
    var count = 0
    for (var y = nextQueue.length - 3; y < nextQueue.length; y++) {
        pipes.draw(xo, yo + count * 64 - queueAnimation, false, nextQueue[y] + 14);
        count += 1;
    }
    ctx.fillStyle = "#eeeeee70";
    ctx.fillRect(xo - 32, yo - 32, 64, 128);
    if (queueAnimation > 0) queueAnimation /= 2;
    ctx.drawImage(shuteImage, 642, 0);
}

function drawPhoneStarts(sp) {
    phoneStarts.draw(GXO - 64 + 32, GYO + sp.end.y * 64 + 32, false, sp.colour * 2);
    phoneStarts.draw(GXO + 8 * 64 + 32, GYO + sp.start.y * 64 + 32, false, sp.colour * 2 + 1);
}

function drawToolTip() {
    ctx.drawImage(pipes.img, nextQueue.at(-1) * 64, 0, 64, 64, mx + 5, my - 20, 16, 16);
}


function clamp(v, i, x) {
    if (v < i) v = i;
    if (v > x) v = x;
    return v;
}

function inCircle(p, c) {
    return ((p.x - c.x) * (p.x - c.x) + (p.y - c.y) * (p.y - c.y) < c.r * c.r);
}

function deg2rad(d) {
    return (d / 180.0) * Math.PI;
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function pointInRect(p, r) {
    return (p.x >= r.x && p.y >= r.y && p.x < (r.x + r.width) && p.y < r.y + r.height);
}
function drawImageRotated(img, x, y, r) {
    const rad = r * Math.PI / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rad);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
}

function prepareResources() {
    background = getImage("Background");
    phoneStarts = new AnimImage("PhoneStarts", 64, 64);
    electroBoom = new AnimImage("ElectroBoom", 64, 64);
    digitsImage = getImage("Digits");
    shuteImage = getImage("Shute");
    phoneImage = getImage("Phone");
    ffImage = getImage("FF");
    pipes = new AnimImage("Pipes", 64, 64);
    titleImage = getImage("Title");
    instructions1Image = getImage("Instructions1");
    instructions2Image = getImage("Instructions2");
    deadImage = getImage("YouDied");
    winImage = getImage("YouWin");
    levelImage = getImage("NextLevel");
    pressSpace = getImage("PressSpace");

    mode = TITLE;
    titleSound.play();
}

const digitWidth = digitsImage.width / 10.0;
const digitHeight = digitsImage.height;
function drawDigit(x, y, d) {
    ctx.drawImage(digitsImage, d * (digitsImage.width / 10.0), 0, (digitsImage.width / 10.0), digitsImage.height, x, y, (digitsImage.width / 10.0), digitsImage.height);
}

function drawNumber(x, y, n) {
    var digits = [];

    while (n > 0) {
        var m = n % 10;
        n = n - m;
        n = n / 10;
        n = Math.floor(n);
        digits.push(Math.floor(m));
    }
    if (digits.length == 0) {
        digits.push(0);
    }

    digits.reverse();

    for (var dn = 0; dn < digits.length; dn++) {
        drawDigit(x + dn * (digitsImage.width / 10.0), y, digits[dn]);
    }

}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Fiddle around with the buildqueue to try and adjust the difficulty
// Bit of a hack!
function buildQueue(signalPaths) {
    var goodQueue = []
    var randomQueue = []
    nextQueue = []
    // Clear grid
    for (const sp of signalPaths) {
        goodQueue.push(PIECE_HORIZONTAL);
        goodQueue.push(PIECE_HORIZONTAL);
        goodQueue.push(PIECE_HORIZONTAL);
        goodQueue.push(PIECE_HORIZONTAL);
        goodQueue.push(PIECE_HORIZONTAL);
        goodQueue.push(PIECE_HORIZONTAL);
        goodQueue.push(PIECE_HORIZONTAL);
        if (sp.start.y == sp.end.y) {
            goodQueue.push(PIECE_HORIZONTAL);
            goodQueue.push(PIECE_HORIZONTAL);
        } else if (sp.start.y > sp.end.y) {
            goodQueue.push(PIECE_TOPRIGHT);
            goodQueue.push(PIECE_BOTTOMLEFT);
            goodQueue.push(PIECE_VERTICAL);
        } else if (sp.start.y < sp.end.y) {
            goodQueue.push(PIECE_BOTTOMRIGHT);
            goodQueue.push(PIECE_TOPLEFT);
            goodQueue.push(PIECE_BOTTOMRIGHT);
            goodQueue.push(PIECE_TOPLEFT);
            goodQueue.push(PIECE_VERTICAL);
        }
        goodQueue.push(PIECE_CROSS);
    }

    for (var n = 0; n < goodQueue.length; n++) {
        var chance = getRandomInt(1, 100);
        if (chance < 70) {
            const good = [PIECE_BOTTOMLEFT, PIECE_BOTTOMRIGHT, PIECE_CROSS, PIECE_HORIZONTAL, PIECE_TOPLEFT, PIECE_TOPRIGHT, PIECE_VERTICAL];
            randomQueue.push(good[getRandomInt(0, 6)]);
        } else {
            const bad = [PIECE_NOBOTTOM, PIECE_NORIGHT, PIECE_NOLEFT, PIECE_NOTOP];
            randomQueue.push(bad[getRandomInt(0, 3)]);
        }
    }

    shuffleArray(goodQueue);

    if (level == 0 || level == 1) {
        for (var n = 0; n < goodQueue.length; n++) {
            nextQueue.push(goodQueue[n]);
            nextQueue.push(randomQueue[n]);
        }

        if (level == 0) {
            nextQueue[nextQueue.length - 2] = PIECE_HORIZONTAL;
            nextQueue[nextQueue.length - 4] = PIECE_TOPRIGHT;
            nextQueue[nextQueue.length - 6] = PIECE_BOTTOMLEFT;
        }
    }
    if (level == 2) {
        for (var n = 0; n < goodQueue.length; n++) {
            nextQueue.push(goodQueue[n]);
        }
        var count = 0;
        for (var n=nextQueue.length;n<6*8;n++) {
            nextQueue.push(randomQueue[count]);
            count+=1;
        }
        shuffleArray(nextQueue);

    }
}



var mode = TITLE;
var level = 0;
var signalPaths = [];
var levelSwitch = false;

var StartDelay = 5;
var SpeedStepFrames = 20;
var diedAt = {}
var requiredPath = {
    from: 3,
    to: 2,
    colour: RED
}
var stepResults = []

var levelData = [
    {
        speed: 20,
        delay: 20,
        calls: 1
    },
    {
        speed: 35,
        delay: 35,
        calls: 2
    },
    {
        speed: 40,
        delay: 300,
        calls: 3
    }
];
var phoneSprites = [];

// Main game Loop
function animate(timeStamp) {

    frame++;
    // Calculate the number of seconds passed since the last frame
    secondsPassed = (timeStamp - oldTimeStamp) / 1000;
    oldTimeStamp = timeStamp;

    // Clear the background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (mode) {
        case TITLE:
            ctx.drawImage(titleImage, 0, 0);
            ctx.drawImage(pressSpace, canvas.width / 2 - pressSpace.width / 2, 300 + Math.floor(Math.sin(frame / 15) * 20));
            if (isKeyPressed("Space")) {
                delete keys["Space"]
                mode = INSTRUCTIONS1;
            }
            break;
        case INSTRUCTIONS1:
            ctx.drawImage(instructions1Image, 0, 0);
            ctx.drawImage(pressSpace, canvas.width / 2 - pressSpace.width / 2, 390 + Math.floor(Math.sin(frame / 15) * 20));
            if (isKeyPressed("Space")) {
                delete keys["Space"]
                mode = INSTRUCTIONS2;
            }
            break;
        case INSTRUCTIONS2:
            ctx.drawImage(instructions2Image, 0, 0);
            ctx.drawImage(pressSpace, canvas.width / 2 - pressSpace.width / 2, 390 + Math.floor(Math.sin(frame / 15) * 20));
            if (isKeyPressed("Space")) {
                delete keys["Space"]
                mode = PREPARE;
                titleSound.pause();
                titleSound.currentTime = 0;
                gameSound.play();
            }
            break;
        case PREPARE:
            frame = 0;
            // Clear grid
            for (var x = 0; x < pipeGrid[0].length; x++) {
                for (var y = 0; y < pipeGrid.length; y++) {
                    pipeGrid[y][x] = 0;
                }
            }

            signalPaths = []

            StartDelay = levelData[level].delay;
            SpeedStepFrames = levelData[level].speed;

            //Build paths
            switch (levelData[level].calls) {
                case 1:
                    var sp = new SignalPath({ x: 0, y: 2 }, { x: 7, y: 3 }, RED);
                    signalPaths.push(sp);
                    break;
                case 2:
                    var sp = new SignalPath({ x: 0, y: 2 }, { x: 7, y: 3 }, RED);
                    signalPaths.push(sp);
                    sp = new SignalPath({ x: 0, y: 1 }, { x: 7, y: 5 }, GREEN);
                    signalPaths.push(sp);
                    break;
                case 3:
                    var sp = new SignalPath({ x: 0, y: 2 }, { x: 7, y: 3 }, RED);
                    signalPaths.push(sp);
                    sp = new SignalPath({ x: 0, y: 1 }, { x: 7, y: 5 }, GREEN);
                    signalPaths.push(sp);
                    sp = new SignalPath({ x: 0, y: 5 }, { x: 7, y: 1 }, BLUE);
                    signalPaths.push(sp);
                    break;
            }
            // Clear queue
            buildQueue(signalPaths);

            // Go
            mode = RUNNING;
            mouseChangeState = false;
            break;
        case RUNNING:
            ctx.drawImage(background, 0, 0);
            drawQueueAt(canvas.width - 40, 16);
            drawGridAt(GXO + 32, GYO + 32, false);
            for (const sp of signalPaths) {
                drawPhoneStarts(sp);
                sp.draw();
            }
            drawGridAt(GXO + 32, GYO + 32, true);

            var result = {};
            if (mode == RUNNING) {
                if (pointInRect({ x: mx, y: my }, { x: GXO, y: GYO, width: 8 * 64, height: 6 * 64 })) {
                    drawToolTip();
                }
                // Highlight Mouse Square
                highlight.x = clamp(Math.floor((mx - GXO) / 64), 0, 7);
                highlight.y = clamp(Math.floor((my - GYO) / 64), 0, 5);


                ctx.strokeStyle = "red";
                ctx.strokeRect(GXO + highlight.x * 64, GYO + highlight.y * 64, 64, 64);
                ////////////////////
                // Mouse clicks
                if (mouseChangeState && mouseDown && pipeGrid[highlight.y][highlight.x] == 0 && pointInRect({ x: mx, y: my }, { x: GXO, y: GYO, width: 8 * 64, height: 6 * 64 })) {
                    mouseChangeState = false;
                    pipeGrid[highlight.y][highlight.x] = nextQueue.pop();
                    nextQueue.unshift(getRandomInt(1, 11));
                    queueAnimation = 64;
                }

                if (mouseDown && inCircle({ x: mx, y: my }, { r: 25, x: 678, y: 314 })) {
                    ctx.drawImage(ffImage, 680 - 34, 316 - 34);
                } else {
                    ctx.drawImage(ffImage, 678 - 34, 314 - 34);
                }

                // Fast Forward
                if ((!mouseDown) && mouseChangeState && inCircle({ x: mx, y: my }, { r: 25, x: 678, y: 314 })) {
                    mouseChangeState = false;

                    if (StartDelay > 0) {
                        StartDelay = 0;
                        phoneRing.play();
                    } else {
                        SpeedStepFrames = 5;
                    }
                }
                if ((!mouseDown) && mouseChangeState) {
                    mouseChangeState = false;
                }
                // ^^ mouse clicks
                ///////////////////

                if (frame < 60 * StartDelay) {
                    if (StartDelay - (frame / 60) < 10) {
                        drawNumber(671, 403, StartDelay - (frame / 60));
                    } else {
                        drawNumber(666, 403, StartDelay - (frame / 60));
                    }
                }
                if (frame == 60 * (StartDelay - 3)) {
                    phoneRing.play();
                }
                if (frame > 60 * StartDelay) {
                    stepResults = []

                    if (frame % SpeedStepFrames == 0) {
                        for (const sp of signalPaths) {
                            var res = sp.step();
                            stepResults.push(res);
                        }
                    }

                    var winCount = 0;
                    for (const res of stepResults) {
                        if (res.next == 0) {
                            // This may be a win
                            if (res.xt == -1 && (res.yt == res.desy)) {
                                winCount += 1;
                            } else {
                                // Or we may have failed
                                mode = DEAD;
                                gameSound.pause();
                                gameSound.currentTime = 0;
                                deadSound.play();
                                startDeathTimer = 200;
                                diedAt = result;
                            }
                        }
                    }
                    if (mode == RUNNING && winCount == signalPaths.length) {
                        mode = LEVEL;
                        levelSwitch = true;
                    }
                }

            }
            break;
        case DEAD:
            if (startDeathTimer > 0) {
                phoneRing.pause(); phoneRing.res
                startDeathTimer -= 1;
                ctx.drawImage(background, 0, 0);
                drawQueueAt(canvas.width - 40, 16);
                drawGridAt(GXO + 32, GYO + 32, false);
                for (const sp of signalPaths) {
                    drawPhoneStarts(sp);
                    sp.draw();
                }
                drawGridAt(GXO + 32, GYO + 32, true);
                electroSound.play();
                for (const res of stepResults) {
                    electroBoom.draw(res.x - 16, res.y - 16, (frame) % 5);
                    electroBoom.draw(res.x - 16, res.y + 16, (frame) % 5);
                    electroBoom.draw(res.x + 16, res.y - 16, (frame) % 5);
                    electroBoom.draw(res.x + 16, res.y + 16, (frame) % 5);
                }
            } else {
                ctx.drawImage(deadImage, 0, 0);
                ctx.drawImage(pressSpace, canvas.width / 2 - pressSpace.width / 2, 390 + Math.floor(Math.sin(frame / 15) * 20));
                if (isKeyPressed("Space")) {
                    delete keys["Space"]
                    mode = TITLE;
                    level = 0;
                    deadSound.pause();
                    deadSound.currentTime = 0;
                    titleSound.play();
                }
            }
            break;
        case LEVEL:
            ctx.drawImage(levelImage, 0, 0);
            if (levelSwitch) {
                levelSwitch = false;
                level = level + 1;

            }
            if (level == 3) {
                mode = WIN;
                phoneSprites = [];
            } else {
                // Level
                drawNumber(292, 202, level + 1);
                // Speed
                drawNumber(292, 226, levelData[level].speed);
                // Delay
                drawNumber(292, 252, levelData[level].delay);
                // Calls
                drawNumber(292, 279, levelData[level].calls);

                ctx.drawImage(pressSpace, canvas.width / 2 - pressSpace.width / 2, 390 + Math.floor(Math.sin(frame / 15) * 20));
                if (isKeyPressed("Space")) {
                    delete keys["Space"]
                    mode = PREPARE;
                }
            }
            break;
        case WIN:
            ctx.fillStyle = "black";

            if (frame % 5 == 0) {
                phoneSprites.push({
                    r: getRandomInt(0, 330),
                    x: canvas.width / 2,
                    y: canvas.height / 2,
                    speed: { x: getRandomInt(0, 10) - 5, y: -8 }
                })
            }
            for (let i = phoneSprites.length - 1; i >= 0; i--) {
                drawImageRotated(phoneImage, phoneSprites[i].x, phoneSprites[i].y, phoneSprites[i].r);
                phoneSprites[i].x += phoneSprites[i].speed.x;
                phoneSprites[i].y += phoneSprites[i].speed.y;
                phoneSprites[i].speed.y += 0.4;
                phoneSprites[i].r += 1;
                if (phoneSprites[i].r > 359) phoneSprites[i].r = 0;
                if (phoneSprites[i].y > 500) {
                    phoneSprites.splice(i, 1);
                }
            }
            ctx.drawImage(winImage, canvas.width / 2 - winImage.width / 2, 100);
            ctx.drawImage(pressSpace, canvas.width / 2 - pressSpace.width / 2, 390 + Math.floor(Math.sin(frame / 15) * 20));
            if (isKeyPressed("Space")) {
                delete keys["Space"]
                level = 0;
                mode = TITLE;
            }
            break;
    }




    // Debug overlay
    if (debug >= 1) {
        // Calculate fps
        fps = Math.round(1 / secondsPassed);
        // Draw number to the screen
        ctx.font = '25px Arial';
        ctx.fillStyle = 'pink';
        ctx.fillText("FPS: " + fps, 10, 30);
    }

    // Next frame
    requestAnimationFrame(animate);
}

async function startUp() {
    await loadImages(Images);
    prepareResources();
    animate();
}
startUp();


