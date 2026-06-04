const { consola } = require("./logger");

/**
 * Gem ID ranges per slot (ref: owobot.fandom.com — Gems ids 51–57 & 65–78).
 * Slot  1: 51–57
 * Slot  2: 58–64
 * Slot  3: 65–71
 * Slot  4: 72–78
 */
const GEM_IDS = new Set([
  51,
  52,
  53,
  54,
  55,
  56,
  57, // slot 1
  58,
  59,
  60,
  61,
  62,
  63,
  64, // slot 2
  65,
  66,
  67,
  68,
  69,
  70,
  71, // slot 3
  72,
  73,
  74,
  75,
  76,
  77,
  78, // slot 4
]);

/**
 * Rarity ranking — semakin tinggi, semakin kuat.
 *   c = common  ☆
 *   u = unique  ⭐
 *   r = rare    ⭐⭐
 *   e = epic    ⭐⭐⭐
 *   m = mythic  ⭐⭐⭐⭐
 */
const RARITY_RANK = { c: 0, u: 1, r: 2, e: 3, m: 4 };

/**
 * Tentukan slot number dari emoji name.
 *   "ugem1" → 1,  "egem4" → 4
 * @param {string} emojiName
 * @returns {number|null}
 */
function slotFromName(emojiName) {
  const m = emojiName.match(/gem(\d)/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Tentukan rarity character dari emoji name.
 *   "ugem1" → u,  "mgem4" → m
 * @param {string} emojiName
 * @returns {string|null}
 */
function rarityFromName(emojiName) {
  const m = emojiName.match(/^([curem])/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Kirim "owo inv", tangkap response, kembalikan best gem per slot.
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {number} timeoutMs
 * @returns {Promise<Map<number, number>>} Map<slotNumber, bestGemId>
 */
function fetchInventory(client, channel, timeoutMs = 8_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.removeListener("messageCreate", handler);
      consola.warn("Timeout — tidak ada response dari owo inv");
      resolve(new Map());
    }, timeoutMs);

    const handler = (msg) => {
      if (msg.channel.id !== channel.id) return;
      if (!msg.author.bot) return;

      const isReply = msg.reference?.messageId;
      const mentionsUser = msg.mentions?.users?.has(client.user.id);
      const looksLikeInv =
        msg.content.includes("Inventory") || msg.content.includes("inventory");

      if (!isReply && !mentionsUser && !looksLikeInv) return;

      clearTimeout(timer);
      client.removeListener("messageCreate", handler);

      const bestPerSlot = parseBestGems(msg.content);
      consola.info(
        { bestPerSlot: [...bestPerSlot].map(([s, id]) => `slot${s}=${id}`) },
        "Gem terbaik per slot ditemukan",
      );
      resolve(bestPerSlot);
    };

    client.on("messageCreate", handler);
    channel.send("owo inv").catch((err) => {
      clearTimeout(timer);
      client.removeListener("messageCreate", handler);
      consola.error(err, "Gagal mengirim owo inv");
      resolve(new Map());
    });
  });
}

/**
 * Parse inventory text → ekstrak setiap (id, emoji_name) pair,
 * lalu pilih gem terkuat per slot.
 *
 * Format raw:
 *   `052`<:ugem1:492572122514980864>³    `053`<:rgem1:492572122888011776>¹
 *
 * @param {string} content
 * @returns {Map<number, number>} Map<slot, bestGemId>
 */
function parseBestGems(content) {
  // Ekstrak semua pasangan: ID + emoji name
  // Pattern: `NNN`<:NAME:ID_NUM>  (atau <a:NAME:ID_NUM>)
  const pairRegex = /`(\d{2,3})`<a?:(\w+):\d+>/g;
  const pairs = [];
  let m;
  while ((m = pairRegex.exec(content)) !== null) {
    pairs.push({ id: parseInt(m[1], 10), emoji: m[2] });
  }

  consola.debug({ pairCount: pairs.length }, "Pairs diekstrak dari inventory");

  // Filter hanya gem, kelompokkan per slot
  const bySlot = new Map(); // slot → { id, rank }

  for (const { id, emoji } of pairs) {
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

  // Konversi ke Map<slot, id>
  const bestPerSlot = new Map();
  for (const [slot, { id, rarity }] of bySlot) {
    bestPerSlot.set(slot, id);
    consola.debug({ slot, id, rarity }, "Gem terbaik per slot");
  }

  return bestPerSlot;
}

/**
 * Cek inventory → equip gem terkuat di setiap slot yang belum empowered.
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {Set<number>} [empoweredSlots] - Slot yang sudah terisi (dari response owoh)
 * @returns {Promise<string[]>} Array ID gem yang berhasil di-equip
 */
async function checkAndEquipGems(client, channel, empoweredSlots = new Set()) {
  consola.info(
    { missing: [1, 2, 3, 4].filter((s) => !empoweredSlots.has(s)) },
    "🔍 Memeriksa inventory...",
  );

  const bestPerSlot = await fetchInventory(client, channel);

  if (bestPerSlot.size === 0) {
    consola.info("✅ Tidak ada gem di inventory (mungkin sudah di-equip)");
    return [];
  }

  // Hanya equip slot yang belum empowered
  const slots = [...bestPerSlot.keys()]
    .filter((s) => !empoweredSlots.has(s))
    .sort((a, b) => a - b);

  if (slots.length === 0) {
    consola.info("✅ Semua slot dari inventory sudah empowered");
    return [];
  }

  consola.info(
    { count: slots.length, slots: slots.map((s) => `slot${s}=${bestPerSlot.get(s)}`) },
    `${slots.length} slot akan di-equip`,
  );

  const equipped = [];
  for (const slot of slots) {
    const gemId = bestPerSlot.get(slot);
    try {
      await channel.send(`owo equip ${gemId}`);
      consola.success({ slot, id: gemId }, `💎 Slot ${slot} → Gem #${gemId} di-equip`);
      await delay(2_000);
      equipped.push(String(gemId));
    } catch (err) {
      consola.error({ slot, id: gemId, err: err.message }, "Gagal equip gem");
    }
  }

  return equipped;
}

/**
 * Parse response "owoh" → ekstrak slot mana yang sudah empowered.
 *
 * Format: "...empowered by <:mgem4:...>`[505/525]` <:ugem1:...>`[12/25]` !"
 *
 * @param {string} content - Content dari response owoh
 * @returns {Set<number>} Set of slot numbers yang empowered
 */
function parseEmpoweredSlots(content) {
  const slots = new Set();
  // Match gem emoji: <:ugem1:ID> atau <a:mgem4:ID>
  const gemRegex = /<(a?):(\w*gem\d):\d+>/gi;
  let m;
  while ((m = gemRegex.exec(content)) !== null) {
    const slot = slotFromName(m[2]);
    if (slot !== null) slots.add(slot);
  }
  return slots;
}

/** Promise-based delay */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { checkAndEquipGems, parseEmpoweredSlots, GEM_IDS };
