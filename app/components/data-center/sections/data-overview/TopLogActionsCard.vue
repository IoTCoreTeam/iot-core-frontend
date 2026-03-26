<template>
  <article class="min-h-[360px] bg-white border border-slate-200 rounded p-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-900">Top Log Actions</p>
        <p class="text-xs text-slate-500">Most frequent actions in last 7 days</p>
      </div>
    </div>

    <div class="mt-4 h-[270px]">
      <ClientOnly>
        <ApexChart
          type="bar"
          height="100%"
          width="100%"
          :options="chartOptions"
          :series="normalizedSeries"
        />
      </ClientOnly>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts";
import { computed, defineAsyncComponent, toRefs } from "vue";

const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

const props = defineProps<{
  categories: string[];
  series: { name: string; data: number[] }[];
}>();

const { categories, series } = toRefs(props);

const normalizedSeries = computed(() => {
  if (!Array.isArray(series.value) || series.value.length === 0) {
    return [{ name: "Count", data: [] }];
  }

  return series.value.map((item) => ({
    name: item?.name || "Count",
    data: Array.isArray(item?.data) ? item.data : [],
  }));
});

const normalizedCategories = computed(() =>
  (categories.value ?? []).map((value) =>
    String(value)
      .replace(/\./g, " ")
      .replace(/_/g, " ")
      .trim(),
  ),
);

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "bar" as const,
    toolbar: { show: false },
    fontFamily: "inherit",
    foreColor: "#64748b",
  },
  colors: ["#2563eb"],
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: "58%",
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: normalizedCategories.value,
    labels: {
      style: {
        colors: "#94a3b8",
        fontSize: "11px",
      },
    },
    axisBorder: {
      show: false,
    },
    axisTicks: {
      show: false,
    },
  },
  yaxis: {
    labels: {
      style: {
        colors: "#475569",
        fontSize: "11px",
      },
      formatter: (value: string) => value,
    },
  },
  grid: {
    borderColor: "#e2e8f0",
    strokeDashArray: 4,
  },
  legend: {
    show: false,
  },
  noData: {
    text: "No action logs",
    align: "center",
    verticalAlign: "middle",
    style: {
      color: "#94a3b8",
      fontSize: "12px",
    },
  },
  tooltip: {
    theme: "light" as const,
  },
}));
</script>
