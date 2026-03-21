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
        <p class="text-xs text-slate-500">Average and p95 latency (ms)</p>
      </div>
      <div class="mt-4 h-[230px]">
        <ClientOnly>
          <ApexChart
            type="bar"
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
import type { ControlAckBucket, ControlAckTotals } from "@/types/control-ack";

const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

const props = defineProps<{
  bucket: "hour" | "minute";
  buckets: ControlAckBucket[];
  totals: ControlAckTotals;
}>();

const { bucket, buckets, totals } = toRefs(props);

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

const categories = computed(() =>
  buckets.value.map((item) => formatBucketLabel(item.bucket)),
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
    categories: categories.value,
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

const latencySeries = computed(() => [
  {
    name: "Avg",
    data: buckets.value.map((item) =>
      item.avg_latency_ms === null ? null : Number(item.avg_latency_ms),
    ),
  },
  {
    name: "p95",
    data: buckets.value.map((item) =>
      item.p95_latency_ms === null ? null : Number(item.p95_latency_ms),
    ),
  },
]);

const latencyOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "bar",
    toolbar: { show: false },
    fontFamily: "inherit",
    foreColor: "#64748b",
  },
  colors: ["#2563eb", "#1d4ed8"],
  plotOptions: {
    bar: {
      columnWidth: "42%",
      borderRadius: 2,
    },
  },
  xaxis: {
    categories: categories.value,
    labels: {
      rotate: -35,
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
  tooltip: { theme: "light" },
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
