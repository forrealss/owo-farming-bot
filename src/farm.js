const { consola } = require("./logger");

/**
 * Pola-pola yang menandakan Owo bot mendeteksi botting.
 * Dicek dengan regex case-insensitive, toleransi karakter zero-width (zwj/zwnj)
 * yang sering disisipkan oleh Owo untuk menghindari pattern matching.
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
 * @param {string} content
 * @returns {boolean}
 */
function isBotDetection(content) {
  // Hapus semua karakter zero-width sebelum dicek
  const clean = content.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, "");
  return BOT_DETECTION_PATTERNS.some((p) => p.test(clean));
}

/**
 * Jalankan farming loop — kirim pesan secara berkala ke channel target.
 * Otomatis stop jika mendeteksi pesan botting dari Owo.
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {object} options
 * @param {string[]} options.messages
 * @param {number}   options.minDelayMs
 * @param {number}   options.maxDelayMs
 * @param {number}   options.interMessageDelayMs
 */
function startFarming(client, channel, options) {
  const { messages, minDelayMs, maxDelayMs, interMessageDelayMs } = options;

  let stopped = false;
  let timer = null;

  const formatTime = (date) => date.toLocaleString();

  const getRandomDelay = () =>
    Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;

  // ── Listener: deteksi pesan botting dari Owo ──
  const onMessage = (msg) => {
    // Hanya cek pesan di channel yang sama, dan dari bot (Owo)
    if (msg.channel.id !== channel.id) return;
    if (!msg.author.bot) return;

    if (isBotDetection(msg.content)) {
      consola.warn(
        {
          from: msg.author.tag,
          content: msg.content.slice(0, 80),
        },
        "🚨 BOTTING DETECTED — menghentikan farming!",
      );
      stop();
    }
  };

  client.on("messageCreate", onMessage);

  // ── Stop function ──
  function stop() {
    if (stopped) return;
    stopped = true;

    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    client.removeListener("messageCreate", onMessage);
    consola.warn("Farming STOPPED. Verifikasi Owo terdeteksi.");
    consola.warn("Selesaikan verifikasi secara manual, lalu restart bot.");
  }

  // ── Farming loop ──
  const loop = async () => {
    if (stopped) return;

    for (const msg of messages) {
      if (stopped) return;

      try {
        await channel.send(msg);
        consola.info({ at: formatTime(new Date()), msg }, "Pesan terkirim");
      } catch (err) {
        consola.error({ msg, err: err.message }, "Gagal mengirim pesan");
      }

      if (msg !== messages[messages.length - 1]) {
        await delay(interMessageDelayMs);
      }
    }

    if (stopped) return;

    const nextDelay = getRandomDelay();
    const nextAt = new Date(Date.now() + nextDelay);
    consola.info(
      { nextDelayMs: nextDelay, nextAt: formatTime(nextAt) },
      "Siklus berikutnya",
    );
    timer = setTimeout(loop, nextDelay);
  };

  consola.info("Farming dimulai!");
  consola.info("Menunggu deteksi botting dari Owo...");
  loop();

  return { stop };
}

/** Promise-based delay. */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { startFarming };
