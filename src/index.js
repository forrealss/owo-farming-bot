const { Client } = require("discord.js-selfbot-v13");
const { loadConfig } = require("./config");
const { consola, renderIntro } = require("./logger");
const { startFarming } = require("./farm");

async function main() {
  // ── 1. Load & validasi config ──
  const config = loadConfig();
  renderIntro(config);

  // ── 2. Buat client ──
  const client = new Client({
    checkUpdate: false,
    ws: {
      properties: { browser: "Discord Client" },
    },
  });

  // ── 3. Handle ready ──
  client.once("ready", async () => {
    consola.success("Discord client siap");

    try {
      const guild = await client.guilds.fetch(config.serverId);
      const channel = await guild.channels.fetch(config.channelId);

      if (!channel?.isText()) {
        throw new Error(
          `Channel ${config.channelId} bukan text channel atau tidak ditemukan`,
        );
      }

      consola.info(
        { serverId: config.serverId, channelId: config.channelId },
        "Channel target ter-resolve",
      );

      startFarming(client, channel, config);
    } catch (err) {
      consola.error(err, "Gagal inisialisasi farming");
      process.exit(1);
    }
  });

  // ── 4. Graceful shutdown ──
  const shutdown = (signal) => {
    consola.info(`${signal} diterima, menutup koneksi...`);
    client.destroy();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // ── 5. Login ──
  try {
    await client.login(config.token);
  } catch (err) {
    consola.error(err, "Login gagal — periksa DISCORD_TOKEN");
    process.exit(1);
  }
}

main();
