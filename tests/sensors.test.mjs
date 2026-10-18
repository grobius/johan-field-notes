import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { normalizeUplink, validateDevices } from '../sensor-bridge/normalize.mjs';
import worker, { UPSERT } from '../sensor-bridge/worker.mjs';

const devices = [{ applicationId: 'app', deviceId: 'private-device', alias: 'NODE 01', fields: [
  { key: 'temperature', label: 'Temperature', unit: '°C', min: -50, max: 85, staleAfterSeconds: 900 },
  { key: 'humidity', label: 'Humidity', unit: '%', min: 0, max: 100, staleAfterSeconds: 900 },
] }];
const payload = (values = { temperature: 18.6, humidity: 62 }) => ({ end_device_ids: { application_ids: { application_id: 'app' }, device_id: 'private-device', dev_eui: 'SECRET' }, received_at: new Date().toISOString(), uplink_message: { decoded_payload: { ...values, latitude: 59.3 }, rx_metadata: [{ location: 'PRIVATE' }] } });
const secret = 'a'.repeat(48);
const request = (body, auth = true) => new Request('https://bridge.example/ttn/uplink', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Basic ${btoa(`ttn:${secret}`)}` } : {}) }, body: JSON.stringify(body) });
function environment() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../sensor-bridge/schema.sql', import.meta.url), 'utf8'));
  return { TTN_WEBHOOK_SECRET: secret, SENSOR_DEVICES: JSON.stringify(devices), SENSOR_DB: {
    prepare(sql) { return { bind(...args) { return { all: async () => ({ results: db.prepare(sql).all(...args) }), run: () => db.prepare(sql).run(...args) }; } }; },
    async batch(statements) { return statements.map(s => s.run()); },
  } };
}
test('normalizes mixed measurements, publishes only approved data', () => {
  const rows = normalizeUplink(payload(), validateDevices(devices));
  assert.equal(rows.length, 2); assert.equal(rows[0].value, 18.6);
  assert.equal(rows[1].unit, '%');
  assert.doesNotMatch(JSON.stringify(rows), /private-device|SECRET|latitude|rx_metadata/);
});
test('rejects unknown applications/devices, missing decoder, invalid values and timestamps', () => {
  const p = payload(); p.end_device_ids.application_ids.application_id = 'other';
  assert.deepEqual(normalizeUplink(p, devices), []);
  p.end_device_ids.application_ids.application_id = 'app'; p.end_device_ids.device_id = 'other';
  assert.deepEqual(normalizeUplink(p, devices), []);
  assert.deepEqual(normalizeUplink(payload({ temperature: '18', humidity: 101 }), devices), []);
  assert.deepEqual(normalizeUplink({ ...payload(), received_at: 'invalid' }, devices), []);
  assert.deepEqual(normalizeUplink({ ...payload(), received_at: new Date(Date.now() + 3600000).toISOString() }, devices), []);
  assert.deepEqual(normalizeUplink({ ...payload(), uplink_message: {} }, devices), []);
});
test('validates config and rejects duplicate aliases/fields', () => {
  assert.throws(() => validateDevices([...devices, ...devices]));
  assert.throws(() => validateDevices([{ ...devices[0], fields: [{ ...devices[0].fields[0], staleAfterSeconds: 0 }] }]));
});
test('requires webhook credentials and correct method', async () => {
  const env = environment();
  assert.equal((await worker.fetch(request(payload(), false), env)).status, 401);
  assert.equal((await worker.fetch(request(payload()), { ...env, TTN_WEBHOOK_SECRET: 'wrong'.repeat(10) })).status, 401);
  assert.equal((await worker.fetch(new Request('https://bridge.example/ttn/uplink'), env)).status, 405);
});
test('webhook to public feed, duplicates and out-of-order packets do not overwrite newer data', async () => {
  const env = environment(); const p = payload();
  assert.equal((await worker.fetch(request(p), env)).status, 200);
  await worker.fetch(request(p), env);
  const old = payload({ temperature: 9 }); old.received_at = new Date(Date.now() - 3600000).toISOString();
  await worker.fetch(request(old), env);
  const response = await worker.fetch(new Request('https://bridge.example/api/sensors'), env);
  const body = await response.json();
  assert.equal(body.readings.length, 2);
  assert.equal(body.readings.find(r => r.label === 'Temperature').value, 18.6);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), '*');
  assert.doesNotMatch(JSON.stringify(body), /private-device|SECRET|latitude/);
  env.SENSOR_DEVICES = '[]';
  assert.deepEqual((await (await worker.fetch(new Request('https://bridge.example/api/sensors'), env)).json()).readings, []);
});
test('malformed and oversized payloads fail safely', async () => {
  assert.equal((await worker.fetch(request({ padding: 'x'.repeat(33000) }), environment())).status, 400);
  const req = request(payload());
  const malformed = new Request(req.url, { method: 'POST', headers: req.headers, body: '{' });
  assert.equal((await worker.fetch(malformed, environment())).status, 400);
  const result = await worker.fetch(new Request('https://bridge.example/api/sensors'), {});
  assert.equal(result.status, 503); assert.equal(result.headers.get('Cache-Control'), 'no-store');
});
test('SQL upsert keeps zero values and replaces only with newer timestamps', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../sensor-bridge/schema.sql', import.meta.url), 'utf8'));
  const put = db.prepare(UPSERT);
  put.run('a', 'NODE', 'Level', 1, 'm', '2026-10-18T10:00:00.000Z', 900);
  put.run('a', 'NODE', 'Level', 0, 'm', '2026-10-18T11:00:00.000Z', 900);
  assert.equal(db.prepare('SELECT value FROM readings').get().value, 0);
});
