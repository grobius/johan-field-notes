import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { handleLikes } from '../src/server/article-likes.mjs';
import { canonicalUrl, shareLinks, socialImagePath } from '../src/lib/article-social.mjs';

const origin = 'https://notes.example';
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const allowed = new Set(['minipill-v2-first-prototype', 'other-note']);
function environment() {
  const db = new DatabaseSync(':memory:');
  const schema = readFileSync(new URL('../migrations/articles/0001_article_likes.sql', import.meta.url), 'utf8');
  // A repeat application must leave sensor data and existing likes alone.
  db.exec('CREATE TABLE readings (id TEXT PRIMARY KEY, value REAL); INSERT INTO readings VALUES (\'sensor\', 9)');
  db.exec(schema); db.exec(schema);
  const session = {
    prepare(sql) { return { bind(...args) {
      return { first: async () => db.prepare(sql).get(...args), execute: () => ({ results: db.prepare(sql).all(...args) }) };
    } }; },
    async batch(statements) {
      db.exec('BEGIN IMMEDIATE');
      try { const results = statements.map(statement => statement.execute()); db.exec('COMMIT'); return results; }
      catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  const limiter = { limit: async () => ({ success: true }) };
  return { db, env: { johan_sensors: { withSession: constraint => {
    assert.equal(constraint, 'first-primary'); return session;
  } }, REACTION_READ_LIMITER: limiter, REACTION_WRITE_LIMITER: limiter } };
}
function request({ method = 'GET', visitor = a, post = 'minipill-v2-first-prototype', body, headers = {} } = {}) {
  return new Request(`${origin}/api/likes?${new URLSearchParams({ post })}`, {
    method, headers: { Origin: origin, 'CF-Connecting-IP': '192.0.2.1', ...(visitor ? { 'X-Visitor-ID': visitor } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}
test('likes persist, retries are idempotent and each visitor can undo only their own like', async () => {
  const { db, env } = environment();
  const call = async options => (await handleLikes(request(options), env, allowed)).json();
  assert.deepEqual(await call({ visitor: '' }), { count: 0, liked: false });
  assert.deepEqual(await call({ method: 'PUT', body: { liked: true } }), { count: 1, liked: true });
  assert.deepEqual(await call({ method: 'PUT', body: { liked: true } }), { count: 1, liked: true });
  assert.deepEqual(await call({ visitor: b }), { count: 1, liked: false });
  assert.deepEqual(await call({ visitor: b, method: 'PUT', body: { liked: false } }), { count: 1, liked: false });
  assert.deepEqual(await call({ visitor: b, method: 'PUT', body: { liked: true } }), { count: 2, liked: true });
  assert.deepEqual(await call({ method: 'PUT', body: { liked: false } }), { count: 1, liked: false });
  assert.deepEqual(await call({ method: 'PUT', body: { liked: false } }), { count: 1, liked: false });
  assert.deepEqual(await call({ post: 'other-note' }), { count: 0, liked: false });
  assert.equal(db.prepare('SELECT value FROM readings').get().value, 9);
  db.close();
});
test('rejects unknown posts, invalid IDs, cross-origin writes and malformed/oversized bodies', async () => {
  const { db, env } = environment();
  const cases = [
    [{ post: 'invented' }, 404], [{ visitor: 'not-a-uuid' }, 400], [{ method: 'POST' }, 405],
    [{ method: 'PUT', visitor: '', body: { liked: true } }, 400],
    [{ method: 'PUT', body: { liked: true }, headers: { Origin: 'https://other.example' } }, 403],
    [{ method: 'PUT', body: { liked: true }, headers: { 'Sec-Fetch-Site': 'cross-site' } }, 403],
    [{ method: 'PUT', body: '{' }, 400], [{ method: 'PUT', body: { liked: 'true' } }, 400],
    [{ method: 'PUT', body: { liked: true, padding: 'x'.repeat(600) } }, 400],
    [{ method: 'PUT', body: { liked: true }, headers: { 'Content-Type': 'text/plain' } }, 400],
  ];
  for (const [options, status] of cases) assert.equal((await handleLikes(request(options), env, allowed)).status, status);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM article_likes').get().count, 0);
  db.close();
});
test('rate limits reads/writes, returns uncached private state and fails safely without bindings/schema', async () => {
  const { db, env } = environment();
  const response = await handleLikes(request(), env, allowed);
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.doesNotMatch(await response.text(), /visitor|192\.0\.2/);
  let limiterKey;
  env.REACTION_WRITE_LIMITER = { limit: async ({ key }) => { limiterKey = key; return { success: false }; } };
  const limited = await handleLikes(request({ method: 'PUT', body: { liked: true } }), env, allowed);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get('Retry-After'), '60');
  assert.match(limiterKey, /^[0-9a-f]{64}$/);
  env.REACTION_READ_LIMITER = env.REACTION_WRITE_LIMITER;
  assert.equal((await handleLikes(request(), env, allowed)).status, 429);
  assert.equal((await handleLikes(request(), {}, allowed)).status, 503);
  env.REACTION_READ_LIMITER = { limit: async () => ({ success: true }) };
  db.exec('DROP TABLE article_likes');
  assert.equal((await handleLikes(request(), env, allowed)).status, 503);
  db.close();
});
test('sharing preserves special characters and canonical URLs exclude tracking parameters', () => {
  const title = 'MiniPill & LoRa: Åäö #1?';
  const url = canonicalUrl('/notes/minipill/?utm_source=preview#comments', origin);
  assert.equal(url, `${origin}/notes/minipill/`);
  const links = shareLinks(title, url);
  assert.equal(new URL(links.linkedin).searchParams.get('url'), url);
  assert.equal(new URL(links.facebook).searchParams.get('u'), url);
  assert.equal(new URL(links.x).searchParams.get('text'), title);
  assert.equal(new URL(links.bluesky).searchParams.get('text'), `${title}\n${url}`);
  assert.equal(new URL(links.email).searchParams.get('subject'), title);
  assert.equal(socialImagePath('/images/note-water.svg'), '/social/note-water.svg.jpg');
  assert.equal(socialImagePath('/images/minipill-v2.webp'), '/social/minipill-v2.webp.jpg');
  assert.equal(socialImagePath(undefined), '/social/field-notes.jpg');
});
