import * as cheerio from 'cheerio';

export interface TrendingRepo {
  fullName: string;   // e.g. "facebook/react"
  description: string;
  language: string;
  url: string;        // e.g. "https://github.com/facebook/react"
  starsToday: number; // parsed from "1,234 stars today"
}

const GITHUB_TRENDING_URL = 'https://github.com/trending';

export async function scrapeTrending(since: 'daily' | 'weekly' = 'daily'): Promise<TrendingRepo[]> {
  const url = `${GITHUB_TRENDING_URL}?since=${since}`;
  console.log(`[Scraper] Fetching ${url}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'GitHubStarExplosionDetector/1.0',
      'Accept': 'text/html',
    },
  });

  if (!response.ok) {
    throw new Error(`[Scraper] HTTP ${response.status} fetching trending page`);
  }

  const html = await response.text();
  return parseTrendingHtml(html);
}

export function parseTrendingHtml(html: string): TrendingRepo[] {
  const $ = cheerio.load(html);
  const repos: TrendingRepo[] = [];

  $('article.Box-row').each((_, el) => {
    const $el = $(el);

    // Repo name: "owner / name" in h2 > a
    const repoLink = $el.find('h2 a').attr('href')?.trim();
    if (!repoLink) return;

    const fullName = repoLink.replace(/^\//, '').trim();
    const url = `https://github.com/${fullName}`;

    // Description
    const description = $el.find('p').first().text().trim() || '';

    // Programming language
    const language = $el.find('[itemprop="programmingLanguage"]').text().trim() || '';

    // Stars today: "1,234 stars today" or "1,234 stars this week"
    let starsToday = 0;
    const starText = $el.find('.float-sm-right, .d-inline-block.float-sm-right').text().trim();
    const starMatch = starText.match(/([\d,]+)\s+stars/);
    if (starMatch) {
      starsToday = parseInt(starMatch[1].replace(/,/g, ''), 10);
    }

    repos.push({ fullName, description, language, url, starsToday });
  });

  console.log(`[Scraper] Found ${repos.length} trending repos`);
  return repos;
}

export async function scrapeAllTrending(): Promise<TrendingRepo[]> {
  const [daily, weekly] = await Promise.all([
    scrapeTrending('daily'),
    scrapeTrending('weekly'),
  ]);

  // Merge: deduplicate by fullName, prefer daily data
  const seen = new Map<string, TrendingRepo>();
  for (const repo of daily) {
    seen.set(repo.fullName, repo);
  }
  for (const repo of weekly) {
    if (!seen.has(repo.fullName)) {
      seen.set(repo.fullName, repo);
    }
  }

  const result = Array.from(seen.values());
  console.log(`[Scraper] Total unique repos after merge: ${result.length}`);
  return result;
}
