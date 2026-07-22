import { config } from './config';
import { scrapeAllTrending } from './scraper/trending';
import { trackRepos } from './tracker/starTracker';
import { analyzeVelocity, confirmAlerts } from './analyzer/velocity';
import { broadcastAlerts } from './notifier/line';
import { saveStore, cleanupOldSnapshots } from './store';

async function main(): Promise<void> {
  const startTime = Date.now();
  console.log(`===== Pipeline started at ${new Date().toISOString()} =====`);
  console.log(`Thresholds: ${config.thresholds.stars24h} stars/24h, ${config.thresholds.stars72h} stars/72h`);

  // Step 1: Scrape trending repos
  const trending = await scrapeAllTrending();
  if (trending.length === 0) {
    throw new Error('No trending repos found — scraper may be broken');
  }

  // Step 2: Track star counts via GitHub API
  const tracked = await trackRepos(trending);

  // Step 3: Analyze velocity and generate alerts
  const alerts = analyzeVelocity(tracked);

  // Step 4: Broadcast notifications
  if (alerts.length > 0) {
    await broadcastAlerts(alerts);
    confirmAlerts(alerts);
  }

  // Step 5: Cleanup old data and persist history
  cleanupOldSnapshots(7);
  saveStore();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`===== Pipeline complete in ${elapsed}s | ${trending.length} scraped | ${tracked.length} tracked | ${alerts.length} alerts =====`);
}

main().catch(err => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
