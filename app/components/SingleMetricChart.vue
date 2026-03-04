<template>
  <div class="bg-white border border-slate-200 rounded p-4">
    <div
      class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
      <div class="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <div class="flex items-center gap-2 text-[11px] text-gray-600">
          <label class="text-[11px] text-gray-600">Select metric</label>
          <select
            :value="selectedMetricKey"
            @change="
              updateMetricKey(($event.target as HTMLSelectElement).value)
            "
            class="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800"
          >
            <option
              v-for="metric in availableMetrics"
              :key="metric.key"
              :value="metric.key"
            >
              {{ metric.title }}
            </option>
          </select>
        </div>
        <div class="flex items-center gap-2 text-[11px] text-gray-600">
          <label class="text-[11px] text-gray-600">Select node</label>
          <select
            :value="activeNodeId"
            @change="
              updateNodeId(($event.target as HTMLSelectElement).value)
            "
            class="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-800"
          >
            <option :value="ALL_NODES_VALUE">All nodes</option>
            <option
              v-for="nodeId in nodeSelectOptions"
              :key="nodeId"
              :value="nodeId"
            >
              {{ nodeId }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="mt-2">
      <p v-if="displayError" class="text-[11px] font-semibold text-red-500">
        {{ displayError }}
      </p>
    </div>

    <div class="mt-3">
      <div class="flex items-end justify-between text-xs text-gray-500">
        <div class="flex items-center gap-1">
          <span class="inline-block h-2 w-2 rounded-full bg-blue-600" />
          Latest readings
        </div>
        <div class="flex items-center gap-3">
          <span>{{ selectedSeriesMinLabel }}</span>
          <span>{{ selectedSeriesMaxLabel }}</span>
        </div>
      </div>

      <div class="mt-2 overflow-hidden rounded-lg bg-white min-h-[20vh] my-auto">
        <ClientOnly>
          <ApexChart
            type="line"
            height="200"
            :options="chartOptions"
            :series="chartSeries"
          />
          <template #fallback>
            <LoadingState message="Loading chart..." />
          </template>
        </ClientOnly>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, onBeforeUnmount, ref, watch } from "vue";
import LoadingState from "@/components/common/LoadingState.vue";
import type { ApexOptions } from "apexcharts";
import type { DashboardMetric, SeriesPoint, TimeframeKey } from "@/types/dashboard";
import { useMetricQuery } from "@/composables/SingleMetricChart/useMetricQuery";
import { useMetrics } from "@/composables/useMetrics";

const props = withDefaults(
  defineProps<{
    metrics?: DashboardMetric[];
    series?: SeriesPoint[];
    isLoading?: boolean;
    error?: string | null;
    selectedMetricKey: string;
    selectedTimeframe: TimeframeKey;
    sensorIds?: string[]; // Updated prop
    nodeIds?: string[];
    sensorType?: string; // Updated prop
    deviceId?: string; // Legacy
    deviceType?: string; // Legacy
    selectedNodeId?: string;
  }>(),
  {
    selectedTimeframe: "second" as TimeframeKey,
  }
);

const emit = defineEmits<{
  (e: "update:selectedMetricKey", value: string): void;
  (e: "update:selectedNodeId", value: string): void;
}>();

const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

const metricQuery = useMetricQuery(props);
const {
  fetchedSeries,
  isFetching,
  fetchError,
  fetchOnce,
} = metricQuery;

const { metrics: metricsRef, fetchMetrics } = useMetrics();

const availableMetrics = computed(() => {
  if (props.metrics && props.metrics.length > 0) return props.metrics;
  if (metricsRef.value.length > 0) return metricsRef.value;
  return [];
});

const selectedMetric = computed(() =>
  availableMetrics.value.find(
    (metric) => metric.key === props.selectedMetricKey
  )
);

const ALL_NODES_VALUE = "__all__";
const internalSelectedNodeId = ref("");

function updateMetricKey(value: string) {
  emit("update:selectedMetricKey", value);
}

function updateNodeId(value: string) {
  internalSelectedNodeId.value = value;
  emit("update:selectedNodeId", value);
}

function formatValue(value: number) {
  return value.toFixed(3);
}

const initialLoading = ref(true);

const displayLoading = computed(() => {
  const isGroupedView =
    props.selectedTimeframe === "minute" ||
    props.selectedTimeframe === "hour" ||
    props.selectedTimeframe === "day";
  return (
    initialLoading.value ||
    props.isLoading ||
    (isGroupedView && isFetching.value)
  );
});
const displayError = computed(() => props.error || fetchError.value);

const displaySeries = computed(() => {
  if (fetchedSeries.value.length > 0) return fetchedSeries.value;
  const fallback = props.series || [];
  if (fallback.length === 0) return [];
  const base = Date.now();
  return [
    {
      name: selectedMetric.value?.title ?? "Metric",
      data: fallback.map((p, index) => ({
        x: base - (fallback.length - 1 - index) * 60_000,
        y: p.value,
      })),
    },
  ];
});

const MAX_DISPLAY_POINTS = 20;
const GAP_THRESHOLD_MS = 12 * 60 * 60 * 1000;

const trimSeriesData = (data: { x: number; y: number }[]) => {
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
};

const limitedSeries = computed(() =>
  displaySeries.value.map((series) => ({
    ...series,
    data: trimSeriesData(series.data),
  }))
);

const nodeSelectOptions = computed(() => {
  const source = props.nodeIds && props.nodeIds.length > 0
    ? props.nodeIds
    : limitedSeries.value.map((series) => series.name);
  return Array.from(new Set(source.filter((value) => value && value.trim())));
});

const activeNodeId = computed(() => {
  return props.selectedNodeId ?? internalSelectedNodeId.value;
});

const activeSeries = computed(() => {
  if (!activeNodeId.value || activeNodeId.value === ALL_NODES_VALUE) {
    return limitedSeries.value;
  }
  return limitedSeries.value.filter((series) => series.name === activeNodeId.value);
});

const allValues = computed(() => {
  return activeSeries.value.flatMap((s) => s.data.map((p: any) => p.y));
});

const seriesExtent = computed(() => {
  if (!allValues.value.length) return { min: 0, max: 1 };
  const values = allValues.value;
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
});

const chartSeries = computed(() => activeSeries.value);
const seriesColors = computed(() => {
  const palette = [
    "#2563eb",
    "#0ea5e9",
    "#06b6d4",
    "#14b8a6",
    "#22c55e",
    "#38bdf8",
    "#60a5fa",
    "#7dd3fc",
    "#5eead4",
    "#34d399",
  ];
  return activeSeries.value.map((_, index) => palette[index % palette.length]);
});

const chartOptions = computed<ApexOptions>(() => {
  return {
    chart: {
      id: `parameter-trend-${props.selectedTimeframe}`,
      height: 350,
      type: "line",
      stacked: false,
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "linear",
        speed: 300,
        dynamicAnimation: { speed: 300 },
      },
      fontFamily:
        "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
    dataLabels: { enabled: false },
    stroke: { curve: "smooth" as const, width: 3 },
    fill: { opacity: 1 },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: "#ffffff",
      hover: { size: 6 },
    },
    xaxis: {
      type: "datetime",
      labels: {
        datetimeUTC: false,
        datetimeFormatter: {
          year: "yyyy",
          month: "dd MMM",
          day: "dd MMM",
          hour: "HH:mm:ss",
          minute: "HH:mm:ss",
          second: "HH:mm:ss",
        },
        style: { fontSize: "11px", colors: "#6b7280" },
      },
      axisBorder: { color: "#e5e7eb" },
      axisTicks: { color: "#e5e7eb" },
    },
    yaxis: {
      min: seriesExtent.value.min,
      max: seriesExtent.value.max,
      labels: {
        style: { fontSize: "11px", colors: "#6b7280" },
        formatter: (val: number) => val.toFixed(3),
      },
    },
    grid: {
      strokeDashArray: 3,
      borderColor: "#e5e7eb",
    },
    colors: seriesColors.value,
    tooltip: {
      x: { format: "dd MMM yyyy HH:mm" },
      y: {
        formatter: (val: number) =>
          `${formatValue(val)}${selectedMetric.value?.unit ? ` ${selectedMetric.value.unit}` : ""}`,
      },
    },
  };
});

const selectedSeriesMinLabel = computed(() => {
  if (!allValues.value.length) return "Min --";
  const min = Math.min(...allValues.value);
  const unit = selectedMetric.value?.unit ?? "";
  return `Min ${formatValue(min)}${unit ? ` ${unit}` : ""}`;
});

const selectedSeriesMaxLabel = computed(() => {
  if (!allValues.value.length) return "Max --";
  const max = Math.max(...allValues.value);
  const unit = selectedMetric.value?.unit ?? "";
  return `Max ${formatValue(max)}${unit ? ` ${unit}` : ""}`;
});

onMounted(() => {
  fetchMetrics();
  setTimeout(() => {
    initialLoading.value = false;
  }, 5000);
});

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
  { immediate: true }
);

let pollingTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  pollingTimer = setInterval(() => {
    fetchOnce();
  }, 5000);
});

onBeforeUnmount(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
});

</script>
