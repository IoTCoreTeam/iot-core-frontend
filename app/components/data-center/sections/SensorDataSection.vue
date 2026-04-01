<template>
  <section class="w-full">
    <a-tabs v-model:activeKey="activeTab" class="px-4 custom-tabs text-xs">
      <a-tab-pane key="sensor-data" tab="Sensor Data">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div
            :class="[
              'bg-white rounded border border-slate-200 overflow-hidden w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
              { hidden: !isSensorDataFilterVisible },
            ]"
          >
            <div class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
                <p class="text-xs text-gray-500">Refine sensor readings.</p>
              </div>
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
                @click="toggleSensorDataFilters"
              >
                Close
              </button>
            </div>
            <AdvancedFilterPanel
              :fields="sensorDataFilterFields"
              :model-value="sensorDataFilters"
              :is-loading="isSensorDataLoading"
              apply-label="Apply"
              reset-label="Reset"
              @update:modelValue="handleSensorDataFilterModelUpdate"
              @apply="applySensorDataFilters"
              @reset="resetSensorDataFilters"
            />
          </div>

          <div
            :class="[
              'flex flex-col gap-4',
              isSensorDataFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
            ]"
          >
            <DataBoxCard
              class="sensor-data-table-card"
              :is-loading="isSensorDataLoading"
              :columns="sensorDataTableColumns.length"
              :has-data="displayedSensorDataRows.length > 0"
              :pagination="sensorDataPagination"
              loading-text="Loading sensor readings..."
              @prev-page="prevSensorDataPage"
              @next-page="nextSensorDataPage"
              @change-per-page="changeSensorDataPerPage"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <h3 class="text-gray-700 text-xs">Sensor Data</h3>
                  <button
                    type="button"
                    class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                    @click="toggleSensorDataFilters"
                  >
                    {{ isSensorDataFilterVisible ? "Hide Filters" : "Show Filters" }}
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <div class="relative">
                    <input
                      v-model="sensorDataSearchKeyword"
                      type="text"
                      placeholder="Search gateway/node/sensor..."
                      class="pl-5 pr-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white w-60 text-xs cursor-text"
                    />
                    <BootstrapIcon
                      name="search"
                      class="absolute left-1 top-1.5 w-3 h-3 text-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    class="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 rounded px-3 py-1 text-xs border border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="isSensorDataLoading"
                    @click="refreshSensorDataRows"
                  >
                    <BootstrapIcon
                      name="arrow-clockwise"
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': isSensorDataLoading }"
                    />
                    {{ isSensorDataLoading ? "Refreshing..." : "Refresh" }}
                  </button>
                </div>
              </template>

              <template #head>
                <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 text-center">
                  <th
                    v-for="column in sensorDataTableColumns"
                    :key="column"
                    :class="[
                      'w-[14.2857%] px-2 py-2 font-normal text-gray-600 text-center align-middle leading-4',
                      column === 'Gateway' ||
                      column === 'Node' ||
                      column === 'Sensor' ||
                      column === 'Metric' ||
                      column === 'Timestamp'
                        ? 'text-left'
                        : '',
                    ]"
                  >
                    {{ column }}
                  </th>
                </tr>
              </template>

              <template #default>
                <tr
                  v-for="row in displayedSensorDataRows"
                  :key="sensorDataRowKey(row)"
                  class="hover:bg-gray-50 transition-colors text-xs align-top border-b border-gray-100 py-1 text-center"
                >
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.gateway_id || "-" }}</td>
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.node_id || "-" }}</td>
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.sensor_id || "-" }}</td>
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 text-left align-middle leading-4">{{ row.metric || "-" }}</td>
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 align-middle leading-4">{{ formatValue(row.value) }}</td>
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 align-middle leading-4">{{ row.unit || "-" }}</td>
                  <td class="w-[14.2857%] px-2 py-2 text-gray-700 text-left align-middle leading-4">
                    {{ formatDateTime(row.timestamp) }}
                  </td>
                </tr>
              </template>

              <template #empty>No sensor readings found.</template>
              <template #footer>
                <span>Showing {{ displayedSensorDataRows.length }} entries on this page.</span>
                <span>
                  Total filtered:
                  <span class="text-gray-600 font-medium">{{ sensorDataPagination.total }}</span>
                </span>
              </template>
            </DataBoxCard>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="sensor-device" tab="Sensor Device">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div
            :class="[
              'bg-white rounded border border-slate-200 overflow-hidden w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
              { hidden: !isSensorDeviceFilterVisible },
            ]"
          >
            <div class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
                <p class="text-xs text-gray-500">Refine sensor devices.</p>
              </div>
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
                @click="toggleSensorDeviceFilters"
              >
                Close
              </button>
            </div>
            <AdvancedFilterPanel
              :fields="sensorDeviceFilterFields"
              :model-value="sensorDeviceFilters"
              :is-loading="isSensorDeviceLoading"
              apply-label="Apply"
              reset-label="Reset"
              @update:modelValue="handleSensorDeviceFilterModelUpdate"
              @apply="applySensorDeviceFilters"
              @reset="resetSensorDeviceFilters"
            />
          </div>

          <div
            :class="[
              'flex flex-col gap-4',
              isSensorDeviceFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
            ]"
          >
            <DataBoxCard
              class="sensor-device-table-card"
              :is-loading="isSensorDeviceLoading"
              :columns="sensorDeviceTableColumns.length"
              :has-data="displayedSensorDeviceRows.length > 0"
              :pagination="sensorDevicePagination"
              loading-text="Loading sensor devices..."
              @prev-page="prevSensorDevicePage"
              @next-page="nextSensorDevicePage"
              @change-per-page="changeSensorDevicePerPage"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <h3 class="text-gray-700 text-xs">Sensor Device</h3>
                  <button
                    type="button"
                    class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                    @click="toggleSensorDeviceFilters"
                  >
                    {{ isSensorDeviceFilterVisible ? "Hide Filters" : "Show Filters" }}
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <div class="relative">
                    <input
                      v-model="sensorDeviceSearchKeyword"
                      type="text"
                      placeholder="Search sensor device..."
                      class="pl-5 pr-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white w-60 text-xs cursor-text"
                    />
                    <BootstrapIcon
                      name="search"
                      class="absolute left-1 top-1.5 w-3 h-3 text-gray-400"
                    />
                  </div>
                  <button
                    type="button"
                    class="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 rounded px-3 py-1 text-xs border border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="isSensorDeviceLoading"
                    @click="refreshSensorDeviceRows"
                  >
                    <BootstrapIcon
                      name="arrow-clockwise"
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': isSensorDeviceLoading }"
                    />
                    {{ isSensorDeviceLoading ? "Refreshing..." : "Refresh" }}
                  </button>
                </div>
              </template>

              <template #head>
                <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 text-left">
                  <th
                    v-for="column in sensorDeviceTableColumns"
                    :key="column.key"
                    class="px-2 py-3 font-normal text-gray-600"
                    :style="{ width: column.width }"
                  >
                    {{ column.label }}
                  </th>
                </tr>
              </template>

              <template #default>
                <tr
                  v-for="row in displayedSensorDeviceRows"
                  :key="row.id"
                  :class="[
                    'transition-colors text-xs border-b border-gray-100',
                    isSoftDeletedSensorDevice(row) ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-gray-50',
                  ]"
                >
                  <td class="p-2 text-gray-700">{{ row.external_id || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.name || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ resolveGatewayDisplayId(row) }}</td>
                  <td class="p-2 text-gray-700">{{ row.mac_address || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.ip_address || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ formatDateTime(row.created_at) }}</td>
                  <td class="p-2 text-center">
                    <button
                      type="button"
                      class="inline-flex h-7 w-7 items-center justify-center rounded border transition-colors"
                      :class="
                        isPinnedSensor(row)
                          ? 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      "
                      :title="isPinnedSensor(row) ? 'Unpin sensor' : 'Pin sensor'"
                      @click.stop="toggleSensorPin(row)"
                    >
                      <BootstrapIcon
                        :name="isPinnedSensor(row) ? 'pin-angle-fill' : 'pin-angle'"
                        class="w-3 h-3"
                      />
                    </button>
                  </td>
                </tr>
              </template>

              <template #empty>No sensor devices found.</template>
              <template #footer>
                <span>Showing {{ displayedSensorDeviceRows.length }} entries on this page.</span>
                <span>
                  Total filtered:
                  <span class="text-gray-600 font-medium">{{ sensorDevicePagination.total }}</span>
                </span>
              </template>
            </DataBoxCard>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { apiConfig } from "~~/config/api";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { useMetrics } from "@/composables/useMetrics";
import { useAuthStore } from "~~/stores/auth";
import {
  readPinnedSensorIds,
  writePinnedSensorIds,
} from "~~/config/pinned-sensors";
import {
  fetchSensorInventoryRows,
  isSoftDeletedInventoryRow,
  type DeviceInventoryRow,
} from "@/composables/DeviceRegistration/useDeviceInventory";
import AdvancedFilterPanel, {
  type FilterFieldRow,
} from "@/components/common/AdvancedFilterPanel.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";

type SensorReadingRow = {
  _id?: { $oid?: string } | string | null;
  gateway_id?: string | null;
  node_id?: string | null;
  sensor_id?: string | null;
  metric?: string | null;
  value?: unknown;
  unit?: string | null;
  timestamp?: string | null;
  raw?: unknown;
};

type SensorFilterState = {
  gateway_id: string;
  node_id: string;
  sensor_id: string;
  metric: string;
  timestamp_from: string;
  timestamp_to: string;
};

type SensorDeviceRow = DeviceInventoryRow;

type SensorDeviceFilterState = {
  external_id: string;
  name: string;
  gateway_external_id: string;
  mac_address: string;
  ip_address: string;
};

const IOT_OFFSET_MS = 7 * 60 * 60 * 1000;
const SERVER_BASE_URL = (apiConfig.server || "").replace(/\/$/, "");
const authStore = useAuthStore();
const { metrics } = useMetrics();
const activeTab = ref<"sensor-data" | "sensor-device">("sensor-data");

const sensorDataTableColumns = [
  "Gateway",
  "Node",
  "Sensor",
  "Metric",
  "Value",
  "Unit",
  "Timestamp",
];

const sensorDataRows = ref<SensorReadingRow[]>([]);
const sensorDataSearchKeyword = ref("");
const isSensorDataLoading = ref(false);
const isSensorDataFilterVisible = ref(true);
const sensorDataPagination = ref({ page: 1, perPage: 20, lastPage: 1, total: 0 });

const sensorDataFilters = reactive<SensorFilterState>({
  gateway_id: "",
  node_id: "",
  sensor_id: "",
  metric: "",
  timestamp_from: "",
  timestamp_to: "",
});
const appliedSensorDataFilters = ref<SensorFilterState>({ ...sensorDataFilters });

const sensorDataFilterFields = computed<FilterFieldRow[]>(() => [
  [{ key: "gateway_id", label: "Gateway ID", type: "text", placeholder: "GW_001" }],
  [{ key: "node_id", label: "Node ID", type: "text", placeholder: "node-sensor-001" }],
  [{ key: "sensor_id", label: "Sensor ID", type: "text", placeholder: "sensor-env-01-temp" }],
  [
    {
      key: "metric",
      label: "Metric",
      type: "select",
      options: [
        { label: "All", value: "" },
        ...metrics.value.map((metric) => ({
          label: metric.title,
          value: metric.key,
        })),
      ],
    },
  ],
  [
    { key: "timestamp_from", label: "Timestamp from", type: "datetime-local" },
    { key: "timestamp_to", label: "Timestamp to", type: "datetime-local" },
  ],
]);

const filteredSensorDataRows = computed(() => {
  const filters = appliedSensorDataFilters.value;
  const keyword = normalizeText(sensorDataSearchKeyword.value);

  return sensorDataRows.value.filter((row) => {
    if (filters.gateway_id && !normalizeText(row.gateway_id).includes(normalizeText(filters.gateway_id))) {
      return false;
    }
    if (filters.node_id && !normalizeText(row.node_id).includes(normalizeText(filters.node_id))) {
      return false;
    }
    if (filters.sensor_id && !normalizeText(row.sensor_id).includes(normalizeText(filters.sensor_id))) {
      return false;
    }
    if (filters.metric && normalizeText(row.metric) !== normalizeText(filters.metric)) {
      return false;
    }

    const rowTime = toIotComparable(row.timestamp);
    if (filters.timestamp_from) {
      const fromTime = toIotComparable(fromLocalInputToIso(filters.timestamp_from));
      if (rowTime === null || fromTime === null || rowTime < fromTime) return false;
    }
    if (filters.timestamp_to) {
      const toTime = toIotComparable(fromLocalInputToIso(filters.timestamp_to));
      if (rowTime === null || toTime === null || rowTime > toTime) return false;
    }

    if (keyword) {
      const haystack = [
        row.gateway_id,
        row.node_id,
        row.sensor_id,
        row.metric,
        formatValue(row.value),
        row.unit,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
});

const displayedSensorDataRows = computed(() => {
  const start = (sensorDataPagination.value.page - 1) * sensorDataPagination.value.perPage;
  const end = start + sensorDataPagination.value.perPage;
  return filteredSensorDataRows.value.slice(start, end);
});

const sensorDeviceRows = ref<SensorDeviceRow[]>([]);
const sensorDeviceSearchKeyword = ref("");
const isSensorDeviceLoading = ref(false);
const isSensorDeviceFilterVisible = ref(true);
const sensorDevicePagination = ref({ page: 1, perPage: 10, lastPage: 1, total: 0 });

const sensorDeviceTableColumns: Array<{ key: keyof SensorDeviceRow | "created_at" | "actions"; label: string; width: string }> = [
  { key: "external_id", label: "Sensor ID", width: "18%" },
  { key: "name", label: "Name", width: "17%" },
  { key: "gateway_id", label: "Gateway ID", width: "18%" },
  { key: "mac_address", label: "MAC", width: "15%" },
  { key: "ip_address", label: "IP", width: "12%" },
  { key: "created_at", label: "Created At", width: "14%" },
  { key: "actions", label: "Actions", width: "6%" },
];

const sensorDeviceFilters = reactive<SensorDeviceFilterState>({
  external_id: "",
  name: "",
  gateway_external_id: "",
  mac_address: "",
  ip_address: "",
});
const appliedSensorDeviceFilters = ref<SensorDeviceFilterState>({ ...sensorDeviceFilters });
const gatewayExternalIdMap = ref<Record<string, string>>({});
const pinnedSensorIds = ref<string[]>([]);

const sensorDeviceFilterFields = computed<FilterFieldRow[]>(() => [
  [{ key: "external_id", label: "Sensor ID", type: "text", placeholder: "node_sensor_01" }],
  [{ key: "name", label: "Name", type: "text", placeholder: "Environment Sensor" }],
  [{ key: "gateway_external_id", label: "Gateway ID", type: "text", placeholder: "GW_001" }],
  [{ key: "mac_address", label: "MAC", type: "text", placeholder: "00:11:22:33:44:55" }],
  [{ key: "ip_address", label: "IP", type: "text", placeholder: "192.168.1.21" }],
]);

const filteredSensorDeviceRows = computed(() => {
  const filters = appliedSensorDeviceFilters.value;
  const keyword = normalizeText(sensorDeviceSearchKeyword.value);

  return sensorDeviceRows.value.filter((row) => {
    if (filters.external_id && !normalizeText(row.external_id).includes(normalizeText(filters.external_id))) {
      return false;
    }
    if (filters.name && !normalizeText(row.name).includes(normalizeText(filters.name))) {
      return false;
    }
    if (
      filters.gateway_external_id &&
      !normalizeText(resolveGatewayDisplayId(row)).includes(normalizeText(filters.gateway_external_id))
    ) {
      return false;
    }
    if (filters.mac_address && !normalizeText(row.mac_address).includes(normalizeText(filters.mac_address))) {
      return false;
    }
    if (filters.ip_address && !normalizeText(row.ip_address).includes(normalizeText(filters.ip_address))) {
      return false;
    }

    if (keyword) {
      const haystack = [
        row.external_id,
        row.name,
        resolveGatewayDisplayId(row),
        row.gateway_id,
        row.mac_address,
        row.ip_address,
      ]
        .map((value) => normalizeText(value))
        .join(" ");

      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
});

const displayedSensorDeviceRows = computed(() => {
  const start = (sensorDevicePagination.value.page - 1) * sensorDevicePagination.value.perPage;
  const end = start + sensorDevicePagination.value.perPage;
  return filteredSensorDeviceRows.value.slice(start, end);
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

function toIotComparable(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime() - IOT_OFFSET_MS;
}

function formatDateTime(value?: string | null) {
  return formatIotDateTime(value, { fallback: "-" });
}

function formatValue(value: unknown) {
  if (typeof value === "number") return Number(value.toFixed(3)).toString();
  if (value && typeof value === "object" && "$numberDecimal" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>).$numberDecimal ?? "-");
  }
  return String(value ?? "-");
}

function formatObjectId(value: SensorReadingRow["_id"]) {
  if (!value) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "$oid" in value) {
    return String(value.$oid ?? "-");
  }
  return String(value);
}

function sensorDataRowKey(row: SensorReadingRow) {
  const objectId = formatObjectId(row._id);
  return `${objectId}-${row.sensor_id ?? ""}-${row.timestamp ?? ""}`;
}

function handleSensorDataFilterModelUpdate(value: Record<string, string>) {
  Object.assign(sensorDataFilters, value);
}

function applySensorDataFilters(payload?: Record<string, string>) {
  appliedSensorDataFilters.value = {
    ...sensorDataFilters,
    ...(payload ?? {}),
  };
  sensorDataPagination.value.page = 1;
  fetchSensorDataRows();
}

function resetSensorDataFilters() {
  sensorDataFilters.gateway_id = "";
  sensorDataFilters.node_id = "";
  sensorDataFilters.sensor_id = "";
  sensorDataFilters.metric = "";
  sensorDataFilters.timestamp_from = "";
  sensorDataFilters.timestamp_to = "";
  appliedSensorDataFilters.value = { ...sensorDataFilters };
  sensorDataPagination.value.page = 1;
  fetchSensorDataRows();
}

function toggleSensorDataFilters() {
  isSensorDataFilterVisible.value = !isSensorDataFilterVisible.value;
}

function refreshSensorDataRows() {
  if (isSensorDataLoading.value) return;
  fetchSensorDataRows();
}

function prevSensorDataPage() {
  if (sensorDataPagination.value.page > 1) {
    sensorDataPagination.value.page -= 1;
  }
}

function nextSensorDataPage() {
  if (sensorDataPagination.value.page < sensorDataPagination.value.lastPage) {
    sensorDataPagination.value.page += 1;
  }
}

function changeSensorDataPerPage(value: number) {
  if (value <= 0) return;
  sensorDataPagination.value.perPage = value;
}

function recalculateSensorDataPagination() {
  const total = filteredSensorDataRows.value.length;
  sensorDataPagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / sensorDataPagination.value.perPage));
  sensorDataPagination.value.lastPage = lastPage;
  if (sensorDataPagination.value.page > lastPage) {
    sensorDataPagination.value.page = lastPage;
  }
}

function handleSensorDeviceFilterModelUpdate(value: Record<string, string>) {
  Object.assign(sensorDeviceFilters, value);
}

function applySensorDeviceFilters(payload?: Record<string, string>) {
  appliedSensorDeviceFilters.value = {
    ...sensorDeviceFilters,
    ...(payload ?? {}),
  };
  sensorDevicePagination.value.page = 1;
}

function resetSensorDeviceFilters() {
  sensorDeviceFilters.external_id = "";
  sensorDeviceFilters.name = "";
  sensorDeviceFilters.gateway_external_id = "";
  sensorDeviceFilters.mac_address = "";
  sensorDeviceFilters.ip_address = "";
  appliedSensorDeviceFilters.value = { ...sensorDeviceFilters };
  sensorDevicePagination.value.page = 1;
}

function toggleSensorDeviceFilters() {
  isSensorDeviceFilterVisible.value = !isSensorDeviceFilterVisible.value;
}

function refreshSensorDeviceRows() {
  if (isSensorDeviceLoading.value) return;
  fetchSensorDeviceRows();
}

function prevSensorDevicePage() {
  if (sensorDevicePagination.value.page > 1) {
    sensorDevicePagination.value.page -= 1;
  }
}

function nextSensorDevicePage() {
  if (sensorDevicePagination.value.page < sensorDevicePagination.value.lastPage) {
    sensorDevicePagination.value.page += 1;
  }
}

function changeSensorDevicePerPage(value: number) {
  if (value <= 0) return;
  sensorDevicePagination.value.perPage = value;
}

function recalculateSensorDevicePagination() {
  const total = filteredSensorDeviceRows.value.length;
  sensorDevicePagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / sensorDevicePagination.value.perPage));
  sensorDevicePagination.value.lastPage = lastPage;
  if (sensorDevicePagination.value.page > lastPage) {
    sensorDevicePagination.value.page = lastPage;
  }
}

function resolveGatewayDisplayId(row: SensorDeviceRow) {
  const gatewayUuid = String(row.gateway_id ?? "");
  if (!gatewayUuid) return "-";
  return gatewayExternalIdMap.value[gatewayUuid] ?? gatewayUuid;
}

function isSoftDeletedSensorDevice(row: SensorDeviceRow) {
  return isSoftDeletedInventoryRow(row);
}

function getSensorPinKey(row: SensorDeviceRow) {
  return String(row.external_id ?? "").trim();
}

function isPinnedSensor(row: SensorDeviceRow) {
  const sensorId = getSensorPinKey(row);
  if (!sensorId) return false;
  return pinnedSensorIds.value.includes(sensorId);
}

function toggleSensorPin(row: SensorDeviceRow) {
  const sensorId = getSensorPinKey(row);
  if (!sensorId) return;

  const next = isPinnedSensor(row)
    ? []
    : [sensorId];
  pinnedSensorIds.value = writePinnedSensorIds(next);
}

async function fetchSensorDataRows() {
  if (!import.meta.client || !SERVER_BASE_URL) return;

  isSensorDataLoading.value = true;
  try {
    const params = new URLSearchParams();
    params.set("limit", "500");
    params.set("page", "1");

    if (appliedSensorDataFilters.value.metric) params.set("sensor_type", appliedSensorDataFilters.value.metric);
    if (appliedSensorDataFilters.value.gateway_id) params.set("gateway_id", appliedSensorDataFilters.value.gateway_id);
    if (appliedSensorDataFilters.value.node_id) params.set("node_id", appliedSensorDataFilters.value.node_id);
    if (appliedSensorDataFilters.value.sensor_id) params.set("sensor_id", appliedSensorDataFilters.value.sensor_id);

    const fromIso = fromLocalInputToIso(appliedSensorDataFilters.value.timestamp_from);
    const toIso = fromLocalInputToIso(appliedSensorDataFilters.value.timestamp_to);
    if (fromIso) params.set("timestamp_from", fromIso);
    if (toIso) params.set("timestamp_to", toIso);

    const response = await fetch(`${SERVER_BASE_URL}/v1/sensors/query?${params.toString()}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => []);
    if (!response.ok) {
      throw new Error(`Failed to fetch sensor data (${response.status}).`);
    }

    sensorDataRows.value = Array.isArray(payload) ? (payload as SensorReadingRow[]) : [];
    recalculateSensorDataPagination();
  } catch (error) {
    console.error("Failed to fetch sensor readings:", error);
    sensorDataRows.value = [];
    recalculateSensorDataPagination();
  } finally {
    isSensorDataLoading.value = false;
  }
}

async function fetchSensorDeviceRows() {
  if (!import.meta.client) return;

  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    sensorDeviceRows.value = [];
    recalculateSensorDevicePagination();
    return;
  }

  isSensorDeviceLoading.value = true;
  try {
    const { sensorRows, gatewayMap } = await fetchSensorInventoryRows(authorization);
    gatewayExternalIdMap.value = gatewayMap;
    sensorDeviceRows.value = sensorRows;

    recalculateSensorDevicePagination();
  } catch (error) {
    console.error("Failed to fetch sensor devices:", error);
    gatewayExternalIdMap.value = {};
    sensorDeviceRows.value = [];
    recalculateSensorDevicePagination();
  } finally {
    isSensorDeviceLoading.value = false;
  }
}

onMounted(() => {
  pinnedSensorIds.value = writePinnedSensorIds(readPinnedSensorIds().slice(0, 1));
  fetchSensorDataRows();
  fetchSensorDeviceRows();
});

watch(
  filteredSensorDataRows,
  () => {
    recalculateSensorDataPagination();
  },
  { immediate: true },
);

watch(
  filteredSensorDeviceRows,
  () => {
    recalculateSensorDevicePagination();
  },
  { immediate: true },
);

watch(
  () => sensorDataPagination.value.perPage,
  () => {
    sensorDataPagination.value.page = 1;
    recalculateSensorDataPagination();
  },
);

watch(
  () => sensorDevicePagination.value.perPage,
  () => {
    sensorDevicePagination.value.page = 1;
    recalculateSensorDevicePagination();
  },
);

watch(sensorDataSearchKeyword, () => {
  sensorDataPagination.value.page = 1;
});

watch(sensorDeviceSearchKeyword, () => {
  sensorDevicePagination.value.page = 1;
});

watch(
  () => authStore.authorizationHeader,
  (authorization, previousAuthorization) => {
    if (authorization && authorization !== previousAuthorization) {
      fetchSensorDeviceRows();
    }
  },
);
</script>

<style scoped>
.sensor-data-table-card :deep(table),
.sensor-device-table-card :deep(table) {
  table-layout: fixed;
}
</style>
