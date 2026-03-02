import { ref, watch } from "vue";
import { apiConfig } from "~~/config/api";
import type { TimeframeKey } from "@/types/dashboard";

const BASE_URL = (apiConfig.server || "").replace(/\/$/, "");
const MAX_POINTS = 30;

const sensorTypeMapping: Record<string, string> = {
  soilMoisture: "soil",
  soil_moisture: "soil",
  airHumidity: "humidity",
  air_humidity: "humidity",
};

const timeFieldMap: Record<TimeframeKey, string> = {
  second: "sec",
  minute: "minute",
  hour: "hour",
  day: "day",
};

interface UseMetricQueryProps {
  selectedMetricKey: string;
  selectedTimeframe: TimeframeKey;
  sensorIds?: string[];
  nodeIds?: string[];
  sensorType?: string;
  deviceId?: string;
}

const toNumber = (v: any): number | null => {
  if (v == null) return null;
  if (typeof v === "object") {
    return toNumber(
      v.$numberDecimal ??
      v.$numberDouble ??
      v.$numberLong ??
      v.value
    );
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function useMetricQuery(props: UseMetricQueryProps) {
  const fetchedSeries = ref<{ name: string; data: { x: number; y: number }[] }[]>([]);
  const isFetching = ref(false);
  const fetchError = ref<string | null>(null);

  const buildParams = () => {
    const params = new URLSearchParams();
    const ids = props.sensorIds ?? (props.deviceId ? [props.deviceId] : []);
    const nodeIds = props.nodeIds ?? [];

    params.set("time_field", timeFieldMap[props.selectedTimeframe]);
    params.set("limit", String(MAX_POINTS));

    const typeKey = props.sensorType ?? props.selectedMetricKey;
    const mappedType = sensorTypeMapping[typeKey] ?? typeKey;
    if (mappedType) params.set("sensor_type", mappedType);

    nodeIds.forEach(id => params.append("node_id", id));
    ids.forEach(id => params.append("sensor_id", id));
    if (ids.length > 0) {
      params.set("latest_by_sensor", "1");
    }
    return params.toString();
  };

  const mapToSeries = (rows: any[]) => {
    const map: Record<string, { x: number; y: number }[]> = {};

    for (const r of rows) {
      const value = toNumber(r.value ?? r._id?.value);
      const time = r.timestamp ?? r._id?.timestamp;
      if (value == null || !time) continue;

      const name =
        r.node_id ??
        r._id?.node_id ??
        r.sensorName ??
        r._id?.sensorName ??
        r.sensorId ??
        "sensor";

      map[name] ??= [];
      map[name].push({
        x: new Date(time).getTime(),
        y: value,
      });
    }

    fetchedSeries.value = Object.entries(map).map(([name, data]) => ({
      name,
      data: data.sort((a, b) => a.x - b.x).slice(-MAX_POINTS),
    }));
  };

  const fetchOnce = async () => {
    if (!BASE_URL) return;
    if (isFetching.value) return;
    if (!props.sensorType && !props.selectedMetricKey) {
      fetchedSeries.value = [];
      return;
    }

    isFetching.value = true;
    fetchError.value = null;

    try {
      const res = await fetch(
        `${BASE_URL}/v1/sensors/query?${buildParams()}`
      );
      if (!res.ok) throw new Error("API error");
      mapToSeries(await res.json());
    } catch (e: any) {
      fetchError.value = e.message;
      fetchedSeries.value = [];
    } finally {
      isFetching.value = false;
    }
  };

  watch(
    () => [
      props.selectedMetricKey,
      props.selectedTimeframe,
      props.sensorIds,
      props.nodeIds,
      props.sensorType,
      props.deviceId,
    ],
    fetchOnce,
    { immediate: true }
  );

  return {
    fetchedSeries,
    isFetching,
    fetchError,
    fetchOnce,
    MAX_POINTS,
  };
}
