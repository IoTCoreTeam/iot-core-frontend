<template>
  <section class="w-full p-4">
    <div class="space-y-4">
      <template v-if="isOverviewLoading">
        <section class="rounded border border-slate-200 bg-slate-50/60 p-4">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-900">Control Data</p>
            <p class="text-xs text-slate-500">
              Validate execution quality with command timeline, ACK latency, and success rate.
            </p>
          </div>
          <article class="mt-4 animate-pulse">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div class="rounded border border-emerald-100 bg-emerald-50 p-3">
                <div class="h-3 w-20 rounded bg-emerald-200/80"></div>
                <div class="mt-2 h-6 w-16 rounded bg-emerald-200/80"></div>
              </div>
              <div class="rounded border border-blue-100 bg-blue-50 p-3">
                <div class="h-3 w-24 rounded bg-blue-200/80"></div>
                <div class="mt-2 h-6 w-20 rounded bg-blue-200/80"></div>
              </div>
              <div class="rounded border border-violet-100 bg-violet-50 p-3">
                <div class="h-3 w-20 rounded bg-violet-200/80"></div>
                <div class="mt-2 h-6 w-20 rounded bg-violet-200/80"></div>
              </div>
            </div>
          </article>
          <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article
              v-for="item in 3"
              :key="`ack-chart-skeleton-${item}`"
              class="min-h-[320px] bg-white border border-slate-200 rounded p-4 animate-pulse"
            >
              <div class="h-4 w-40 rounded bg-slate-200"></div>
              <div class="mt-2 h-3 w-44 rounded bg-slate-100"></div>
              <div class="mt-4 h-[230px] rounded bg-slate-100"></div>
            </article>
          </div>
        </section>

        <section class="rounded border border-slate-200 bg-slate-50/60 p-4">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-slate-900">System Data</p>
            <p class="text-xs text-slate-500">
              Review users and logs to understand overall platform operations.
            </p>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <article class="min-h-[360px] bg-white border border-slate-200 rounded p-4 animate-pulse">
              <div class="h-4 w-28 rounded bg-slate-200"></div>
              <div class="mt-2 h-3 w-44 rounded bg-slate-100"></div>
              <div class="mt-4 h-10 rounded border border-slate-100 bg-slate-50"></div>
              <div class="mt-4 h-[270px] rounded bg-slate-100"></div>
            </article>
            <article class="min-h-[360px] bg-white border border-slate-200 rounded p-4 animate-pulse">
              <div class="h-4 w-32 rounded bg-slate-200"></div>
              <div class="mt-2 h-3 w-28 rounded bg-slate-100"></div>
              <div class="mt-4 h-[270px] rounded bg-slate-100"></div>
            </article>
            <article class="min-h-[360px] bg-white border border-slate-200 rounded p-4 animate-pulse">
              <div class="h-4 w-36 rounded bg-slate-200"></div>
              <div class="mt-2 h-3 w-44 rounded bg-slate-100"></div>
              <div class="mt-4 h-[270px] rounded bg-slate-100"></div>
            </article>
          </div>
        </section>
      </template>

      <template v-else>
        
        <section class="rounded border border-slate-200 bg-slate-50/60 p-4">
          <div class="flex items-center gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">Control Data</p>
              <p class="text-xs text-slate-500">
                Validate execution quality with command timeline, ACK latency, and success rate.
              </p>
            </div>
          </div>
          <div class="mt-4">
            <ControlAckKpiStrip
              :totals="controlAckTotals"
              :buckets="controlAckBuckets"
              :rows="controlAckRows"
            />
          </div>
          <div class="mt-4">
            <ControlAckChartsPanel
              :bucket="controlAckBucket"
              :buckets="controlAckBuckets"
              :totals="controlAckTotals"
              :rows="controlAckRows"
            />
          </div>
        </section>

        <section class="rounded border border-slate-200 bg-slate-50/60 p-4">
          <div class="flex items-center gap-3">
            <div>
              <p class="text-sm font-semibold text-slate-900">System Data</p>
              <p class="text-xs text-slate-500">
                Review users and logs to understand overall platform operations.
              </p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <UsersByRoleCard :user-role-counts="userRoleCounts" />
            <LogsMonitoringCard
              :categories="logsCategories"
              :series="logsSeries"
            />
            <TopLogActionsCard
              :categories="topLogActionCategories"
              :series="topLogActionSeries"
            />
          </div>
        </section>
      </template>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import { useControlAckApi } from "@/composables/ControlAck/useControlAckApi";
import ControlAckKpiStrip from "@/components/devices-control/sections/ControlAckKpiStrip.vue";
import UsersByRoleCard from "./data-overview/UsersByRoleCard.vue";
import LogsMonitoringCard from "./data-overview/LogsMonitoringCard.vue";
import TopLogActionsCard from "./data-overview/TopLogActionsCard.vue";
import ControlAckChartsPanel from "./data-overview/ControlAckChartsPanel.vue";
import {
  DEFAULT_CONTROL_ACK_BUCKET,
  DEFAULT_CONTROL_ACK_TOPIC,
  DEFAULT_CONTROL_ACK_TOTALS,
  type ControlAckBucket,
  type ControlLogRow,
  type ControlAckTotals,
} from "@/types/control-ack";
const authStore = useAuthStore();

const isOverviewLoading = ref(true);

const userRoleCounts = ref({
  admin: 0,
  engineer: 0,
  user: 0,
  other: 0,
});

const logsCategories = ref<string[]>([]);
const logsSeries = ref<{ name: string; data: number[] }[]>([]);
const topLogActionCategories = ref<string[]>([]);
const topLogActionSeries = ref<{ name: string; data: number[] }[]>([]);
const controlAckBucket = ref<"hour" | "minute">(DEFAULT_CONTROL_ACK_BUCKET);
const controlAckBuckets = ref<ControlAckBucket[]>([]);
const controlAckTotals = ref<ControlAckTotals>({ ...DEFAULT_CONTROL_ACK_TOTALS });
const controlAckRows = ref<ControlLogRow[]>([]);
const controlAckApi = useControlAckApi(apiConfig.server || "");

async function fetchJson(url: string) {
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    throw new Error("Missing authorization header.");
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: authorization,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? `Request failed: ${response.status}`);
  }

  return payload;
}

async function fetchOverviewData() {
  if (!import.meta.client) return;
  if (!authStore.authorizationHeader) {
    isOverviewLoading.value = false;
    return;
  }

  isOverviewLoading.value = true;

  try {
    const [userRoles, logs, topActions] = await Promise.all([
      fetchJson(`${apiConfig.auth}/users/count-by-role`),
      fetchJson(`${apiConfig.auth}/metrics/system-logs-count`),
      fetchJson(`${apiConfig.auth}/metrics/system-logs-actions?days=7&limit=6`),
    ]);

    userRoleCounts.value = {
      admin: Number(userRoles?.data?.role_counts?.admin ?? 0),
      engineer: Number(userRoles?.data?.role_counts?.engineer ?? 0),
      user: Number(userRoles?.data?.role_counts?.user ?? 0),
      other: Number(userRoles?.data?.other ?? 0),
    };

    logsCategories.value = Array.isArray(logs?.categories) ? logs.categories : [];
    logsSeries.value = Array.isArray(logs?.series) ? logs.series : [];
    topLogActionCategories.value = Array.isArray(topActions?.categories)
      ? topActions.categories
      : [];
    topLogActionSeries.value = Array.isArray(topActions?.series)
      ? topActions.series
      : [];

    try {
      const overview = await controlAckApi.fetchOverview(12, "hour");
      controlAckBucket.value = overview.bucket;
      controlAckBuckets.value = overview.buckets;
      controlAckTotals.value = overview.totals;
      controlAckRows.value = await controlAckApi.fetchRows(
        {
          gateway_id: "",
          node_id: "",
          device: "",
          state: "",
          status: "",
          topic: DEFAULT_CONTROL_ACK_TOPIC,
          timestamp_from: "",
          timestamp_to: "",
        },
        120,
        1,
      );
    } catch (error) {
      console.error("Failed to fetch control ack overview:", error);
      controlAckBucket.value = DEFAULT_CONTROL_ACK_BUCKET;
      controlAckBuckets.value = [];
      controlAckTotals.value = { ...DEFAULT_CONTROL_ACK_TOTALS };
      controlAckRows.value = [];
    }
  } catch (error) {
    console.error("Failed to fetch data overview:", error);
  } finally {
    isOverviewLoading.value = false;
  }
}

onMounted(() => {
  fetchOverviewData();
});

watch(
  () => authStore.authorizationHeader,
  (token) => {
    if (!token) return;
    fetchOverviewData();
  },
);
</script>
