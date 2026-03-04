<template>
  <BaseModal
    :model-value="modelValue"
    title="Control URL Details"
    max-width="max-w-5xl"
    panel-class="p-6 shadow-xl"
    @request-close="handleClose"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <div
        v-if="!controlUrl"
        class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500 text-center"
      >
        Control URL information is unavailable.
      </div>

      <template v-else>
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
              <h4 class="text-xs font-semibold text-gray-700">Node</h4>
              <span class="text-[10px] uppercase tracking-wider text-gray-500">
                {{ formatValue(controlUrl.node?.external_id) }}
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
                      {{ formatValue(controlUrl.node?.name) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      Type
                    </td>
                    <td class="px-4 py-3 text-gray-900">
                      {{ formatValue(controlUrl.node?.type) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      MAC
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrl.node?.mac_address) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section class="space-y-4">
            <div class="flex items-center justify-between pb-3 border-b border-gray-200">
              <h4 class="text-xs font-semibold text-gray-700">Gateway</h4>
              <span class="text-[10px] uppercase tracking-wider text-gray-500">
                {{ formatValue(controlUrl.node?.gateway?.external_id) }}
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
                      {{ formatValue(controlUrl.node?.gateway?.name) }}
                    </td>
                  </tr>
                  <tr class="border-b border-gray-100">
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      MAC
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrl.node?.gateway?.mac_address) }}
                    </td>
                  </tr>
                  <tr>
                    <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                      IP
                    </td>
                    <td class="px-4 py-3 text-gray-900 break-all">
                      {{ formatValue(controlUrl.node?.gateway?.ip_address) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section v-if="isAnalog" class="space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-gray-200">
            <h4 class="text-xs font-semibold text-gray-700">Analog Signal</h4>
            <button
              type="button"
              class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-60 pointer-events-auto"
              :disabled="isSavingAnalog"
              @click.prevent.stop="handleSaveAnalogSignal"
            >
              {{ isSavingAnalog ? "Saving..." : "Save" }}
            </button>
          </div>

          <div class="rounded-lg border border-gray-200 bg-white p-4">
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div class="flex items-center gap-3">
                <label class="w-32 text-[10px] text-gray-500 uppercase tracking-wider">
                  Min Value
                </label>
                <input
                  v-model="analogForm.min_value"
                  type="number"
                  step="0.0001"
                  class="w-full border-0 border-b border-gray-200 px-0 py-1 text-xs focus:border-blue-500 focus:ring-0 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div class="flex items-center gap-3">
                <label class="w-32 text-[10px] text-gray-500 uppercase tracking-wider">
                  Max Value
                </label>
                <input
                  v-model="analogForm.max_value"
                  type="number"
                  step="0.0001"
                  class="w-full border-0 border-b border-gray-200 px-0 py-1 text-xs focus:border-blue-500 focus:ring-0 focus:outline-none"
                  placeholder="100"
                />
              </div>
              <div class="flex items-center gap-3">
                <label class="w-32 text-[10px] text-gray-500 uppercase tracking-wider">
                  Unit
                </label>
                <input
                  v-model="analogForm.unit"
                  type="text"
                  class="w-full border-0 border-b border-gray-200 px-0 py-1 text-xs focus:border-blue-500 focus:ring-0 focus:outline-none"
                  placeholder="e.g. %"
                />
              </div>
              <div class="flex items-center gap-3">
                <label class="w-32 text-[10px] text-gray-500 uppercase tracking-wider">
                  Signal Type
                </label>
                <input
                  v-model="analogForm.signal_type"
                  type="text"
                  class="w-full border-0 border-b border-gray-200 px-0 py-1 text-xs focus:border-blue-500 focus:ring-0 focus:outline-none"
                  placeholder="e.g. pwm"
                />
              </div>
              <div class="flex items-center gap-3">
                <label class="w-32 text-[10px] text-gray-500 uppercase tracking-wider">
                  Resolution Bits
                </label>
                <input
                  v-model="analogForm.resolution_bits"
                  type="number"
                  step="1"
                  class="w-full border-0 border-b border-gray-200 px-0 py-1 text-xs focus:border-blue-500 focus:ring-0 focus:outline-none"
                  placeholder="12"
                />
              </div>
            </div>
          </div>
        </section>

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
                    {{ formatValue(controlUrl.name) }}
                  </td>
                </tr>
                <tr class="border-b border-gray-100">
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                    URL
                  </td>
                  <td class="px-4 py-3 text-gray-900 break-all">
                    {{ formatValue(controlUrl.url) }}
                  </td>
                </tr>
                <tr>
                  <td class="w-40 px-4 py-3 text-gray-500 uppercase tracking-wider text-[10px]">
                    Input Type
                  </td>
                  <td class="px-4 py-3 text-gray-900">
                    {{ formatValue(controlUrl.input_type) }}
                  </td>
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
import { computed, reactive, ref, watch } from "vue";
import { message } from "ant-design-vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import BaseModal from "../BaseModal.vue";

type ControlAnalogSignal = {
  id?: string | null;
  control_url_id?: string | null;
  min_value?: number | string | null;
  max_value?: number | string | null;
  unit?: string | null;
  signal_type?: string | null;
  resolution_bits?: number | string | null;
};

type ControlUrlItem = {
  id: string;
  name?: string | null;
  url?: string | null;
  input_type?: string | null;
  analog_signal?: ControlAnalogSignal | null;
  analogSignal?: ControlAnalogSignal | null;
  node?: {
    id?: string | null;
    name?: string | null;
    external_id?: string | null;
    mac_address?: string | null;
    ip_address?: string | null;
    type?: string | null;
    gateway?: {
      id?: string | null;
      name?: string | null;
      external_id?: string | null;
      mac_address?: string | null;
      ip_address?: string | null;
    } | null;
  } | null;
};

const props = defineProps<{
  modelValue: boolean;
  controlUrl: ControlUrlItem | null;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "close"): void;
  (e: "save-analog", value: ControlAnalogSignal): void;
}>();

const authStore = useAuthStore();
const isSavingAnalog = ref(false);
const isLoadingAnalog = ref(false);
const analogSignal = ref<ControlAnalogSignal | null>(null);
const analogForm = reactive({
  min_value: "",
  max_value: "",
  unit: "",
  signal_type: "",
  resolution_bits: "",
});

const isAnalog = computed(() => {
  const raw = String(props.controlUrl?.input_type ?? "").trim().toLowerCase();
  return raw.includes("analog");
});

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

function resolveAnalogSignal(item: ControlUrlItem | null) {
  if (!item) return null;
  return item.analog_signal ?? item.analogSignal ?? null;
}

function hydrateAnalogForm(signal: ControlAnalogSignal | null) {
  analogForm.min_value = signal?.min_value?.toString() ?? "";
  analogForm.max_value = signal?.max_value?.toString() ?? "";
  analogForm.unit = signal?.unit ?? "";
  analogForm.signal_type = signal?.signal_type ?? "";
  analogForm.resolution_bits = signal?.resolution_bits?.toString() ?? "";
}

async function handleSaveAnalogSignal() {
  if (!props.controlUrl || !isAnalog.value) {
    return;
  }

  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }

  const maxValueRaw = String(analogForm.max_value ?? "").trim();
  const maxValue = maxValueRaw ? Number(maxValueRaw) : NaN;
  const minValueRaw = String(analogForm.min_value ?? "").trim();
  const minValue = minValueRaw ? Number(minValueRaw) : 0;
  const resolutionBits = Number(analogForm.resolution_bits);
  const unit = String(analogForm.unit ?? "").trim();
  const signalType = String(analogForm.signal_type ?? "").trim();

  if (!maxValueRaw || !Number.isFinite(maxValue)) {
    message.warning("Max value is required.");
    return;
  }
  if (!Number.isFinite(minValue)) {
    message.warning("Min value must be a number.");
    return;
  }
  if (!unit) {
    message.warning("Unit is required.");
    return;
  }
  if (!signalType) {
    message.warning("Signal type is required.");
    return;
  }
  if (!Number.isInteger(resolutionBits) || resolutionBits <= 0) {
    message.warning("Resolution bits must be a positive integer.");
    return;
  }

  if (!apiConfig.controlModule) {
    message.error("Missing control module configuration.");
    return;
  }

  const endpoint = `${apiConfig.controlModule.replace(/\/$/, "")}/control-analog-signals/createorupdate`;
  isSavingAnalog.value = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: authorization,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        control_url_id: props.controlUrl.id,
        min_value: minValue,
        max_value: maxValue,
        unit,
        signal_type: signalType,
        resolution_bits: resolutionBits,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to save analog signal.");
    }
    analogSignal.value = payload?.data ?? null;
    hydrateAnalogForm(analogSignal.value);
    if (analogSignal.value) {
      emit("save-analog", analogSignal.value);
    }
    message.success("Analog signal saved.");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to save analog signal.");
  } finally {
    isSavingAnalog.value = false;
  }
}

function handleClose() {
  emit("update:modelValue", false);
  emit("close");
}

async function fetchAnalogSignal(controlUrlId: string) {
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    return;
  }
  if (!apiConfig.controlModule) {
    return;
  }
  isLoadingAnalog.value = true;
  try {
    const endpoint = `${apiConfig.controlModule.replace(/\/$/, "")}/control-analog-signals?control_url_id=${encodeURIComponent(controlUrlId)}`;
    const response = await fetch(endpoint, {
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load analog signal.");
    }
    analogSignal.value = payload?.data ?? null;
    hydrateAnalogForm(analogSignal.value);
    if (analogSignal.value) {
      message.success("Analog signal loaded.");
    } else {
      message.info("No analog signal data yet.");
    }
  } catch (error: any) {
    message.error(error?.message ?? "Failed to load analog signal.");
  } finally {
    isLoadingAnalog.value = false;
  }
}

watch(
  () => props.controlUrl,
  (value) => {
    analogSignal.value = resolveAnalogSignal(value ?? null);
    hydrateAnalogForm(analogSignal.value);
    if (props.modelValue && isAnalog.value && value?.id) {
      fetchAnalogSignal(value.id);
    }
  },
  { immediate: true },
);
</script>
