<template>
  <BaseModal
    :model-value="isOpen"
    title="Area Details"
    max-width="max-w-2xl"
    panel-class="p-6 py-4 shadow-xl"
    :close-disabled="isSubmitting"
    @request-close="handleClose"
  >
    <form
      class="grid grid-cols-1 gap-4 md:grid-cols-2"
      @submit.prevent="submitForm"
    >
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">Name</label>
        <input
          v-model="areaForm.name"
          type="text"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Production Zone"
          required
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Height (m)
        </label>
        <input
          v-model="areaForm.height_m"
          type="number"
          step="0.1"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. 3.5"
          min="0"
        />
      </div>

      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Description
        </label>
        <textarea
          v-model="areaForm.description"
          rows="4"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Short description for this area"
        ></textarea>
      </div>

      <div class="mt-4 flex justify-end space-x-3 md:col-span-2">
        <button
          type="button"
          :disabled="isSubmitting"
          class="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? "Saving..." : "Save Changes" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { message } from "ant-design-vue";
import BaseModal from "../BaseModal.vue";

type AreaDetail = {
  id: number;
  name: string;
  description?: string | null;
  height_m?: number | null;
};

const props = defineProps<{
  area: AreaDetail | null;
}>();

const emit = defineEmits(["close", "save"]);

const isOpen = ref(true);
const isSubmitting = ref(false);

const areaForm = ref({
  name: "",
  description: "",
  height_m: "3.5",
});

function normalizeDetailArea(input?: AreaDetail | null) {
  return {
    name: input?.name ?? "",
    description: input?.description ?? "",
    height_m: input?.height_m ? String(input.height_m) : "3.5",
  };
}

function handleClose() {
  if (isSubmitting.value) return;
  scheduleClose();
}

let closeTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleClose() {
  isOpen.value = false;
  if (closeTimer) {
    clearTimeout(closeTimer);
  }
  closeTimer = setTimeout(() => emit("close"), 450);
}

function submitForm() {
  if (!props.area?.id) {
    message.error("Area ID is missing.");
    return;
  }
  if (!areaForm.value.name) {
    message.warning("Please fill in the required fields.");
    return;
  }

  isSubmitting.value = true;
  emit("save", { ...areaForm.value, id: props.area.id });
  scheduleClose();
  isSubmitting.value = false;
}

watch(
  () => props.area,
  (value) => {
    areaForm.value = normalizeDetailArea(value);
  },
  { deep: true, immediate: true }
);
</script>
