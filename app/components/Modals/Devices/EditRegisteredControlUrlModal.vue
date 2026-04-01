<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    max-width="max-w-3xl"
    panel-class="p-6 shadow-xl"
    @request-close="handleClose"
  >
    <div class="space-y-6 text-xs text-gray-700">
      <section class="space-y-4">
        <div class="flex items-center justify-between border-b border-gray-200 pb-2">
          <h4 class="text-xs font-semibold text-gray-700">Control URL Information</h4>
          <span class="text-[10px] uppercase tracking-wider text-gray-500">
            {{ displayValue(form.node_external_id) }}
          </span>
        </div>

        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table class="w-full text-xs">
            <tbody>
              <tr class="border-b border-gray-100">
                <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                  Node External ID
                </td>
                <td class="px-4 py-3 text-gray-900 break-all">
                  <input
                    :value="form.node_external_id"
                    type="text"
                    class="w-full rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500 outline-none"
                    disabled
                  />
                </td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                  Controller ID
                </td>
                <td class="px-4 py-3 text-gray-900">
                  <input
                    v-model="form.controller_id"
                    type="text"
                    class="w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  />
                </td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                  Control URL Name
                </td>
                <td class="px-4 py-3 text-gray-900">
                  <input
                    v-model="form.name"
                    type="text"
                    class="w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  />
                </td>
              </tr>
              <tr class="border-b border-gray-100">
                <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                  Input Type
                </td>
                <td class="px-4 py-3 text-gray-900">
                  <input
                    v-model="form.input_type"
                    type="text"
                    class="w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  />
                </td>
              </tr>
              <tr>
                <td class="w-40 px-4 py-3 text-[10px] uppercase tracking-wider text-gray-500">
                  URL
                </td>
                <td class="px-4 py-3 text-gray-900">
                  <textarea
                    v-model="form.url"
                    rows="3"
                    class="w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-900 outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="rounded border border-gray-300 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          :disabled="isSaving"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          type="button"
          class="inline-flex items-center rounded bg-blue-600 px-4 py-1.5 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSaving"
          @click="emit('save')"
        >
          <BootstrapIcon
            v-if="isSaving"
            name="arrow-clockwise"
            class="mr-1.5 h-3 w-3 animate-spin"
          />
          {{ isSaving ? "Saving..." : "Update" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from "../BaseModal.vue";

type EditRegisteredControlUrlForm = {
  id: string;
  node_id: string;
  node_external_id: string;
  controller_id: string;
  name: string;
  url: string;
  input_type: string;
};

withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
    isSaving?: boolean;
    form: EditRegisteredControlUrlForm;
  }>(),
  {
    title: "Edit Control URL",
    isSaving: false,
  },
);

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save"): void;
}>();

function displayValue(value?: string | null) {
  return value && value.trim() ? value : "N/A";
}

function handleClose() {
  emit("close");
}
</script>
