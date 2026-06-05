/**
 * Test: coba equip star ID 80 dengan "owo use 80" vs "owo equip 80".
 */
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");

const { DISCORD_TOKEN, SERVER_ID, CHANNEL_ID } = process.env;

const client = new Client({ checkUpdate: false });

client.once("ready", async () => {
  console.log("✅ Connected");
  const guild = await client.guilds.fetch(SERVER_ID);
  const channel = await guild.channels.fetch(CHANNEL_ID);

  // Test 1: owo equip 80
  console.log('\n📤 Test 1: "owo equip 80"');
  const msg1 = await channel.send("owo equip 80");
  console.log("⏳ Menunggu response...");

  let resp1 = null;
  const h1 = (m) => {
    if (m.reference?.messageId === msg1.id && m.author.bot) resp1 = m;
  };
  client.on("messageCreate", h1);
  await delay(5000);
  client.removeListener("messageCreate", h1);
  console.log("Response:", resp1?.content?.slice(0, 200) || "TIMEOUT");

  await delay(2000);

  // Test 2: owo use 80
  console.log('\n📤 Test 2: "owo use 80"');
  const msg2 = await channel.send("owo use 80");
  console.log("⏳ Menunggu response...");

  let resp2 = null;
  const h2 = (m) => {
    if (m.reference?.messageId === msg2.id && m.author.bot) resp2 = m;
  };
  client.on("messageCreate", h2);
  await delay(5000);
  client.removeListener("messageCreate", h2);
  console.log("Response:", resp2?.content?.slice(0, 300) || "TIMEOUT");

  client.destroy();
  process.exit(0);
});

client.login(DISCORD_TOKEN).catch((err) => {
  console.error("Login gagal:", err);
  process.exit(1);
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
