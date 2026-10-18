// Only explicitly configured fields become public. Never forward raw TTN payloads.
export function normalizeUplink(payload, devices, now = Date.now()) {
  const device = devices.find(d => d.applicationId === payload?.end_device_ids?.application_ids?.application_id && d.deviceId === payload?.end_device_ids?.device_id);
  if (!device) return [];
  const decoded = payload?.uplink_message?.decoded_payload;
  const timestamp = Date.parse(payload.received_at);
  if (!decoded || !Number.isFinite(timestamp) || timestamp > now + 60000 || timestamp < now - 7 * 86400000) return [];
  return device.fields.flatMap(field => {
    const value = decoded[field.key];
    if (typeof value !== 'number' || !Number.isFinite(value)) return [];
    if (field.min !== undefined && value < field.min || field.max !== undefined && value > field.max) return [];
    return [{ id: `${device.alias}:${field.key}`, node: device.alias, label: field.label, value, unit: field.unit, observedAt: new Date(timestamp).toISOString(), staleAfterSeconds: field.staleAfterSeconds ?? 21600 }];
  });
}

export function validateDevices(devices) {
  if (!Array.isArray(devices) || devices.length > 20) throw new Error('Invalid device configuration');
  const ids = new Set();
  let count = 0;
  for (const d of devices) {
    if (!d || !['applicationId', 'deviceId', 'alias'].every(k => typeof d[k] === 'string' && d[k].length > 0 && d[k].length <= 50) || !Array.isArray(d.fields)) throw new Error('Invalid device');
    for (const f of d.fields) {
      if (!f || !['key', 'label', 'unit'].every(k => typeof f[k] === 'string' && f[k].length <= 40) || !f.key || !f.label || !Number.isFinite(f.staleAfterSeconds) || f.staleAfterSeconds < 60 || f.staleAfterSeconds > 604800) throw new Error('Invalid field');
      if (f.min !== undefined && !Number.isFinite(f.min) || f.max !== undefined && !Number.isFinite(f.max) || f.min !== undefined && f.max !== undefined && f.min > f.max) throw new Error('Invalid range');
      const id = `${d.alias}:${f.key}`;
      if (ids.has(id)) throw new Error('Duplicate public measurement ID');
      ids.add(id); count++;
    }
  }
  if (count > 40) throw new Error('Maximum 40 public measurements');
  return devices;
}
