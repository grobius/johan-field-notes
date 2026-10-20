import { renderSensorReading, type SensorValue } from '../lib/sensor-presentation';

type Reading = SensorValue & { observedAt: string; staleAfterSeconds: number };

export function initSensorTicker(panel: HTMLElement) {
  const list = panel.querySelector<HTMLUListElement>('.sensor-list')!;
  const track = panel.querySelector<HTMLElement>('.sensor-track')!;
  const status = panel.querySelector<HTMLElement>('.sensor-status')!;
  const empty = panel.querySelector<HTMLElement>('.sensor-empty')!;
  const pause = panel.querySelector<HTMLButtonElement>('.sensor-pause')!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  let readings: Reading[] = [];
  let failed = false;
  let busy = false;
  let lastContent = '';
  const url = panel.dataset.sensorFeed;
  const animate = () => {
    track.querySelector('[data-copy]')?.remove();
    const moving = list.children.length > 2 && !reducedMotion.matches;
    panel.classList.toggle('is-animated', moving);
    pause.hidden = !moving;
    if (moving) {
      const copy = list.cloneNode(true) as HTMLElement;
      copy.dataset.copy = '';
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      track.append(copy);
    }
  };
  const motion = () => {
    panel.classList.toggle('is-paused', paused || document.hidden);
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? 'Resume sensor animation' : 'Pause sensor animation');
    pause.textContent = paused ? '▶' : 'Ⅱ';
  };
  pause.addEventListener('click', () => { paused = !paused; motion(); });
  reducedMotion.addEventListener('change', animate);
  document.addEventListener('visibilitychange', () => { motion(); if (!document.hidden) void refresh(); });

  function age(reading: Reading) {
    const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(reading.observedAt)) / 1000));
    const time = seconds < 60 ? 'just now' : seconds < 3600 ? `${Math.floor(seconds / 60)} min ago` : seconds < 86400 ? `${Math.floor(seconds / 3600)} h ago` : `${Math.floor(seconds / 86400)} d ago`;
    return `${time}${seconds > reading.staleAfterSeconds ? ' · stale' : ''}`;
  }
  function updateAges() {
    panel.querySelectorAll<HTMLElement>('[data-reading-id]').forEach(el => {
      const reading = readings.find(r => r.id === el.dataset.readingId);
      if (reading) { el.textContent = age(reading); el.title = reading.observedAt; }
    });
    if (url && !failed && readings.length) {
      const stale = readings.every(r => Date.now() - Date.parse(r.observedAt) > r.staleAfterSeconds * 1000);
      status.textContent = stale ? 'Readings delayed' : 'Latest readings';
      panel.classList.toggle('has-live-data', !stale);
    }
  }
  async function refresh() {
    if (!url || document.hidden || busy) return;
    busy = true;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000), credentials: 'omit' });
      if (!response.ok) throw new Error('Feed unavailable');
      const data = await response.json();
      if (!Array.isArray(data.readings) || data.readings.length > 40) throw new Error('Invalid feed');
      const valid = data.readings.every((r: Reading) => r && ['id', 'label', 'node', 'unit', 'observedAt'].every(k => typeof r[k as keyof Reading] === 'string' && String(r[k as keyof Reading]).length < 100) && Number.isFinite(r.value) && Number.isFinite(Date.parse(r.observedAt)) && Number.isFinite(r.staleAfterSeconds) && r.staleAfterSeconds > 0);
      if (!valid) throw new Error('Invalid readings');
      readings = data.readings;
      failed = false;
      const content = JSON.stringify(readings);
      if (content !== lastContent) {
        list.innerHTML = readings.map(r => renderSensorReading(r)).join('');
        lastContent = content;
        animate();
      }
      empty.hidden = readings.length > 0;
      empty.textContent = 'No public readings yet.';
      status.textContent = readings.length ? 'Latest readings' : 'Waiting for sensors';
      updateAges();
    } catch {
      failed = true;
      status.textContent = readings.length ? 'Offline · last readings' : 'Feed unavailable';
      panel.classList.remove('has-live-data');
      empty.hidden = readings.length > 0;
      empty.textContent = 'Waiting for the sensor feed. No demo values are substituted.';
    } finally { busy = false; }
  }
  animate(); motion(); void refresh();
  setInterval(() => { updateAges(); void refresh(); }, 60000);
}
