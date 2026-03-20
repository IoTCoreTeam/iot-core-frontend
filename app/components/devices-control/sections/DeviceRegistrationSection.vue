<template>
  <section class="min-h-screen">
    <a-tabs v-model:activeKey="activeDeviceTab" class="px-4 custom-tabs text-xs">
      <a-tab-pane v-for="tab in deviceTabs" :key="tab.key" :tab="tab.label">
        <div v-if="tab.key === activeDeviceTab" class="pb-2">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
            <div
              :class="[
                'bg-white rounded border border-slate-200 overflow-hidden transition-all duration-200 w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
                { hidden: !isDeviceFilterVisible },
              ]"
            >
              <div
                class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between"
              >
                <div>
                  <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
                  <p class="text-xs text-gray-500">Refine the devices list.</p>
                </div>
                <button
                  type="button"
                  class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
                  @click="toggleDeviceFilters"
                >
                  Close
                </button>
              </div>
              <AdvancedFilterPanel
                :fields="deviceFilterFields"
                :model-value="deviceFilters"
                :is-loading="isDeviceLoading"
                apply-label="Apply"
                reset-label="Reset"
                @update:modelValue="handleDeviceFilterModelUpdate"
                @apply="applyDeviceFilters"
                @reset="resetDeviceFilters"
              />
            </div>

            <div
              :class="[
                'flex flex-col gap-4',
                isDeviceFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
              ]"
            >
              <SingleMetricChart
                v-if="activeDeviceTab === 'nodes'"
                class="w-full"
                :selected-metric-key="selectedNodeMetricKey"
                :selected-timeframe="selectedNodeTimeframe"
                :selected-node-id="selectedNodeId"
                @update:selected-metric-key="handleNodeMetricChange"
                @update:selected-node-id="handleNodeIdChange"
              />

              <DataBoxCard
                class="lg:self-start device-table"
                :key="deviceTableKey"
                :is-loading="isDeviceLoading"
                :columns="deviceTableColumnDefinitions.length"
                :has-data="displayedDeviceRows.length > 0"
                :pagination="devicePagination"
                :loading-text="deviceLoadingText"
                @prev-page="prevDevicePage"
                @next-page="nextDevicePage"
                @change-per-page="changeDevicePerPage"
              >
                <template #header>
                  <div class="flex items-center gap-2">
                    <h3 class="font-semibold text-gray-700 text-xs">
                      {{ currentDeviceTab.label }}
                    </h3>
                    <button
                      type="button"
                      class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                      @click="toggleDeviceFilters"
                    >
                      {{
                        isDeviceFilterVisible ? "Hide Filters" : "Show Filters"
                      }}
                    </button>
                  </div>

                  <div class="flex flex-wrap items-center gap-2">
                    <div class="relative">
                      <input
                        v-model="deviceSearchKeyword"
                        type="text"
                        placeholder="Search device, batch, note..."
                        class="pl-5 pr-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white w-60 text-xs cursor-text"
                      />
                      <BootstrapIcon
                        name="search"
                        class="absolute left-1 top-1.5 w-3 h-3 text-gray-400"
                      />
                    </div>

                    <button
                      @click="refreshDevices"
                      class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-3 py-1 text-xs border border-gray-300"
                      :disabled="isDeviceLoading"
                    >
                      <BootstrapIcon
                        name="arrow-clockwise"
                        class="w-3 h-3 mr-1"
                        :class="{ 'animate-spin': isDeviceLoading }"
                      />
                      {{ isDeviceLoading ? "Refreshing..." : "Refresh" }}
                    </button>
                    <button
                      type="button"
                      class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs"
                      :disabled="isDeviceLoading || !filteredDeviceRows.length"
                      @click="exportDevices"
                    >
                      <BootstrapIcon
                        name="file-earmark-arrow-down"
                        class="w-3 h-3 mr-1"
                      />
                      Export
                    </button>
                  </div>
                </template>

                <template #head>
                  <tr
                    class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600"
                  >
                    <th
                      v-for="column in deviceTableColumnDefinitions"
                      :key="column.key"
                      class="px-2 py-2 font-normal text-gray-600 text-xs tracking-wide"
                      :class="column.key === 'actions' ? 'text-center' : 'text-left'"
                      :style="{ width: column.width }"
                    >
                      {{ column.label }}
                    </th>
                  </tr>
                </template>
                <template #default>
                  <template v-for="row in displayedDeviceRows" :key="row.id">
                    <tr
                      :class="[
                        'transition-colors text-xs align-middle border-b border-gray-100 h-12',
                        'hover:bg-slate-50',
                      ]"
                    >
                      <td
                        v-for="(column, columnIndex) in deviceTableColumnDefinitions"
                        :key="column.key"
                        class="px-2 py-2 align-middle"
                        :class="column.key === 'actions' ? 'text-center' : ''"
                        :style="{ width: getColumnWidth(columnIndex) }"
                      >
                        <template v-if="column.key === 'id'">
                          <div class="text-xs whitespace-nowrap">{{ row.id }}</div>
                        </template>
                        <template v-else-if="column.key === 'name'">
                          <p class="text-xs text-gray-700 truncate">{{ row.name }}</p>
                        </template>
                        <template v-else-if="column.key === 'type'">
                          <p class="text-xs capitalize">{{ row.type || "N/A" }}</p>
                        </template>
                        <template v-else-if="column.key === 'ip'">
                          <p class="text-xs">{{ row.ip || "N/A" }}</p>
                        </template>
                        <template v-else-if="column.key === 'mac'">
                          <p class="text-xs truncate">{{ row.mac || "N/A" }}</p>
                        </template>
                        <template v-else-if="column.key === 'status'">
                          <div
                            class="text-xs font-semibold uppercase"
                            :class="statusTextColorClass(row.status)"
                          >
                            {{ formatDeviceStatus(row.status) }}
                          </div>
                        </template>
                        <template v-else-if="column.key === 'registered'">
                          <div
                            class="text-xs font-semibold uppercase"
                            :class="registrationTextColorClass(row.registered)"
                          >
                            {{ formatRegistrationStatus(row.registered) }}
                          </div>
                        </template>
                        <template v-else-if="column.key === 'actions'">
                          <div class="flex items-center justify-center gap-1">
                            <button
                              v-if="
                                (activeDeviceTab === 'gateways' ||
                                  (activeDeviceTab === 'registered' &&
                                    row.resourceType === 'gateway')) &&
                                !isUnactiveStatus(row.status)
                              "
                              type="button"
                              :class="infoButtonClass"
                              title="View details"
                              @click.stop="openGatewayDetail(row)"
                            >
                              <BootstrapIcon name="info-circle" class="w-3 h-3" />
                              <span class="sr-only">Details</span>
                            </button>
                            <button
                              v-if="
                                activeDeviceTab === 'nodes' ||
                                (activeDeviceTab === 'registered' &&
                                  row.resourceType === 'node')
                              "
                              type="button"
                              :class="infoButtonClass"
                              title="View node details"
                              @click.stop="openNodeDetail(row)"
                            >
                              <BootstrapIcon name="info-circle" class="w-3 h-3" />
                              <span class="sr-only">Node Details</span>
                            </button>
                            <button
                              v-if="
                                activeDeviceTab === 'nodes' &&
                                isControlNode(row)
                              "
                              type="button"
                              class="w-8 h-8 inline-flex items-center justify-center rounded border cursor-pointer"
                              :class="
                                row.registered === false
                                  ? 'border-gray-200 text-gray-400 bg-gray-50 hover:bg-gray-100'
                                  : 'border-blue-200 text-blue-600 hover:bg-blue-50'
                              "
                              title="Add control url"
                              @click.stop="handleControlUrlClick(row)"
                            >
                              <BootstrapIcon name="link-45deg" class="w-3 h-3" />
                              <span class="sr-only">Add Control URL</span>
                            </button>
                            <template
                              v-if="
                                activeDeviceTab !== 'registered' &&
                                row.registered === false
                              "
                            >
                              <button
                                type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded border cursor-pointer"
                                :class="[
                                  activeDeviceTab === 'gateways'
                                    ? 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                    : isGatewayRegisteredForRow(row)
                                      ? 'border-blue-200 text-blue-600 hover:bg-blue-50'
                                      : 'border-gray-200 text-gray-400 bg-gray-50',
                                ]"
                                title="Register Device"
                                @click.stop="handleNodeEnrollClick(row)"
                              >
                                <BootstrapIcon name="plus-lg" class="w-3 h-3" />
                                <span clascs="sr-only">Register</span>
                              </button>
                            </template>
                            <template v-else-if="activeDeviceTab !== 'registered'">
                              <button
                                type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                :class="{
                                  'opacity-50 cursor-not-allowed':
                                    isDeactivatingDevice(row.id),
                                }"
                                :disabled="isDeactivatingDevice(row.id)"
                                :aria-busy="isDeactivatingDevice(row.id)"
                                title="Deactivate Device"
                                @click.stop="handleDeactivateSensor(row)"
                              >
                                <BootstrapIcon name="slash-circle" class="w-3 h-3" />
                                <span class="sr-only">Deactivate</span>
                              </button>
                            </template>
                            <template v-else>
                              <button
                                type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                                :class="{
                                  'opacity-50 cursor-not-allowed':
                                    isDeletingRegisteredDevice(row),
                                }"
                                :disabled="isDeletingRegisteredDevice(row)"
                                :aria-busy="isDeletingRegisteredDevice(row)"
                                title="Delete Registered Device"
                                @click.stop="handleDeleteRegisteredDevice(row)"
                              >
                                <BootstrapIcon name="trash" class="w-3 h-3" />
                                <span class="sr-only">Delete</span>
                              </button>
                            </template>
                          </div>
                        </template>
                      </td>
                    </tr>
                    <transition name="inline-slide">
                      <tr
                        v-if="showControlUrlInline(row)"
                        class="bg-white border-b border-blue-100"
                      >
                        <td
                          :colspan="deviceTableColumnDefinitions.length"
                          class="p-3"
                        >
                          <div class="flex flex-wrap items-end gap-3 text-xs">
                          <div class="w-full">
                            <p class="text-[11px] text-blue-600 font-semibold">
                              Saved control URLs
                            </p>
                            <p
                              v-if="controlUrlLoadError"
                              class="text-[11px] text-red-500"
                            >
                              {{ controlUrlLoadError }}
                            </p>
                          </div>
                          <div
                            v-if="isLoadingControlUrls"
                            class="w-full text-[11px] text-gray-500"
                          >
                            Loading control urls...
                          </div>
                          <div
                            v-else-if="!controlUrlItems.length"
                            class="w-full text-[11px] text-gray-500"
                          >
                            No control urls yet.
                          </div>
                          <div
                            v-for="item in controlUrlItems"
                            :key="item.id"
                            class="flex flex-wrap items-end gap-3 w-full py-2 border-b border-slate-100"
                          >
                            <div class="flex flex-col gap-1">
                              <label class="text-[10px] text-gray-500">Name</label>
                              <input
                                v-model="item.name"
                                type="text"
                                readonly
                                class="border-0 border-b border-slate-300 rounded-none px-0 py-1 text-xs w-40 bg-transparent focus:outline-none focus:ring-0 focus:border-blue-500"
                              />
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="text-[10px] text-gray-500">URL</label>
                              <input
                                v-model="item.url"
                                type="text"
                                placeholder="e.g. /pump"
                                class="border-0 border-b border-slate-300 rounded-none px-0 py-1 text-xs w-80 bg-transparent focus:outline-none focus:ring-0 focus:border-blue-500"
                              />
                            </div>
                            <div class="flex flex-col gap-1">
                              <label class="text-[10px] text-gray-500">Input type</label>
                              <input
                                v-model="item.input_type"
                                type="text"
                                readonly
                                disabled
                                class="border-0 border-b border-slate-300 rounded-none px-0 py-1 text-xs w-28 bg-transparent text-gray-400 cursor-not-allowed focus:outline-none focus:ring-0 focus:border-blue-500"
                              />
                            </div>
                            <div class="flex items-center gap-2">
                              <button
                                type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50"
                                title="Update control url"
                                :disabled="isSavingControlUrl || !item.url"
                                @click="handleUpdateControlUrl(item)"
                              >
                                <BootstrapIcon
                                  name="pencil-square"
                                  class="w-3 h-3"
                                />
                                <span class="sr-only">Update</span>
                              </button>
                              <button
                                type="button"
                                class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
                                title="Delete control url"
                                :disabled="false"
                                @click="handleDeleteControlUrl(item)"
                              >
                                <BootstrapIcon name="trash" class="w-3 h-3" />
                                <span class="sr-only">Delete</span>
                              </button>
                            </div>
                          </div>
                          </div>
                        </td>
                      </tr>
                    </transition>
                  </template>
                </template>
                <template #empty> No devices to display yet. </template>

                <template #footer>
                  <span
                    >Showing {{ displayedDeviceRows.length }} entries on this
                    page.</span
                  >
                  <span
                    >Total filtered:
                    <span class="text-gray-600 font-medium">{{
                      filteredDeviceRows.length
                    }}</span></span
                  >
                </template>
              </DataBoxCard>
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
    <GatewayDetailModal
      v-if="isGatewayDetailOpen"
      :gateway="selectedGateway"
      :nodes="connectedGatewayNodes"
      @close="closeGatewayDetail"
    />
    <BaseNodeDetailModal
      v-if="isNodeDetailOpen"
      :model-value="isNodeDetailOpen"
      :node="selectedNodeDetail"
      @update:modelValue="isNodeDetailOpen = $event"
      @close="closeNodeDetail"
    />
  </section>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
} from "vue";
import { message } from "ant-design-vue";
import AdvancedFilterPanel from "@/components/common/AdvancedFilterPanel.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import SingleMetricChart from "@/components/SingleMetricChart.vue";
import { useMetrics } from "@/composables/useMetrics";
import type {
  DeviceRow,
  DeviceTab,
  DeviceTabKey,
  Section,
  NodeInfo,
  ControllerState,
} from "@/types/devices-control";
import type { TimeframeKey } from "@/types/dashboard";
import { apiConfig } from "~~/config/api";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { useRegisterDevice } from "@/composables/DeviceRegistration/RegisterDevice";
import { useDeviceDeactivation } from "@/composables/DeviceRegistration/DeactiveDevice";
import { useAuthStore } from "~~/stores/auth";
import { useHandleUrlControl } from "@/composables/DeviceRegistration/handleUrlControl";
import {
  createNodeCollectionsStore,
  type GatewayEventPayload,
} from "@/composables/DeviceRegistration/SSEHandle";
import { useLoadDataRow } from "@/composables/DeviceRegistration/loadDataRow";
import { useDeviceFilter } from "@/composables/DeviceRegistration/DeviceFilter";
import GatewayDetailModal from "@/components/Modals/Devices/GatewayDetailModal.vue";
import BaseNodeDetailModal from "@/components/Modals/Devices/BaseNodeDetailModal.vue";

defineProps<{
  section: Section;
}>();

const gatewayRows = ref<DeviceRow[]>([]);
const nodeRows = ref<DeviceRow[]>([]);
const registeredRows = ref<DeviceRow[]>([]);
const controllerStatesByNode = ref<Record<string, ControllerState[]>>({});
const deviceTableKey = ref(0);
const isGatewayDetailOpen = ref(false);
const selectedGateway = ref<DeviceRow | null>(null);
const isNodeDetailOpen = ref(false);
const selectedNodeDetail = ref<NodeInfo | null>(null);

const { metrics, fetchMetrics } = useMetrics();
const selectedNodeMetricKey = ref<string>("");
const selectedNodeTimeframe = ref<TimeframeKey>("second");
const selectedNodeId = ref<string | undefined>(undefined);

const infoButtonClass =
  "w-8 h-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-600 cursor-pointer transition-colors duration-150 hover:bg-gray-50 hover:text-gray-700 hover:border-gray-300";

function handleNodeMetricChange(value: string) {
  selectedNodeMetricKey.value = value;
}

function handleNodeIdChange(value: string) {
  selectedNodeId.value = value;
}

const { isDeactivatingDevice, deactivateDevice } = useDeviceDeactivation();
const { registerDevice } = useRegisterDevice();
const authStore = useAuthStore();
const gatewayIdMap = ref<Record<string, string>>({});
const isGatewayIdMapLoading = ref(false);
const nodeIdMap = ref<Record<string, string>>({});
const isNodeIdMapLoading = ref(false);
const deletingRegisteredDeviceMap = ref<Record<string, boolean>>({});

function getRegisteredDeviceKey(row: DeviceRow) {
  return `${row.resourceType ?? "unknown"}:${row.id}`;
}

function isDeletingRegisteredDevice(row: DeviceRow) {
  return Boolean(deletingRegisteredDeviceMap.value[getRegisteredDeviceKey(row)]);
}

function setDeletingRegisteredDevice(row: DeviceRow, value: boolean) {
  deletingRegisteredDeviceMap.value = {
    ...deletingRegisteredDeviceMap.value,
    [getRegisteredDeviceKey(row)]: value,
  };
}

function normalizeIndexRows(payload: any) {
  return Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
}

async function fetchAllPages(endpoint: string, authorization: string) {
  const allRows: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const separator = endpoint.includes("?") ? "&" : "?";
    const pagedEndpoint = `${endpoint}${separator}per_page=200&page=${page}`;
    const response = await fetch(pagedEndpoint, {
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load registered devices.");
    }

    allRows.push(...normalizeIndexRows(payload));
    lastPage = Number(payload?.last_page ?? payload?.meta?.last_page ?? 1);
    page += 1;
  } while (page <= lastPage);

  return allRows;
}

function mapRegisteredGatewayRow(row: any): DeviceRow {
  const externalId = row?.external_id ? String(row.external_id) : String(row?.id ?? "");
  return {
    id: externalId,
    externalId,
    resourceType: "gateway",
    name: row?.name ?? `Gateway ${externalId}`,
    ip: row?.ip_address ?? null,
    mac: row?.mac_address ?? null,
    type: "gateway",
    status: row?.status === "online" ? "online" : "offline",
    registered: true,
    lastSeen: row?.last_seen ?? null,
  };
}

function mapRegisteredNodeRow(row: any): DeviceRow {
  const externalId = row?.external_id ? String(row.external_id) : String(row?.id ?? "");
  return {
    id: externalId,
    externalId,
    resourceType: "node",
    name: row?.name ?? `Node ${externalId}`,
    gatewayId: row?.gateway?.external_id ?? row?.gateway_id ?? null,
    ip: row?.ip_address ?? null,
    mac: row?.mac_address ?? null,
    type: row?.type ?? null,
    status: row?.status === "online" ? "online" : "offline",
    registered: true,
    lastSeen: row?.last_seen ?? null,
  };
}

async function loadRegisteredDevices() {
  if (!import.meta.client) return;
  if (!apiConfig.controlModule) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) return;

  isDeviceLoading.value = true;
  try {
    const base = apiConfig.controlModule.replace(/\/$/, "");
    const [gatewayPayload, nodePayload] = await Promise.all([
      fetchAllPages(`${base}/gateways`, authorization),
      fetchAllPages(`${base}/nodes?include=gateway`, authorization),
    ]);
    const mappedGateways = gatewayPayload.map(mapRegisteredGatewayRow);
    const mappedNodes = nodePayload.map(mapRegisteredNodeRow);
    registeredRows.value = [...mappedGateways, ...mappedNodes].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }),
    );
  } catch (error: any) {
    console.error("Failed to load registered devices", error);
    registeredRows.value = [];
    message.error(error?.message ?? "Failed to load registered devices.");
  } finally {
    isDeviceLoading.value = false;
  }
}

async function loadGatewayIdMap() {
  if (!import.meta.client) return;
  if (isGatewayIdMapLoading.value) return;
  if (!apiConfig.controlModule) return;

  const authorization = authStore.authorizationHeader;
  if (!authorization) return;

  isGatewayIdMapLoading.value = true;
  try {
    const endpoint = `${apiConfig.controlModule.replace(/\/$/, "")}/gateways`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load gateways.");
    }

    const rows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const map: Record<string, string> = {};
    rows.forEach((row: any) => {
      if (row?.external_id && row?.id) {
        map[row.external_id] = row.id;
      }
    });
    gatewayIdMap.value = map;
  } catch (error) {
    console.error("Failed to load gateway IDs", error);
  } finally {
    isGatewayIdMapLoading.value = false;
  }
}

async function loadNodeIdMap() {
  if (!import.meta.client) return;
  if (isNodeIdMapLoading.value) return;
  if (!apiConfig.controlModule) return;

  const authorization = authStore.authorizationHeader;
  if (!authorization) return;

  isNodeIdMapLoading.value = true;
  try {
    const endpoint = `${apiConfig.controlModule.replace(/\/$/, "")}/nodes`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load nodes.");
    }

    const rows = Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload)
        ? payload
        : [];
    const map: Record<string, string> = {};
    rows.forEach((row: any) => {
      if (row?.external_id && row?.id) {
        map[row.external_id] = row.id;
      }
    });
    nodeIdMap.value = map;
  } catch (error) {
    console.error("Failed to load node IDs", error);
  } finally {
    isNodeIdMapLoading.value = false;
  }
}

function triggerDeviceTableReload(reason: "activate" | "deactivate") {
  if (isDeviceLoading.value) return;
  isDeviceLoading.value = true;
  deviceLoadingText.value =
    reason === "activate"
      ? "Activating device... This may take up to 5 seconds."
      : "Deactivating device... This may take up to 5 seconds.";
  deviceTableKey.value += 1;
  if (deviceRefreshTimeout) {
    clearTimeout(deviceRefreshTimeout);
  }
  deviceRefreshTimeout = setTimeout(() => {
    isDeviceLoading.value = false;
    deviceLoadingText.value = "Loading devices...";
  }, 5000);
}

async function handleDeactivateSensor(row: DeviceRow) {
  if (isDeactivatingDevice(row.id)) {
    return;
  }

  const success = await deactivateDevice(row, activeDeviceTab.value);
  if (success) {
    row.status = "offline";
    row.registered = false;
    triggerDeviceTableReload("deactivate");
  }
}

async function handleDeleteRegisteredDevice(row: DeviceRow) {
  if (!apiConfig.controlModule) {
    message.warning("Control module endpoint is not configured.");
    return;
  }
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.warning("Missing authentication token.");
    return;
  }
  if (!row?.id) {
    message.warning("Missing device id.");
    return;
  }
  if (isDeletingRegisteredDevice(row)) {
    return;
  }

  const base = apiConfig.controlModule.replace(/\/$/, "");
  const encodedId = encodeURIComponent(row.id);
  const endpoint =
    row.resourceType === "gateway"
      ? `${base}/gateways/${encodedId}/deactivate`
      : `${base}/nodes/${encodedId}/deactivate`;
  const method = "POST";

  setDeletingRegisteredDevice(row, true);
  try {
    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to delete registered device.");
    }

    message.success(payload?.message ?? "Registered device deleted.");
    registeredRows.value = registeredRows.value.filter(
      (item) => getRegisteredDeviceKey(item) !== getRegisteredDeviceKey(row),
    );
  } catch (error: any) {
    console.error("Failed to delete registered device", error);
    message.error(error?.message ?? "Unable to delete registered device.");
  } finally {
    setDeletingRegisteredDevice(row, false);
  }
}

async function handleEnroll(row: DeviceRow) {
  if (activeDeviceTab.value !== "gateways" && !row.gatewayId) {
    message.warning("Gateway ID is missing for this node.");
    return;
  }

  const gatewayIp =
    activeDeviceTab.value === "gateways" ? null : getGatewayIpForRow(row);
  if (activeDeviceTab.value !== "gateways" && !gatewayIp) {
    message.warning("Gateway IP is missing for this node.");
    return;
  }

  let gatewayUuid: string | null = null;
  if (activeDeviceTab.value !== "gateways") {
    const gatewayExternalId = row.gatewayId ?? null;
    if (!gatewayExternalId) {
      message.warning("Gateway ID is missing for this node.");
      return;
    }

    if (!gatewayIdMap.value[gatewayExternalId]) {
      await loadGatewayIdMap();
    }
    gatewayUuid = gatewayIdMap.value[gatewayExternalId] ?? null;
    if (!gatewayUuid) {
      message.warning(
        `Gateway ${gatewayExternalId} not found in Control Module.`,
      );
      return;
    }
  }

  const success = await registerDevice(row, {
    tab: activeDeviceTab.value,
    gatewayIp,
    gatewayId: gatewayUuid,
  });
  if (success) {
    triggerDeviceTableReload("activate");
  }
}

function getGatewayIdFromRow(row: DeviceRow) {
  return row.gatewayId ?? null;
}

function getGatewayIpForRow(row: DeviceRow) {
  const gatewayId = getGatewayIdFromRow(row);
  if (!gatewayId) return null;
  const gateway = gatewayRows.value.find((item) => item.id === gatewayId);
  return gateway?.ip ?? null;
}

function isGatewayRegisteredForRow(row: DeviceRow) {
  const gatewayId = getGatewayIdFromRow(row);
  if (!gatewayId) return false;
  const gateway = gatewayRows.value.find((item) => item.id === gatewayId);
  return gateway?.registered === true;
}

function handleNodeEnrollClick(row: DeviceRow) {
  if (activeDeviceTab.value === "gateways") {
    return handleEnroll(row);
  }
  if (!isGatewayRegisteredForRow(row)) {
    const gatewayId = getGatewayIdFromRow(row);
    message.info(
      gatewayId
        ? `Please register gateway ${gatewayId} first.`
        : "Please register the node's gateway first.",
    );
      return;
    }
  return handleEnroll(row);
}

function handleReapprove(row: DeviceRow) {
  message.info("Reapproval logic will be added later.");
}

function openGatewayDetail(row: DeviceRow) {
  if (
    activeDeviceTab.value !== "gateways" &&
    !(activeDeviceTab.value === "registered" && row.resourceType === "gateway")
  ) {
    return;
  }
  selectedGateway.value = row;
  isGatewayDetailOpen.value = true;
}

function closeGatewayDetail() {
  isGatewayDetailOpen.value = false;
  selectedGateway.value = null;
}

function openNodeDetail(row: DeviceRow) {
  selectedNodeDetail.value = mapDeviceRowToNodeInfo(row);
  isNodeDetailOpen.value = true;
}

function closeNodeDetail() {
  isNodeDetailOpen.value = false;
  selectedNodeDetail.value = null;
}

const nodeCollectionsStore = createNodeCollectionsStore();
let gatewayEventSource: EventSource | null = null;

const ONLINE_DEVICE_STATUSES = new Set<DeviceRow["status"]>(["online"]);
const {
  updateGatewayFromPayload,
  startDeviceStatusPolling,
  stopDeviceStatusPolling,
} = useLoadDataRow({
  gatewayRows,
  nodeRows,
});

let deviceRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

const deviceTabs = computed<DeviceTab[]>(() => [
  { key: "gateways", label: "Gateways", rows: gatewayRows.value },
  { key: "nodes", label: "Nodes", rows: nodeRows.value },
  { key: "registered", label: "Registered Device", rows: registeredRows.value },
]);

const defaultDeviceTab = computed(() => deviceTabs.value[0]!);
const activeDeviceTab = ref<DeviceTabKey>("gateways");
const isDeviceLoading = ref(false);
const devicePagination = ref({ page: 1, perPage: 5, lastPage: 1, total: 0 });
const deviceLoadingText = ref("Loading devices...");
const gatewayTableColumns: Array<{ key: string; label: string; width: string }> = [
  { key: "id", label: "ID", width: "10%" },
  { key: "name", label: "Name", width: "18%" },
  { key: "ip", label: "IP", width: "12%" },
  { key: "mac", label: "MAC", width: "16%" },
  { key: "status", label: "Status", width: "10%" },
  { key: "registered", label: "Registered", width: "10%" },
  { key: "actions", label: "Actions", width: "12%" },
];
const nodeTableColumns: Array<{ key: string; label: string; width: string }> = [
  { key: "id", label: "ID", width: "auto" },
  { key: "name", label: "Name", width: "auto" },
  { key: "type", label: "Type", width: "auto" },
  { key: "mac", label: "MAC", width: "auto" },
  { key: "status", label: "Status", width: "auto" },
  { key: "registered", label: "Registered", width: "auto" },
  { key: "actions", label: "Actions", width: "auto" },
];
const registeredDeviceTableColumns: Array<{
  key: string;
  label: string;
  width: string;
}> = [
  { key: "id", label: "ID", width: "auto" },
  { key: "name", label: "Name", width: "auto" },
  { key: "type", label: "Type", width: "auto" },
  { key: "ip", label: "IP", width: "auto" },
  { key: "mac", label: "MAC", width: "auto" },
  { key: "status", label: "Status", width: "auto" },
  { key: "actions", label: "Actions", width: "auto" },
];
const {
  controlUrlItems,
  controlUrlLoadError,
  activeControlUrlNodeId,
  isControlNode,
  isLoadingControlUrls,
  isSavingControlUrl,
  handleControlUrlClick,
  showControlUrlInline,
  handleUpdateControlUrl,
  handleDeleteControlUrl,
  syncControlUrlItemsFromControllerStates,
} = useHandleUrlControl({
  activeDeviceTab,
  nodeIdMap,
  loadNodeIdMap,
  isGatewayRegisteredForRow,
  getGatewayIdFromRow,
  controllerStatesByNode,
});
const deviceTableColumnDefinitions = computed(() => {
  if (activeDeviceTab.value === "gateways") return gatewayTableColumns;
  if (activeDeviceTab.value === "nodes") return nodeTableColumns;
  return registeredDeviceTableColumns;
});
const deviceTableColumns = computed(() =>
  deviceTableColumnDefinitions.value.map((column) => column.label),
);
const {
  deviceSearchKeyword,
  isDeviceFilterVisible,
  deviceFilters,
  appliedDeviceFilters,
  deviceFilterFields,
  filterDeviceRows,
  handleDeviceFilterModelUpdate,
  applyDeviceFilters: applyDeviceFiltersBase,
  resetDeviceFilters: resetDeviceFiltersBase,
  toggleDeviceFilters,
} = useDeviceFilter();

const currentDeviceTab = computed(
  () =>
    deviceTabs.value.find((tab) => tab.key === activeDeviceTab.value) ??
    defaultDeviceTab.value,
);
const currentDeviceRows = computed<DeviceRow[]>(
  () => currentDeviceTab.value.rows,
);
const filteredDeviceRows = computed<DeviceRow[]>(() =>
  filterDeviceRows(currentDeviceRows.value)
    .slice()
    .sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }),
    ),
);
const displayedDeviceRows = computed<DeviceRow[]>(() => {
  const start =
    (devicePagination.value.page - 1) * devicePagination.value.perPage;
  const end = start + devicePagination.value.perPage;
  return filteredDeviceRows.value.slice(start, end);
});
const connectedGatewayNodes = computed<DeviceRow[]>(() => {
  if (!selectedGateway.value) return [];
  const sourceRows =
    activeDeviceTab.value === "registered" ? registeredRows.value : nodeRows.value;
  return sourceRows.filter(
    (row) => row.resourceType !== "gateway",
  ).filter(
    (node) => node.gatewayId === selectedGateway.value?.id,
  );
});

function applyDeviceFilters(payload?: Record<string, string>) {
  applyDeviceFiltersBase(payload);
  devicePagination.value.page = 1;
}

function resetDeviceFilters() {
  resetDeviceFiltersBase();
  devicePagination.value.page = 1;
}

function refreshDevices() {
  if (isDeviceLoading.value) return;
  if (activeDeviceTab.value === "registered") {
    loadRegisteredDevices();
    return;
  }
  isDeviceLoading.value = true;
  nodeCollectionsStore.clearNodeCache({ nodeRows, controllerStatesByNode });

  if (deviceRefreshTimeout) {
    clearTimeout(deviceRefreshTimeout);
  }
  deviceRefreshTimeout = setTimeout(() => {
    isDeviceLoading.value = false;
  }, 800);
}

function exportDevices() {
  if (!import.meta.client) return;
  const rows = filteredDeviceRows.value;
  if (!rows.length) {
    message.warning("No devices to export.");
    return;
  }

  const headers = deviceTableColumns.value;
  const escapeValue = (value: string | number | boolean | null | undefined) => {
    const str = (value ?? "").toString().replace(/"/g, '""');
    return `"${str}"`;
  };

  const columnKeys = deviceTableColumnDefinitions.value.map(
    (column) => column.key,
  );

  const resolveCell = (row: DeviceRow, key: string) => {
    switch (key) {
      case "id":
        return row.id;
      case "name":
        return row.name;
      case "gatewayId":
        return row.gatewayId ?? "";
      case "type":
        return row.type ?? "";
      case "ip":
        return row.ip ?? "";
      case "mac":
        return row.mac ?? "";
      case "status":
        return row.status ?? "";
      case "registered":
        return row.registered ?? "";
      case "lastSeen":
        return row.lastSeen ?? "";
      default:
        return "";
    }
  };

  const csvRows = [
    headers.map(escapeValue).join(","),
    ...rows.map((row) =>
      columnKeys
        .filter((key) => key !== "actions")
        .map((key) => resolveCell(row, key))
        .map(escapeValue)
        .join(","),
    ),
  ];

  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().split("T")[0];
  link.href = url;
  link.setAttribute(
    "download",
    `devices-${currentDeviceTab.value.label}-${timestamp}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  message.success("Devices exported.");
}

function formatLastSeen(value?: string | null) {
  return formatIotDateTime(value);
}

function formatDeviceStatus(status: DeviceRow["status"]) {
  if (!status) {
    return "Unknown";
  }

  return status
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatRegistrationStatus(registered?: boolean) {
  return registered ? "true" : "false";
}

function registrationTextColorClass(registered?: boolean) {
  return registered ? "text-blue-600" : "text-red-500";
}

function statusTextColorClass(status?: DeviceRow["status"]) {
  const normalizedStatus = (status ?? "").toLowerCase() as DeviceRow["status"];
  return ONLINE_DEVICE_STATUSES.has(normalizedStatus)
    ? "text-blue-600"
    : "text-red-500";
}

function isOnlineExactStatus(status?: DeviceRow["status"]) {
  return (status ?? "").toLowerCase() === "online";
}

function isUnactiveStatus(status?: DeviceRow["status"]) {
  const normalized = (status ?? "").toLowerCase();
  return normalized === "offline";
}

function mapDeviceRowToNodeInfo(row: DeviceRow): NodeInfo {
  return {
    id: null,
    external_id: row.externalId ?? row.id ?? null,
    name: row.name ?? null,
    type: row.type ?? null,
    gateway_id: row.gatewayId ?? null,
    ip_address: row.ip ?? null,
    mac_address: row.mac ?? null,
    status: row.status ?? null,
    registered: row.registered ?? null,
    last_seen: row.lastSeen ?? null,
  };
}

function getColumnWidth(index: number) {
  return deviceTableColumnDefinitions.value[index]?.width ?? "auto";
}

function prevDevicePage() {
  if (devicePagination.value.page > 1) {
    devicePagination.value.page -= 1;
  }
}

function nextDevicePage() {
  if (devicePagination.value.page < devicePagination.value.lastPage) {
    devicePagination.value.page += 1;
  }
}

function changeDevicePerPage(value: number) {
  if (value <= 0) return;
  devicePagination.value.perPage = value;
}

function recalculateDevicePagination() {
  const total = filteredDeviceRows.value.length;
  devicePagination.value.total = total;
  const lastPage = Math.max(
    1,
    Math.ceil(total / devicePagination.value.perPage),
  );
  devicePagination.value.lastPage = lastPage;
  if (devicePagination.value.page > lastPage) {
    devicePagination.value.page = lastPage;
  }
}

function handleGatewayUpdate(event: MessageEvent) {
  if (!event.data) {
    return;
  }

  try {
    const payload = JSON.parse(event.data) as GatewayEventPayload;
    updateGatewayFromPayload(payload);
    nodeCollectionsStore.updateFromGatewayPayload(payload, {
      nodeRows,
      controllerStatesByNode,
    });
    if (activeControlUrlNodeId.value) {
      syncControlUrlItemsFromControllerStates();
    }
  } catch (error) {
    console.error("Failed to parse gateway SSE payload:", error);
  }
}

function handleGatewayError(event: Event) {
  console.error("Gateway SSE error:", event);
}

function connectGatewaySse() {
  if (!import.meta.client || !apiConfig.server) {
    return;
  }

  disconnectGatewaySse();

  try {
    const endpoint = `${apiConfig.server.replace(/\/$/, "")}/events/gateways`;
    const source = new EventSource(endpoint);
    source.addEventListener("gateway-update", handleGatewayUpdate);
    source.addEventListener("error", handleGatewayError);
    gatewayEventSource = source;
  } catch (error) {
    console.error("Failed to connect to gateway SSE:", error);
  }
}

function disconnectGatewaySse() {
  if (gatewayEventSource) {
    gatewayEventSource.close();
    gatewayEventSource = null;
  }
}

onMounted(() => {
  if (!import.meta.client) return;
  loadGatewayIdMap();
  loadRegisteredDevices();
  connectGatewaySse();
  startDeviceStatusPolling();
  fetchMetrics();
});

onBeforeUnmount(() => {
  disconnectGatewaySse();
  stopDeviceStatusPolling();
});

watch(
  filteredDeviceRows,
  () => {
    recalculateDevicePagination();
  },
  { immediate: true },
);

watch(
  () => devicePagination.value.perPage,
  () => {
    devicePagination.value.page = 1;
    recalculateDevicePagination();
  },
);

watch(deviceSearchKeyword, () => {
  devicePagination.value.page = 1;
});

watch(
  metrics,
  (value) => {
    if (!selectedNodeMetricKey.value && value.length > 0) {
      selectedNodeMetricKey.value = value[0]?.key ?? "";
    }
  },
  { immediate: true },
);

</script>

<style scoped>
.wrap-break-words {
  word-wrap: break-word;
  overflow-wrap: break-word;
}

:deep(.device-table table) {
  table-layout: fixed;
}

.inline-slide-enter-active,
.inline-slide-leave-active {
  transition: max-height 220ms ease, opacity 220ms ease, transform 220ms ease;
}
.inline-slide-enter-from,
.inline-slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-4px);
}
.inline-slide-enter-to,
.inline-slide-leave-from {
  max-height: 120px;
  opacity: 1;
  transform: translateY(0);
}
</style>
