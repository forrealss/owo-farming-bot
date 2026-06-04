require("dotenv").config();

/**
 * Load dan validasi konfigurasi dari environment.
 * @throws {Error} Jika variabel wajib tidak ada.
 */
function loadConfig() {
  const token = process.env.DISCORD_TOKEN;
  const serverId = process.env.SERVER_ID;
  const channelId = process.env.CHANNEL_ID;

  const missing = [];
  if (!token) missing.push("DISCORD_TOKEN");
  if (!serverId) missing.push("SERVER_ID");
  if (!channelId) missing.push("CHANNEL_ID");

  if (missing.length > 0) {
    throw new Error(
      `Variabel environment tidak ditemukan: ${missing.join(", ")}\n` +
        "Lihat .env.example sebagai template.",
    );
  }

  return {
    token,
    serverId,
    channelId,
    // Default farming parameters — bisa di-extend via env nanti
    messages: ["owoh", "owob"],
    minDelayMs: 15_000,
    maxDelayMs: 25_000,
    interMessageDelayMs: 2_000,
  };
}

module.exports = { loadConfig };
