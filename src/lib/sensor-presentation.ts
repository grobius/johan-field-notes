import { sensorKinds } from '../data/sensor-kinds.ts';

export type SensorValue = { id: string; label: string; node: string; value: number; unit: string };

// Local SVG paths only; feed content never supplies SVG or HTML.
const icons = {
  temperature: 'M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z M12 8v9 M16 6h2 M16 10h2',
  battery: 'M4 7h13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z M21 10v4 M6 10v4 M9 10v4 M12 10v4',
  humidity: 'M12 3C10 7 5 10 5 14a7 7 0 0 0 14 0c0-4-5-7-7-11Z M8 14a4 4 0 0 0 4 4',
  level: 'M4 4v16h16 M7 11c2-3 4 3 6 0s4 3 6 0 M7 16c2-3 4 3 6 0s4 3 6 0 M8 4h10 M13 2v5m-2-2 2 2 2-2',
  pressure: 'M5 19a9 9 0 1 1 14 0Z M12 15l4-6 M6 12H4 M12 5V3 M18 12h2',
  light: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5 19 19 M5 19l1.5-1.5 M17.5 6.5 19 5',
  sensor: 'M8 8h8v8H8Z M9 3v2 M15 3v2 M9 19v2 M15 19v2 M3 9h2 M3 15h2 M19 9h2 M19 15h2',
};
type SensorKind = keyof typeof icons;
const labels: Record<string, SensorKind> = {
  temperature: 'temperature', temperatur: 'temperature',
  battery: 'battery', 'battery voltage': 'battery', batteri: 'battery', batterispänning: 'battery',
  humidity: 'humidity', 'relative humidity': 'humidity', luftfuktighet: 'humidity',
  level: 'level', 'water level': 'level', vattennivå: 'level',
  pressure: 'pressure', tryck: 'pressure', light: 'light', illuminance: 'light', ljusstyrka: 'light',
};

export function sensorKind(reading: SensorValue): SensorKind {
  const override = sensorKinds[reading.id];
  if (override && Object.hasOwn(icons, override)) return override as SensorKind;
  const label = reading.label.trim().toLowerCase();
  if (Object.hasOwn(labels, label)) return labels[label];
  if (['°C', '°F'].includes(reading.unit.trim())) return 'temperature';
  return 'sensor';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

const number = new Intl.NumberFormat('en', { maximumFractionDigits: 2 });

// One renderer for the server's demo and the browser's live feed.
// Every data-derived string is escaped before use in markup or attributes.
export function renderSensorReading(reading: SensorValue, demo = false) {
  const kind = sensorKind(reading);
  return `<li class="sensor-reading">
    <svg class="sensor-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false" data-sensor-kind="${kind}"><path d="${icons[kind]}"/></svg>
    <div class="sensor-body">
      <div class="sensor-value"><span class="sensor-label">${escapeHtml(reading.label)}</span><strong><span>${escapeHtml(number.format(reading.value))}</span> <small>${escapeHtml(reading.unit)}</small></strong></div>
      <p class="sensor-meta"><span class="sensor-node">${escapeHtml(reading.node)}</span><span class="sensor-age"${demo ? '' : ` data-reading-id="${escapeHtml(reading.id)}"`}>${demo ? 'Example reading' : ''}</span></p>
    </div>
  </li>`;
}
