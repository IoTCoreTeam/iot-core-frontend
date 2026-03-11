<template>
  <div class="bg-white border border-slate-200 rounded h-[60vh] max-h-[60vh] flex flex-col min-h-0">
    <!-- Header -->
    <div
      v-if="showHeader"
      class="p-4 border-b border-slate-100 flex items-center justify-between"
    >
      <p class="text-sm font-semibold text-slate-900">Active Devices</p>
      <NuxtLink
        v-if="showViewAll && activeTab !== 'map'"
        to="/devices-control/device-control-center"
        class="text-xs font-semibold text-blue-600 hover:text-blue-800"
      >
        View All
      </NuxtLink>
    </div>

    <!-- Tabs -->
    <div class="px-4 border-b border-slate-100">
      <a-tabs v-model:activeKey="activeTab">
        <a-tab-pane key="gateway" tab="Gateways" />
        <a-tab-pane key="node" tab="Nodes" />
        <a-tab-pane v-if="showMapTab" key="map" tab="Map" />
      </a-tabs>
    </div>

    <div class="flex-1 overflow-auto min-h-0">
      <div v-if="activeTab === 'map'" class="h-full">
        <DataBoxCard
          class="w-full h-full border-0 shadow-none"
          :is-loading="areasLoading"
          :columns="2"
          :has-data="pagedAreas.length > 0"
          :elevated="false"
          :padded="false"
          :scroll-body="true"
          :pagination="{
            page: areasPage,
            perPage: areasPerPage,
            lastPage: areasLastPage,
            total: areasTotal,
          }"
          @prev-page="areasPage = Math.max(1, areasPage - 1)"
          @next-page="areasPage = Math.min(areasLastPage, areasPage + 1)"
          @change-per-page="(value) => { areasPerPage = value; areasPage = 1; }"
        >
          <template #head>
            <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600">
              <th class="px-2 py-2 font-normal text-start">Name</th>
              <th class="px-2 py-2 font-normal text-center">Actions</th>
            </tr>
          </template>

          <template #default>
            <tr
              v-for="area in pagedAreas"
              :key="area.id"
              class="hover:bg-gray-50 transition-colors text-xs border-b border-gray-100"
            >
              <td class="px-2 py-2 text-gray-700 text-start">
                {{ area.name || `Area ${area.id}` }}
              </td>
              <td class="px-2 py-2 text-center">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                    @click="handleFocusArea(area)"
                    title="Focus"
                    aria-label="Focus area"
                  >
                    <BootstrapIcon name="geo-alt" class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </template>

          <template #empty> No managed areas yet. </template>

          <template #footer>
            <span>Showing {{ areasTotal }} entries.</span>
          </template>
        </DataBoxCard>
      </div>

      <DataBoxCard
        v-else
        :is-loading="false"
        :has-data="displayedDevices.length > 0"
        :columns="4"
        :elevated="false"
        :padded="false"
        :scroll-body="true"
        :pagination="{
          page: devicesPage,
          perPage: devicesPerPage,
          lastPage: devicesLastPage,
          total: devicesTotal,
        }"
        @prev-page="devicesPage = Math.max(1, devicesPage - 1)"
        @next-page="devicesPage = Math.min(devicesLastPage, devicesPage + 1)"
        @change-per-page="(value) => { devicesPerPage = value; devicesPage = 1; }"
        class="border-0 shadow-none h-full min-h-0"
      >
        <template #head>
          <tr
            class="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500"
          >
            <th class="px-3 py-2 text-left font-semibold">Name</th>
            <th class="px-3 py-2 text-center font-semibold">Registered</th>
            <th class="px-3 py-2 text-right font-semibold">Last Seen</th>
          </tr>
        </template>

        <template #default>
          <tr
            v-for="device in displayedDevices"
            :key="device.id"
            class="hover:bg-gray-50 text-xs"
          >
            <td class="px-3 py-3">
              <div class="font-medium">{{ device.name }}</div>
              <div class="text-[10px] text-gray-500">{{ device.id }}</div>
            </td>

            <td class="px-1.5 py-0.5 rounded text-xs font-semibold text-center uppercase">
              <span :class="registeredClass(device.registered)">
                {{ formatRegistered(device.registered) }}
              </span>
            </td>

            <td class="px-3 text-right text-gray-600">
              {{ formatLastSeen(device.lastSeen ?? null) }}
            </td>
          </tr>
        </template>

        <template #empty> No devices to display yet. </template>

        <template #footer>
          <span>Showing {{ devicesTotal }} entries.</span>
        </template>
      </DataBoxCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, watch } from "vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import type { DeviceRow } from "@/types/devices-control";
import { useLoadDataRow } from "@/composables/DeviceRegistration/loadDataRow";
import {
  createNodeCollectionsStore,
  type GatewayEventPayload,
} from "@/composables/DeviceRegistration/SSEHandle";
import { apiConfig } from "~~/config/api";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { useAuthStore } from "~~/stores/auth";

const props = withDefaults(
  defineProps<{
    defaultTab?: "gateway" | "node" | "map";
    showHeader?: boolean;
    showViewAll?: boolean;
    headerLabel?: string;
    showMapTab?: boolean;
    enableDeviceSse?: boolean;
    enableMapAreasFetch?: boolean;
    mapIsAreasLoading?: boolean;
    mapManagedAreas?: any[];
    mapFocusArea?: (area: any) => void;
  }>(),
  {
    defaultTab: "gateway",
    showHeader: true,
    showViewAll: true,
    showMapTab: false,
    enableDeviceSse: true,
    enableMapAreasFetch: true,
    mapIsAreasLoading: false,
  },
);

// Internal State
const activeTab = ref<"gateway" | "node" | "map">(props.defaultTab);

const gatewayRows = ref<DeviceRow[]>([]);
const nodeRows = ref<DeviceRow[]>([]);

const {
  updateGatewayFromPayload,
  startDeviceStatusPolling,
  stopDeviceStatusPolling,
} = useLoadDataRow({
  gatewayRows,
  nodeRows,
});
let gatewayEventSource: EventSource | null = null;
const nodeCollectionsStore = createNodeCollectionsStore();

// Derived State
const filteredDevices = computed(() => {
  switch (activeTab.value) {
    case "gateway":
      return gatewayRows.value;
    case "node":
      return nodeRows.value;
    case "map":
      return [];
    default:
      return [];
  }
});

const devicesPage = ref(1);
const devicesPerPage = ref(5);
const devicesTotal = computed(() => filteredDevices.value.length);
const devicesLastPage = computed(() =>
  Math.max(1, Math.ceil(devicesTotal.value / Math.max(1, devicesPerPage.value))),
);

const displayedDevices = computed(() => {
  const start = (devicesPage.value - 1) * devicesPerPage.value;
  return filteredDevices.value.slice(start, start + devicesPerPage.value);
});

const showHeader = computed(() => props.showHeader);
const showViewAll = computed(() => props.showViewAll);
const showMapTab = computed(() => props.showMapTab);
const enableDeviceSse = computed(() => props.enableDeviceSse);
const enableMapAreasFetch = computed(() => props.enableMapAreasFetch);
const hasExternalAreas = computed(() => props.mapManagedAreas !== undefined);
const externalAreas = computed(() => props.mapManagedAreas ?? []);

const authStore = useAuthStore();
const internalAreas = ref<any[]>([]);
const isInternalAreasLoading = ref(false);
const hasLoadedInternalAreas = ref(false);

const areasPage = ref(1);
const areasPerPage = ref(5);

const areasLoading = computed(() =>
  hasExternalAreas.value ? props.mapIsAreasLoading : isInternalAreasLoading.value,
);
const areasSource = computed(() =>
  hasExternalAreas.value ? externalAreas.value : internalAreas.value,
);
const areasTotal = computed(() => areasSource.value.length);

const areasLastPage = computed(() =>
  Math.max(1, Math.ceil(areasTotal.value / Math.max(1, areasPerPage.value))),
);

const pagedAreas = computed(() => {
  const start = (areasPage.value - 1) * areasPerPage.value;
  return areasSource.value.slice(start, start + areasPerPage.value);
});


watch([areasTotal, areasLastPage], () => {
  if (areasPage.value > areasLastPage.value) {
    areasPage.value = areasLastPage.value;
  }
});

watch([devicesTotal, devicesLastPage, activeTab], () => {
  if (devicesPage.value > devicesLastPage.value) {
    devicesPage.value = devicesLastPage.value;
  }
});


// SSE Logic
function connectGatewaySse() {
  if (!import.meta.client || !apiConfig.server) return;

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

function handleGatewayUpdate(event: MessageEvent) {
  if (!event.data) return;
  try {
    const payload = JSON.parse(event.data) as GatewayEventPayload;
    updateGatewayFromPayload(payload);
    nodeCollectionsStore.updateFromGatewayPayload(payload, { nodeRows });
  } catch (error) {
    console.error("Failed to parse gateway SSE payload:", error);
  }
}

function handleGatewayError(event: Event) {
  console.error("Gateway SSE error:", event);
  // Optional: Implement reconnection logic here if needed
}

// UI Helpers
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

function formatLastSeen(val: string | null) {
  return formatIotDateTime(val, { formatter: timeFormatter, fallback: "-" });
}

function formatRegistered(value?: boolean) {
  if (value === undefined) return "-";
  return value ? "True" : "False";
}

function registeredClass(value?: boolean) {
  if (value === undefined) {
    return "text-gray-400";
  }
  return value ? "text-blue-600" : "text-rose-600";
}

function handleFocusArea(area: any) {
  props.mapFocusArea?.(area);
}

async function loadManagedAreasInternal() {
  if (hasExternalAreas.value || hasLoadedInternalAreas.value) return;
  if (!apiConfig.auth) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) return;

  isInternalAreasLoading.value = true;
  try {
    const response = await fetch(`${apiConfig.auth}/managed-areas?per_page=200`, {
      method: "GET",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      throw new Error(data?.message ?? "Failed to load managed areas.");
    }
    const items = Array.isArray(data?.data?.data)
      ? data.data.data
      : Array.isArray(data?.data)
        ? data.data
        : [];
    internalAreas.value = items;
    hasLoadedInternalAreas.value = true;
  } catch (error) {
    console.error("Failed to load managed areas:", error);
  } finally {
    isInternalAreasLoading.value = false;
  }
}

// Lifecycle
onMounted(() => {
  if (!enableDeviceSse.value) return;
  connectGatewaySse();
  startDeviceStatusPolling();
});

onBeforeUnmount(() => {
  if (!enableDeviceSse.value) return;
  disconnectGatewaySse();
  stopDeviceStatusPolling();
});

watch(
  [activeTab, showMapTab, enableMapAreasFetch, hasExternalAreas],
  ([tab, mapTabVisible, allowFetch, external]) => {
    if (!mapTabVisible || !allowFetch || external) return;
    if (tab !== "map") return;
    loadManagedAreasInternal();
  },
  { immediate: true },
);
</script>
