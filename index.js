const mineflayer = require('mineflayer');
const http = require('http');
const fs = require('fs');

// 1. Keep-Alive Web Server
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AFK Bot is running!');
}).listen(PORT, () => {
  console.log(`[HTTP] Server listening on port ${PORT}`);
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
  console.log('[Bot] Connecting to Minecraft server...');

  const bot = mineflayer.createBot({
    host: settings.server.ip,
    port: settings.server.port,
    username: settings["bot-account"].username,
    version: settings.server.version || false
  });

  bot.once('spawn', () => {
    console.log('[Bot] Spawned in world.');

    // Handle AuthMe /login
    if (settings.utils['auto-auth']?.enabled) {
      setTimeout(() => {
        bot.chat(`/login ${settings.utils['auto-auth'].password}`);
        console.log('[Bot] Logged in.');
      }, 2500);
    }

    // Start walking forward once spawned
    setTimeout(() => {
      if (settings.movement.enabled) {
        bot.setControlState('forward', true);
      }
    }, 4000);
  });

  // Smooth look-around timer (rotates head so it looks natural)
  setInterval(() => {
    if (bot.entity && settings.movement.enabled) {
      const yaw = bot.entity.yaw + 0.5;
      const pitch = (Math.random() - 0.5) * 0.2;
      bot.look(yaw, pitch, true);
    }
  }, settings.movement['look-around']?.interval || 8000);

  // Jump over blocks directly in front
  bot.on('physicsTick', () => {
    if (!settings.movement.enabled || !bot.entity) return;

    const yaw = bot.entity.yaw;
    const frontX = -Math.sin(yaw) * 0.8;
    const frontZ = -Math.cos(yaw) * 0.8;

    const feetBlock = bot.blockAt(bot.entity.position.offset(frontX, 0, frontZ));
    const headBlock = bot.blockAt(bot.entity.position.offset(frontX, 1, frontZ));

    // Jump if there is a 1-block wall ahead with open air above it
    if (feetBlock && feetBlock.boundingBox === 'block') {
      if (!headBlock || headBlock.boundingBox === 'empty') {
        bot.setControlState('jump', true);
      }
    } else {
      bot.setControlState('jump', false);
    }
  });

  bot.on('end', (reason) => {
    console.log(`[Bot] Disconnected (${reason}). Reconnecting in 10s...`);
    setTimeout(createBot, 10000);
  });

  bot.on('error', (err) => console.error('[Bot Error]', err.message));
}

createBot();
