<template>
  <div class="w-full min-h-[80vh] bg-gray-50 p-4">
    <div class="mx-auto flex max-w-8xl flex-col gap-4">
      <template v-if="isDashboardLoading">
        <section class="grid grid-cols-1 gap-4 items-start">
          <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div
              v-for="card in 5"
              :key="`metric-skeleton-${card}`"
              class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div class="animate-pulse space-y-3">
                <div class="h-3 w-24 rounded bg-gray-200"></div>
                <div class="h-6 w-28 rounded bg-gray-200"></div>
                <div class="h-3 w-32 rounded bg-gray-100"></div>
                <div class="h-3 w-20 rounded bg-gray-100"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="grid min-h-[60vh] grid-cols-1 gap-4 xl:grid-cols-5 items-start min-h-0">
            <div class="xl:col-span-2 h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="animate-pulse flex h-full flex-col gap-4">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-40 rounded bg-gray-200"></div>
                  <div class="h-8 w-32 rounded bg-gray-200"></div>
                </div>
                <div class="flex-1 w-full rounded bg-gray-100"></div>
                <div class="h-4 w-48 rounded bg-gray-200"></div>
              </div>
            </div>
            <div class="xl:col-span-2 h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="animate-pulse flex h-full flex-col gap-4">
                <div class="h-8 w-28 rounded bg-gray-200"></div>
                <div class="flex-1 w-full rounded bg-gray-100"></div>
                <div class="h-4 w-40 rounded bg-gray-200"></div>
              </div>
            </div>
            <div class="xl:col-span-1 h-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div class="animate-pulse flex h-full flex-col gap-4">
                <div class="h-5 w-32 rounded bg-gray-200"></div>
                <div class="flex-1 w-full rounded bg-gray-100"></div>
                <div class="h-8 w-full rounded bg-gray-100"></div>
                <div class="h-8 w-full rounded bg-gray-100"></div>
              </div>
            </div>
        </section>
      </template>

      <template v-else>
        <section class="grid grid-cols-1 gap-4 items-start">
          <DevicesControlMetricDataWidgetBox />
        </section>

        <section class="grid min-h-[60vh] grid-cols-1 gap-4 xl:grid-cols-5 items-start min-h-0">
            <SingleMetricChart
              class="xl:col-span-2 h-full"
              container-height="60vh"
              :series="chartSeries"
              :selected-metric-key="selectedMetricKey"
              :selected-timeframe="selectedTimeframe"
              @update:selected-metric-key="handleMetricChange"
              @update:selected-timeframe="handleTimeframeChange"
            />
            <DeviceMapCanvas
              ref="mapCanvasRef"
              class="xl:col-span-2 h-full rounded"
              map-height="60vh"
              :show-controls="true"
            />
            <div class="xl:col-span-1 h-full">
              <!-- ActiveDevicesPanel now handles its own data fetching via SSE -->
              <DevicesControlActiveDevicesPanel
                :show-map-tab="true"
                :map-is-areas-loading="mapIsAreasLoading"
                :map-managed-areas="mapManagedAreas"
                :map-focus-area="handleFocusArea"
                :map-zoom-to-node="handleZoomToNode"
              />
            </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, isRef, type Ref } from "vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import SingleMetricChart from "@/components/SingleMetricChart.vue";
import DeviceMapCanvas from "@/components/devices-control/maps/DeviceMapCanvas.vue";
import { useMetrics } from "@/composables/useMetrics";
import DevicesControlMetricDataWidgetBox from "@/components/devices-control/MetricDataWidgetBox.vue";

const authStore = useAuthStore();
import type { SeriesPoint, TimeframeKey } from "@/types/dashboard";

interface AutomationBatchItem {
  id: number;
  name: string;
  devices: number;
  trigger: string;
  status: "Completed" | "Running";
  updated: string;
}


const lastUpdated = ref<Date | null>(null);

const lastUpdatedLabel = computed(() =>
  lastUpdated.value
    ? new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(lastUpdated.value)
    : "Updating...",
);

const typeDistributionCategories = ref<string[]>([]);
const typeDistributionSeries = ref<{ name: string; data: number[] }[]>([]);
const isTypeDistributionLoading = ref(true);
const isDashboardLoading = computed(
  () => metrics.value.length === 0 || isTypeDistributionLoading.value,
);

const automationBatches = ref<AutomationBatchItem[]>([]);

const { metrics } = useMetrics();
const selectedMetricKey = ref<string>("");
const selectedTimeframe = ref<TimeframeKey>("second");
// const chartSeries = ref<SeriesPoint[]>([]); // handled in child or removed
const chartSeries = ref<SeriesPoint[]>([]);

type MapCanvasExpose = {
  managedAreas: Ref<any[]> | any[];
  isAreasLoading: Ref<boolean> | boolean;
  focusArea: (area: any) => void;
};

const mapCanvasRef = ref<MapCanvasExpose | null>(null);

const mapManagedAreas = computed(() => {
  const areas = mapCanvasRef.value?.managedAreas;
  if (isRef(areas)) return Array.isArray(areas.value) ? areas.value : [];
  return Array.isArray(areas) ? areas : [];
});

const mapIsAreasLoading = computed(() => {
  const loading = mapCanvasRef.value?.isAreasLoading;
  if (isRef(loading)) return Boolean(loading.value);
  return Boolean(loading);
});

function handleFocusArea(area: any) {
  mapCanvasRef.value?.focusArea?.(area);
}

function handleZoomToNode(node: any) {
  if (mapCanvasRef.value && 'zoomToNode' in mapCanvasRef.value) {
     (mapCanvasRef.value as any).zoomToNode?.(node);
  }
}

function handleMetricChange(key: string) {
  selectedMetricKey.value = key;
  // fetchChartData(); // Removed
}

function handleTimeframeChange(timeframe: TimeframeKey) {
  selectedTimeframe.value = timeframe;
  // fetchChartData(); // Removed
}

onMounted(() => {
  lastUpdated.value = new Date();

  if (authStore.accessToken) {
    fetchTypeDistribution();
  }
});

watch(
  metrics,
  (value) => {
    if (!selectedMetricKey.value && value.length > 0) {
      selectedMetricKey.value = value[0]?.key || "";
    }
  },
  { immediate: true },
);

async function fetchTypeDistribution() {
  if (!import.meta.client) return;

  isTypeDistributionLoading.value = true;

  try {
    const authorization = authStore.authorizationHeader;
    if (!authorization) return;

    const response = await fetch(
      `${apiConfig.auth}/metrics/system-logs-count`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: authorization,
        },
      },
    );

    const data = await response.json().catch(() => ({}));

    if (response.ok && data) {
      if (Array.isArray(data.categories)) {
        typeDistributionCategories.value = data.categories;
      }
      if (Array.isArray(data.series)) {
        typeDistributionSeries.value = data.series;
      }
    }
  } catch (error) {
    console.error("Failed to fetch system logs distribution:", error);
  }
  finally {
    isTypeDistributionLoading.value = false;
  }
}
</script>
