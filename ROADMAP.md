# ROADMAP

- [x] 1. 建立 .env 檔案：填入 LINE Channel Access Token（GitHub Token 在 Actions 中使用內建 `GITHUB_TOKEN`，本地可選填）
- [x] 2. ~~設定 LINE Webhook URL~~ → 改為 Broadcast 廣播架構後不需要 webhook（無常駐伺服器）；通知會廣播給所有加 LINE 官方帳號好友的人
- [x] 3. 改為 GitHub Actions cron workflow（`.github/workflows/star-watch.yml`），每 4 小時掃描一次 GitHub trending，透過 LINE 官方帳號廣播通知；星數歷史存於 `data/history.json` 並於每次執行後 commit 回 repo
- [x] 4. Commit and push 至 GitHub
- [x] 5. 把這專案升級成 pnpm（`packageManager: pnpm@11`，workflow 改用 `pnpm/action-setup` + `pnpm install --frozen-lockfile`）