import { normalizeUplink, validateDevices } from './normalize.mjs';

export const UPSERT = `INSERT INTO readings (id, node, label, value, unit, observed_at, stale_after_seconds)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET node=excluded.node, label=excluded.label,
  value=excluded.value, unit=excluded.unit, observed_at=excluded.observed_at,
  stale_after_seconds=excluded.stale_after_seconds
  WHERE excluded.observed_at > readings.observed_at`;

async function authorized(header, secret) {
  if (!secret || secret.length < 32 || !header || header.length > 1024) return false;
  const expected = `Basic ${btoa(`ttn:${secret}`)}`;
  const digest = value => crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  const [a, b] = await Promise.all([digest(header), digest(expected)]);
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('content-type');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('body');
  let size = 0;
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) { await reader.cancel(); throw new Error('size'); }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path !== '/api/sensors' && path !== '/ttn/uplink') return new Response('Not found', { status: 404 });
    const publicHeaders = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=30', 'X-Content-Type-Options': 'nosniff' };
    if (path === '/api/sensors' && request.method !== 'GET' || path === '/ttn/uplink' && request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: path === '/api/sensors' ? 'GET' : 'POST' } });
    if (path === '/ttn/uplink' && !await authorized(request.headers.get('authorization'), env.TTN_WEBHOOK_SECRET)) return new Response('Unauthorized', { status: 401 });
    try {
      if (!env.SENSOR_DB) throw new Error('Missing database');
      const devices = validateDevices(JSON.parse(env.SENSOR_DEVICES ?? '[]'));
      if (path === '/api/sensors') {
        // Configuration remains the publication allowlist, even after a device is removed.
        const allowed = new Map(devices.flatMap(d => d.fields.map(f => [`${d.alias}:${f.key}`, { node: d.alias, label: f.label, unit: f.unit, staleAfterSeconds: f.staleAfterSeconds }])));
        if (!allowed.size) return Response.json({ readings: [] }, { headers: publicHeaders });
        const { results } = await env.SENSOR_DB.prepare(`SELECT id, value, observed_at AS observedAt FROM readings WHERE observed_at > ? AND id IN (${[...allowed].map(() => '?').join(',')}) ORDER BY observed_at DESC, id LIMIT 40`).bind(new Date(Date.now() - 7 * 86400000).toISOString(), ...allowed.keys()).all();
        const readings = results.filter(r => allowed.has(r.id)).map(r => ({ ...r, ...allowed.get(r.id) }));
        return Response.json({ readings }, { headers: publicHeaders });
      }
      let payload;
      try { payload = await readJson(request); } catch { return new Response('Invalid JSON body (maximum 32 KB)', { status: 400 }); }
      const readings = normalizeUplink(payload, devices);
      if (readings.length) {
        await env.SENSOR_DB.batch(readings.map(r => env.SENSOR_DB.prepare(UPSERT).bind(r.id, r.node, r.label, r.value, r.unit, r.observedAt, r.staleAfterSeconds)));
      }
      return new Response('OK');
    } catch {
      // No raw payloads or credentials in logs/errors.
      return Response.json({ error: 'Sensor service unavailable' }, { status: 503, headers: path === '/api/sensors' ? { ...publicHeaders, 'Cache-Control': 'no-store' } : { 'Cache-Control': 'no-store' } });
    }
  }
};
