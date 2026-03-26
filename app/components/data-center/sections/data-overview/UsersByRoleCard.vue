<template>
  <article class="min-h-[360px] bg-white border border-slate-200 rounded p-4">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-sm font-semibold text-slate-900">Users by Role</p>
        <p class="text-xs text-slate-500">
          Distribution of admin, engineer and user
        </p>
      </div>
    </div>

    <div class="mt-4 h-[270px]">
      <ClientOnly>
        <ApexChart
          type="donut"
          height="100%"
          width="100%"
          :options="userRoleChartOptions"
          :series="userRoleChartSeries"
        />
      </ClientOnly>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts";
import { computed, defineAsyncComponent, toRefs } from "vue";

const ApexChart = defineAsyncComponent(() => import("vue3-apexcharts"));

const CHART_COLORS = {
  primary: "#2563eb",
  primaryStrong: "#1d4ed8",
  sky: "#0ea5e9",
  neutral: "#64748b",
} as const;

const USER_ROLE_LABELS = ["Admin", "Engineer", "User", "Other"] as const;

const USER_ROLE_COLORS = [
  CHART_COLORS.primaryStrong,
  CHART_COLORS.primary,
  CHART_COLORS.sky,
  CHART_COLORS.neutral,
] as const;

const props = defineProps<{
  userRoleCounts: {
    admin: number;
    engineer: number;
    user: number;
    other: number;
  };
}>();

const { userRoleCounts } = toRefs(props);

const userRoleChartSeries = computed(() => {
  const values = [
    userRoleCounts.value.admin,
    userRoleCounts.value.engineer,
    userRoleCounts.value.user,
    userRoleCounts.value.other,
  ];

  const hasAny = values.some((value) => value > 0);
  return hasAny ? values : [1, 0, 0, 0];
});

const totalUsers = computed(
  () =>
    userRoleCounts.value.admin +
    userRoleCounts.value.engineer +
    userRoleCounts.value.user +
    userRoleCounts.value.other,
);

const userRoleChartOptions = computed<ApexOptions>(() => ({
  chart: {
    type: "donut" as const,
    toolbar: { show: false },
    fontFamily: "inherit",
    foreColor: "#64748b",
  },
  labels: [...USER_ROLE_LABELS],
  colors: [...USER_ROLE_COLORS],
  legend: {
    position: "bottom" as const,
    fontSize: "12px",
    markers: {
      size: 12,
    },
    itemMargin: {
      horizontal: 10,
      vertical: 4,
    },
    labels: {
      colors: "#475569",
    },
  },
  stroke: {
    width: 3,
    colors: ["#ffffff"],
  },
  dataLabels: {
    enabled: true,
    style: {
      colors: ["#ffffff"],
      fontSize: "11px",
      fontWeight: 700,
    },
    formatter: (_value: number, opts?: { seriesIndex?: number; w?: { config?: { series?: Array<number | string> } } }) => {
      const seriesIndex = opts?.seriesIndex ?? -1;
      const rawValue = opts?.w?.config?.series?.[seriesIndex];
      return String(Number(rawValue ?? 0));
    },
    dropShadow: {
      enabled: false,
    },
  },
  plotOptions: {
    pie: {
      expandOnClick: false,
      donut: {
        size: "66%",
        labels: {
          show: true,
          name: {
            show: true,
            color: "#64748b",
            fontSize: "14px",
            fontWeight: 500,
            offsetY: -4,
          },
          value: {
            show: true,
            color: "#0f172a",
            fontSize: "16px",
            fontWeight: 700,
            offsetY: 6,
            formatter: (value: string) => value,
          },
          total: {
            show: true,
            showAlways: true,
            label: "Total Users",
            color: "#64748b",
            fontSize: "14px",
            fontWeight: 500,
            formatter: () => String(totalUsers.value),
          },
        },
      },
    },
  },
  states: {
    hover: {
      filter: {
        type: "darken" as const,
        value: 0.92,
      },
    },
    active: {
      filter: {
        type: "none" as const,
      },
    },
  },
  tooltip: {
    theme: "light" as const,
  },
}));
</script>
