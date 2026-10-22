const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATE = `SELECT COUNT(*) AS count,
  EXISTS(SELECT 1 FROM article_likes WHERE post_id = ? AND visitor_id = ?) AS liked
  FROM article_likes WHERE post_id = ?`;

function json(body, status = 200, headers = {}) {
  return Response.json(body, { status, headers: {
    'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', ...headers,
  } });
}

async function readBody(request) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new Error('type');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > 512) { await reader.cancel(); throw new Error('size'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const data = JSON.parse(new TextDecoder().decode(bytes));
  if (!data || typeof data.liked !== 'boolean') throw new Error('liked');
  return data.liked;
}

export async function handleLikes(request, env, allowedPosts) {
  const method = request.method;
  if (!['GET', 'PUT'].includes(method)) return json({ error: 'Method not allowed' }, 405, { Allow: 'GET, PUT' });
  const url = new URL(request.url);
  const post = url.searchParams.get('post');
  if (!post || !allowedPosts.has(post)) return json({ error: 'Unknown article' }, 404);
  const visitor = request.headers.get('X-Visitor-ID') ?? '';
  if (visitor && !UUID.test(visitor) || method === 'PUT' && !visitor) return json({ error: 'Invalid visitor ID' }, 400);
  if (method === 'PUT' && request.headers.get('Origin') !== url.origin) return json({ error: 'Invalid origin' }, 403);
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ error: 'Invalid origin' }, 403);

  try {
    const limiter = method === 'PUT' ? env.REACTION_WRITE_LIMITER : env.REACTION_READ_LIMITER;
    if (!env.johan_sensors || !limiter) throw new Error('Missing bindings');
    // IPs are not persisted. The short-lived limiter key changes daily.
    const ip = request.headers.get('CF-Connecting-IP') ?? 'local-development';
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${new Date().toISOString().slice(0, 10)}:${ip}`));
    const key = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
    if (!(await limiter.limit({ key })).success) return json({ error: 'Too many requests' }, 429, { 'Retry-After': '60' });

    const db = env.johan_sensors.withSession('first-primary');
    const state = db.prepare(STATE).bind(post, visitor, post);
    let row;
    if (method === 'PUT') {
      let liked;
      try { liked = await readBody(request); } catch { return json({ error: 'Invalid JSON body (maximum 512 bytes)' }, 400); }
      const mutation = liked
        ? db.prepare('INSERT INTO article_likes (post_id, visitor_id) VALUES (?, ?) ON CONFLICT DO NOTHING').bind(post, visitor)
        : db.prepare('DELETE FROM article_likes WHERE post_id = ? AND visitor_id = ?').bind(post, visitor);
      // D1 batches are transactional; retries set a state rather than incrementing.
      const results = await db.batch([mutation, state]);
      row = results[1].results[0];
    } else {
      row = await state.first();
    }
    return json({ count: row.count, liked: Boolean(row.liked) });
  } catch {
    return json({ error: 'Likes temporarily unavailable' }, 503);
  }
}
