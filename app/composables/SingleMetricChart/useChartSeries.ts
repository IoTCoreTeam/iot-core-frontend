import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { DashboardMetric, SeriesPoint } from "@/types/dashboard";

export type MetricSeriesPoint = {
  x: number;
  y: number;
};

export type MetricSeries = {
  name: string;
  data: MetricSeriesPoint[];
};

export const ALL_NODES_VALUE = "__all__";

const MAX_DISPLAY_POINTS = 20;
const GAP_THRESHOLD_MS = 12 * 60 * 60 * 1000;

function trimSeriesData(data: MetricSeriesPoint[]) {
  if (!data.length) return data;
  const sorted = [...data].sort((a, b) => a.x - b.x);
  let startIndex = 0;
  for (let i = sorted.length - 1; i > 0; i -= 1) {
    const current = sorted[i];
    const previous = sorted[i - 1];
    if (!current || !previous) continue;
    if (current.x - previous.x > GAP_THRESHOLD_MS) {
      startIndex = i;
      break;
    }
  }
  const sliced = sorted.slice(startIndex);
  if (sliced.length <= MAX_DISPLAY_POINTS) return sliced;
  return sliced.slice(-MAX_DISPLAY_POINTS);
}

export function useChartSeries(params: {
  fetchedSeries: Ref<MetricSeries[]>;
  fallbackSeries: ComputedRef<SeriesPoint[]>;
  selectedMetric: ComputedRef<DashboardMetric | undefined>;
  nodeIds: ComputedRef<string[] | undefined>;
  selectedNodeId: ComputedRef<string | undefined>;
  onNodeIdChange: (value: string) => void;
}) {
  const internalSelectedNodeId = ref("");

  const displaySeries = computed<MetricSeries[]>(() => {
    if (params.fetchedSeries.value.length > 0) return params.fetchedSeries.value;

    const fallback = params.fallbackSeries.value;
    if (fallback.length === 0) return [];

    const base = Date.now();
    return [
      {
        name: params.selectedMetric.value?.title ?? "Metric",
        data: fallback.map((p, index) => ({
          x: base - (fallback.length - 1 - index) * 60_000,
          y: p.value,
        })),
      },
    ];
  });

  const limitedSeries = computed(() =>
    displaySeries.value.map((series) => ({
      ...series,
      data: trimSeriesData(series.data),
    })),
  );

  const nodeSelectOptions = computed(() => {
    const source =
      params.nodeIds.value && params.nodeIds.value.length > 0
        ? params.nodeIds.value
        : limitedSeries.value.map((series) => series.name);
    return Array.from(new Set(source.filter((value) => value && value.trim())));
  });

  const activeNodeId = computed(() => {
    return params.selectedNodeId.value ?? internalSelectedNodeId.value;
  });

  const activeSeries = computed(() => {
    if (!activeNodeId.value || activeNodeId.value === ALL_NODES_VALUE) {
      return limitedSeries.value;
    }
    return limitedSeries.value.filter((series) => series.name === activeNodeId.value);
  });

  const allValues = computed(() =>
    activeSeries.value.flatMap((series) => series.data.map((point) => point.y)),
  );

  const seriesExtent = computed(() => {
    if (!allValues.value.length) return { min: 0, max: 1 };
    const min = Math.min(...allValues.value);
    const max = Math.max(...allValues.value);
    if (min === max) {
      return { min: min - 1, max: max + 1 };
    }
    return { min, max };
  });

  function updateNodeId(value: string) {
    internalSelectedNodeId.value = value;
    params.onNodeIdChange(value);
  }

  watch(
    [nodeSelectOptions, activeNodeId],
    ([options, current]) => {
      if (!current) {
        updateNodeId(ALL_NODES_VALUE);
        return;
      }
      if (current === ALL_NODES_VALUE) return;
      if (!options.length) {
        updateNodeId(ALL_NODES_VALUE);
        return;
      }
      if (!options.includes(current)) {
        updateNodeId(ALL_NODES_VALUE);
      }
    },
    { immediate: true },
  );

  return {
    activeNodeId,
    activeSeries,
    allValues,
    displaySeries,
    limitedSeries,
    nodeSelectOptions,
    seriesExtent,
    updateNodeId,
  };
}
