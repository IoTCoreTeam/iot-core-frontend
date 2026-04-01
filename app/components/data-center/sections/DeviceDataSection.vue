<template>
  <section class="w-full">
    <a-tabs v-model:activeKey="activeTab" class="px-4 custom-tabs text-xs">
      <a-tab-pane key="gateway" tab="Gateway">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div
            :class="[
              'bg-white rounded border border-slate-200 overflow-hidden w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
              { hidden: !isGatewayFilterVisible },
            ]"
          >
            <div class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
                <p class="text-xs text-gray-500">Refine gateways.</p>
              </div>
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
                @click="toggleGatewayFilters"
              >
                Close
              </button>
            </div>
            <AdvancedFilterPanel
              :fields="gatewayFilterFields"
              :model-value="gatewayFilters"
              :is-loading="isGatewayLoading"
              apply-label="Apply"
              reset-label="Reset"
              @update:modelValue="handleGatewayFilterModelUpdate"
              @apply="applyGatewayFilters"
              @reset="resetGatewayFilters"
            />
          </div>

          <div
            :class="[
              'flex flex-col gap-4',
              isGatewayFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
            ]"
          >
            <DataBoxCard
              class="device-data-table-card"
              :is-loading="isGatewayLoading"
              :columns="gatewayColumns.length"
              :has-data="displayedGatewayRows.length > 0"
              :pagination="gatewayPagination"
              loading-text="Loading gateways..."
              @prev-page="prevGatewayPage"
              @next-page="nextGatewayPage"
              @change-per-page="changeGatewayPerPage"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <h3 class="text-gray-700 text-xs">Gateway</h3>
                  <button
                    type="button"
                    class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                    @click="toggleGatewayFilters"
                  >
                    {{ isGatewayFilterVisible ? "Hide Filters" : "Show Filters" }}
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <div class="relative">
                    <input
                      v-model="gatewaySearchKeyword"
                      type="text"
                      placeholder="Search gateway..."
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
                    :disabled="isGatewayLoading"
                    @click="refreshGatewayRows"
                  >
                    <BootstrapIcon
                      name="arrow-clockwise"
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': isGatewayLoading }"
                    />
                    {{ isGatewayLoading ? "Refreshing..." : "Refresh" }}
                  </button>
                </div>
              </template>

              <template #head>
                <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 text-left">
                  <th
                    v-for="column in gatewayColumns"
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
                  v-for="row in displayedGatewayRows"
                  :key="row.id"
                  :class="[
                    'transition-colors text-xs border-b border-gray-100 py-3',
                    isSoftDeleted(row) ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-gray-50',
                  ]"
                >
                  <td class="p-2 text-gray-700">{{ row.external_id || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.name || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.mac_address || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.ip_address || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ formatDateTime(row.created_at) }}</td>
                  <td class="p-2 text-center">
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                      title="View details"
                      @click.stop="openGatewayDetail(row)"
                    >
                      <BootstrapIcon name="info-circle" class="w-3 h-3" />
                      <span class="sr-only">View gateway details</span>
                    </button>
                  </td>
                </tr>
              </template>

              <template #empty>No gateways found.</template>
              <template #footer>
                <span>Showing {{ displayedGatewayRows.length }} entries on this page.</span>
                <span>
                  Total filtered:
                  <span class="text-gray-600 font-medium">{{ gatewayPagination.total }}</span>
                </span>
              </template>
            </DataBoxCard>
          </div>
        </div>
      </a-tab-pane>

      <a-tab-pane key="node" tab="Node">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div
            :class="[
              'bg-white rounded border border-slate-200 overflow-hidden w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
              { hidden: !isNodeFilterVisible },
            ]"
          >
            <div class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
                <p class="text-xs text-gray-500">Refine nodes.</p>
              </div>
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
                @click="toggleNodeFilters"
              >
                Close
              </button>
            </div>
            <AdvancedFilterPanel
              :fields="nodeFilterFields"
              :model-value="nodeFilters"
              :is-loading="isNodeLoading"
              apply-label="Apply"
              reset-label="Reset"
              @update:modelValue="handleNodeFilterModelUpdate"
              @apply="applyNodeFilters"
              @reset="resetNodeFilters"
            />
          </div>

          <div
            :class="[
              'flex flex-col gap-4',
              isNodeFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
            ]"
          >
            <DataBoxCard
              class="device-data-table-card"
              :is-loading="isNodeLoading"
              :columns="nodeColumns.length"
              :has-data="displayedNodeRows.length > 0"
              :pagination="nodePagination"
              loading-text="Loading nodes..."
              @prev-page="prevNodePage"
              @next-page="nextNodePage"
              @change-per-page="changeNodePerPage"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <h3 class="text-gray-700 text-xs">Node</h3>
                  <button
                    type="button"
                    class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                    @click="toggleNodeFilters"
                  >
                    {{ isNodeFilterVisible ? "Hide Filters" : "Show Filters" }}
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <div class="relative">
                    <input
                      v-model="nodeSearchKeyword"
                      type="text"
                      placeholder="Search node..."
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
                    :disabled="isNodeLoading"
                    @click="refreshNodeRows"
                  >
                    <BootstrapIcon
                      name="arrow-clockwise"
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': isNodeLoading }"
                    />
                    {{ isNodeLoading ? "Refreshing..." : "Refresh" }}
                  </button>
                </div>
              </template>

              <template #head>
                <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 text-left">
                  <th
                    v-for="column in nodeColumns"
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
                  v-for="row in displayedNodeRows"
                  :key="row.id"
                  :class="[
                    'transition-colors text-xs border-b border-gray-100 py-3',
                    isSoftDeleted(row) ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-gray-50',
                  ]"
                >
                  <td class="p-2 text-gray-700">{{ row.external_id || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.name || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ resolveGatewayId(row.gateway_id) }}</td>
                  <td class="p-2 text-gray-700">{{ row.type || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.mac_address || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ row.ip_address || "-" }}</td>
                  <td class="p-2 text-gray-700">{{ formatDateTime(row.created_at) }}</td>
                  <td class="p-2 text-center">
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-100"
                      title="View node details"
                      @click.stop="openNodeDetail(row)"
                    >
                      <BootstrapIcon name="info-circle" class="w-3 h-3" />
                      <span class="sr-only">View node details</span>
                    </button>
                  </td>
                </tr>
              </template>

              <template #empty>No nodes found.</template>
              <template #footer>
                <span>Showing {{ displayedNodeRows.length }} entries on this page.</span>
                <span>
                  Total filtered:
                  <span class="text-gray-600 font-medium">{{ nodePagination.total }}</span>
                </span>
              </template>
            </DataBoxCard>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
    <DeviceDataGatewayDetailModal
      :gateway="selectedGateway"
      :model-value="isGatewayDetailOpen"
      @update:modelValue="isGatewayDetailOpen = $event"
      @close="closeGatewayDetail"
    />
    <BaseNodeDetailModal
      :model-value="isNodeDetailOpen"
      :node="selectedNodeDetail"
      @update:modelValue="isNodeDetailOpen = $event"
      @close="closeNodeDetail"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { useAuthStore } from "~~/stores/auth";
import {
  buildUuidToExternalIdMap,
  fetchGatewayInventoryRows,
  fetchNodeInventoryRows,
  isSoftDeletedInventoryRow,
  type DeviceInventoryRow,
} from "@/composables/DeviceRegistration/useDeviceInventory";
import AdvancedFilterPanel, {
  type FilterFieldRow,
} from "@/components/common/AdvancedFilterPanel.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import DeviceDataGatewayDetailModal from "@/components/Modals/Devices/DeviceDataGatewayDetailModal.vue";
import BaseNodeDetailModal from "@/components/Modals/Devices/BaseNodeDetailModal.vue";
import type { NodeInfo } from "@/types/devices-control";

type DeviceDataRow = DeviceInventoryRow;

type GatewayFilterState = {
  external_id: string;
  name: string;
  mac_address: string;
  ip_address: string;
};

type NodeFilterState = {
  external_id: string;
  name: string;
  gateway_external_id: string;
  type: string;
  mac_address: string;
  ip_address: string;
};

const authStore = useAuthStore();
const activeTab = ref<"gateway" | "node">("gateway");

const gatewayRows = ref<DeviceDataRow[]>([]);
const gatewaySearchKeyword = ref("");
const isGatewayLoading = ref(false);
const isGatewayFilterVisible = ref(true);
const gatewayPagination = ref({ page: 1, perPage: 10, lastPage: 1, total: 0 });
const gatewayUuidToExternalIdMap = ref<Record<string, string>>({});
const isGatewayDetailOpen = ref(false);
const selectedGateway = ref<DeviceDataRow | null>(null);

const gatewayColumns: Array<{ key: string; label: string; width: string }> = [
  { key: "external_id", label: "Gateway ID", width: "18%" },
  { key: "name", label: "Name", width: "22%" },
  { key: "mac_address", label: "MAC", width: "18%" },
  { key: "ip_address", label: "IP", width: "14%" },
  { key: "created_at", label: "Created At", width: "18%" },
  { key: "actions", label: "Actions", width: "10%" },
];

const gatewayFilters = reactive<GatewayFilterState>({
  external_id: "",
  name: "",
  mac_address: "",
  ip_address: "",
});
const appliedGatewayFilters = ref<GatewayFilterState>({ ...gatewayFilters });

const gatewayFilterFields = computed<FilterFieldRow[]>(() => [
  [{ key: "external_id", label: "Gateway ID", type: "text", placeholder: "GW_001" }],
  [{ key: "name", label: "Name", type: "text", placeholder: "Main Gateway" }],
  [{ key: "mac_address", label: "MAC", type: "text", placeholder: "00:70:07:E5:F2:58" }],
  [{ key: "ip_address", label: "IP", type: "text", placeholder: "192.168.1.249" }],
]);

const filteredGatewayRows = computed(() => {
  const filters = appliedGatewayFilters.value;
  const keyword = normalizeText(gatewaySearchKeyword.value);

  return gatewayRows.value.filter((row) => {
    if (filters.external_id && !normalizeText(row.external_id).includes(normalizeText(filters.external_id))) {
      return false;
    }
    if (filters.name && !normalizeText(row.name).includes(normalizeText(filters.name))) {
      return false;
    }
    if (filters.mac_address && !normalizeText(row.mac_address).includes(normalizeText(filters.mac_address))) {
      return false;
    }
    if (filters.ip_address && !normalizeText(row.ip_address).includes(normalizeText(filters.ip_address))) {
      return false;
    }

    if (keyword) {
      const haystack = [row.external_id, row.name, row.mac_address, row.ip_address]
        .map((value) => normalizeText(value))
        .join(" ");
      if (!haystack.includes(keyword)) return false;
    }

    return true;
  });
});

const displayedGatewayRows = computed(() => {
  const start = (gatewayPagination.value.page - 1) * gatewayPagination.value.perPage;
  const end = start + gatewayPagination.value.perPage;
  return filteredGatewayRows.value.slice(start, end);
});

const nodeRows = ref<DeviceDataRow[]>([]);
const nodeSearchKeyword = ref("");
const isNodeLoading = ref(false);
const isNodeFilterVisible = ref(true);
const nodePagination = ref({ page: 1, perPage: 10, lastPage: 1, total: 0 });
const isNodeDetailOpen = ref(false);
const selectedNodeDetail = ref<NodeInfo | null>(null);

const nodeColumns: Array<{ key: string; label: string; width: string }> = [
  { key: "external_id", label: "Node ID", width: "14%" },
  { key: "name", label: "Name", width: "14%" },
  { key: "gateway_id", label: "Gateway ID", width: "14%" },
  { key: "type", label: "Type", width: "10%" },
  { key: "mac_address", label: "MAC", width: "14%" },
  { key: "ip_address", label: "IP", width: "12%" },
  { key: "created_at", label: "Created At", width: "14%" },
  { key: "actions", label: "Actions", width: "8%" },
];

const nodeFilters = reactive<NodeFilterState>({
  external_id: "",
  name: "",
  gateway_external_id: "",
  type: "",
  mac_address: "",
  ip_address: "",
});
const appliedNodeFilters = ref<NodeFilterState>({ ...nodeFilters });

const nodeFilterFields = computed<FilterFieldRow[]>(() => [
  [{ key: "external_id", label: "Node ID", type: "text", placeholder: "node_001" }],
  [{ key: "name", label: "Name", type: "text", placeholder: "Node 001" }],
  [{ key: "gateway_external_id", label: "Gateway ID", type: "text", placeholder: "GW_001" }],
  [
    {
      key: "type",
      label: "Type",
      type: "select",
      options: [
        { label: "All", value: "" },
        { label: "Node", value: "node" },
        { label: "Sensor", value: "sensor" },
        { label: "Controller", value: "controller" },
      ],
    },
  ],
  [{ key: "mac_address", label: "MAC", type: "text", placeholder: "24:6F:28:AA:BB:01" }],
  [{ key: "ip_address", label: "IP", type: "text", placeholder: "192.168.1.21" }],
]);

const filteredNodeRows = computed(() => {
  const filters = appliedNodeFilters.value;
  const keyword = normalizeText(nodeSearchKeyword.value);

  return nodeRows.value.filter((row) => {
    if (filters.external_id && !normalizeText(row.external_id).includes(normalizeText(filters.external_id))) {
      return false;
    }
    if (filters.name && !normalizeText(row.name).includes(normalizeText(filters.name))) {
      return false;
    }
    if (filters.gateway_external_id && !normalizeText(resolveGatewayId(row.gateway_id)).includes(normalizeText(filters.gateway_external_id))) {
      return false;
    }
    if (filters.type && normalizeText(row.type) !== normalizeText(filters.type)) {
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
        resolveGatewayId(row.gateway_id),
        row.type,
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

const displayedNodeRows = computed(() => {
  const start = (nodePagination.value.page - 1) * nodePagination.value.perPage;
  const end = start + nodePagination.value.perPage;
  return filteredNodeRows.value.slice(start, end);
});

function normalizeText(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function formatDateTime(value?: string | null) {
  return formatIotDateTime(value, { fallback: "-" });
}

function isSoftDeleted(row: DeviceDataRow) {
  return isSoftDeletedInventoryRow(row);
}

function resolveGatewayId(gatewayUuid?: string | null) {
  const key = String(gatewayUuid ?? "");
  if (!key) return "-";
  return gatewayUuidToExternalIdMap.value[key] ?? key;
}

function mapDeviceDataRowToNodeInfo(row: DeviceDataRow): NodeInfo {
  return {
    id: row.id,
    external_id: row.external_id ?? null,
    name: row.name ?? null,
    type: row.type ?? null,
    gateway_id: row.gateway_id ?? null,
    ip_address: row.ip_address ?? null,
    mac_address: row.mac_address ?? null,
    status: row.status ?? null,
    registered: row.registered ?? null,
    last_seen: row.last_seen ?? row.created_at ?? null,
  };
}

function recalculateGatewayPagination() {
  const total = filteredGatewayRows.value.length;
  gatewayPagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / gatewayPagination.value.perPage));
  gatewayPagination.value.lastPage = lastPage;
  if (gatewayPagination.value.page > lastPage) {
    gatewayPagination.value.page = lastPage;
  }
}

function recalculateNodePagination() {
  const total = filteredNodeRows.value.length;
  nodePagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / nodePagination.value.perPage));
  nodePagination.value.lastPage = lastPage;
  if (nodePagination.value.page > lastPage) {
    nodePagination.value.page = lastPage;
  }
}

function handleGatewayFilterModelUpdate(value: Record<string, string>) {
  Object.assign(gatewayFilters, value);
}

function applyGatewayFilters(payload?: Record<string, string>) {
  appliedGatewayFilters.value = {
    ...gatewayFilters,
    ...(payload ?? {}),
  };
  gatewayPagination.value.page = 1;
}

function resetGatewayFilters() {
  gatewayFilters.external_id = "";
  gatewayFilters.name = "";
  gatewayFilters.mac_address = "";
  gatewayFilters.ip_address = "";
  appliedGatewayFilters.value = { ...gatewayFilters };
  gatewayPagination.value.page = 1;
}

function toggleGatewayFilters() {
  isGatewayFilterVisible.value = !isGatewayFilterVisible.value;
}

function refreshGatewayRows() {
  if (isGatewayLoading.value) return;
  fetchGatewayRows();
}

function openGatewayDetail(row: DeviceDataRow) {
  selectedGateway.value = row;
  isGatewayDetailOpen.value = true;
}

function closeGatewayDetail() {
  isGatewayDetailOpen.value = false;
  selectedGateway.value = null;
}

function prevGatewayPage() {
  if (gatewayPagination.value.page > 1) gatewayPagination.value.page -= 1;
}

function nextGatewayPage() {
  if (gatewayPagination.value.page < gatewayPagination.value.lastPage) gatewayPagination.value.page += 1;
}

function changeGatewayPerPage(value: number) {
  if (value <= 0) return;
  gatewayPagination.value.perPage = value;
}

function handleNodeFilterModelUpdate(value: Record<string, string>) {
  Object.assign(nodeFilters, value);
}

function applyNodeFilters(payload?: Record<string, string>) {
  appliedNodeFilters.value = {
    ...nodeFilters,
    ...(payload ?? {}),
  };
  nodePagination.value.page = 1;
}

function resetNodeFilters() {
  nodeFilters.external_id = "";
  nodeFilters.name = "";
  nodeFilters.gateway_external_id = "";
  nodeFilters.type = "";
  nodeFilters.mac_address = "";
  nodeFilters.ip_address = "";
  appliedNodeFilters.value = { ...nodeFilters };
  nodePagination.value.page = 1;
}

function toggleNodeFilters() {
  isNodeFilterVisible.value = !isNodeFilterVisible.value;
}

function refreshNodeRows() {
  if (isNodeLoading.value) return;
  fetchNodeRows();
}

function openNodeDetail(row: DeviceDataRow) {
  selectedNodeDetail.value = mapDeviceDataRowToNodeInfo(row);
  isNodeDetailOpen.value = true;
}

function closeNodeDetail() {
  isNodeDetailOpen.value = false;
  selectedNodeDetail.value = null;
}

function prevNodePage() {
  if (nodePagination.value.page > 1) nodePagination.value.page -= 1;
}

function nextNodePage() {
  if (nodePagination.value.page < nodePagination.value.lastPage) nodePagination.value.page += 1;
}

function changeNodePerPage(value: number) {
  if (value <= 0) return;
  nodePagination.value.perPage = value;
}

async function fetchGatewayRows() {
  if (!import.meta.client) return;

  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    gatewayRows.value = [];
    gatewayUuidToExternalIdMap.value = {};
    recalculateGatewayPagination();
    return;
  }

  isGatewayLoading.value = true;
  try {
    const mapped = await fetchGatewayInventoryRows(authorization);
    gatewayUuidToExternalIdMap.value = buildUuidToExternalIdMap(mapped);
    gatewayRows.value = mapped;
    recalculateGatewayPagination();
  } catch (error) {
    console.error("Failed to fetch gateways:", error);
    gatewayRows.value = [];
    gatewayUuidToExternalIdMap.value = {};
    recalculateGatewayPagination();
  } finally {
    isGatewayLoading.value = false;
  }
}

async function fetchNodeRows() {
  if (!import.meta.client) return;

  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    nodeRows.value = [];
    recalculateNodePagination();
    return;
  }

  isNodeLoading.value = true;
  try {
    const [nodes, gateways] = await Promise.all([
      fetchNodeInventoryRows(authorization),
      fetchGatewayInventoryRows(authorization),
    ]);
    gatewayUuidToExternalIdMap.value = buildUuidToExternalIdMap(gateways);
    nodeRows.value = nodes;

    recalculateNodePagination();
  } catch (error) {
    console.error("Failed to fetch nodes:", error);
    nodeRows.value = [];
    recalculateNodePagination();
  } finally {
    isNodeLoading.value = false;
  }
}

onMounted(() => {
  fetchGatewayRows();
  fetchNodeRows();
});

watch(
  filteredGatewayRows,
  () => {
    recalculateGatewayPagination();
  },
  { immediate: true },
);

watch(
  filteredNodeRows,
  () => {
    recalculateNodePagination();
  },
  { immediate: true },
);

watch(
  () => gatewayPagination.value.perPage,
  () => {
    gatewayPagination.value.page = 1;
    recalculateGatewayPagination();
  },
);

watch(
  () => nodePagination.value.perPage,
  () => {
    nodePagination.value.page = 1;
    recalculateNodePagination();
  },
);

watch(gatewaySearchKeyword, () => {
  gatewayPagination.value.page = 1;
});

watch(nodeSearchKeyword, () => {
  nodePagination.value.page = 1;
});

watch(
  () => authStore.authorizationHeader,
  (authorization, previousAuthorization) => {
    if (authorization && authorization !== previousAuthorization) {
      fetchGatewayRows();
      fetchNodeRows();
    }
  },
);
</script>

<style scoped>
.device-data-table-card :deep(table) {
  table-layout: fixed;
}
</style>
