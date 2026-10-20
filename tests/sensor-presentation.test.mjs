import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSensorReading, sensorKind } from '../src/lib/sensor-presentation.ts';
import { sensorKinds } from '../src/data/sensor-kinds.ts';

const reading = { id: 'NODE:temperature', label: 'Temperature', node: 'SjohagawaterSensor', value: 0, unit: '°C' };

test('existing feeds get semantic icons; ambiguous units stay generic and allow overrides', () => {
  assert.equal(sensorKind(reading), 'temperature');
  assert.equal(sensorKind({ ...reading, label: 'Battery', unit: 'V' }), 'battery');
  assert.equal(sensorKind({ ...reading, label: 'Humidity', unit: '%' }), 'humidity');
  assert.equal(sensorKind({ ...reading, label: 'Signal', unit: '%' }), 'sensor');
  assert.equal(sensorKind({ ...reading, label: 'Supply', unit: 'V' }), 'sensor');
  assert.equal(sensorKind({ ...reading, label: 'constructor', unit: '' }), 'sensor');
  sensorKinds[reading.id] = 'battery';
  try {
    assert.equal(sensorKind({ ...reading, label: 'Supply', unit: 'V' }), 'battery');
    sensorKinds[reading.id] = '<svg onload=alert(1)>';
    assert.equal(sensorKind({ ...reading, label: 'Supply', unit: 'V' }), 'sensor');
  } finally { delete sensorKinds[reading.id]; }
});

test('shared demo/live renderer preserves zero, Unicode and escapes every external string', () => {
  for (const demo of [false, true]) {
    const html = renderSensorReading({ ...reading,
      id: '\" onclick=\"alert(1)', label: '<img src=x onerror=alert(1)>',
      node: 'Sjö & <script>alert(1)</script>', unit: '\"<&°C',
    }, demo);
    assert.doesNotMatch(html, /<img|<script|data-reading-id="" onclick/);
    assert.match(html, /&lt;img/);
    assert.match(html, /Sjö &amp; &lt;script&gt;/);
    assert.match(html, /<span>0<\/span>/);
    assert.match(html, /<small>&quot;&lt;&amp;°C<\/small>/);
  }
});
