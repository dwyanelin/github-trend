import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'history.json');

export interface RepoRecord {
  fullName: string;
  description: string | null;
  language: string | null;
  url: string;
  firstSeenAt: string;
}

interface Snapshot {
  stars: number;
  at: string; // ISO timestamp
}

interface StoreData {
  repos: Record<string, RepoRecord>;
  snapshots: Record<string, Snapshot[]>;
  sentAlerts: Record<string, string>; // "fullName|thresholdType" -> sent-at ISO
}

let data: StoreData | null = null;

function getData(): StoreData {
  if (!data) {
    if (fs.existsSync(DATA_PATH)) {
      data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8')) as StoreData;
      data.repos ||= {};
      data.snapshots ||= {};
      data.sentAlerts ||= {};
    } else {
      data = { repos: {}, snapshots: {}, sentAlerts: {} };
    }
  }
  return data;
}

export function saveStore(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(getData(), null, 2));
}

// --- Repo helpers ---

export function upsertRepo(
  fullName: string,
  description: string | null,
  language: string | null,
  url: string,
): RepoRecord {
  const d = getData();
  const existing = d.repos[fullName];
  d.repos[fullName] = {
    fullName,
    description,
    language,
    url,
    firstSeenAt: existing?.firstSeenAt ?? new Date().toISOString(),
  };
  return d.repos[fullName];
}

// --- Snapshot helpers ---

export function insertSnapshot(fullName: string, starCount: number): void {
  const d = getData();
  (d.snapshots[fullName] ||= []).push({ stars: starCount, at: new Date().toISOString() });
}

export function getSnapshotBefore(fullName: string, hoursAgo: number): { star_count: number } | undefined {
  const cutoff = Date.now() - hoursAgo * 3600 * 1000;
  const snaps = getData().snapshots[fullName] || [];
  // Latest snapshot at or before the cutoff
  let best: Snapshot | undefined;
  for (const s of snaps) {
    const t = Date.parse(s.at);
    if (t <= cutoff && (!best || t > Date.parse(best.at))) {
      best = s;
    }
  }
  return best ? { star_count: best.stars } : undefined;
}

// --- Alert dedup helpers ---

export function hasAlertBeenSent(fullName: string, thresholdType: string): boolean {
  return `${fullName}|${thresholdType}` in getData().sentAlerts;
}

export function markAlertSent(fullName: string, thresholdType: string): void {
  getData().sentAlerts[`${fullName}|${thresholdType}`] = new Date().toISOString();
}

// --- Cleanup ---

export function cleanupOldSnapshots(daysToKeep: number = 7): void {
  const d = getData();
  const cutoff = Date.now() - daysToKeep * 24 * 3600 * 1000;

  for (const [name, snaps] of Object.entries(d.snapshots)) {
    const kept = snaps.filter(s => Date.parse(s.at) >= cutoff);
    if (kept.length === 0) {
      delete d.snapshots[name];
      delete d.repos[name];
    } else {
      d.snapshots[name] = kept;
    }
  }

  // Expire dedup entries so a repo trending again months later can re-alert
  for (const [key, sentAt] of Object.entries(d.sentAlerts)) {
    if (Date.parse(sentAt) < cutoff) {
      delete d.sentAlerts[key];
    }
  }
}
