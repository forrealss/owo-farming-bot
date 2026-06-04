/**
 * Test: kirim "owoh" dan dump response nya.
 */
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");

const { DISCORD_TOKEN, SERVER_ID, CHANNEL_ID } = process.env;

const client = new Client({ checkUpdate: false });

client.once("ready", async () => {
  console.log("✅ Connected");

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    const channel = await guild.channels.fetch(CHANNEL_ID);

    console.log('\n📤 Mengirim: "owoh"');
    const sentMsg = await channel.send("owoh");
    console.log("⏳ Menunggu response OwO...");

    let response = null;
    const start = Date.now();
    const timeout = 10_000;

    const handler = (msg) => {
      if (msg.channel.id !== channel.id) return;
      if (!msg.author.bot) return;
      if (msg.reference?.messageId !== sentMsg.id && !msg.content.includes("⚔")) return;
      response = msg;
    };

    client.on("messageCreate", handler);

    while (!response && Date.now() - start < timeout) {
      await delay(300);
    }

    client.removeListener("messageCreate", handler);

    if (!response) {
      console.log("❌ Timeout", timeout, "ms — coba ambil semua pesan terbaru:");
      const recent = await channel.messages.fetch({ limit: 5 });
      recent.forEach((m) => {
        console.log("\n--- Pesan ---");
        console.log("Author:", m.author.tag, "| Bot:", m.author.bot);
        console.log("Content:", m.content);
        console.log("Embeds:", m.embeds.length);
        m.embeds.forEach((e, i) => {
          console.log(`\n  Embed #${i}:`);
          for (const key of Object.keys(e)) {
            if (e[key] != null && key !== "raw") {
              const val =
                typeof e[key] === "string"
                  ? e[key].slice(0, 500)
                  : JSON.stringify(e[key]).slice(0, 300);
              console.log(`  ${key}:`, val);
            }
          }
        });
      });
    } else {
      console.log("\n✅ Response OwO diterima!\n");
      console.log("--- CONTENT ---");
      console.log(response.content);
      console.log("\n--- EMBEDS ---");
      console.log("Jumlah:", response.embeds.length);
      response.embeds.forEach((e, i) => {
        console.log(`\n🔹 Embed #${i}:`);
        for (const key of Object.keys(e)) {
          if (e[key] != null && key !== "raw") {
            const val =
              typeof e[key] === "string"
                ? e[key].slice(0, 800)
                : JSON.stringify(e[key]).slice(0, 500);
            console.log(`  ${key}:`, val);
          }
        }
        // If has fields
        if (e.fields?.length) {
          e.fields.forEach((f, j) => {
            console.log(`  Field ${j}: name="${f.name}" value="${f.value}"`);
          });
        }
      });
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }

  client.destroy();
  process.exit(0);
});

client.login(DISCORD_TOKEN).catch((err) => {
  console.error("Login gagal:", err);
  process.exit(1);
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
