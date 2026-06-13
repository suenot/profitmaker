/**
 * Vitest setup: load the gitignored repo-root .env into process.env (without an
 * extra dotenv dependency) and provide safe defaults so module imports that
 * touch the db client don't throw at load time.
 *
 * The integration suite reads MM_LOGIN/MM_PASS etc. from process.env BY NAME and
 * soft-skips when they're absent — values are never hardcoded or logged here.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// packages/server → packages → repo root.
const REPO_ROOT = resolve(__dirname, '../../../..');
const ENV_PATH = resolve(REPO_ROOT, '.env');

/** Minimal KEY=VALUE parser: skips blanks/comments, strips matching quotes. */
function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

if (existsSync(ENV_PATH)) {
  const parsed = parseEnv(readFileSync(ENV_PATH, 'utf8'));
  for (const [k, v] of Object.entries(parsed)) {
    // Don't clobber anything already set in the real environment.
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

// Dummy DB url so importing modules that build the postgres client at load time
// succeed. postgres-js connects lazily (on first query), and unit tests mock the
// db-touching collaborators, so no real connection is ever opened.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://test@localhost:5432/profitmaker_test';
}
