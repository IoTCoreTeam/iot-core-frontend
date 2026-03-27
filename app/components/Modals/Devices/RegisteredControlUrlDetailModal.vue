<template>
  <BaseModal
    :model-value="modelValue"
    title="Registered Control URL Detail"
    max-width="max-w-3xl"
    panel-class="p-6 shadow-xl"
    @request-close="$emit('close')"
  >
    <div class="space-y-5 text-xs text-gray-700">
      <div
        v-if="!row"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-center text-gray-500"
      >
        Control URL detail is unavailable.
      </div>

      <template v-else>
        <section class="space-y-3">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <h4 class="text-xs font-semibold text-gray-700">Node Info</h4>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">External ID</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.nodeId) }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Name</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.nodeName) }}</td>
                </tr>
                <tr>
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Type</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.nodeType) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="space-y-3">
          <div class="flex items-center justify-between border-b border-gray-200 pb-2">
            <h4 class="text-xs font-semibold text-gray-700">Control URL Info</h4>
          </div>
          <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <table class="w-full text-xs">
              <tbody>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Controller ID</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.controllerId) }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Name</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.name) }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">URL</td>
                  <td class="px-4 py-3 text-gray-900 break-all">{{ formatValue(row.url) }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Input Type</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.inputType) }}</td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Created At</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.createdAt) }}</td>
                </tr>
                <tr>
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">Updated At</td>
                  <td class="px-4 py-3 text-gray-900">{{ formatValue(row.updatedAt) }}</td>
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
import BaseModal from "@/components/Modals/BaseModal.vue";
import type { DeviceRow } from "@/types/devices-control";

defineProps<{
  modelValue: boolean;
  row: DeviceRow | null;
}>();

defineEmits<{
  (event: "close"): void;
}>();

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}
</script>
