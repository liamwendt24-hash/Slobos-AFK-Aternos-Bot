const mineflayer = require('mineflayer');
const http = require('http');
const fs = require('fs');

// 1. Web server for UptimeRobot pings
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AFK Bot is running 24/7!');
}).listen(PORT, () => {
  console.log(`[HTTP] Keep-alive server listening on port ${PORT}`);
});

// 2. Load JSON Configuration
let config;
try {
  config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
} catch (err) {
  console.error('[Config Error] Could not load config.json:', err.message);
  process.exit(1);
}

function createBotInstance() {
  console.log('[Bot] Connecting to server...');

  const bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config["bot-account"].username,
    version: config.server.version || false
  });

  // Handle AuthMe login after spawning
  bot.once('spawn', () => {
    console.log('[Bot] Spawned into world.');
    
    if (config.utils['auto-auth'] && config.utils['auto-auth'].enabled) {
      const pwd = config.utils['auto-auth'].password;
      setTimeout(() => {
        bot.chat(`/login ${pwd}`);
        console.log('[Bot] Sent /login command.');
      }, 2500);
    }
  });

  // Detection & jump logic for obstacles directly ahead
  bot.on('physicsTick', () => {
    if (!config.movement.enabled || !bot.entity) return;

    const yaw = bot.entity.yaw;
    const frontX = -Math.sin(yaw) * 0.8;
    const frontZ = -Math.cos(yaw) * 0.8;

    const feetBlock = bot.blockAt(bot.entity.position.offset(frontX, 0, frontZ));
    const headBlock = bot.blockAt(bot.entity.position.offset(frontX, 1, frontZ));

    if (feetBlock && feetBlock.boundingBox === 'block') {
      if (!headBlock || headBlock.boundingBox === 'empty') {
        bot.setControlState('jump', true);
      }
    } else {
      bot.setControlState('jump', false);
    }
  });

  // Auto-reconnect handling
  bot.on('end', (reason) => {
    console.log(`[Bot] Disconnected (${reason}). Reconnecting in 10s...`);
    setTimeout(createBotInstance, 10000);
  });

  bot.on('error', (err) => {
    console.error('[Bot Error]', err.message);
  });
}

createBotInstance();
