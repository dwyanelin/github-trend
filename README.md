# ⭐ GitHub Star Explosion Detector

> Instantly detect GitHub repositories with explosive star growth and get notified via LINE.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

## What is this?

A GitHub Actions cron job that monitors GitHub's trending repositories **every 4 hours** and broadcasts a beautiful LINE Flex Message to everyone who follows your LINE Official Account when a repo experiences explosive star growth:

- **🔥 24h Alert**: Repo gains **1,000+ stars** in 24 hours
- **💥 72h Alert**: Repo gains **3,000+ stars** in 72 hours

No more wasting time browsing Twitter, Reddit, or Hacker News for hot repos. Get the signal directly from the source — **GitHub itself**. No server required: everything runs on GitHub Actions for free.

## How it works

```
GitHub Actions cron (every 4h)
        │
GitHub Trending ──(scrape)──▶ Candidate Discovery
                                      │
GitHub REST API ◄──(star count)───────┘
        │
   Star History (data/history.json, committed back to the repo)
        │
   Velocity Calculator (24h / 72h)
        │
   Alert Engine (threshold + dedup)
        │
   LINE Broadcast API ──▶ All followers of your LINE OA 🎉
```

1. Every 4 hours, a GitHub Actions workflow scrapes `github.com/trending` (daily + weekly)
2. Fetches precise star counts via GitHub REST API
3. Calculates growth velocity over 24h and 72h windows using history stored in `data/history.json`
4. When thresholds are hit, broadcasts a Flex Message card via your LINE Official Account
5. Deduplication ensures followers only get notified **once** per repo per threshold
6. The updated star history is committed back to the repo, so state survives between runs

## Setup

### 1. Create a LINE Official Account with Messaging API

1. Go to the [LINE Developers Console](https://developers.line.biz/console/)
2. Create a provider, then a **Messaging API** channel (this creates a LINE Official Account)
3. In the channel's **Messaging API** tab, issue a **long-lived Channel Access Token**
4. Add the Official Account as a friend (scan its QR code) — broadcasts go to all followers

### 2. Configure GitHub repository secrets

In your repo → **Settings → Secrets and variables → Actions**, add:

| Secret | Value |
|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | The long-lived channel access token from step 1 |

The workflow uses the built-in `GITHUB_TOKEN` for GitHub API calls — no personal access token needed.

### 3. Enable the workflow

The workflow at [.github/workflows/star-watch.yml](.github/workflows/star-watch.yml) runs automatically every 4 hours. You can also trigger it manually from the **Actions** tab (`workflow_dispatch`).

## Local development

```bash
cp .env.example .env   # fill in LINE_CHANNEL_ACCESS_TOKEN (and optionally GITHUB_TOKEN)
npm install
npm test               # unit tests (no network needed)
npm run dev            # run the full pipeline once (scrape → track → analyze → broadcast)
```

Note: running the pipeline locally writes to `data/history.json` and, if thresholds are hit, sends a **real broadcast** to your LINE OA followers.

## Configuration

| Env var | Default | Description |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | — | LINE Messaging API long-lived channel access token (required to broadcast) |
| `GITHUB_TOKEN` | — | GitHub API token (optional; raises rate limits) |
| `STAR_THRESHOLD_24H` | `1000` | Stars gained in 24h to trigger an alert |
| `STAR_THRESHOLD_72H` | `3000` | Stars gained in 72h to trigger an alert |

## License

MIT
