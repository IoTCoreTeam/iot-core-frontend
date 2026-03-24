<template>
  <div class="grid grid-cols-1 gap-4 xl:grid-cols-3">
    <article class="min-h-[320px] bg-white border border-slate-200 rounded p-4">
      <div>
        <p class="text-sm font-semibold text-slate-900">Control Commands Timeline</p>
        <p class="text-xs text-slate-500">ON/OFF commands by time bucket</p>
      </div>
      <div class="mt-4 h-[230px]">
        <ClientOnly>
          <ApexChart
            type="bar"
            height="100%"
            width="100%"
            :options="commandTimelineOptions"
            :series="commandTimelineSeries"
          />
        </ClientOnly>
      </div>
    </article>

    <article class="min-h-[320px] bg-white border border-slate-200 rounded p-4">
      <div>
        <p class="text-sm font-semibold text-slate-900">ACK Latency</p>
        <p class="text-xs text-slate-500">Latency per ACK record (ms)</p>
      </div>
      <div class="mt-4 h-[230px]">
        <ClientOnly>
          <ApexChart
            type="line"
            height="100%"
            width="100%"
            :options="latencyOptions"
            :series="latencySeries"
          />
        </ClientOnly>
      </div>
    </article>

    <article class="min-h-[320px] bg-white border border-slate-200 rounded p-4">
      <div>
        <p class="text-sm font-semibold text-slate-900">ACK Success Rate</p>
        <p class="text-xs text-slate-500">Success / Failed / Timeout ratio</p>
      </div>
      <div class="mt-4 h-[230px]">
        <ClientOnly>
          <ApexChart
            type="donut"
            height="100%"
            width="100%"
            :options="successRateOptions"
            :series="successRateSeries"
          />
        </ClientOnly>
      </div>
    </article>
  </div>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts";
import { computed, defineAsyncComponent, toRefs } from "vue";
import type { ControlAckBucket, ControlAckTotals, ControlLogRow } from "@/types/control-ack";

const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

const props = defineProps<{
  bucket: "hour" | "minute";
  buckets: ControlAckBucket[];
  totals: ControlAckTotals;
  rows?: ControlLogRow[];
}>();

const { bucket, buckets, totals, rows } = toRefs(props);

const orderedRows = computed(() =>
  [...(rows.value ?? [])].sort((a, b) => {
    const left = Date.parse(a?.received_at ?? a?.timestamp ?? "") || 0;
    const right = Date.parse(b?.received_at ?? b?.timestamp ?? "") || 0;
    return left - right;
  }),
);

const formatBucketLabel = (value: string) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: bucket.value === "hour" ? "2-digit" : undefined,
    month: bucket.value === "hour" ? "2-digit" : undefined,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const timelineCategories = computed(() =>
  buckets.value.map((item) => formatBucketLabel(item.bucket)),
);

const latencyRows = computed(() => orderedRows.value.slice(-30));

function formatExecutionTimeLabel(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

const latencyCategories = computed(() =>
  latencyRows.value.map((item) =>
    formatExecutionTimeLabel(item?.timestamp ?? item?.received_at ?? null),
  ),
);

const commandTimelineSeries = computed(() => [
  { name: "ON", data: buckets.value.map((item) => item.on) },
  { name: "OFF", data: buckets.value.map((item) => item.off) },
]);

const commandTimelineOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "bar",
    stacked: true,
    toolbar: { show: false },
    fontFamily: "inherit",
    foreColor: "#64748b",
  },
  colors: ["#2563eb", "#0ea5e9"],
  xaxis: {
    categories: timelineCategories.value,
    labels: {
      rotate: -35,
      style: { fontSize: "10px", colors: "#94a3b8" },
    },
  },
  yaxis: {
    labels: {
      style: { fontSize: "11px", colors: "#64748b" },
    },
  },
  grid: {
    borderColor: "#e2e8f0",
    strokeDashArray: 3,
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
  },
  dataLabels: { enabled: false },
  tooltip: { theme: "light" },
}));

function toMs(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

const latencySeries = computed(() => [
  {
    name: "ACK latency",
    data: latencyRows.value.map((item) => {
      const sentMs = toMs(item?.timestamp ?? null);
      const receivedMs = toMs(item?.received_at ?? null);
      if (sentMs === null || receivedMs === null) return null;
      const latency = receivedMs - sentMs;
      return Number.isFinite(latency) && latency >= 0 ? latency : null;
    }),
  },
]);

const latencyOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "line",
    toolbar: { show: false },
    fontFamily: "inherit",
    foreColor: "#64748b",
  },
  colors: ["#1d4ed8"],
  stroke: {
    curve: "smooth",
    width: 2,
  },
  markers: {
    size: 0,
  },
  xaxis: {
    categories: latencyCategories.value,
    labels: {
      rotate: 0,
      style: { fontSize: "10px", colors: "#94a3b8" },
    },
  },
  yaxis: {
    labels: {
      formatter: (val: number) => `${Math.round(val)} ms`,
      style: { fontSize: "11px", colors: "#64748b" },
    },
  },
  grid: {
    borderColor: "#e2e8f0",
    strokeDashArray: 3,
  },
  legend: {
    position: "top",
    horizontalAlign: "right",
  },
  dataLabels: { enabled: false },
  tooltip: {
    theme: "light",
    y: {
      formatter: (val: number | null) =>
        val === null || val === undefined ? "-" : `${Math.round(val)} ms`,
    },
  },
}));

const successRateSeries = computed(() => {
  const values = [
    Number(totals.value.success || 0),
    Number(totals.value.failed || 0),
    Number(totals.value.timeout || 0),
  ];
  const hasAny = values.some((value) => value > 0);
  return hasAny ? values : [1, 0, 0];
});

const successRateOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "donut",
    toolbar: { show: false },
    fontFamily: "inherit",
    foreColor: "#64748b",
  },
  labels: ["Success", "Failed", "Timeout"],
  colors: ["#2563eb", "#ef4444", "#f59e0b"],
  legend: {
    position: "bottom",
    labels: {
      colors: "#475569",
    },
  },
  stroke: {
    width: 2,
    colors: ["#ffffff"],
  },
  plotOptions: {
    pie: {
      donut: {
        size: "64%",
      },
    },
  },
  dataLabels: {
    enabled: true,
    formatter: (val: number) => `${Math.round(val)}%`,
  },
  tooltip: { theme: "light" },
}));
</script>
