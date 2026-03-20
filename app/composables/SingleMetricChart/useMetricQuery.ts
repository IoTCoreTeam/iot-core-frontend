import { ref, watch } from "vue";
import { apiConfig } from "~~/config/api";
import type { TimeframeKey } from "@/types/dashboard";
import {
  normalizeSensorSeriesRows,
  normalizeSensorType,
  type SensorQueryRow,
} from "@/composables/metrics/sensorPayload";

const BASE_URL = (apiConfig.server || "").replace(/\/$/, "");
const MAX_POINTS = 30;
const UI_OFFSET_MS = 7 * 60 * 60 * 1000;

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
}

export function useMetricQuery(props: UseMetricQueryProps) {
  const fetchedSeries = ref<{ name: string; data: { x: number; y: number }[] }[]>([]);
  const isFetching = ref(false);
  const fetchError = ref<string | null>(null);

  const buildParams = () => {
    const params = new URLSearchParams();
    const ids = props.sensorIds ?? [];
    const nodeIds = props.nodeIds ?? [];

    params.set("time_field", timeFieldMap[props.selectedTimeframe]);
    params.set("limit", String(MAX_POINTS));

    const mappedType = normalizeSensorType(props.sensorType ?? props.selectedMetricKey);
    if (mappedType) params.set("sensor_type", mappedType);

    nodeIds.forEach(id => params.append("node_id", id));
    ids.forEach(id => params.append("sensor_id", id));
    if (ids.length > 0) {
      params.set("latest_by_sensor", "1");
    }
    return params.toString();
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
      const payload = await res.json();
      const rows = Array.isArray(payload) ? (payload as SensorQueryRow[]) : [];
      fetchedSeries.value = normalizeSensorSeriesRows(rows, {
        maxPoints: MAX_POINTS,
        uiOffsetMs: UI_OFFSET_MS,
      });
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
