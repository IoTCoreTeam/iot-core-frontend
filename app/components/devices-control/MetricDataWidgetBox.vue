<template>
  <section class="w-full">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <article
        v-for="widget in widgets"
        :key="widget.key"
        class="relative overflow-hidden rounded border border-gray-200 bg-white p-4 transition-opacity duration-300"
        :class="{ 'opacity-70': isRefreshing }"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700">
            <BootstrapIcon :name="widget.icon" class="h-3.5 w-3.5" />
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-wide text-gray-500">
              {{ widget.subtitle }}
            </p>
            <h3 class="text-sm font-semibold text-gray-800 leading-tight">
              {{ widget.title }}
            </h3>
          </div>
        </div>

        <div class="mt-3 flex items-baseline gap-2">
          <span class="text-2xl font-bold text-gray-900">
            {{ displayValue(widget.value) }}
          </span>
          <span class="text-sm text-gray-500">{{ widget.unit }}</span>
          <span
            v-if="widget.change !== null"
            :class="[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              widget.change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
            ]"
          >
            <BootstrapIcon
              :name="widget.change >= 0 ? 'arrow-up-right' : 'arrow-down-right'"
              class="h-3 w-3"
            />
            {{ Math.abs(widget.change).toFixed(1) }}%
          </span>
        </div>

        <div v-if="progress(widget) !== null" class="mt-3 space-y-1">
          <div class="flex justify-between text-[10px] text-gray-500">
            <span>Current level</span>
            <span>{{ progress(widget)?.toFixed(0) }}%</span>
          </div>
          <div class="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full rounded-full bg-blue-600"
              :style="{ width: progressWidth(widget) }"
            />
          </div>
        </div>

        <div v-if="chartPoints(widget)" class="mt-3">
          <svg viewBox="0 0 100 60" class="h-16 w-full">
            <rect x="0" y="0" width="100" height="60" fill="transparent" />
            <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" stroke-width="1" />
            <line x1="8" y1="5" x2="8" y2="50" stroke="#e5e7eb" stroke-width="1" />
            <polygon :points="chartAreaPoints(widget)" fill="#dbeafe" opacity="0.8" />
            <polyline
              :points="chartPoints(widget)"
              stroke="#2563eb"
              stroke-width="2.5"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="mt-3 flex items-center justify-between text-[10px] text-gray-500">
          <span>Sensor: {{ widget.sensorId }}</span>
          <span>{{ widget.timestamp }}</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { apiConfig } from "~~/config/api";
import { useMetrics } from "@/composables/useMetrics";
import type { DashboardMetric } from "@/types/dashboard";
import { formatIotDateTime } from "~~/config/iot-time-format";
import {
  normalizeSensorLatestRow,
  normalizeSensorType,
  type SensorQueryRow,
} from "@/composables/metrics/sensorPayload";

interface MetricWidgetItem {
  key: string;
  title: string;
  subtitle: string;
  icon: DashboardMetric["icon"];
  unit: string;
  value: string | number;
  change: number | null;
  min?: number;
  max?: number;
  trend?: number[];
  timestamp: string;
  sensorId: string;
  nodeId: string;
  gatewayId: string;
}

const BASE_URL = (apiConfig.server || "").replace(/\/$/, "");
const isLoading = ref(false);
const isRefreshing = ref(false);
const hasLoadedOnce = ref(false);

const formatTimestamp = (value?: string) => {
  return formatIotDateTime(value, {
    formatter: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    fallback: "-",
  });
};

const buildDefaultWidget = (metric: DashboardMetric): MetricWidgetItem => ({
  key: metric.key,
  title: metric.title,
  subtitle: metric.subtitle,
  icon: metric.icon,
  unit: metric.unit ?? "",
  value: "--",
  change: null,
  min: metric.min,
  max: metric.max,
  trend: metric.trend,
  timestamp: "-",
  sensorId: "-",
  nodeId: "-",
  gatewayId: "-",
});

const { metrics } = useMetrics();
const widgets = ref<MetricWidgetItem[]>([]);

const fetchLatestByMetric = async (metricKey: string) => {
  const params = new URLSearchParams();
  const mappedType = normalizeSensorType(metricKey);
  params.set("sensor_type", mappedType);
  params.set("limit", "1");
  params.set("page", "1");

  const res = await fetch(`${BASE_URL}/v1/sensors/query?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`API error ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0] as SensorQueryRow;
};

const loadLatestMetrics = async () => {
  if (!BASE_URL) return;
  if (!hasLoadedOnce.value) {
    isLoading.value = true;
  } else {
    isRefreshing.value = true;
  }

  try {
    const results = await Promise.all(
      metrics.value.map(async (metric) => {
        const row = await fetchLatestByMetric(metric.key);
        if (!row) return buildDefaultWidget(metric);

        const normalized = normalizeSensorLatestRow(row);
        const unit = normalized.unit || metric.unit || "";

        return {
          key: metric.key,
          title: metric.title,
          subtitle: metric.subtitle,
          icon: metric.icon,
          unit,
          value: normalized.value ?? normalized.rawValue ?? "--",
          change: null,
          min: metric.min,
          max: metric.max,
          trend: metric.trend,
          timestamp: formatTimestamp(normalized.timestamp),
          sensorId: normalized.sensorId,
          nodeId: normalized.nodeId,
          gatewayId: normalized.gatewayId,
        } as MetricWidgetItem;
      })
    );

    widgets.value = results;
    hasLoadedOnce.value = true;
  } catch (error) {
    console.error("Failed to load metric widgets:", error);
    widgets.value = metrics.value.map(buildDefaultWidget);
  } finally {
    isLoading.value = false;
    isRefreshing.value = false;
  }
};

const progress = (widget: MetricWidgetItem) => {
  if (widget.min === undefined || widget.max === undefined) return null;
  if (typeof widget.value !== "number") return null;

  const range = widget.max - widget.min;
  const safeRange = range === 0 ? 1 : range;
  const clamped = Math.min(widget.max, Math.max(widget.min, widget.value));
  const percent = ((clamped - widget.min) / safeRange) * 100;

  return Math.min(100, Math.max(0, percent));
};

const progressWidth = (widget: MetricWidgetItem) => {
  const current = progress(widget);
  return current !== null ? `${current.toFixed(0)}%` : "0%";
};

const displayValue = (value: number | string) =>
  typeof value === "number" ? Number(value.toFixed(1)).toString() : value;

interface ChartPoint {
  x: number;
  y: number;
}

const chartCoordinates = (trend?: number[]) => {
  if (!trend || trend.length < 2) return [];

  const max = Math.max(...trend);
  const min = Math.min(...trend);
  const range = max === min ? 1 : max - min;
  const paddedMin = min - range * 0.1;
  const paddedRange = range === 0 ? 1 : range * 1.2;
  const xOffset = 8;
  const usableWidth = 92;
  const yScale = 40;

  return trend.map((value, index) => {
    const x = (index / (trend.length - 1)) * usableWidth + xOffset;
    const normalizedY = 50 - ((value - paddedMin) / paddedRange) * yScale;
    const y = Math.min(50, Math.max(0, normalizedY));
    return { x, y } as ChartPoint;
  });
};

const chartPoints = (widget: MetricWidgetItem) => {
  const coords = chartCoordinates(widget.trend);
  if (!coords.length) return "";
  return coords.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
};

const chartAreaPoints = (widget: MetricWidgetItem) => {
  const coords = chartCoordinates(widget.trend);
  if (!coords.length) return "";
  const first = coords.at(0);
  const last = coords.at(-1);
  if (!first || !last) return "";
  const points = chartPoints(widget);
  const firstX = first.x.toFixed(2);
  const lastX = last.x.toFixed(2);
  return `${points} ${lastX},50 ${firstX},50`;
};

let pollingTimer: ReturnType<typeof setInterval> | null = null;

const startPolling = () => {
  if (pollingTimer) return;
  pollingTimer = setInterval(loadLatestMetrics, 10000);
};

watch(
  metrics,
  (value) => {
    if (value.length === 0) return;
    loadLatestMetrics();
    startPolling();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
});
</script>
