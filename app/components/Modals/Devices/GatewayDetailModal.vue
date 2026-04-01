<template>
  <BaseModal
    :model-value="isOpen"
    title="Gateway Details"
    max-width="max-w-5xl"
    panel-class="p-6 shadow-xl"
    @request-close="closeModal"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <div
        v-if="!gatewayView"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-gray-500"
      >
        Gateway information is unavailable.
      </div>

      <template v-else>
        <section class="space-y-4">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <h4 class="text-xs font-semibold text-gray-700">Gateway Information</h4>
            <span class="text-[10px] uppercase tracking-wider text-gray-500">
              {{ gatewayView.externalId }}
            </span>
          </div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                    Name
                  </td>
                  <td class="break-all px-4 py-3 text-gray-900">
                    {{ gatewayView.name }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                    UUID
                  </td>
                  <td class="break-all px-4 py-3 text-gray-900">
                    {{ gatewayView.id }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                    IP Address
                  </td>
                  <td class="break-all px-4 py-3 text-gray-900">
                    {{ gatewayView.ip }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                    MAC
                  </td>
                  <td class="break-all px-4 py-3 text-gray-900">
                    {{ gatewayView.mac }}
                  </td>
                </tr>
                <tr>
                  <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                    Last Seen
                  </td>
                  <td class="px-4 py-3 text-gray-900">
                    {{ gatewayView.lastSeen }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="space-y-4">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <h4 class="text-xs font-semibold text-gray-700">Connected Nodes</h4>
            <span class="text-[10px] uppercase tracking-wider text-gray-500">
              {{ nodesTotal }} total
            </span>
          </div>

          <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <DataBoxCard
              :is-loading="false"
              :has-data="pagedNodes.length > 0"
              :columns="6"
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
              @change-per-page="handleChangePerPage"
            >
              <template #head>
                <tr class="border-b border-gray-200 bg-gray-50">
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Node ID</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">MAC</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Status</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Registered</th>
                  <th class="px-4 py-3 text-left text-xs font-semibold text-gray-600">Last Seen</th>
                </tr>
              </template>

              <template #default>
                <tr
                  v-for="node in pagedNodes"
                  :key="node.id"
                  class="border-b border-gray-100 text-xs transition-colors hover:bg-gray-50"
                >
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(node.id) }}</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(node.name) }}</td>
                  <td class="px-4 py-3 text-gray-700">{{ formatValue(node.mac) }}</td>
                  <td class="px-4 py-3">
                    <span :class="statusBadgeClass(node.status)">
                      {{ formatValue(node.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <span :class="registeredBadgeClass(node.registered)">
                      {{ formatRegistered(node.registered) }}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-gray-700">
                    {{ formatLastSeen(node.lastSeen) }}
                  </td>
                </tr>
              </template>

              <template #empty>
                No nodes connected to this gateway.
              </template>

              <template #footer>
                <span>Showing {{ pagedNodes.length }} of {{ nodesTotal }} entries.</span>
              </template>
            </DataBoxCard>
          </div>
        </section>
      </template>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import type { DeviceRow } from "@/types/devices-control";
import { formatIotDateTime } from "~~/config/iot-time-format";
import BaseModal from "../BaseModal.vue";

const props = defineProps<{
  gateway: DeviceRow | null;
  nodes: DeviceRow[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const isOpen = ref(true);
const nodesPage = ref(1);
const nodesPerPage = ref(5);

const lastSeenFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

const gatewayView = computed(() => {
  const gateway = props.gateway;
  if (!gateway) return null;

  return {
    id: formatValue(gateway.id),
    externalId: formatValue(gateway.externalId ?? gateway.id),
    name: formatValue(gateway.name),
    ip: formatValue(gateway.ip),
    mac: formatValue(gateway.mac),
    lastSeen: formatLastSeen(gateway.lastSeen),
  };
});

const normalizedNodes = computed(() =>
  props.nodes.map((node) => ({
    id: formatValue(node.id),
    name: formatValue(node.name),
    mac: node.mac ?? null,
    status: node.status ?? null,
    registered: node.registered ?? null,
    lastSeen: node.lastSeen ?? null,
  })),
);

const nodesTotal = computed(() => normalizedNodes.value.length);
const nodesLastPage = computed(() =>
  Math.max(1, Math.ceil(nodesTotal.value / Math.max(1, nodesPerPage.value))),
);

const pagedNodes = computed(() => {
  const start = (nodesPage.value - 1) * nodesPerPage.value;
  return normalizedNodes.value.slice(start, start + nodesPerPage.value);
});

watch(
  () => props.gateway,
  () => {
    isOpen.value = true;
    nodesPage.value = 1;
  },
);

watch([nodesTotal, nodesLastPage], () => {
  if (nodesPage.value > nodesLastPage.value) {
    nodesPage.value = nodesLastPage.value;
  }
});

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function formatLastSeen(value?: string | null) {
  return formatIotDateTime(value, {
    formatter: lastSeenFormatter,
    fallback: "N/A",
  });
}

function formatRegistered(value?: boolean | null) {
  if (value === true) return "TRUE";
  if (value === false) return "FALSE";
  return "N/A";
}

function statusBadgeClass(status?: string | null) {
  const base = "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";
  const normalized = String(status ?? "").trim().toLowerCase();

  if (normalized === "online") {
    return `${base} border-blue-200 bg-blue-50 text-blue-700`;
  }

  if (normalized === "offline") {
    return `${base} border-red-200 bg-red-50 text-red-700`;
  }

  return `${base} border-gray-200 bg-gray-100 text-gray-600`;
}

function registeredBadgeClass(registered?: boolean | null) {
  const base = "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide";

  if (registered === true) {
    return `${base} border-blue-200 bg-blue-50 text-blue-700`;
  }

  if (registered === false) {
    return `${base} border-red-200 bg-red-50 text-red-700`;
  }

  return `${base} border-gray-200 bg-gray-100 text-gray-600`;
}

function handleChangePerPage(value: number) {
  nodesPerPage.value = value;
  nodesPage.value = 1;
}

function closeModal() {
  isOpen.value = false;
  emit("close");
}
</script>
