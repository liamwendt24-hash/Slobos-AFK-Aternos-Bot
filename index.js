const mineflayer = require('mineflayer');
const http = require('http');
const fs = require('fs');

// 1. Web server for hosting platforms
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AFK Bot active');
}).listen(PORT, () => {
  console.log(`[HTTP] Keep-alive active on port ${PORT}`);
});

// 2. Load settings
let settings;
try {
  settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'));
} catch (err) {
  console.error('[Error] Could not load settings.json:', err.message);
  process.exit(1);
}

function createBot() {
  console.log('[Bot] Connecting to server...');

  const bot = mineflayer.createBot({
    host: settings.server.ip,
    port: settings.server.port,
    username: settings["bot-account"].username,
    version: settings.server.version || false
  });

  let humanLoopTimeout = null;

  bot.once('spawn', () => {
    console.log('[Bot] Spawned into world.');

    // AuthMe login delay
    if (settings.utils['auto-auth']?.enabled) {
      setTimeout(() => {
        bot.chat(`/login ${settings.utils['auto-auth'].password}`);
        console.log('[Bot] Logged in via AuthMe.');
      }, 5000);
    }

    // Start Realistic Human Behavior Loop after spawn
    setTimeout(() => {
      console.log('[Bot] Humanized behaviors active.');
      runHumanRoutine();
    }, 10000);
  });

  // Human Behavioral State Machine
  function runHumanRoutine() {
    if (!bot.entity) return;

    // Check if there is a real player standing nearby (within 6 blocks)
    const filterPlayer = (e) => e.type === 'player' && e.username !== bot.username;
    const nearestPlayer = bot.nearestEntity(filterPlayer);

    // 1. If a player is nearby, 40% chance to look directly at them
    if (nearestPlayer && bot.entity.position.distanceTo(nearestPlayer.position) <= 6 && Math.random() < 0.4) {
      const eyePosition = nearestPlayer.position.offset(0, 1.6, 0);
      bot.lookAt(eyePosition, true);
    } 
    else {
      // 2. Random Player Actions
      const roll = Math.random();

      if (roll < 0.40) {
        // Natural glance around
        const yaw = bot.entity.yaw + (Math.random() - 0.5) * 1.6;
        const pitch = (Math.random() - 0.5) * 0.3;
        bot.look(yaw, pitch, true);
      } 
      else if (roll < 0.60) {
        // Double Crouch / Hello gesture
        bot.setControlState('sneak', true);
        setTimeout(() => {
          bot.setControlState('sneak', false);
          setTimeout(() => {
            bot.setControlState('sneak', true);
            setTimeout(() => bot.setControlState('sneak', false), 300);
          }, 200);
        }, 300);
      } 
      else if (roll < 0.80) {
        // Small step adjustment
        bot.setControlState('forward', true);
        setTimeout(() => bot.setControlState('forward', false), 300 + Math.random() * 400);
      } 
      else if (roll < 0.90) {
        // Swing arm (main hand)
        bot.swingArm('right');
      } 
      else {
        // Switch hotbar slot (0 to 8)
        const randomSlot = Math.floor(Math.random() * 9);
        bot.setQuickBarSlot(randomSlot);
      }
    }

    // Schedule next decision at a randomized human interval (4 - 12 seconds)
    const nextInterval = 4000 + Math.random() * 8000;
    humanLoopTimeout = setTimeout(runHumanRoutine, nextInterval);
  }

  bot.on('kicked', (reason) => console.log('[Bot Kicked]:', reason));

  bot.on('end', (reason) => {
    if (humanLoopTimeout) clearTimeout(humanLoopTimeout);
    console.log(`[Bot] Disconnected (${reason}). Reconnecting in 15s...`);
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => console.error('[Bot Error]:', err.message));
}

createBot();
