/**
 * Test: coba equip star ID 80 — cek semua response (reply, DM, messageCreate).
 */
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");

const { DISCORD_TOKEN, SERVER_ID, CHANNEL_ID } = process.env;

const client = new Client({ checkUpdate: false });

client.once("ready", async () => {
  console.log("✅ Connected");
  const guild = await client.guilds.fetch(SERVER_ID);
  const channel = await guild.channels.fetch(CHANNEL_ID);

  // Collect ALL bot messages & DM for 8 detik
  const responses = [];

  const hChannel = (m) => {
    if (m.author?.bot) {
      responses.push({
        type: "channel",
        content: m.content.slice(0, 300),
        ref: !!m.reference,
        embeds: m.embeds.length,
      });
    }
  };

  client.on("messageCreate", hChannel);

  // Also watch for any embed edit on our own message
  let ownMsgEdit = null;
  const hEdit = (oldMsg, newMsg) => {
    if (newMsg.embeds?.length > 0) {
      ownMsgEdit = {
        type: "self-edit",
        content: newMsg.content?.slice(0, 300),
        embeds: newMsg.embeds.length,
      };
    }
  };
  client.on("messageUpdate", hEdit);

  // Send: owo use 80
  console.log('\n📤 "owo use 80"');
  await channel.send("owo use 80");
  console.log("⏳ Menunggu 8 detik...");

  await delay(8000);

  // Send: owo equip 80
  console.log('\n📤 "owo equip 80"');
  await channel.send("owo equip 80");
  console.log("⏳ Menunggu 8 detik...");

  await delay(8000);

  client.removeListener("messageCreate", hChannel);
  client.removeListener("messageUpdate", hEdit);

  console.log("\n=== ALL RESPONSES ===");
  console.log("Responses from bot:", responses.length);
  responses.forEach((r, i) => console.log(`  ${i}:`, JSON.stringify(r)));
  console.log("Self-edit:", ownMsgEdit);

  client.destroy();
  process.exit(0);
});

client.login(DISCORD_TOKEN).catch((err) => {
  console.error("Login gagal:", err);
  process.exit(1);
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
