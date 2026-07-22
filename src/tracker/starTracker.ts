import { config } from '../config';
import { upsertRepo, insertSnapshot, RepoRecord } from '../store';
import { TrendingRepo } from '../scraper/trending';

interface GitHubRepoResponse {
  stargazers_count: number;
  description: string | null;
  language: string | null;
}

async function fetchStarCount(fullName: string): Promise<GitHubRepoResponse> {
  const url = `https://api.github.com/repos/${fullName}`;
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitHubStarExplosionDetector/1.0',
  };
  if (config.github.token) {
    headers['Authorization'] = `Bearer ${config.github.token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    throw new Error(`[Tracker] Repo not found: ${fullName}`);
  }
  if (response.status === 403 || response.status === 429) {
    const resetAt = response.headers.get('x-ratelimit-reset');
    throw new Error(`[Tracker] Rate limited. Resets at ${resetAt ? new Date(parseInt(resetAt) * 1000).toISOString() : 'unknown'}`);
  }
  if (!response.ok) {
    throw new Error(`[Tracker] HTTP ${response.status} for ${fullName}`);
  }

  return response.json() as Promise<GitHubRepoResponse>;
}

export interface TrackedRepo {
  repo: RepoRecord;
  currentStars: number;
}

export async function trackRepos(trending: TrendingRepo[]): Promise<TrackedRepo[]> {
  const results: TrackedRepo[] = [];
  const batchSize = 10;

  for (let i = 0; i < trending.length; i += batchSize) {
    const batch = trending.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (repo) => {
        try {
          const data = await fetchStarCount(repo.fullName);
          const record = upsertRepo(
            repo.fullName,
            data.description ?? repo.description,
            data.language ?? repo.language,
            repo.url,
          );
          insertSnapshot(record.fullName, data.stargazers_count);
          return { repo: record, currentStars: data.stargazers_count };
        } catch (err) {
          console.error(`[Tracker] Failed to track ${repo.fullName}:`, (err as Error).message);
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
      }
    }

    // Small delay between batches to be respectful of rate limits
    if (i + batchSize < trending.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log(`[Tracker] Successfully tracked ${results.length}/${trending.length} repos`);
  return results;
}
