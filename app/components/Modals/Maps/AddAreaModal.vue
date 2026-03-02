<template>
  <BaseModal
    :model-value="isOpen"
    title="Add New Area"
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
          v-model="area.name"
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
          v-model="area.height_m"
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
          v-model="area.description"
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
          {{ isSubmitting ? "Adding..." : "Add" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { message } from "ant-design-vue";
import BaseModal from "../BaseModal.vue";

interface AreaForm {
  name: string;
  description: string;
  height_m: string;
}

const emit = defineEmits(["close", "save"]);

const isOpen = ref(true);
const isSubmitting = ref(false);

const area = ref<AreaForm>({
  name: "",
  description: "",
  height_m: "3.5",
});

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

function resetForm() {
  area.value = {
    name: "",
    description: "",
    height_m: "3.5",
  };
}

function submitForm() {
  if (!area.value.name) {
    message.warning("Please fill in the required fields.");
    return;
  }

  isSubmitting.value = true;
  emit("save", { ...area.value });
  resetForm();
  scheduleClose();
  isSubmitting.value = false;
}
</script>
