# OwO Bot

Bot farming Discord untuk [OwO Bot](https://owobot.com) — otomatisasi `owoh`/`owob`, auto-equip gem & star, anti-deteksi botting.

## Fitur

| Fitur | Deskripsi |
|-------|-----------|
| 🔄 **Farming loop** | Kirim `owoh` + `owob` otomatis dengan jeda acak |
| 💎 **Auto-equip gem** | Deteksi gem terbaik per slot, equip multi-ID dalam 1 command |
| 🌟 **Auto-equip star** | Deteksi star terkuat, equip via `owo use` |
| 📦 **Auto-buka lootbox** | Otomatis `owo lb all` kalau lootbox terdeteksi |
| 🛡️ **Anti-detection** | Berhenti otomatis kalau OwO kirim verifikasi "are you a real human" |
| 🔍 **Empowered tracking** | Parse response `owoh` — skip inventory kalau semua slot penuh |
| ⚠️ **Expired re-check** | Deteksi gem/star expired → auto re-equip |

## Prasyarat

- [Bun](https://bun.sh) runtime (`>= 1.3`)
- Akun Discord (selfbot — gunakan dengan risiko sendiri)
- Server + channel tempat OwO Bot berjalan

## Setup

```bash
# Clone
git clone https://github.com/forrealss/owo-farming-bot
cd owo-farming-bot

# Install dependencies
bun install

# Konfigurasi
cp .env.example .env
# Edit .env — isi DISCORD_TOKEN, SERVER_ID, CHANNEL_ID
```

## Environment Variables

| Variable | Wajib | Default | Deskripsi |
|----------|-------|---------|-----------|
| `DISCORD_TOKEN` | ✅ | — | Token akun Discord |
| `SERVER_ID` | ✅ | — | ID server Discord |
| `CHANNEL_ID` | ✅ | — | ID channel untuk farming |
| `MESSAGES` | ❌ | `owoh,owob` | Pesan yang dikirim (pisahkan dengan koma) |
| `MIN_DELAY_MS` | ❌ | `15000` | Jeda minimal antar siklus (ms) |
| `MAX_DELAY_MS` | ❌ | `25000` | Jeda maksimal antar siklus (ms) |
| `INTER_MESSAGE_DELAY_MS` | ❌ | `2000` | Jeda antar pesan dalam 1 siklus (ms) |

## Menjalankan

```bash
# Development
bun start

# Production (PM2)
pm2 start "bun src/index.js" --name owo --interpreter none --cwd /path/to/owobot
pm2 logs owo
pm2 restart owo
```

## Struktur Proyek

```
owobot/
├── src/
│   ├── index.js          # Entry point
│   ├── config.js         # Load & validasi .env
│   ├── logger.js         # Banner ASCII + consola
│   ├── farm.js           # Farming loop + empowered tracking
│   └── inventory.js      # Logic gem, star, lootbox
├── scripts/
│   ├── test-inv.js       # Test parse inventory
│   ├── test-owoh.js      # Test dump response owoh
│   ├── test-star.js      # Test equip star
│   └── test-star2.js     # Test equip star (debug)
├── .env.example          # Template konfigurasi
├── package.json
├── eslint.config.js
└── .prettierrc
```

## Scripts

| Command | Deskripsi |
|---------|-----------|
| `bun start` | Jalankan bot |
| `bun run lint` | ESLint check |
| `bun run fix` | Format + lint auto-fix |
| `bun run check` | Format check + lint |

## Cara Kerja

```
┌──────────────────────────────────────────────────┐
│  SIKLUS FARMING                                  │
│                                                  │
│  1. Kirim "owoh"                                 │
│  2. Tangkap response — parse empowered slots     │
│     "...empowered by <:mgem4:...> <:ugem1:...>"  │
│                                                  │
│  3. Kalau ada slot kosong (belum 4/4):           │
│     → owo inv → parse gem + star + lootbox       │
│     → Equip gem terkuat di slot kosong           │
│     → Equip star kalau belum active              │
│     → Buka lootbox kalau ada                     │
│                                                  │
│  4. Kirim "owob"                                 │
│  5. Jeda 15-25 detik (random)                    │
│  6. Ulangi                                       │
└──────────────────────────────────────────────────┘
```

### Gem & Star ID Ranges

| Slot | Tipe | Range ID | Rarity Tiers |
|------|------|----------|--------------|
| 1 | Hunting ◆ | 51–57 | c, u, r, e, m, l, f |
| 2 | Empowering ● | 58–64 | c, u, r, e, m, l, f |
| 3 | Lucky ♥ | 65–71 | c, u, r, e, m, l, f |
| 4 | Special ★ | 72–78 | c, u, r, e, m, l, f |
| Star | — | 79–85 | c, u, r, e, m, l, f |

## ⚠️ Disclaimer

Ini adalah **selfbot** — melanggar [Terms of Service Discord](https://discord.com/terms). Gunakan dengan risiko sendiri. Akunmu bisa dibanned oleh Discord.

Bot ini juga melanggar Terms of Service OwO Bot — akun OwO-mu bisa dibanned.

## License

ISC
