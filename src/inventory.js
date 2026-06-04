const { consola } = require("./logger");

/**
 * Gem ID ranges per slot (ref: owobot.fandom.com — Gems ids 51–57 & 65–78).
 * Slot  1: 51–57 (hunting)
 * Slot  2: 58–64 (empowering)
 * Slot  3: 65–71 (lucky)
 * Slot  4: 72–78 (special)
 * Star:       79–85 (single slot, equipped via `owo use`)
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

/** Star IDs — single slot, 7 tiers. Equipped via `owo use <id>` (not `owo equip`). */
const STAR_IDS = new Set([79, 80, 81, 82, 83, 84, 85]);

/**
 * Rarity ranking — semakin tinggi, semakin kuat.
 *   c = common    ☆
 *   u = uncommon  ⭐
 *   r = rare      ⭐⭐
 *   e = epic      ⭐⭐⭐
 *   m = mythical  ⭐⭐⭐⭐
 *   l = legendary ⭐⭐⭐⭐⭐
 *   f = fabled    ⭐⭐⭐⭐⭐⭐
 */
const RARITY_RANK = { c: 0, u: 1, r: 2, e: 3, m: 4, l: 5, f: 6 };

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
  const m = emojiName.match(/^([curemlf])/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * Kirim "owo inv", tangkap response, kembalikan best gem per slot + deteksi lootbox + best star.
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {number} timeoutMs
 * @returns {Promise<{ bestPerSlot: Map<number, number>, hasLootbox: boolean, bestStar: number|null }>}
 */
function fetchInventory(client, channel, timeoutMs = 8_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      client.removeListener("messageCreate", handler);
      consola.warn("Timeout — tidak ada response dari owo inv");
      resolve({ bestPerSlot: new Map(), hasLootbox: false, bestStar: null });
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

      const { bestPerSlot, bestStar } = parseBestGems(msg.content);
      const hasLootbox = hasLootboxCheck(msg.content);

      consola.info(
        {
          bestPerSlot: [...bestPerSlot].map(([s, id]) => `slot${s}=${id}`),
          bestStar,
          hasLootbox,
        },
        "Inventory diproses",
      );
      resolve({ bestPerSlot, hasLootbox, bestStar });
    };

    client.on("messageCreate", handler);
    channel.send("owo inv").catch((err) => {
      clearTimeout(timer);
      client.removeListener("messageCreate", handler);
      consola.error(err, "Gagal mengirim owo inv");
      resolve({ bestPerSlot: new Map(), hasLootbox: false, bestStar: null });
    });
  });
}

/**
 * Parse inventory text → ekstrak best gem per slot + best star.
 *
 * @param {string} content
 * @returns {{ bestPerSlot: Map<number, number>, bestStar: number|null }}
 */
function parseBestGems(content) {
  const pairRegex = /`(\d{2,3})`<a?:(\w+):\d+>/g;
  const pairs = [];
  let m;
  while ((m = pairRegex.exec(content)) !== null) {
    pairs.push({ id: parseInt(m[1], 10), emoji: m[2] });
  }

  consola.debug({ pairCount: pairs.length }, "Pairs diekstrak dari inventory");

  // Gem: kelompokkan per slot
  const bySlot = new Map();

  // Star: pilih yang tertinggi
  let bestStarId = null;
  let bestStarRank = -1;

  for (const { id, emoji } of pairs) {
    if (GEM_IDS.has(id)) {
      const slot = slotFromName(emoji);
      const rarityChar = rarityFromName(emoji);
      if (slot === null || rarityChar === null) continue;

      const rank = RARITY_RANK[rarityChar] ?? -1;
      const existing = bySlot.get(slot);
      if (!existing || rank > existing.rank) {
        bySlot.set(slot, { id, rank, rarity: rarityChar });
      }
    } else if (STAR_IDS.has(id)) {
      const rarityChar = rarityFromName(emoji);
      if (rarityChar === null) continue;

      const rank = RARITY_RANK[rarityChar] ?? -1;
      if (rank > bestStarRank) {
        bestStarRank = rank;
        bestStarId = id;
      }
    }
  }

  const bestPerSlot = new Map();
  for (const [slot, { id }] of bySlot) {
    bestPerSlot.set(slot, id);
    consola.debug({ slot, id }, "Gem terbaik per slot");
  }

  if (bestStarId !== null) {
    consola.debug({ bestStarId, rarity: bestStarRank }, "Best star ditemukan");
  }

  return { bestPerSlot, bestStar: bestStarId };
}

/**
 * Cek apakah ada lootbox (ID 49 atau 50) di inventory.
 *
 * @param {string} content
 * @returns {boolean}
 */
function hasLootboxCheck(content) {
  const lootboxRegex = /`(049|050)`<a?:/;
  return lootboxRegex.test(content);
}

/**
 * Buka lootbox dengan "owo lb all".
 *
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @returns {Promise<void>}
 */
async function openLootboxes(channel) {
  try {
    consola.info("📦 Membuka lootbox — owo lb all...");
    await channel.send("owo lb all");
    consola.success("📦 Lootbox dibuka!");
    await delay(3_000);
  } catch (err) {
    consola.error(err, "Gagal membuka lootbox");
  }
}

/**
 * Cek inventory → equip gem + star + buka lootbox.
 *
 * @param {import("discord.js-selfbot-v13").Client} client
 * @param {import("discord.js-selfbot-v13").TextChannel} channel
 * @param {Set<number>} [empoweredSlots] - Slot yang sudah terisi (dari response owoh)
 * @param {boolean} [starActive] - Apakah star sudah aktif (dari response owoh)
 * @returns {Promise<string[]>} Array item yang berhasil di-equip
 */
async function checkAndEquipGems(
  client,
  channel,
  empoweredSlots = new Set(),
  starActive = false,
) {
  consola.info(
    { missing: [1, 2, 3, 4].filter((s) => !empoweredSlots.has(s)), starActive },
    "🔍 Memeriksa inventory...",
  );

  const { bestPerSlot, hasLootbox, bestStar } = await fetchInventory(client, channel);

  // ── Buka lootbox kalau ada ──
  if (hasLootbox) {
    await openLootboxes(channel);
  }

  // ── Equip star (pakai owo use) ──
  if (bestStar !== null && !starActive) {
    try {
      consola.info({ id: bestStar }, "🌟 Meng-equip star...");
      await channel.send(`owo use ${bestStar}`);
      consola.success({ id: bestStar }, "🌟 Star di-equip!");
      await delay(2_000);
    } catch (err) {
      consola.error({ id: bestStar, err: err.message }, "Gagal equip star");
    }
  } else if (bestStar !== null && starActive) {
    consola.debug({ id: bestStar }, "Star sudah aktif — skip");
  }

  // ── Equip gem ──
  if (bestPerSlot.size === 0) {
    consola.info("✅ Tidak ada gem di inventory (mungkin sudah di-equip)");
    return [];
  }

  const slots = [...bestPerSlot.keys()]
    .filter((s) => !empoweredSlots.has(s))
    .sort((a, b) => a - b);

  if (slots.length === 0) {
    consola.info("✅ Semua slot dari inventory sudah empowered");
    return [];
  }

  consola.info(
    {
      count: slots.length,
      slots: slots.map((s) => `slot${s}=${bestPerSlot.get(s)}`),
    },
    `${slots.length} slot akan di-equip`,
  );

  const equipped = [];
  const multiequipIds = slots.map((slot) => bestPerSlot.get(slot));
  const multiequipCmd = `owo equip ${multiequipIds.join(" ")}`;

  try {
    await channel.send(multiequipCmd);
    consola.success(
      { slots, ids: multiequipIds },
      `💎 Multi-equip ${slots.length} slot → ${multiequipIds.join(", ")}`,
    );
    await delay(2_000);
    equipped.push(...multiequipIds.map(String));
  } catch (err) {
    consola.error(
      { slots, ids: multiequipIds, err: err.message },
      "Gagal multi-equip gem",
    );
  }

  return equipped;
}

/**
 * Parse response "owoh" → ekstrak gem slots + apakah star sudah aktif.
 *
 * @param {string} content - Content dari response owoh
 * @returns {{ slots: Set<number>, starActive: boolean }}
 */
function parseEmpowered(content) {
  const slots = new Set();
  let starActive = false;

  // Match gem emoji: <:ugem1:ID> atau <a:mgem4:ID>
  const gemRegex = /<(a?):(\w*gem\d):\d+>/gi;
  let m;
  while ((m = gemRegex.exec(content)) !== null) {
    const slot = slotFromName(m[2]);
    if (slot !== null) slots.add(slot);
  }

  // Cek star di empowered line: <a:lstar:ID> atau <:cstar:ID>
  const starRegex = /<(a?):(\w*star):\d+>/gi;
  while ((m = starRegex.exec(content)) !== null) {
    starActive = true;
    break;
  }

  return { slots, starActive };
}

/** Promise-based delay */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { checkAndEquipGems, parseEmpowered, GEM_IDS, STAR_IDS, RARITY_RANK };
