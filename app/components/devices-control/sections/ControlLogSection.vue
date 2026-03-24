<template>
  <section class="w-full py-4">
    <div class="flex flex-col gap-4">
      <ControlAckChartsPanel
        :bucket="controlAckBucket"
        :buckets="controlAckBuckets"
        :totals="controlAckTotals"
        :rows="rows"
      />
      <ControlAckKpiStrip
        :totals="controlAckTotals"
        :buckets="controlAckBuckets"
        :rows="rows"
      />

      <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div
        :class="[
          'bg-white rounded border border-slate-200 overflow-hidden w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
          { hidden: !isFilterVisible },
        ]"
      >
        <div class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
            <p class="text-xs text-gray-500">Refine control logs.</p>
          </div>
          <button
            type="button"
            class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
            @click="toggleFilters"
          >
            Close
          </button>
        </div>
        <AdvancedFilterPanel
          :fields="filterFields"
          :model-value="filters"
          :is-loading="isLoading"
          apply-label="Apply"
          reset-label="Reset"
          @update:modelValue="handleFilterModelUpdate"
          @apply="applyFilters"
          @reset="resetFilters"
        />
      </div>

      <div
        :class="[
          'flex flex-col gap-4',
          isFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
        ]"
      >
        <DataBoxCard
          class="control-log-table-card"
          :is-loading="isLoading"
          :columns="tableColumns.length"
          :has-data="displayedRows.length > 0"
          :pagination="pagination"
          loading-text="Loading control logs..."
          @prev-page="prevPage"
          @next-page="nextPage"
          @change-per-page="changePerPage"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="text-gray-700 text-xs">Control Log</h3>
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                @click="toggleFilters"
              >
                {{ isFilterVisible ? "Hide Filters" : "Show Filters" }}
              </button>
            </div>

            <div class="flex items-center gap-2">
              <div class="relative">
                <input
                  v-model="searchKeyword"
                  type="text"
                  placeholder="Search gateway/node/device/topic..."
                  class="pl-5 pr-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white w-64 text-xs cursor-text"
                />
                <BootstrapIcon
                  name="search"
                  class="absolute left-1 top-1.5 w-3 h-3 text-gray-400"
                />
              </div>
              <button
                type="button"
                class="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 rounded px-3 py-1 text-xs border border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="isLoading"
                @click="refreshRows"
              >
                <BootstrapIcon
                  name="arrow-clockwise"
                  class="w-3 h-3 mr-1"
                  :class="{ 'animate-spin': isLoading }"
                />
                {{ isLoading ? "Refreshing..." : "Refresh" }}
              </button>
            </div>
          </template>

          <template #head>
            <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 text-center">
              <th
                v-for="column in tableColumns"
                :key="column"
                :class="[
                  'px-2 py-2 font-normal text-gray-600 text-center align-middle leading-4',
                  columnWidthClasses[column] ?? '',
                  leftAlignedColumns.has(column) ? 'text-left' : '',
                ]"
              >
                {{ column }}
              </th>
            </tr>
          </template>

          <template #default>
            <tr
              v-for="row in displayedRows"
              :key="rowKey(row)"
              class="hover:bg-gray-50 transition-colors text-xs align-top border-b border-gray-100 py-1 text-center cursor-pointer"
              @click="openTraceDrawer(row)"
            >
              <td class="w-[10%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.gateway_id || "-" }}</td>
              <td class="w-[12%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.node_id || "-" }}</td>
              <td class="w-[10%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.device || "-" }}</td>
              <td class="w-[8%] px-2 py-2 text-gray-700 align-middle leading-4">{{ row.state || "-" }}</td>
              <td class="w-[8%] px-2 py-2 text-gray-700 align-middle leading-4">{{ row.status || "-" }}</td>
              <td class="w-[16%] px-2 py-2 text-gray-700 text-left align-middle leading-4 break-words">{{ row.topic || "-" }}</td>
              <td class="w-[8%] px-2 py-2 text-gray-700 align-middle leading-4">{{ formatExecMs(row.command_exec_ms) }}</td>
              <td class="w-[14%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ formatDateTime(row.timestamp) }}</td>
              <td class="w-[14%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ formatDateTime(row.received_at) }}</td>
            </tr>
          </template>

          <template #empty>No control logs found.</template>
          <template #footer>
            <span>Showing {{ displayedRows.length }} entries on this page.</span>
            <span>
              Total filtered:
              <span class="text-gray-600 font-medium">{{ pagination.total }}</span>
            </span>
          </template>
        </DataBoxCard>
      </div>
    </div>
    <ControlCommandTraceDrawer
      :open="isTraceDrawerOpen"
      :row="selectedTraceRow"
      @close="closeTraceDrawer"
    />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { apiConfig } from "~~/config/api";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { useControlAckApi } from "@/composables/ControlAck/useControlAckApi";
import ControlAckChartsPanel from "@/components/data-center/sections/data-overview/ControlAckChartsPanel.vue";
import ControlAckKpiStrip from "@/components/devices-control/sections/ControlAckKpiStrip.vue";
import ControlCommandTraceDrawer from "@/components/devices-control/sections/ControlCommandTraceDrawer.vue";
import AdvancedFilterPanel, {
  type FilterFieldRow,
} from "@/components/common/AdvancedFilterPanel.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import {
  DEFAULT_CONTROL_ACK_BUCKET,
  DEFAULT_CONTROL_ACK_TOPIC,
  DEFAULT_CONTROL_ACK_TOTALS,
  type ControlAckBucket,
  type ControlAckTotals,
  type ControlLogFilterState,
  type ControlLogRow,
} from "@/types/control-ack";

defineProps<{
  section?: { id: string; label: string };
}>();

const SERVER_BASE_URL = (apiConfig.server || "").replace(/\/$/, "");

const tableColumns = [
  "Gateway",
  "Node",
  "Device",
  "State",
  "Status",
  "Topic",
  "Exec (ms)",
  "Timestamp",
  "Received At",
];
const leftAlignedColumns = new Set([
  "Gateway",
  "Node",
  "Device",
  "Topic",
  "Timestamp",
  "Received At",
  "Exec (ms)",
]);

const rows = ref<ControlLogRow[]>([]);
const searchKeyword = ref("");
const isLoading = ref(false);
const isFilterVisible = ref(true);
const pagination = ref({ page: 1, perPage: 20, lastPage: 1, total: 0 });
const controlAckBucket = ref<"hour" | "minute">(DEFAULT_CONTROL_ACK_BUCKET);
const controlAckBuckets = ref<ControlAckBucket[]>([]);
const controlAckTotals = ref<ControlAckTotals>({ ...DEFAULT_CONTROL_ACK_TOTALS });
const controlAckApi = useControlAckApi(SERVER_BASE_URL);
const isTraceDrawerOpen = ref(false);
const selectedTraceRow = ref<ControlLogRow | null>(null);
const columnWidthClasses: Record<string, string> = {
  Gateway: "w-[10%]",
  Node: "w-[12%]",
  Device: "w-[10%]",
  State: "w-[8%]",
  Status: "w-[8%]",
  Topic: "w-[16%]",
  "Exec (ms)": "w-[8%]",
  Timestamp: "w-[14%]",
  "Received At": "w-[14%]",
};

const filters = reactive<ControlLogFilterState>({
  gateway_id: "",
  node_id: "",
  device: "",
  state: "",
  status: "",
  topic: DEFAULT_CONTROL_ACK_TOPIC,
  timestamp_from: "",
  timestamp_to: "",
});
const appliedFilters = ref<ControlLogFilterState>({ ...filters });

const filterFields = computed<FilterFieldRow[]>(() => [
  [{ key: "gateway_id", label: "Gateway ID", type: "text", placeholder: "GW_001" }],
  [{ key: "node_id", label: "Node ID", type: "text", placeholder: "node-control-001" }],
  [{ key: "device", label: "Device", type: "text", placeholder: "pump" }],
  [{ key: "state", label: "State", type: "text", placeholder: "on/off" }],
  [{ key: "status", label: "Status", type: "text", placeholder: "applied" }],
  [{ key: "topic", label: "Topic", type: "text", placeholder: DEFAULT_CONTROL_ACK_TOPIC }],
  [
    { key: "timestamp_from", label: "Timestamp from", type: "datetime-local" },
    { key: "timestamp_to", label: "Timestamp to", type: "datetime-local" },
  ],
]);

const filteredRows = computed(() => {
  const active = appliedFilters.value;
  const keyword = normalizeText(searchKeyword.value);

  return rows.value.filter((row) => {
    if (active.gateway_id && !normalizeText(row.gateway_id).includes(normalizeText(active.gateway_id))) {
      return false;
    }
    if (active.node_id && !normalizeText(row.node_id).includes(normalizeText(active.node_id))) {
      return false;
    }
    if (active.device && !normalizeText(row.device).includes(normalizeText(active.device))) {
      return false;
    }
    if (active.state && normalizeText(row.state) !== normalizeText(active.state)) {
      return false;
    }
    if (active.status && !normalizeText(row.status).includes(normalizeText(active.status))) {
      return false;
    }
    if (active.topic && !normalizeText(row.topic).includes(normalizeText(active.topic))) {
      return false;
    }

    const rowTime = toComparable(row.timestamp);
    if (active.timestamp_from) {
      const fromTime = toComparable(fromLocalInputToIso(active.timestamp_from));
      if (rowTime === null || fromTime === null || rowTime < fromTime) return false;
    }
    if (active.timestamp_to) {
      const toTime = toComparable(fromLocalInputToIso(active.timestamp_to));
      if (rowTime === null || toTime === null || rowTime > toTime) return false;
    }

    if (keyword) {
      const haystack = [
        row.gateway_id,
        row.node_id,
        row.device,
        row.state,
        row.status,
        row.topic,
        row.command_exec_ms,
        row.timestamp,
        row.received_at,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
});

const displayedRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.perPage;
  const end = start + pagination.value.perPage;
  return filteredRows.value.slice(start, end);
});

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function fromLocalInputToIso(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function toComparable(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function formatDateTime(value?: string | null) {
  return formatIotDateTime(value, { fallback: "-" });
}

function formatExecMs(value?: number | null) {
  if (!Number.isFinite(Number(value))) return "-";
  return `${Math.round(Number(value))}`;
}

function rowKey(row: ControlLogRow) {
  const objectId =
    typeof row._id === "string"
      ? row._id
      : (row._id as { $oid?: string } | null)?.$oid ?? "";
  return `${objectId}-${row.timestamp ?? ""}-${row.received_at ?? ""}`;
}

function handleFilterModelUpdate(value: Record<string, string>) {
  Object.assign(filters, value);
}

function applyFilters(payload?: Record<string, string>) {
  appliedFilters.value = {
    ...filters,
    ...(payload ?? {}),
  };
  pagination.value.page = 1;
  fetchRows();
}

function resetFilters() {
  filters.gateway_id = "";
  filters.node_id = "";
  filters.device = "";
  filters.state = "";
  filters.status = "";
  filters.topic = DEFAULT_CONTROL_ACK_TOPIC;
  filters.timestamp_from = "";
  filters.timestamp_to = "";
  appliedFilters.value = { ...filters };
  pagination.value.page = 1;
  fetchRows();
}

function openTraceDrawer(row: ControlLogRow) {
  selectedTraceRow.value = row;
  isTraceDrawerOpen.value = true;
}

function closeTraceDrawer() {
  isTraceDrawerOpen.value = false;
  selectedTraceRow.value = null;
}

function toggleFilters() {
  isFilterVisible.value = !isFilterVisible.value;
}

function refreshRows() {
  if (isLoading.value) return;
  Promise.all([fetchControlAckOverview(), fetchRows()]);
}

function prevPage() {
  if (pagination.value.page > 1) {
    pagination.value.page -= 1;
  }
}

function nextPage() {
  if (pagination.value.page < pagination.value.lastPage) {
    pagination.value.page += 1;
  }
}

function changePerPage(value: number) {
  if (value <= 0) return;
  pagination.value.perPage = value;
}

function recalculatePagination() {
  const total = filteredRows.value.length;
  pagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / pagination.value.perPage));
  pagination.value.lastPage = lastPage;
  if (pagination.value.page > lastPage) {
    pagination.value.page = lastPage;
  }
}

async function fetchRows() {
  isLoading.value = true;
  try {
    rows.value = await controlAckApi.fetchRows(appliedFilters.value, 500, 1);
    recalculatePagination();
  } catch (error) {
    console.error("Failed to fetch control logs:", error);
    rows.value = [];
    recalculatePagination();
  } finally {
    isLoading.value = false;
  }
}

async function fetchControlAckOverview() {
  try {
    const overview = await controlAckApi.fetchOverview(12, "hour");
    controlAckBucket.value = overview.bucket;
    controlAckBuckets.value = overview.buckets;
    controlAckTotals.value = overview.totals;
  } catch (error) {
    console.error("Failed to fetch control ACK overview:", error);
    controlAckBucket.value = DEFAULT_CONTROL_ACK_BUCKET;
    controlAckBuckets.value = [];
    controlAckTotals.value = { ...DEFAULT_CONTROL_ACK_TOTALS };
  }
}

onMounted(() => {
  fetchControlAckOverview();
  fetchRows();
});

watch(
  filteredRows,
  () => {
    recalculatePagination();
  },
  { immediate: true },
);

watch(
  () => pagination.value.perPage,
  () => {
    pagination.value.page = 1;
    recalculatePagination();
  },
);

watch(searchKeyword, () => {
  pagination.value.page = 1;
});
</script>

<style scoped>
.control-log-table-card :deep(table) {
  table-layout: fixed;
}
</style>
