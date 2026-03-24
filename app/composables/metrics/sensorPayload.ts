export type SensorQueryRow = {
  value?: unknown;
  unit?: string | null;
  timestamp?: string | null;
  sensor_id?: string | null;
  node_id?: string | null;
  gateway_id?: string | null;
  sensorName?: string | null;
  sensorId?: string | null;
  _id?: {
    value?: unknown;
    unit?: string | null;
    timestamp?: string | null;
    sensor_id?: string | null;
    node_id?: string | null;
    gateway_id?: string | null;
    sensorName?: string | null;
  } | null;
};

export type NormalizedSensorLatest = {
  value: number | null;
  rawValue: unknown;
  unit: string;
  timestamp: string;
  sensorId: string;
  nodeId: string;
  gatewayId: string;
};

const SENSOR_TYPE_MAPPING: Record<string, string> = {
  soilMoisture: "soil",
  soil_moisture: "soil",
  airHumidity: "humidity",
  air_humidity: "humidity",
};

export function normalizeSensorType(value?: string | null) {
  const typeKey = String(value ?? "").trim();
  if (!typeKey) return "";
  return SENSOR_TYPE_MAPPING[typeKey] ?? typeKey;
}

export function toSensorNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "object") {
    const data = value as Record<string, unknown>;
    return toSensorNumber(
      data.$numberDecimal ??
        data.$numberDouble ??
        data.$numberLong ??
        data.value,
    );
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeSensorSeriesRows(
  rows: SensorQueryRow[],
  options: {
    maxPoints: number;
    uiOffsetMs?: number;
  },
) {
  const uiOffsetMs = options.uiOffsetMs ?? 0;
  const grouped: Record<string, { x: number; y: number }[]> = {};

  for (const row of rows) {
    const value = toSensorNumber(row.value ?? row._id?.value);
    const timestamp = row.timestamp ?? row._id?.timestamp;
    if (value == null || !timestamp) continue;

    const seriesName =
      row.node_id ??
      row._id?.node_id ??
      row.sensorName ??
      row._id?.sensorName ??
      row.sensorId ??
      row.sensor_id ??
      row._id?.sensor_id ??
      "sensor";

    grouped[seriesName] ??= [];
    grouped[seriesName].push({
      x: new Date(timestamp).getTime() - uiOffsetMs,
      y: value,
    });
  }

  return Object.entries(grouped).map(([name, data]) => ({
    name,
    data: data.sort((a, b) => a.x - b.x).slice(-options.maxPoints),
  }));
}

export function normalizeSensorLatestRow(row: SensorQueryRow): NormalizedSensorLatest {
  return {
    value: toSensorNumber(row.value ?? row._id?.value),
    rawValue: row.value ?? row._id?.value ?? null,
    unit: row.unit ?? row._id?.unit ?? "",
    timestamp: row.timestamp ?? row._id?.timestamp ?? "",
    sensorId: row.sensor_id ?? row._id?.sensor_id ?? "-",
    nodeId: row.node_id ?? row._id?.node_id ?? "-",
    gatewayId: row.gateway_id ?? row._id?.gateway_id ?? "-",
  };
}
