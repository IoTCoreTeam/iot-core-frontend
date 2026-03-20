<template>
  <div
    class="bg-white border border-slate-200 rounded p-4 flex flex-col min-h-0"
    :style="containerStyle"
  >
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
              updateChartNodeId(($event.target as HTMLSelectElement).value)
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

    <div class="mt-3 flex-1 min-h-0 flex flex-col">
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

      <div class="mt-2 overflow-hidden rounded-lg bg-white flex-1 min-h-0">
        <ClientOnly>
          <ApexChart
            type="line"
            height="100%"
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
import { computed, defineAsyncComponent, onMounted, ref } from "vue";
import LoadingState from "@/components/common/LoadingState.vue";
import type { DashboardMetric, SeriesPoint, TimeframeKey } from "@/types/dashboard";
import { useMetricQuery } from "@/composables/SingleMetricChart/useMetricQuery";
import { useMetrics } from "@/composables/useMetrics";
import { ALL_NODES_VALUE, useChartSeries } from "@/composables/SingleMetricChart/useChartSeries";
import { useChartOptions } from "@/composables/SingleMetricChart/useChartOptions";
import { useMetricSSE } from "@/composables/SingleMetricChart/useMetricSSE";

const props = withDefaults(
  defineProps<{
    metrics?: DashboardMetric[];
    series?: SeriesPoint[];
    isLoading?: boolean;
    error?: string | null;
    selectedMetricKey: string;
    selectedTimeframe: TimeframeKey;
    sensorIds?: string[];
    nodeIds?: string[];
    sensorType?: string;
    selectedNodeId?: string;
    containerHeight?: string;
  }>(),
  {
    selectedTimeframe: "second" as TimeframeKey,
    containerHeight: "60vh",
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
useMetricSSE({ fetchOnce, pollIntervalMs: 5000 });

const { metrics: metricsRef } = useMetrics();

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

const containerStyle = computed(() => ({
  height: props.containerHeight,
  minHeight: props.containerHeight,
  maxHeight: props.containerHeight,
}));

function updateMetricKey(value: string) {
  emit("update:selectedMetricKey", value);
}

function updateNodeId(value: string) {
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
const {
  activeNodeId,
  activeSeries,
  allValues,
  seriesExtent,
  nodeSelectOptions,
  updateNodeId: updateChartNodeId,
} = useChartSeries({
  fetchedSeries,
  fallbackSeries: computed(() => props.series || []),
  selectedMetric,
  nodeIds: computed(() => props.nodeIds),
  selectedNodeId: computed(() => props.selectedNodeId),
  onNodeIdChange: updateNodeId,
});

const chartSeries = computed(() => activeSeries.value);
const { chartOptions } = useChartOptions({
  selectedTimeframe: computed(() => props.selectedTimeframe),
  seriesExtent,
  activeSeriesCount: computed(() => activeSeries.value.length),
  selectedUnit: computed(() => selectedMetric.value?.unit),
  formatValue,
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
  setTimeout(() => {
    initialLoading.value = false;
  }, 5000);
});

onMounted(() => {
  updateChartNodeId(props.selectedNodeId ?? ALL_NODES_VALUE);
});

</script>
