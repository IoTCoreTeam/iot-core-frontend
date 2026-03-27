<template>
  <BaseModal
    :model-value="modelValue"
    title="Command Detail"
    max-width="max-w-4xl"
    panel-class="p-6 shadow-xl"
    @request-close="$emit('close')"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <div
        v-if="!row"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-center"
      >
        Command information is unavailable.
      </div>

      <template v-else>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
              <h4 class="text-xs font-semibold text-gray-700">Control URL</h4>
              
            </div>

            <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <table class="w-full text-xs">
                <tbody>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Name
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrlMeta.name) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      URL
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrlMeta.url) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Input Type
                    </td>
                    <td class="px-4 py-3 text-gray-900">
                      {{ formatValue(controlUrlMeta.inputType) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Controller ID
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrlMeta.controllerId) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Node ID
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrlMeta.nodeExternalId ?? controlUrlMeta.nodeId) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Gateway ID
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrlMeta.gatewayId) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="space-y-4 lg:pl-6 lg:border-l lg:border-gray-200">
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
              <h4 class="text-xs font-semibold text-gray-700">Command</h4>
              <span class="text-[10px] uppercase tracking-wider text-gray-500">
                {{ formatValue(commandDetail.type) }}
              </span>
            </div>

            <div class="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <table class="w-full text-xs">
                <tbody>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Name
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(commandDetail.name ?? row.name) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Created At
                    </td>
                    <td class="px-4 py-3 text-gray-900">
                      {{ formatValue(row.createdAt) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Updated At
                    </td>
                    <td class="px-4 py-3 text-gray-900">
                      {{ formatValue(row.updatedAt) }}
                    </td>
                  </tr>
                  <template v-if="commandDetail.type === 'analog_signal'">
                    <tr class="border-b border-gray-100">
                      <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                        Min Value
                      </td>
                      <td class="px-4 py-3 text-gray-900">
                        {{ formatValue(commandDetail.minValue) }}
                      </td>
                    </tr>
                    <tr class="border-b border-gray-100">
                      <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                        Max Value
                      </td>
                      <td class="px-4 py-3 text-gray-900">
                        {{ formatValue(commandDetail.maxValue) }}
                      </td>
                    </tr>
                    <tr class="border-b border-gray-100">
                      <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                        Unit
                      </td>
                      <td class="px-4 py-3 text-gray-900">
                        {{ formatValue(commandDetail.unit) }}
                      </td>
                    </tr>
                    <tr class="border-b border-gray-100">
                      <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                        Signal Type
                      </td>
                      <td class="px-4 py-3 text-gray-900">
                        {{ formatValue(commandDetail.signalType) }}
                      </td>
                    </tr>
                    <tr>
                      <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                        Resolution Bits
                      </td>
                      <td class="px-4 py-3 text-gray-900">
                        {{ formatValue(commandDetail.resolutionBits) }}
                      </td>
                    </tr>
                  </template>
                  <tr v-else>
                    <td colspan="2" class="px-4 py-3 text-gray-900">
                      <div class="mb-2 text-gray-500 uppercase tracking-wider text-[10px]">
                        JSON Payload
                      </div>
                      <pre class="block w-full max-h-[40vh] overflow-y-auto rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] leading-6 whitespace-pre-wrap break-all">{{ commandPayloadText }}</pre>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </template>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed } from "vue";
import BaseModal from "@/components/Modals/BaseModal.vue";
import type { DeviceRow } from "@/types/devices-control";

const props = defineProps<{
  modelValue: boolean;
  row: DeviceRow | null;
}>();

defineEmits<{
  (event: "close"): void;
}>();

const controlUrlMeta = computed(() => props.row?.controlUrlMeta ?? {});
const commandDetail = computed(() => props.row?.commandDetail ?? {});

const commandPayloadText = computed(() => {
  const payload = commandDetail.value.command;
  if (payload === null || payload === undefined || payload === "") return "N/A";
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
});

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}
</script>
