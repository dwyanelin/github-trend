/**
 * Quick test script to verify core components work.
 * Run with: npm test
 */
import { parseTrendingHtml } from './scraper/trending';
import {
  upsertRepo,
  insertSnapshot,
  getSnapshotBefore,
  hasAlertBeenSent,
  markAlertSent,
} from './store';

function testScraper() {
  console.log('\n=== Test: Scraper HTML Parser ===');

  // Simulated trending HTML snippet (matches GitHub's actual structure)
  const mockHtml = `
    <div>
      <article class="Box-row">
        <h2><a href="/openai/whisper">openai / whisper</a></h2>
        <p>Robust Speech Recognition via Large-Scale Weak Supervision</p>
        <span itemprop="programmingLanguage">Python</span>
        <span class="d-inline-block float-sm-right">2,345 stars today</span>
      </article>
      <article class="Box-row">
        <h2><a href="/rustdesk/rustdesk">rustdesk / rustdesk</a></h2>
        <p>An open-source remote desktop</p>
        <span itemprop="programmingLanguage">Rust</span>
        <span class="d-inline-block float-sm-right">1,567 stars today</span>
      </article>
    </div>
  `;

  const repos = parseTrendingHtml(mockHtml);
  console.log(`Parsed ${repos.length} repos:`);
  for (const r of repos) {
    console.log(`  - ${r.fullName}: ${r.starsToday} stars/day (${r.language})`);
  }

  console.assert(repos.length === 2, 'Should parse 2 repos');
  console.assert(repos[0].fullName === 'openai/whisper', 'First repo should be openai/whisper');
  console.assert(repos[0].starsToday === 2345, 'Stars should be 2345');
  console.assert(repos[1].language === 'Rust', 'Second repo language should be Rust');
  console.log('✅ Scraper parser tests passed!');
}

function testStore() {
  console.log('\n=== Test: Store Operations (in-memory) ===');

  const repo = upsertRepo('test/repo', 'A test repository', 'TypeScript', 'https://github.com/test/repo');
  console.assert(repo.fullName === 'test/repo', 'Repo should be upserted');

  insertSnapshot(repo.fullName, 1000);
  const recent = getSnapshotBefore(repo.fullName, 0);
  console.assert(recent?.star_count === 1000, 'Should find snapshot at cutoff = now');

  const old = getSnapshotBefore(repo.fullName, 24);
  console.assert(old === undefined, 'Should not find a 24h-old snapshot for fresh data');

  console.assert(!hasAlertBeenSent(repo.fullName, '24h'), 'No alert sent yet');
  markAlertSent(repo.fullName, '24h');
  console.assert(hasAlertBeenSent(repo.fullName, '24h'), 'Alert should be deduped after marking');

  console.log('✅ Store tests passed!');
}

testScraper();
testStore();
console.log('\nAll tests passed! 🎉');
