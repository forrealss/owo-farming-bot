/**
 * Test script: kirim "owo inv", capture raw response,
 * lalu parse pakai parseBestGems() — pilih gem terkuat per slot.
 *
 * Usage: node src/test-inv.js
 */
require("dotenv").config();
const { Client } = require("discord.js-selfbot-v13");
const { GEM_IDS } = require("./inventory");

const { DISCORD_TOKEN, SERVER_ID, CHANNEL_ID } = process.env;

if (!DISCORD_TOKEN || !SERVER_ID || !CHANNEL_ID) {
  console.error("DISCORD_TOKEN, SERVER_ID, CHANNEL_ID wajib di .env");
  process.exit(1);
}

// ---- Copy parseBestGems dari inventory.js untuk test mandiri ----
const RARITY_RANK = { c: 0, u: 1, r: 2, e: 3, m: 4 };

function slotFromName(emojiName) {
  const m = emojiName.match(/gem(\d)/i);
  return m ? parseInt(m[1], 10) : null;
}

function rarityFromName(emojiName) {
  const m = emojiName.match(/^([curem])/i);
  return m ? m[1].toLowerCase() : null;
}

function parseBestGems(content) {
  const pairRegex = /`(\d{2,3})`<a?:(\w+):\d+>/g;
  const bySlot = new Map();
  let m;
  while ((m = pairRegex.exec(content)) !== null) {
    const id = parseInt(m[1], 10);
    const emoji = m[2];
    if (!GEM_IDS.has(id)) continue;
    const slot = slotFromName(emoji);
    const rarityChar = rarityFromName(emoji);
    if (slot === null || rarityChar === null) continue;
    const rank = RARITY_RANK[rarityChar] ?? -1;
    const existing = bySlot.get(slot);
    if (!existing || rank > existing.rank) {
      bySlot.set(slot, { id, rank, rarity: rarityChar });
    }
  }
  const bestPerSlot = new Map();
  for (const [slot, { id, rarity }] of bySlot) {
    bestPerSlot.set(slot, { id, rarity });
  }
  return bestPerSlot;
}
// ---------------------------------------------------------------

const client = new Client({ checkUpdate: false });

client.once("ready", async () => {
  console.log("✅ Connected as", client.user.tag);

  try {
    const guild = await client.guilds.fetch(SERVER_ID);
    const channel = await guild.channels.fetch(CHANNEL_ID);
    console.log("📌 Channel:", channel.name, `(${channel.id})`);

    // Kirim owo inv
    console.log('\n📤 Mengirim: "owo inv"');
    await channel.send("owo inv");
    console.log("⏳ Menunggu response OwO...");

    let response = null;
    const start = Date.now();
    const timeout = 10_000;

    const handler = (msg) => {
      if (msg.channel.id !== channel.id) return;
      if (!msg.author.bot) return;
      if (!msg.content.includes("Inventory")) return;
      response = msg;
    };

    client.on("messageCreate", handler);

    while (!response && Date.now() - start < timeout) {
      await delay(300);
    }

    client.removeListener("messageCreate", handler);

    if (!response) {
      console.log("❌ Tidak ada response dalam", timeout, "ms");
    } else {
      console.log("\n✅ Response OwO diterima!");
      console.log("--- RAW CONTENT ---");
      console.log(response.content);
      console.log("--- END RAW ---\n");

      // Parse — best gem per slot
      const bestPerSlot = parseBestGems(response.content);

      if (bestPerSlot.size === 0) {
        console.log("❌ Tidak ada gem ditemukan");
      } else {
        const rarityNames = {
          c: "Common ☆",
          u: "Unique ⭐",
          r: "Rare ⭐⭐",
          e: "Epic ⭐⭐⭐",
          m: "Mythic ⭐⭐⭐⭐",
        };

        console.log("🏆 Gem Terkuat Per Slot:");
        const slots = [...bestPerSlot.keys()].sort((a, b) => a - b);
        for (const slot of slots) {
          const { id, rarity } = bestPerSlot.get(slot);
          console.log(`  Slot ${slot}: Gem #${id} — ${rarityNames[rarity] || rarity}`);
        }
        console.log(`\n  Total: ${slots.length} slot siap di-equip`);
        console.log(
          `  Commands: ${slots.map((s) => `owo equip ${bestPerSlot.get(s).id}`).join(", ")}`,
        );
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }

  client.destroy();
  process.exit(0);
});

client.login(DISCORD_TOKEN).catch((err) => {
  console.error("❌ Login gagal:", err.message);
  process.exit(1);
});

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
