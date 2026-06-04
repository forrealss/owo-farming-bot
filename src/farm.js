const { consola } = require("./logger");
const { checkAndEquipGems, parseEmpoweredSlots } = require("./inventory");

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
 * Tangkap response Owo setelah mengirim pesan farming.
 * Filter: bot, reply ke pesan kita, atau mengandung "empowered".
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {string} referenceId - message ID dari pesan yang kita kirim
 * @param {number} timeoutMs
 * @returns {Promise<string|null>} Content response atau null kalau timeout
 */
function captureOwoResponse(client, channel, referenceId, timeoutMs = 6_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.removeListener("messageCreate", handler);
      resolve(null);
    }, timeoutMs);

    const handler = (msg) => {
      if (msg.channel.id !== channel.id) return;
      if (!msg.author.bot) return;

      const isReply = msg.reference?.messageId === referenceId;
      const mentionsUser = msg.mentions?.users?.has(client.user.id);
      const looksLikeHunt = msg.content.includes("empowered");

      if (!isReply && !mentionsUser && !looksLikeHunt) return;

      clearTimeout(timer);
      client.removeListener("messageCreate", handler);
      resolve(msg.content);
    };

    client.on("messageCreate", handler);
  });
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

  // Track empowered count — re-check inventory ONLY when a gem expires (count drops)
  let lastEmpoweredCount = -1; // -1 = belum pernah, force check di siklus pertama
  let skipInventory = false;

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

  // ── Equip gem kalau ada slot kosong ──
  async function equipEmptySlots(empoweredSlots) {
    const missing = 4 - empoweredSlots.size;
    if (missing === 0) {
      consola.debug("Semua 4 slot sudah empowered — skip inventory");
      return;
    }

    consola.info({ missing }, "Slot kosong terdeteksi — cek inventory...");

    try {
      const equipped = await checkAndEquipGems(client, channel, empoweredSlots);
      if (equipped.length > 0) {
        await delay(3_000);
      }
    } catch (err) {
      consola.error(err, "Gagal cek inventory");
    }
  }

  // ── Farming loop ──
  const loop = async () => {
    if (stopped) return;

    cycleCount++;

    // Kirim pesan pertama (owoh) — tangkap response-nya
    let empoweredSlots = new Set();
    try {
      const sentMsg = await channel.send(messages[0]);
      consola.info({ at: formatTime(new Date()), msg: messages[0] }, "Pesan terkirim");

      // Tangkap response dari Owo (ada "empowered" di text)
      const owohResponse = await captureOwoResponse(client, channel, sentMsg.id, 5_000);

      if (owohResponse) {
        empoweredSlots = parseEmpoweredSlots(owohResponse);
        const currentCount = empoweredSlots.size;

        consola.debug(
          { empowered: [...empoweredSlots], count: currentCount },
          "Slot empowered terdeteksi dari owoh",
        );

        // Deteksi gem expired: count turun dari sebelumnya
        if (currentCount < lastEmpoweredCount) {
          consola.info(
            { before: lastEmpoweredCount, after: currentCount },
            "⚠️ Gem expired terdeteksi — akan re-check inventory",
          );
          skipInventory = false;
        }

        lastEmpoweredCount = currentCount;

        // Hanya buka inventory kalau memang perlu (slot < 4 DAN belum di-skip)
        if (currentCount < 4 && !skipInventory) {
          await equipEmptySlots(empoweredSlots);
          skipInventory = true; // jangan buka lagi kecuali ada gem expired
        } else if (currentCount === 4) {
          consola.debug("Semua 4 slot empowered — skip inventory");
          skipInventory = true;
        } else {
          consola.debug(
            { count: currentCount },
            "Slot belum penuh tapi inventory sudah di-skip (nunggu gem expired)",
          );
        }
      }
    } catch (err) {
      consola.error({ msg: messages[0], err: err.message }, "Gagal mengirim owoh");
    }

    // Kirim sisa pesan (owob, dll)
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
      {
        nextDelayMs: nextDelay,
        nextAt: formatTime(nextAt),
        cycle: cycleCount,
      },
      "Siklus berikutnya",
    );
    timer = setTimeout(loop, nextDelay);
  };

  consola.info("Farming dimulai! (auto-equip gem + deteksi empowered)");
  loop();

  return { stop };
}

/** Promise-based delay */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { startFarming };
