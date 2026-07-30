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

  let afkInterval = null;

  bot.once('spawn', () => {
    console.log('[Bot] Spawned in world.');

    // Wait 5 seconds before AuthMe login
    if (settings.utils['auto-auth']?.enabled) {
      setTimeout(() => {
        bot.chat(`/login ${settings.utils['auto-auth'].password}`);
        console.log('[Bot] Logged in.');
      }, 5000);
    }

    // Start humanized anti-AFK routine after 10 seconds
    setTimeout(() => {
      console.log('[Bot] Anti-AFK routine active.');
      
      afkInterval = setInterval(() => {
        if (!bot.entity) return;

        // Randomly choose an action: look around, sneak, or take a short step
        const action = Math.random();

        if (action < 0.5) {
          // Look around randomly
          const yaw = bot.entity.yaw + (Math.random() - 0.5) * 1.5;
          const pitch = (Math.random() - 0.5) * 0.5;
          bot.look(yaw, pitch, true);
        } else if (action < 0.8) {
          // Sneak for a moment
          bot.setControlState('sneak', true);
          setTimeout(() => bot.setControlState('sneak', false), 1200);
        } else {
          // Take a tiny step forward, then stop
          bot.setControlState('forward', true);
          setTimeout(() => bot.setControlState('forward', false), 800);
        }
      }, 6000 + Math.random() * 4000); // Trigger every 6-10 seconds randomly
    }, 10000);
  });

  bot.on('kicked', (reason) => console.log('[Bot Kicked Reason]:', reason));

  bot.on('end', (reason) => {
    if (afkInterval) clearInterval(afkInterval);
    console.log(`[Bot] Disconnected (${reason}). Reconnecting in 15s...`);
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => console.error('[Bot Error]', err.message));
}

createBot();
