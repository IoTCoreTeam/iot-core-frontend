<template>
  <div class="bg-white border border-slate-200 rounded h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-slate-100 flex items-center justify-between">
      <p class="text-sm font-semibold text-slate-900">Active Devices</p>
      <NuxtLink
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
      </a-tabs>
    </div>

    <div class="flex-1 overflow-auto">
      <DataBoxCard
        :is-loading="false"
        :has-data="filteredDevices.length > 0"
        :columns="4"
        :elevated="false"
        :padded="false"
        class="border-0 shadow-none h-full"
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
      </DataBoxCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import type { DeviceRow, DeviceRowStatus } from "@/types/devices-control";
import { useLoadDataRow } from "@/composables/DeviceRegistration/loadDataRow";
import {
  createNodeCollectionsStore,
  type GatewayEventPayload,
} from "@/composables/DeviceRegistration/SSEHandle";
import { apiConfig } from "~~/config/api";
import { formatIotDateTime } from "~~/config/iot-time-format";

// Internal State
const activeTab = ref<"gateway" | "node">("gateway");

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
    default:
      return [];
  }
});

const displayedDevices = computed(() => {
  return filteredDevices.value;
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
function formatStatus(status: DeviceRowStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusColorClass(status: DeviceRowStatus) {
  if (status === "online") return "text-blue-600";
  return "text-rose-600";
}

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
// Lifecycle
onMounted(() => {
  connectGatewaySse();
  startDeviceStatusPolling();
});

onBeforeUnmount(() => {
  disconnectGatewaySse();
  stopDeviceStatusPolling();
});
</script>

