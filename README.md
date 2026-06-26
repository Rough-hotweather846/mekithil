# MiMo Chain Bot

> 🔷 Automated Xiaomi MiMo Open Platform registration + Telegram admin bot
>
> ✨ Chain-loop: register → redeem → API key → ultraspeed → capture ref code → repeat
>
> 🎛 Telegram inline keyboard UI — control everything from your phone

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🔗 **Chain loop** | Auto-register accounts in chain — each new account uses previous ref code |
| 🎭 **Random fingerprint** | Unique browser profile per account (UA, WebGL, canvas, locale, timezone, hardware) |
| 🧩 **Smart captcha** | reCAPTCHA v2 + image captcha solving via 2Captcha |
| 🌐 **Multi-proxy** | Proxy pool with auto-rotation, health check, country-aware fingerprint |
| 🤖 **Telegram bot** | Admin-only with inline keyboard, real-time progress, config editor |
| 🧹 **Auto-clean chat** | Bot deletes previous messages for a clean UI |
| 🔐 **Watermarked** | Brand preserved — cannot be removed without modifying source |
| 📦 **Modular** | Clean structure: clients / core / browser / runner / bot |

---

## 📦 Project Structure

```
mekithil/
├── src/
│   ├── clients/            # External API clients
│   │   ├── tempmail.js     # Temporary email API client
│   │   └── captcha.js      # 2Captcha solver
│   ├── core/
│   │   └── registration.js # MimoRegistration + getReferralCode
│   ├── browser/
│   │   ├── fingerprint.js  # Browser profile randomizer
│   │   ├── human.js        # Human-like interaction
│   │   └── proxy.js        # Proxy pool manager
│   ├── runner/
│   │   └── chain-runner.js # Event-based chain orchestrator
│   ├── bot/
│   │   ├── index.js        # Telegram bot entry point
│   │   ├── admin.js        # Admin whitelist middleware
│   │   ├── watermark.js    # Branding & integrity
│   │   ├── commands/       # Command handlers
│   │   │   ├── chain.js    # /chain /stop + live progress
│   │   │   ├── proxy.js    # /proxies + add/delete
│   │   │   ├── config.js   # /config + edit
│   │   │   └── export.js   # /export
│   │   └── ui/
│   │       └── keyboard.js # Inline keyboard builders
│   ├── config.js           # Config loader
│   └── index.js            # Barrel export
├── scripts/
│   ├── chain-loop.js       # CLI entry point
│   └── chain-loop-config.js
├── config/
│   └── default.json        # User configuration
├── output/                 # Results directory
├── package.json
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 18
- **Chrome / Chromium** installed
- **2Captcha** account with balance
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/hirotomasato/mekithil.git
cd mekithil

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install chrome
# Linux VPS only:
npx playwright install-deps

# 4. Configure
cp config/default.json config/default.json
nano config/default.json
```

### Configuration

Edit `config/default.json`:

```json
{
  "tempmail": {
    "apiUrl": "https://your-domain.com/api"
  },
  "captcha": {
    "provider": "2captcha",
    "apiKey": "YOUR_2CAPTCHA_KEY"
  },
  "xiaomi": {
    "referralLink": "https://platform.xiaomimimo.com/?ref=YOURCODE",
    "inviteCode": "YOURCODE",
    "password": "YourPassword",
    "betaApplication": "MiMo-V2.5-Pro-UltraSpeed"
  },
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "adminIds": [YOUR_TELEGRAM_ID],
    "logChatId": null
  },
  "browser": {
    "headless": true,
    "timeout": 60000,
    "screenshots": false
  },
  "proxy": {
    "enabled": false,
    "rotatePerAccount": true,
    "defaultCountry": "US",
    "maxRetries": 3,
    "proxyList": []
  }
}
```

**Required:**
- `captcha.apiKey` — 2Captcha API key (needs balance)
- `xiaomi.inviteCode` — Referral code for first account seed (6 chars)
- `xiaomi.password` — Password for all accounts
- `telegram.botToken` — Telegram bot token from @BotFather
- `telegram.adminIds` — Your Telegram user ID (array of numbers)
- `tempmail.apiUrl` — Your own temp mail API (**must deploy yourself — see below**)

**Optional:**
- `proxy.enabled` — Enable proxy rotation
- `proxy.proxyList` — Array of proxy strings: `ip:port:user:pass`
- `browser.headless` — `true` = no UI, `false` = visible browser

### ⚠️ Required: Deploy Your Own Tempmail API

This bot does **not** include a temp email service. You must deploy your own:

📦 **[github.com/hirotomasato/tempik](https://github.com/hirotomasato/tempik)**

Self-hosted disposable email on **Cloudflare Workers** (free tier). Setup takes 5 minutes — no VPS needed.

```bash
git clone https://github.com/hirotomasato/tempik
cd tempik
npm install
npx wrangler deploy
```

Then point your config to your domain:

```json
"tempmail": {
  "apiUrl": "https://mail.yourdomain.com/api"
}
```

### Run

```bash
# Telegram Bot (recommended)
npm run bot

# CLI mode (direct terminal)
npm run chain -- --count 5
npm run chain -- --count 10 --seed XXXXXX --output results.txt
```

---

## 🤖 Telegram Bot Commands

| Command / Button | Action |
|---|---|
| `/start` | Main menu with status overview |
| `▶ Run Chain` | Select account count, start registration |
| `⏹ Stop` | Gracefully stop running chain |
| `🔌 Proxies` | View/add/delete proxy pool |
| `⚙ Config` | Edit referral code, password, API key |
| `📤 Export` | Download chain results as `.txt` |

### Live Progress

```
🚀 Chain Running
📌 Seed: XXXXXX
⏱ Elapsed: 2m 15s

████████░░░░░░░░
🔵 Processing..  ·  6/10
✅ 5 success  ·  ❌ 1 failed

📋 Latest:
✅ bulanharum75@→ USQWSH
✅ putrilucu@→ UWCYHP
❌ gagal@→ timeout
```

---

## 🌐 Proxy Setup

Proxy format: `ip:port:username:password`

```json
"proxy": {
  "enabled": true,
  "defaultCountry": "SG",
  "proxyList": [
    "103.1.2.3:5000:user:pass",
    "104.1.2.3:5001:user:pass"
  ]
}
```

| `defaultCountry` | Locale | Timezone |
|---|---|---|
| `US` | en-US | America/Chicago |
| `SG` | en-SG | Asia/Singapore |
| `ID` | id-ID | Asia/Jakarta |
| `MY` | en-US | Asia/Kuala Lumpur |
| `TH` | th-TH | Asia/Bangkok |
| `PH` | en-PH | Asia/Manila |
| `GB` | en-GB | Europe/London |

Proxy auto-rotate per account. Dead proxies (≥3 failures) are skipped and reset after 5 minutes.

---

## 📊 Output Format

`output/chain-result.txt`:
```
email:password:refCode:apiKey:invitedBy
account1@exse7en.fr:Password123:K3M2P8:sk-aaa...bbb:T9K59J
account2@exse7en.fr:Password123:LX8N2A:sk-ccc...ddd:K3M2P8
```

`output/chain-fail.log`:
```
[ISO timestamp] email | error message
```

---

## 🔐 Brand & Watermark

This project includes hardcoded branding in the Telegram bot messages. Modifying the source to remove branding may break functionality. The public repository is provided for transparency and education.

---

## ⚡ Performance

| Scenario | Per Account |
|---|---|
| No proxy (local IP) | ~2-3 minutes |
| Proxy Asia (SG/ID) | ~2.5-4 minutes |
| Proxy US | ~4-5 minutes |

Bottleneck: 2Captcha solving (60-90 seconds per account).

---

## 🛠 Troubleshooting

| Issue | Fix |
|---|---|
| **Captcha timeout** | 2Captcha workers busy — wait & retry. Add balance. |
| **Account restricted** | IP flagged — switch proxy or wait hours. |
| **Balance not credited** | Balance delayed by Xiaomi (≤5 min). Screenshot saved. |
| **Ref code not captured** | Modal layout changed — screenshot saved for debug. |
| **Browser zombie** | Ctrl+C → auto-close. `pkill chrome` if stuck. |
| **Proxy dead** | Auto-marked dead, retry next proxy. |

---

## 📄 License

MIT

---

## 👤 Author

**masantoid** — [github.com/hirotomasato](https://github.com/hirotomasato)
