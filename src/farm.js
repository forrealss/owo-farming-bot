const { consola } = require("./logger");
const { checkAndEquipGems, parseEmpowered } = require("./inventory");

/**
 * Pola-pola yang menandakan Owo bot mendeteksi botting.
 * Dicek dengan regex case-insensitive, toleransi karakter zero-width.
 */
const BOT_DETECTION_PATTERNS = [
  /are\s+you\s+a\s+real\s+human/i,
  /use\s+the\s+link\s+below/i,
  /complete\s+this\s+within/i,
  /result\s+in\s+a\s+ban/i,
  /please\s+verify\s+you/i,
];

/**
 * Cek apakah pesan mengandung pola botting detection dari Owo.
 */
function isBotDetection(content) {
  const clean = content.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, "");
  return BOT_DETECTION_PATTERNS.some((p) => p.test(clean));
}

/**
 * Jalankan farming loop.
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {object} options
 */
function startFarming(client, channel, options) {
  const { messages, minDelayMs, maxDelayMs, interMessageDelayMs } = options;

  let stopped = false;
  let timer = null;
  let cycleCount = 0;

  let lastEmpoweredCount = -1;
  let skipInventory = false;
  let starActive = false; // tracked from owoh response

  const formatTime = (date) => date.toLocaleString();
  const getRandomDelay = () =>
    Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;

  // ── Listener: deteksi botting ──
  const onMessage = (msg) => {
    if (msg.channel.id !== channel.id) return;
    if (!msg.author.bot) return;
    if (isBotDetection(msg.content)) {
      consola.warn(
        { from: msg.author.tag, content: msg.content.slice(0, 80) },
        "🚨 BOTTING DETECTED — menghentikan farming!",
      );
      stop();
    }
  };
  client.on("messageCreate", onMessage);

  function stop() {
    if (stopped) return;
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    client.removeListener("messageCreate", onMessage);
    consola.warn("Farming STOPPED.");
  }

  // ── Equip gem + star ──
  async function equipEmptySlots(empoweredSlots) {
    const missing = [1, 2, 3, 4].filter((s) => !empoweredSlots.has(s));
    consola.info({ missing }, "Slot kosong terdeteksi — cek inventory...");

    try {
      await checkAndEquipGems(client, channel, empoweredSlots, starActive);
    } catch (err) {
      consola.error(err, "Gagal cek inventory");
    }
  }

  // ── Farming loop ──
  const loop = async () => {
    if (stopped) return;

    cycleCount++;

    // Kirim "owoh" — parse empowered line
    try {
      const sentMsg = await channel.send(messages[0]);
      consola.info({ at: formatTime(new Date()), msg: messages[0] }, "Pesan terkirim");

      // Tunggu response OwO
      let owohContent = null;
      const start = Date.now();
      const timeout = 10_000;
      const msgHandler = (msg) => {
        if (msg.channel.id !== channel.id) return;
        if (!msg.author.bot) return;
        if (
          msg.reference?.messageId === sentMsg.id ||
          msg.content.includes("empowered") ||
          msg.content.includes("hunt is")
        ) {
          owohContent = msg.content;
        }
      };

      client.on("messageCreate", msgHandler);

      while (!owohContent && Date.now() - start < timeout) {
        await delay(300);
      }

      client.removeListener("messageCreate", msgHandler);

      if (owohContent) {
        const { slots: empoweredSlots, starActive: sa } = parseEmpowered(owohContent);
        const currentCount = empoweredSlots.size;

        // Update star status
        if (sa) starActive = true;

        // Deteksi gem expired: count turun
        if (currentCount < lastEmpoweredCount) {
          consola.info(
            { before: lastEmpoweredCount, after: currentCount },
            "⚠️ Gem expired terdeteksi — akan re-check inventory",
          );
          skipInventory = false;
        }

        // Deteksi star expired: sebelumnya aktif, sekarang nggak
        if (starActive && !sa) {
          consola.info("⚠️ Star expired terdeteksi — akan re-check inventory");
          starActive = false;
          skipInventory = false;
        }

        lastEmpoweredCount = currentCount;

        if (currentCount < 4 && !skipInventory) {
          await equipEmptySlots(empoweredSlots);
          skipInventory = true;
        } else if (currentCount === 4) {
          consola.debug("Semua 4 slot empowered — skip inventory");
          skipInventory = true;
        }
      }
    } catch (err) {
      consola.error({ msg: messages[0], err: err.message }, "Gagal mengirim owoh");
    }

    // Kirim sisa pesan
    for (let i = 1; i < messages.length; i++) {
      if (stopped) return;
      try {
        await channel.send(messages[i]);
        consola.info({ at: formatTime(new Date()), msg: messages[i] }, "Pesan terkirim");
      } catch (err) {
        consola.error({ msg: messages[i], err: err.message }, "Gagal mengirim pesan");
      }
      await delay(interMessageDelayMs);
    }

    if (stopped) return;

    const nextDelay = getRandomDelay();
    const nextAt = new Date(Date.now() + nextDelay);
    consola.info(
      { nextDelayMs: nextDelay, nextAt: formatTime(nextAt), cycle: cycleCount },
      "Siklus berikutnya",
    );
    timer = setTimeout(loop, nextDelay);
  };

  consola.info("Farming dimulai! (auto-equip gem + star + lootbox)");
  loop();

  return { stop };
}

/** Promise-based delay */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { startFarming };
