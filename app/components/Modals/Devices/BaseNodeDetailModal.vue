<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    :max-width="maxWidth"
    panel-class="p-6 shadow-xl"
    @request-close="handleClose"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <LoadingState v-if="loading" message="Loading node details..." />

      <div
        v-else-if="!nodeView"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-center"
      >
        Node information is unavailable.
      </div>

      <template v-else>
        <section class="space-y-4">
          <div
            class="flex items-center justify-between border-b border-gray-200 pb-2"
          >
            <h4 class="text-xs font-semibold text-gray-700">
              Node Information
            </h4>
            <span class="text-[10px] uppercase tracking-wider text-gray-500">
              {{ nodeView.externalId }}
            </span>
          </div>

          <div
            class="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td
                    class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]"
                  >
                    Name
                  </td>
                  <td class="px-4 py-3 text-gray-900 break-all">
                    {{ nodeView.name }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td
                    class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]"
                  >
                    Type
                  </td>
                  <td class="px-4 py-3 text-gray-900">
                    {{ nodeView.type }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td
                    class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]"
                  >
                    Gateway ID
                  </td>
                  <td class="px-4 py-3 text-gray-900 break-all">
                    {{ nodeView.gatewayId }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td
                    class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]"
                  >
                    MAC
                  </td>
                  <td class="px-4 py-3 text-gray-900 break-all">
                    {{ nodeView.mac }}
                  </td>
                </tr>
                <tr>
                  <td
                    class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]"
                  >
                    Last Seen
                  </td>
                  <td class="px-4 py-3 text-gray-900">
                    {{ nodeView.lastSeen }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="space-y-4">
          <div
            class="flex items-center justify-between border-b border-gray-200 pb-2"
          >
            <h4 class="text-xs font-semibold text-gray-700">Assigned Maps</h4>
          </div>
          <div class="flex flex-col gap-3">
            <a-select
              v-model:value="selectedMapIds"
              :options="availableMapOptions"
              mode="multiple"
              size="middle"
              placeholder="Select maps to assign"
              class="w-full text-xs"
              :loading="isLoadingMaps"
              @popupScroll="popupScroll"
              :getPopupContainer="(triggerNode) => triggerNode.parentNode"
            ></a-select>
            <div class="flex justify-end">
              <button
                type="button"
                class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1.5 text-xs transition-colors"
                :disabled="isSavingMaps"
                @click="saveAssignedMaps"
              >
                <BootstrapIcon
                  v-if="isSavingMaps"
                  name="arrow-clockwise"
                  class="w-3 h-3 mr-1.5 animate-spin"
                />
                {{ isSavingMaps ? "Saving..." : "Save maps" }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="hasExtendedSlot" class="space-y-4">
          <div
            class="flex items-center justify-between border-b border-gray-200 pb-2"
          >
            <h4 class="text-xs font-semibold text-gray-700">
              {{ extendedTitle }}
            </h4>
            <slot name="extended-header" />
          </div>
          <div
            class="rounded-lg border border-gray-200 bg-white overflow-hidden"
          >
            <table class="w-full text-xs">
              <tbody>
                <slot />
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>

    <template v-if="hasFooterSlot" #footer>
      <slot name="footer" />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, useSlots, ref, watch } from "vue";
import LoadingState from "@/components/common/LoadingState.vue";
import BaseModal from "../BaseModal.vue";
import type { NodeInfo } from "@/types/devices-control";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import { message } from "ant-design-vue";

const popupScroll = () => {
  console.log("popupScroll");
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    node: NodeInfo | null;
    extendedTitle?: string;
    maxWidth?: string;
    loading?: boolean;
  }>(),
  {
    title: "Node Details",
    extendedTitle: "Extended Details",
    maxWidth: "max-w-3xl",
    loading: false,
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "close"): void;
}>();

const slots = useSlots();
const hasExtendedSlot = computed(() => Boolean(slots.default));
const hasFooterSlot = computed(() => Boolean(slots.footer));

const authStore = useAuthStore();
const isLoadingMaps = ref(false);
const isSavingMaps = ref(false);
const availableMaps = ref<any[]>([]);
const selectedMapIds = ref<number[]>([]);

import type { SelectProps } from "ant-design-vue";

const availableMapOptions = computed<SelectProps["options"]>(() => {
  return availableMaps.value.map((map) => ({
    label: String(map.name),
    value: Number(map.id),
  }));
});

async function fetchAvailableMaps() {
  if (!import.meta.client) return;
  isLoadingMaps.value = true;
  try {
    const res = await fetch(`${apiConfig.auth}/managed-areas`, {
      headers: { Authorization: authStore.authorizationHeader! },
    });
    if (!res.ok) throw new Error("Failed to fetch maps");
    const responseData = await res.json();
    let mapsArray = [];
    if (Array.isArray(responseData)) {
      mapsArray = responseData;
    } else if (responseData?.data && Array.isArray(responseData.data)) {
      mapsArray = responseData.data;
    } else if (
      responseData?.data?.data &&
      Array.isArray(responseData.data.data)
    ) {
      mapsArray = responseData.data.data;
    }
    availableMaps.value = mapsArray;
  } catch (error) {
    console.error(error);
  } finally {
    isLoadingMaps.value = false;
  }
}

async function fetchNodeAssignedMaps() {
  if (!import.meta.client || !props.node?.external_id) return;
  isLoadingMaps.value = true;
  try {
    const res = await fetch(
      `${apiConfig.controlModule}/nodes?external_id=${props.node.external_id}`,
      {
        headers: { Authorization: authStore.authorizationHeader! },
      },
    );
    if (!res.ok) throw new Error("Failed to fetch node details");
    const responseData = await res.json();
    let nodeData = null;
    if (responseData?.data && Array.isArray(responseData.data)) {
      nodeData = responseData.data[0];
    } else if (
      responseData?.data?.data &&
      Array.isArray(responseData.data.data)
    ) {
      nodeData = responseData.data.data[0];
    }
    if (nodeData && nodeData.managed_areas) {
      selectedMapIds.value = nodeData.managed_areas.map((m: any) => m.id);
    }
  } catch (error) {
    console.error(error);
  } finally {
    isLoadingMaps.value = false;
  }
}

async function saveAssignedMaps() {
  if (!props.node?.external_id) return;
  isSavingMaps.value = true;
  try {
    const res = await fetch(
      `${apiConfig.auth}/managed-areas/nodes/${props.node.external_id}`,
      {
        method: "POST",
        headers: {
          Authorization: authStore.authorizationHeader!,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ managed_area_ids: selectedMapIds.value }),
      },
    );
    if (!res.ok) throw new Error("Failed to assign maps");
    message.success("Maps assigned successfully.");
  } catch (error) {
    console.error(error);
    message.error("Device must be registered first.");
  } finally {
    isSavingMaps.value = false;
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      selectedMapIds.value = [];
      fetchAvailableMaps();
      fetchNodeAssignedMaps();
    }
  },
  { immediate: true },
);

const nodeView = computed(() => {
  const node = props.node as NodeInfo | null;
  if (!node) return null;

  return {
    id: formatValue(node.id ?? "--"),
    externalId: formatValue(node.external_id ?? "--"),
    name: formatValue(node.name ?? "--"),
    type: formatValue(node.type ?? "--"),
    gatewayId: formatValue(node.gateway_id ?? "--"),
    ip: formatValue(node.ip_address ?? "--"),
    mac: formatValue(node.mac_address ?? "--"),
    status: formatValue(node.status ?? "--"),
    registered:
      typeof node.registered === "boolean"
        ? node.registered
          ? "true"
          : "false"
        : "--",
    lastSeen: formatLastSeen(node.last_seen),
  };
});

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function formatLastSeen(value?: string | null) {
  return formatIotDateTime(value, {
    formatter: new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    fallback: "N/A",
  });
}

function handleClose() {
  emit("update:modelValue", false);
  emit("close");
}
</script>
