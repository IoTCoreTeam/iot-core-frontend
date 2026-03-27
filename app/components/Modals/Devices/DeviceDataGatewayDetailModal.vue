<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    :max-width="maxWidth"
    panel-class="p-6 shadow-xl"
    @request-close="handleClose"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <div
        v-if="!gatewayView"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-center"
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

          <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Name</td>
                  <td class="px-4 py-3 text-gray-900 break-all">{{ gatewayView.name }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">External ID</td>
                  <td class="px-4 py-3 text-gray-900 break-all">{{ gatewayView.externalId }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">MAC Address</td>
                  <td class="px-4 py-3 text-gray-900 break-all">{{ gatewayView.mac }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">IP Address</td>
                  <td class="px-4 py-3 text-gray-900 break-all">{{ gatewayView.ip }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Created At</td>
                  <td class="px-4 py-3 text-gray-900">{{ gatewayView.createdAt }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Updated At</td>
                  <td class="px-4 py-3 text-gray-900">{{ gatewayView.updatedAt }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BaseModal from "../BaseModal.vue";
import { formatIotDateTime } from "~~/config/iot-time-format";

type GatewayDetail = {
  id: string;
  external_id?: string | null;
  name?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    gateway: GatewayDetail | null;
    title?: string;
    maxWidth?: string;
  }>(),
  {
    title: "Gateway Details",
    maxWidth: "max-w-3xl",
  },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "close"): void;
}>();

const gatewayView = computed(() => {
  const gateway = props.gateway;
  if (!gateway) return null;

  const isDeleted = Boolean(gateway.deleted_at);
  return {
    name: formatValue(gateway.name),
    externalId: formatValue(gateway.external_id),
    mac: formatValue(gateway.mac_address),
    ip: formatValue(gateway.ip_address),
    createdAt: formatDateTime(gateway.created_at),
    updatedAt: formatDateTime(gateway.updated_at),
    deletedAt: formatDateTime(gateway.deleted_at),
    isDeleted,
  };
});

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function formatDateTime(value?: string | null) {
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
