const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

let gameStarted = false;
let callInterval = null;
let allNumbers = [];
let calledNumbers = [];
let winners = [];
let players = [];
let adminSocketId = null;

/**
 *
 * shuffle function para mag-random ng mga numbers para sa
 * bingo game. Ang function na ito ay nag-generate ng
 * array ng mga numero mula 1 hanggang 75 at nag-shuffle
 * ito gamit ang Fisher-Yates algorithm.
 */
function shuffleNumbers() {
  const nums = Array.from({ length: 75 }, (_, i) => i + 1);
  for (let i = nums.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [nums[i], nums[j]] = [nums[j], nums[i]];
  }
  return nums;
}

/**
 * emitPlayers function para mag-send ng updated
 */
function emitPlayers() {
  io.emit('players-updated', players);
}

/**
 * Socket.IO connection event handler para sa mga
 * client na nag-coconnect sa server.
 */
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  /**
   * Register yung admin socket id para isa lang ang pwedeng magjoin na admin.
   */
  socket.on('register-admin', () => {
    if (!adminSocketId) {
      adminSocketId = socket.id;
      console.log(`Admin registered: ${socket.id}`);
      io.emit('admin-status', { exists: true });
    } else {
      socket.emit('admin-exists', { exists: true });
      socket.disconnect();
    }
  });

  /**
   * Check admin status if its already registered.
   */
  socket.on('check-admin', () => {
    socket.emit('admin-status', { exists: !!adminSocketId });
  });

  /**
   * kapag nag-leave ang admin sa admin page,
   * i-reset ang adminSocketId sa null
   */

  socket.on('leave-admin', () => {
    if (socket.id === adminSocketId) {
      adminSocketId = null;
      console.log('Admin left the admin page');
      io.emit('admin-status', { exists: false });
    }
  });

  /**
   * Get game status event handler para sa mga
   * client na nag-coconnect sa server.
   */
  socket.on('get-game-status', () => {
    socket.emit('game-status', {
      started: gameStarted,
      calledNumbers,
      winners,
    });
  });

  /**
   * Get players event handler para sa mga
   * client na nag-coconnect sa server.
   */
  socket.on('get-players', () => {
    socket.emit('players-updated', players);
  });

  socket.on('player-joined', ({ nickname, cards }) => {
    const existingPlayer = players.find((p) => p.socketId === socket.id);
    if (existingPlayer) {
      existingPlayer.cards = cards;
    } else {
      players.push({ socketId: socket.id, nickname, cards });
    }

    emitPlayers();
  });

  socket.on('set-nickname', (nickname) => {
    if (gameStarted) {
      socket.emit('game-error', 'Game has already started. You cannot join.');
      socket.disconnect();
      return;
    }

    players.push({ socketId: socket.id, nickname, cards: [] });
  });

  socket.on('start-game', () => {
    if (gameStarted) return;
    gameStarted = true;
    winners = [];
    allNumbers = shuffleNumbers();
    calledNumbers = [];

    io.emit('game-started');

    callInterval = setInterval(() => {
      if (
        allNumbers.length === 0 ||
        winners.length >= (players.length === 2 ? 1 : 3)
      ) {
        clearInterval(callInterval);
        io.emit('game-ended');
        gameStarted = false;
        return;
      }

      const number = allNumbers.shift();
      calledNumbers.push(number);
      io.emit('number-called', number);
      console.log('Number called:', number);
    }, 100);
  });

  /**
   * check-blackout event handler para sa pag-check
   * ng mga players kung sila ay may blackout.
   */
  socket.on('check-blackout', (data) => {
    const player = players.find((p) => p.socketId === socket.id);
    if (!player) return;

    const flat = data.card.flat();
    const isWinner = flat.every((n) => n === 0 || data.called.includes(n));

    if (isWinner && !winners.includes(player.nickname)) {
      winners.push(player.nickname);
      io.emit('winner', player.nickname);
      console.log(`Winner #${winners.length}: ${player.nickname}`);

      if (players.length === 2 && winners.length === 1) {
        io.emit('game-ended');
        gameStarted = false;
      }

      const maxWinners = Math.min(3, players.length);
      if (winners.length >= maxWinners) {
        endGame();
      }
    }
  });

  socket.on('end-game', () => {
    endGame();
  });

  socket.on('reset-game', () => {
    players = [];
    calledNumbers = [];
    winners = [];
    gameStarted = false;
    io.emit('game-status', { started: gameStarted });
    io.emit('players-updated', players);
    console.log('Game state has been reset');
  });

  /**
   * disconnect event handler para sa mga
   * client na nag-disconnect sa server.
   */
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    if (socket.id === adminSocketId) {
      adminSocketId = null;
      console.log('Admin disconnected');
      io.emit('admin-status', { exists: false });
    }
    players = players.filter((player) => player.socketId !== socket.id);
    emitPlayers();
  });
});

/**
 * endGame function para tapusin ang laro.
 */
function endGame() {
  gameStarted = false;
  clearInterval(callInterval);
  callInterval = null;
  io.emit('game-status', { started: gameStarted, calledNumbers, winners });
  io.emit('game-ended');
}

/**
 * server.listen function para sa pag-start ng
 * HTTP server.
 */
server.listen(3001, '0.0.0.0', () => {
  console.log('Server running on port 3001');
});
