<template>
  <section class="min-h-screen">
    <div class="mx-auto w-full">
      <div class="flex flex-col lg:flex-row lg:items-start">
        <div class="w-full lg:w-3/4 overflow-hidden border border-gray-200">
          <ClientOnly>
            <div class="relative h-screen w-full">
              <div
                v-if="isLoadingMap"
                class="absolute inset-0 z-0 animate-pulse bg-gray-100"
              ></div>
              <div ref="mapEl" class="h-screen w-full z-0"></div>
              <div class="absolute right-3 top-3 z-20 w-fit">
                <DataBoxCard
                  :is-loading="false"
                  :has-data="true"
                  :columns="1"
                  :padded="false"
                >
                  <template #default>
                    <tr>
                      <td class="px-2 py-2">
                        <div class="flex items-center justify-end gap-2">
                          <input
                            v-model="latInput"
                            type="number"
                            step="any"
                            min="-90"
                            max="90"
                            placeholder="Latitude"
                            class="h-8 w-28 rounded border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                          <input
                            v-model="lngInput"
                            type="number"
                            step="any"
                            min="-180"
                            max="180"
                            placeholder="Longitude"
                            class="h-8 w-28 rounded border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                          <button
                            type="button"
                            class="inline-flex items-center rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                            @click="zoomToInput"
                          >
                            Zoom to Input
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                            @click="resetMapView"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </DataBoxCard>
              </div>
            </div>
          </ClientOnly>
        </div>

        <div class="w-full lg:w-1/4 shrink-0 lg:self-start flex flex-col gap-3">
          <DataBoxCard
            class="w-full"
            :is-loading="isAreasLoading"
            :columns="2"
            :has-data="managedAreas.length > 0"
          >
            <template #header>
              <div class="flex items-center justify-between w-full">
                <h3 class="text-gray-700 text-xs font-semibold">Managed Areas</h3>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-2 py-0.5 text-xs border border-gray-300"
                    :disabled="isAreasLoading"
                    @click="refreshAreas"
                  >
                    <BootstrapIcon
                      name="arrow-clockwise"
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': isAreasLoading }"
                    />
                    {{ isAreasLoading ? "Refreshing..." : "Refresh" }}
                  </button>
                </div>
              </div>
            </template>

            <template #head>
              <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600">
                <th class="px-2 py-2 font-normal text-start">Name</th>
                <th class="px-2 py-2 font-normal text-center">Actions</th>
              </tr>
            </template>

            <template #default>
              <tr
                v-for="area in managedAreas"
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
                      @click="focusArea(area)"
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
              <span>Showing {{ managedAreas.length }} entries.</span>
            </template>
          </DataBoxCard>

          <DataBoxCard
            class="w-full"
            :is-loading="isActiveDevicesLoading"
            :columns="3"
            :has-data="activeDeviceRows.length > 0"
          >
            <template #header>
              <div class="flex items-center justify-between w-full">
                <h3 class="text-gray-700 text-xs font-semibold">Active Devices</h3>
                <div class="text-[11px] text-gray-400">
                  {{ activeDeviceRows.length }} online
                </div>
              </div>
            </template>

            <template #head>
              <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600">
                <th class="px-2 py-2 font-normal text-start">Type</th>
                <th class="px-2 py-2 font-normal text-start">ID</th>
                <th class="px-2 py-2 font-normal text-center">Actions</th>
              </tr>
            </template>

            <template #default>
              <tr
                v-for="row in activeDeviceRows"
                :key="row.key"
                class="hover:bg-gray-50 transition-colors text-xs border-b border-gray-100"
              >
                <td class="px-2 py-2 capitalize text-gray-700">
                  {{ row.kind }}
                </td>
                <td class="px-2 py-2 text-gray-700">
                  {{ row.id }}
                </td>
                <td class="px-2 py-2 text-center">
                  <button
                    type="button"
                    class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                    title="View details"
                    @click="openActiveDeviceDetail(row)"
                  >
                    <BootstrapIcon name="info-circle" class="w-3 h-3" />
                    <span class="sr-only">Details</span>
                  </button>
                </td>
              </tr>
            </template>

            <template #empty> No active devices yet. </template>

            <template #footer>
              <span>Showing {{ activeDeviceRows.length }} entries.</span>
            </template>
          </DataBoxCard>
        </div>
      </div>
    </div>
  </section>
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
</template>

<script setup lang="ts">
import type { DeviceRow, NodeInfo, Section } from "@/types/devices-control";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { computed, onMounted, onBeforeUnmount, ref, nextTick, watch, shallowRef } from "vue";
import { message } from "ant-design-vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import GatewayDetailModal from "@/components/Modals/Devices/GatewayDetailModal.vue";
import BaseNodeDetailModal from "@/components/Modals/Devices/BaseNodeDetailModal.vue";
import { useMapTool, DEFAULT_CENTER, DEFAULT_ZOOM } from "@/composables/Map/MapTool";
import { useHandleMap } from "@/composables/Map/handleMap";
import { createNodeCollectionsStore, type GatewayEventPayload } from "@/composables/DeviceRegistration/SSEHandle";
import { useLoadDataRow } from "@/composables/DeviceRegistration/loadDataRow";
import type { FeatureGroup, Map } from "leaflet";

defineProps<{ section: Section }>();

const mapEl = ref<HTMLDivElement | null>(null);
const isLoadingMap = ref(true);
const mapRef = shallowRef<Map | null>(null);
const drawnItemsRef = shallowRef<FeatureGroup | null>(null);
const leafletRef = shallowRef<typeof import("leaflet") | null>(null);
const gatewayRows = ref<DeviceRow[]>([]);
const nodeRows = ref<DeviceRow[]>([]);
const isGatewayDetailOpen = ref(false);
const selectedGateway = ref<DeviceRow | null>(null);
const isNodeDetailOpen = ref(false);
const selectedNodeDetail = ref<NodeInfo | null>(null);
const isActiveDevicesLoading = ref(true);
const ACTIVE_DEVICES_INITIAL_TIMEOUT_MS = 8000;
const ACTIVE_DEVICES_RETRY_MS = 30000;
let activeDevicesInitialTimeoutId: ReturnType<typeof setTimeout> | null = null;
let activeDevicesRetryTimeoutId: ReturnType<typeof setTimeout> | null = null;

const authStore = useAuthStore();
const nodeCollectionsStore = createNodeCollectionsStore();
let gatewayEventSource: EventSource | null = null;

const {
  isAreasLoading,
  managedAreas,
  pendingStyle,
  applyLayerStyle,
  bindContextMenu,
  loadManagedAreas,
  refreshAreas,
  focusArea,
} = useHandleMap({
  mapRef,
  drawnItemsRef,
  leafletRef,
});

const { updateGatewayFromPayload, startDeviceStatusPolling, stopDeviceStatusPolling } =
  useLoadDataRow({
    gatewayRows,
    nodeRows,
  });

const ONLINE_DEVICE_STATUSES = new Set<DeviceRow["status"]>(["online"]);

const activeDeviceRows = computed(() => {
  const gateways = gatewayRows.value
    .filter((row) => ONLINE_DEVICE_STATUSES.has(row.status))
    .map((row) => ({ key: `gateway-${row.id}`, kind: "gateway" as const, row, id: row.id }));
  const nodes = nodeRows.value
    .filter((row) => ONLINE_DEVICE_STATUSES.has(row.status))
    .map((row) => ({ key: `node-${row.id}`, kind: "node" as const, row, id: row.id }));
  return [...gateways, ...nodes].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }),
  );
});

const connectedGatewayNodes = computed<DeviceRow[]>(() => {
  if (!selectedGateway.value) return [];
  return nodeRows.value.filter(
    (node) => node.gatewayId === selectedGateway.value?.id,
  );
});

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

function openGatewayDetail(row: DeviceRow) {
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

function openActiveDeviceDetail(payload: { kind: "gateway" | "node"; row: DeviceRow }) {
  if (payload.kind === "gateway") {
    openGatewayDetail(payload.row);
    return;
  }
  openNodeDetail(payload.row);
}

const {
  latInput,
  lngInput,
  zoomToInput,
  resetMapView,
} = useMapTool({
  mapRef,
  leafletRef,
});

const ensureLeafletDraw = async (L: typeof import("leaflet")) => {
  if ((L as any).Draw?.Event) return;
  if (typeof window !== "undefined") {
    (window as any).L = L;
  }
  await import("leaflet-draw");
};

onMounted(async () => {
  if (!import.meta.client) return;
  await nextTick();
  if (!mapEl.value) return;
  const L = await import("leaflet");
  await ensureLeafletDraw(L);
  leafletRef.value = L;

  mapRef.value = L.map(mapEl.value, {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(mapRef.value);

  mapRef.value?.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  // Leaflet Draw
  drawnItemsRef.value = new L.FeatureGroup();
  mapRef.value.addLayer(drawnItemsRef.value);
  const drawControl = (L as any).Control?.Draw
    ? new (L as any).Control.Draw({
        edit: {
          featureGroup: drawnItemsRef.value,
        },
        draw: {
          polygon: true,
          rectangle: true,
          circle: false,
          circlemarker: false,
          polyline: false,
          marker: false,
        },
      })
    : null;
  if (drawControl) {
    mapRef.value.addControl(drawControl);
  }

  if ((L as any).Draw?.Event) {
    mapRef.value.on((L as any).Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      const drawnItems = drawnItemsRef.value;
      if (!drawnItems) return;
      applyLayerStyle(layer, pendingStyle);
      drawnItems.addLayer(layer);
      bindContextMenu(layer, false);
    });
  }

  await loadManagedAreas();
  setTimeout(() => {
    isLoadingMap.value = false;
  }, 1000);
});

function handleGatewayUpdate(event: MessageEvent) {
  if (!event.data) {
    return;
  }

  try {
    const payload = JSON.parse(event.data) as GatewayEventPayload;
    updateGatewayFromPayload(payload);
    nodeCollectionsStore.updateFromGatewayPayload(payload, {
      nodeRows,
    });
    isActiveDevicesLoading.value = false;
    if (activeDevicesInitialTimeoutId) {
      clearTimeout(activeDevicesInitialTimeoutId);
      activeDevicesInitialTimeoutId = null;
    }
    if (activeDevicesRetryTimeoutId) {
      clearTimeout(activeDevicesRetryTimeoutId);
      activeDevicesRetryTimeoutId = null;
    }
  } catch (error) {
    console.error("Failed to parse gateway SSE payload:", error);
  }
}

function handleGatewayError(event: Event) {
  console.error("Gateway SSE error:", event);
  isActiveDevicesLoading.value = false;
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
    isActiveDevicesLoading.value = false;
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
  connectGatewaySse();
  startDeviceStatusPolling();
  if (activeDevicesInitialTimeoutId) {
    clearTimeout(activeDevicesInitialTimeoutId);
  }
  activeDevicesInitialTimeoutId = setTimeout(() => {
    if (activeDeviceRows.value.length === 0) {
      isActiveDevicesLoading.value = false;
      if (activeDevicesRetryTimeoutId) {
        clearTimeout(activeDevicesRetryTimeoutId);
      }
      activeDevicesRetryTimeoutId = setTimeout(() => {
        isActiveDevicesLoading.value = true;
        connectGatewaySse();
      }, ACTIVE_DEVICES_RETRY_MS);
    }
  }, ACTIVE_DEVICES_INITIAL_TIMEOUT_MS);
});

watch(
  () => authStore.authorizationHeader,
  async (token) => {
    if (!token) return;
    if (!mapRef.value || !drawnItemsRef.value) return;
    await loadManagedAreas();
  }
);

const reloadMap = async (options?: { silent?: boolean }) => {
  const mapInstance = mapRef.value;
  const mapElement = mapEl.value;
  const L = leafletRef.value;
  if (!mapInstance || !mapElement || !L) return;
  try {
    await ensureLeafletDraw(L);
    const currentCenter = mapInstance.getCenter();
    const currentZoom = mapInstance.getZoom();
    mapInstance.remove();

    mapRef.value = L.map(mapElement, {
      center: [currentCenter.lat, currentCenter.lng],
      zoom: currentZoom,
      zoomControl: true,
    });

    L
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      })
      .addTo(mapRef.value);

    drawnItemsRef.value = new L.FeatureGroup();
    mapRef.value.addLayer(drawnItemsRef.value);
    const drawControl = (L as any).Control?.Draw
      ? new (L as any).Control.Draw({
          edit: { featureGroup: drawnItemsRef.value },
          draw: {
            polygon: true,
            rectangle: true,
            circle: false,
            circlemarker: false,
            polyline: false,
            marker: false,
          },
        })
      : null;
    if (drawControl) {
      mapRef.value.addControl(drawControl);
    }
    if ((L as any).Draw?.Event) {
      mapRef.value.on((L as any).Draw.Event.CREATED, (event: any) => {
        const layer = event.layer;
        const drawnItems = drawnItemsRef.value;
        if (!drawnItems) return;
        applyLayerStyle(layer, pendingStyle);
        drawnItems.addLayer(layer);
        bindContextMenu(layer, false);
      });
    }
    await loadManagedAreas(true);
    if (!options?.silent) {
      message.success("Map reloaded.");
    }
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to reload.";
    message.error(msg);
  }
};


onBeforeUnmount(() => {
  disconnectGatewaySse();
  stopDeviceStatusPolling();
  if (activeDevicesInitialTimeoutId) {
    clearTimeout(activeDevicesInitialTimeoutId);
    activeDevicesInitialTimeoutId = null;
  }
  if (activeDevicesRetryTimeoutId) {
    clearTimeout(activeDevicesRetryTimeoutId);
    activeDevicesRetryTimeoutId = null;
  }
  if (mapRef.value) {
    mapRef.value.remove();
    mapRef.value = null;
  }
  drawnItemsRef.value = null;
  leafletRef.value = null;
});

</script>
