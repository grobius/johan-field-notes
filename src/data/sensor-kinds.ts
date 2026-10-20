// Optional overrides keyed by the public reading ID ("alias:field").
// Existing Temperature/Battery/Humidity/Water level labels work automatically.
// Use an override when a label is custom, translated or ambiguous:
// 'NODE 01:supply_voltage': 'battery',
export const sensorKinds: Record<string, string> = {};
