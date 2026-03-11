<template>
  <BaseModal
    :model-value="isOpen"
    title="Gateway Details"
    max-width="max-w-5xl"
    panel-class="p-6 shadow-xl"
    @request-close="closeModal"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <!-- No data state -->
      <div
        v-if="!gateway"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-center"
      >
        Gateway information is unavailable.
      </div>

      <template v-else>
        <!-- Gateway Information Section -->
        <section class="space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-gray-200"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- ID -->
            <div class="rounded bg-gray-50 p-3 border border-gray-200">
              <p class="text-xs uppercase tracking-wider text-gray-500 font-medium mb-1">ID</p>
              <p class="text-gray-900 text-xs break-all">{{ gateway.id }}</p>
            </div>

            <!-- Name -->
            <div class="rounded bg-gray-50 p-3 border border-gray-200">
              <p class="text-xs tracking-wider text-gray-500 font-medium mb-1">Name</p>
              <p class="text-gray-900 text-xs">{{ gateway.name }}</p>
            </div>

            <!-- IP Address -->
            <div class="rounded bg-gray-50 p-3 border border-gray-200">
              <p class="text-xs tracking-wider text-gray-500 font-medium mb-1">IP Address</p>
              <p class="text-gray-900 text-xs">{{ gateway.ip || "N/A" }}</p>
            </div>

            <!-- MAC Address -->
            <div class="rounded bg-gray-50 p-3 border border-gray-200">
              <p class="text-xs tracking-wider text-gray-500 font-medium mb-1">MAC Address</p>
              <p class="text-gray-900 text-xs">{{ gateway.mac || "N/A" }}</p>
            </div>

            <!-- Last Seen -->
            <div class="rounded bg-gray-50 p-3 border border-gray-200 md:col-span-2">
              <p class="text-xs tracking-wider text-gray-500 font-medium mb-1">Last Seen</p>
              <p class="text-gray-900 text-xs">{{ formatLastSeen(gateway.lastSeen) }}</p>
            </div>
          </div>
        </section>

        <!-- Connected Nodes Section -->
        <section class="space-y-4">
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
            @change-per-page="(value) => { nodesPerPage = value; nodesPage = 1; }"
          >
            <template #header>
              <div></div>
              <span class="text-xs text-gray-500">{{ nodesTotal }} connected nodes</span>
            </template>

            <template #head>
              <tr class="bg-slate-50 border-b border-gray-200">
                <th class="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">MAC</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">Registered</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">Last Seen</th>
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
                <td class="px-4 py-3 text-gray-700 text-xs">{{ node.mac || "N/A" }}</td>

                <!-- Status -->
                <td class="px-4 py-3 text-left font-semibold text-xs">
                  <span :class="statusTextClass(node.status)">{{ node.status }}</span>
                </td>

                <!-- Registered -->
                <td class="px-4 py-3 text-left font-semibold text-xs">
                  <span :class="registeredTextClass(node.registered)">
                    {{ String(node.registered) }}
                  </span>
                </td>

                <td class="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">
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
        </section>
      </template>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BaseModal from "../BaseModal.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import type { DeviceRow } from "@/types/devices-control";
import { formatIotDateTime } from "~~/config/iot-time-format";

const props = defineProps<{
  gateway: DeviceRow | null;
  nodes: DeviceRow[];
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const isOpen = ref(true);

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

function closeModal() {
  isOpen.value = false;
  emit("close");
}

watch(
  () => props.gateway,
  () => {
    isOpen.value = true;
  }
);

const gateway = computed(() => props.gateway);
const nodes = computed(() => props.nodes);

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

const statusTextClass = (status?: string | null) => {
  if (!status) return "text-gray-500 uppercase";
  const normalized = status.toLowerCase();
  if (normalized === "online") return "text-blue-600 uppercase";
  if (normalized === "offline") return "text-red-500 uppercase";
  return "text-gray-500 uppercase";
};

const registeredTextClass = (registered?: boolean | null) => {
  if (registered === true) return "text-blue-600 uppercase";
  if (registered === false) return "text-red-500 uppercase";
  return "text-gray-500 uppercase";
};
</script>

<style scoped>
/* Smooth table transitions */
table tbody tr {
  transition: background-color 150ms ease-in-out;
}
</style>
