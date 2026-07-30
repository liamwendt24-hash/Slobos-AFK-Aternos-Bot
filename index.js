const mineflayer = require('mineflayer');
const http = require('http');
const fs = require('fs');

// 1. Keep-Alive Web Server for UptimeRobot
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AFK Bot is active!');
}).listen(PORT, () => {
  console.log(`[HTTP] Keep-alive server running on port ${PORT}`);
});

// 2. Load settings from settings.json
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

  let humanRoutineInterval = null;

  bot.once('spawn', () => {
    console.log('[Bot] Spawned into world.');

    // 1. AuthMe login with a 5-second natural join delay
    if (settings.utils['auto-auth']?.enabled) {
      setTimeout(() => {
        const pwd = settings.utils['auto-auth'].password;
        bot.chat(`/login ${pwd}`);
        console.log('[Bot] Sent AuthMe login.');
      }, 5000);
    }

    // 2. Start human behavior actions after logging in
    setTimeout(() => {
      console.log('[Bot] Human-like behavior active.');

      humanRoutineInterval = setInterval(() => {
        if (!bot.entity) return;

        const actionChoice = Math.random();

        // 50% Chance: Smooth head glance
        if (actionChoice < 0.50) {
          const yawShift = (Math.random() - 0.5) * 1.8;
          const pitchShift = (Math.random() - 0.5) * 0.4;
          bot.look(bot.entity.yaw + yawShift, pitchShift, true);
        }
        // 20% Chance: Brief sneak (Shift)
        else if (actionChoice < 0.70) {
          bot.setControlState('sneak', true);
          setTimeout(() => bot.setControlState('sneak', false), 1000 + Math.random() * 1500);
        }
        // 20% Chance: Take a small 1-step walk
        else if (actionChoice < 0.90) {
          bot.setControlState('forward', true);
          setTimeout(() => bot.setControlState('forward', false), 400 + Math.random() * 600);
        }
        // 10% Chance: Swing arm / punch air
        else {
          bot.swingArm('right');
        }

      }, 6000 + Math.random() * 6000); // Triggers every 6 to 12 seconds randomly

    }, 10000);
  });

  bot.on('kicked', (reason) => {
    console.log('[Bot Kicked Reason]:', reason);
  });

  bot.on('end', (reason) => {
    if (humanRoutineInterval) clearInterval(humanRoutineInterval);
    console.log(`[Bot] Disconnected (${reason}). Reconnecting in 15 seconds...`);
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => console.error('[Bot Error]', err.message));
}

createBot();
