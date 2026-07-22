import { config } from '../config';
import { getSnapshotBefore, hasAlertBeenSent, markAlertSent, RepoRecord } from '../store';
import { TrackedRepo } from '../tracker/starTracker';

export interface Alert {
  repo: RepoRecord;
  currentStars: number;
  delta: number;
  thresholdType: '24h' | '72h';
  hoursWindow: number;
}

export function analyzeVelocity(trackedRepos: TrackedRepo[]): Alert[] {
  const alerts: Alert[] = [];

  for (const { repo, currentStars } of trackedRepos) {
    // Check 24h threshold
    const snap24h = getSnapshotBefore(repo.fullName, 24);
    if (snap24h) {
      const delta24h = currentStars - snap24h.star_count;
      if (delta24h >= config.thresholds.stars24h) {
        if (!hasAlertBeenSent(repo.fullName, '24h')) {
          alerts.push({
            repo,
            currentStars,
            delta: delta24h,
            thresholdType: '24h',
            hoursWindow: 24,
          });
        }
      }
    }

    // Check 72h threshold
    const snap72h = getSnapshotBefore(repo.fullName, 72);
    if (snap72h) {
      const delta72h = currentStars - snap72h.star_count;
      if (delta72h >= config.thresholds.stars72h) {
        if (!hasAlertBeenSent(repo.fullName, '72h')) {
          alerts.push({
            repo,
            currentStars,
            delta: delta72h,
            thresholdType: '72h',
            hoursWindow: 72,
          });
        }
      }
    }
  }

  console.log(`[Analyzer] Found ${alerts.length} alerts to send`);
  return alerts;
}

export function confirmAlerts(alerts: Alert[]): void {
  for (const alert of alerts) {
    markAlertSent(alert.repo.fullName, alert.thresholdType);
  }
}
