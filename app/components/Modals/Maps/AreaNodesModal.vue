<template>
  <BaseModal
    :model-value="isOpen"
    :title="modalTitle"
    max-width="max-w-5xl"
    panel-class="p-6 shadow-xl"
    @request-close="handleClose"
  >
    <DataBoxCard
      class="border-0 shadow-none"
      :is-loading="false"
      :columns="9"
      :has-data="pagedNodes.length > 0"
      :elevated="false"
      :padded="false"
      :pagination="{
        page: nodesPage,
        perPage: nodesPerPage,
        lastPage: nodesLastPage,
        total: nodesTotal,
      }"
      @prev-page="nodesPage = Math.max(1, nodesPage - 1)"
      @next-page="nodesPage = Math.min(nodesLastPage, nodesPage + 1)"
      @change-per-page="(value) => { nodesPerPage = value; nodesPage = 1; }"
    >
      <template #header>
        <div></div>
        <span class="text-xs text-gray-500">{{ nodesTotal }} nodes in area</span>
      </template>

      <template #head>
        <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600">
          <th class="px-4 py-3 text-left font-semibold">ID</th>
          <th class="px-4 py-3 text-left font-semibold">Name</th>
          <th class="px-4 py-3 text-left font-semibold">Type</th>
          <th class="px-4 py-3 text-left font-semibold">Gateway ID</th>
          <th class="px-4 py-3 text-left font-semibold">MAC</th>
          <th class="px-4 py-3 text-left font-semibold">Status</th>
          <th class="px-4 py-3 text-left font-semibold">Registered</th>
          <th class="px-4 py-3 text-left font-semibold">Last Seen</th>
          <th class="px-4 py-3 text-left font-semibold">Actions</th>
        </tr>
      </template>

      <template #default>
        <tr
          v-for="node in pagedNodes"
          :key="node.id"
          class="border-b border-gray-100 hover:bg-slate-50 transition-colors duration-150"
        >
          <td class="px-4 py-3 text-gray-700 text-xs">{{ node.id }}</td>
          <td class="px-4 py-3 text-gray-900 text-xs">{{ node.name }}</td>
          <td class="px-4 py-3 text-gray-700 text-xs capitalize">
            {{ node.type || "N/A" }}
          </td>
          <td class="px-4 py-3 text-gray-700 text-xs">
            {{ node.gatewayId || "N/A" }}
          </td>
          <td class="px-4 py-3 text-gray-700 text-xs">{{ node.mac || "N/A" }}</td>

          <td class="px-4 py-3 text-left font-semibold text-xs">
            <span :class="statusTextClass(node.status)">
              {{ formatDeviceStatus(node.status) }}
            </span>
          </td>

          <td class="px-4 py-3 text-left font-semibold text-xs">
            <span :class="registeredTextClass(node.registered)">
              {{ formatRegistrationStatus(node.registered) }}
            </span>
          </td>

          <td class="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
            {{ formatLastSeen(node.lastSeen) }}
          </td>

          <td class="px-4 py-3">
            <div class="inline-flex items-center gap-1">
              <template v-if="node.registered === false">
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded border cursor-pointer"
                  :class="
                    isGatewayRegisteredForRow(node)
                      ? 'border-blue-200 text-blue-600 hover:bg-blue-50'
                      : 'border-gray-200 text-gray-400 bg-gray-50'
                  "
                  title="Register Device"
                  @click.stop="handleNodeEnrollClick(node)"
                >
                  <BootstrapIcon name="plus-lg" class="w-3 h-3" />
                  <span class="sr-only">Register</span>
                </button>
              </template>
              <template v-else>
                <button
                  type="button"
                  class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                  :class="{
                    'opacity-50 cursor-not-allowed': isDeactivatingDevice(node.id),
                  }"
                  :disabled="isDeactivatingDevice(node.id)"
                  :aria-busy="isDeactivatingDevice(node.id)"
                  title="Deactivate Device"
                  @click.stop="handleDeactivateNode(node)"
                >
                  <BootstrapIcon name="slash-circle" class="w-3 h-3" />
                  <span class="sr-only">Deactivate</span>
                </button>
              </template>
            </div>
          </td>
        </tr>
      </template>

      <template #empty>
        No nodes inside this area.
      </template>

      <template #footer>
        <span>Showing {{ pagedNodes.length }} of {{ nodesTotal }} entries.</span>
      </template>
    </DataBoxCard>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { message } from "ant-design-vue";
import BaseModal from "../BaseModal.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import type { DeviceRow } from "@/types/devices-control";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { useRegisterDevice } from "@/composables/DeviceRegistration/RegisterDevice";
import { useDeviceDeactivation } from "@/composables/DeviceRegistration/DeactiveDevice";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";

const props = defineProps<{
  area: any | null;
  nodes: DeviceRow[];
  gateways: DeviceRow[];
  modelValue: boolean;
}>();

const emit = defineEmits(["close", "update:modelValue"]);

const isOpen = ref(props.modelValue);

watch(
  () => props.modelValue,
  (value) => {
    isOpen.value = value;
    if (value) {
      nodesPage.value = 1;
    }
  }
);

const modalTitle = computed(() => {
  const name = props.area?.name || (props.area?.id ? `Area ${props.area.id}` : "Area");
  return `Nodes in ${name}`;
});

const nodes = computed(() => props.nodes ?? []);
const gateways = computed(() => props.gateways ?? []);

const nodesPage = ref(1);
const nodesPerPage = ref(5);
const nodesTotal = computed(() => nodes.value.length);
const nodesLastPage = computed(() =>
  Math.max(1, Math.ceil(nodesTotal.value / Math.max(1, nodesPerPage.value))),
);

const pagedNodes = computed(() => {
  const start = (nodesPage.value - 1) * nodesPerPage.value;
  return nodes.value.slice(start, start + nodesPerPage.value);
});

watch([nodesTotal, nodesLastPage], () => {
  if (nodesPage.value > nodesLastPage.value) {
    nodesPage.value = nodesLastPage.value;
  }
});

const lastSeenFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatLastSeen(value?: string | null) {
  return formatIotDateTime(value, {
    formatter: lastSeenFormatter,
    fallback: "N/A",
  });
}

function formatDeviceStatus(status: DeviceRow["status"]) {
  if (!status) return "Unknown";
  return status
    .split(/[_-]/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function formatRegistrationStatus(registered?: boolean) {
  return registered ? "true" : "false";
}

const statusTextClass = (status?: string | null) => {
  if (!status) return "text-gray-500 uppercase";
  const normalized = status.toLowerCase();
  if (normalized === "online") return "text-blue-600 uppercase";
  if (normalized === "offline") return "text-red-500 uppercase";
  return "text-gray-500 uppercase";
};

const normalizeRegistered = (registered?: boolean | string | number | null) => {
  if (registered === true) return true;
  if (registered === false) return false;
  if (registered === 1) return true;
  if (registered === 0) return false;
  if (typeof registered === "string") {
    const normalized = registered.trim().toLowerCase();
    if (normalized === "true" || normalized === "yes" || normalized === "1") {
      return true;
    }
    if (normalized === "false" || normalized === "no" || normalized === "0") {
      return false;
    }
  }
  return null;
};

const registeredTextClass = (registered?: boolean | string | number | null) => {
  const resolved = normalizeRegistered(registered);
  if (resolved === true) return "text-blue-600 uppercase";
  if (resolved === false) return "text-red-500 uppercase";
  return "text-gray-500 uppercase";
};

function getGatewayForNode(row: DeviceRow) {
  if (!row.gatewayId) return null;
  return gateways.value.find((gateway) => gateway.id === row.gatewayId) ?? null;
}

function isGatewayRegisteredForRow(row: DeviceRow) {
  const gateway = getGatewayForNode(row);
  if (gateway) {
    return normalizeRegistered(gateway.registered) === true;
  }
  if (row.gatewayId && gatewayIdMap.value[row.gatewayId]) {
    return true;
  }
  return false;
}

const { registerDevice } = useRegisterDevice();
const { isDeactivatingDevice, deactivateDevice } = useDeviceDeactivation();
const authStore = useAuthStore();
const gatewayIdMap = ref<Record<string, string>>({});
const gatewayMetaMap = ref<Record<string, { id?: string; ip?: string | null }>>({});
const isGatewayIdMapLoading = ref(false);

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
    const meta: Record<string, { id?: string; ip?: string | null }> = {};
    rows.forEach((row: any) => {
      if (row?.external_id && row?.id) {
        map[row.external_id] = row.id;
        meta[row.external_id] = {
          id: row.id,
          ip: row.ip ?? row.ip_address ?? null,
        };
      }
    });
    gatewayIdMap.value = map;
    gatewayMetaMap.value = meta;
  } catch (error) {
    console.error("Failed to load gateway IDs", error);
  } finally {
    isGatewayIdMapLoading.value = false;
  }
}

async function handleEnroll(row: DeviceRow) {
  if (!row.gatewayId) {
    message.warning("Gateway ID is missing for this node.");
    return;
  }

  const gateway = getGatewayForNode(row);
  const fallbackMeta = gatewayMetaMap.value[row.gatewayId];
  const gatewayIp = gateway?.ip ?? fallbackMeta?.ip ?? null;

  if (!gatewayIdMap.value[gateway?.id ?? row.gatewayId]) {
    await loadGatewayIdMap();
  }
  const gatewayUuid =
    gatewayIdMap.value[gateway?.id ?? row.gatewayId] ??
    gatewayIdMap.value[row.gatewayId] ??
    null;
  if (!gatewayUuid) {
    message.warning(`Gateway ${row.gatewayId} not found in Control Module.`);
    return;
  }
  if (!gatewayIp) {
    message.warning("Gateway IP is missing for this node.");
    return;
  }

  const success = await registerDevice(row, {
    tab: "nodes",
    gatewayIp,
    gatewayId: gatewayUuid,
  });

  if (success) {
    row.registered = true;
  }
}

function handleNodeEnrollClick(row: DeviceRow) {
  if (isGatewayRegisteredForRow(row)) {
    handleEnroll(row);
    return;
  }

  if (!row.gatewayId) {
    message.info("Please register the node's gateway first.");
    return;
  }

  loadGatewayIdMap().then(() => {
    if (isGatewayRegisteredForRow(row)) {
      handleEnroll(row);
      return;
    }
    message.info(`Please register gateway ${row.gatewayId} first.`);
  });
}

async function handleDeactivateNode(row: DeviceRow) {
  if (isDeactivatingDevice(row.id)) return;
  const success = await deactivateDevice(row, "nodes");
  if (success) {
    row.status = "offline";
    row.registered = false;
  }
}

function handleClose() {
  emit("update:modelValue", false);
  emit("close");
}
</script>
