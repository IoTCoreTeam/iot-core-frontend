<template>
  <transition name="modal-overlay" appear>
    <div
      v-if="isVisible"
      class="fixed inset-0 flex justify-center z-[9999] pt-4  "
    >
      <div class="absolute inset-0 bg-black/30" @click="handleBackdropClick" />

      <transition name="modal-slide" appear @after-leave="handleAfterLeave">
        <div
          class="relative bg-white rounded-lg border border-gray-200 z-[10000] h-fit w-full"
          :class="[panelClass, maxWidth]"
        >
          <div
            v-if="hasHeader"
            class="flex justify-between items-center mb-4"
            :class="headerClass"
          >
            <slot name="header">
              <h3 v-if="title" class="text-sm font-semibold text-gray-800">
                {{ title }}
              </h3>
              <button
                v-if="showCloseButton"
                type="button"
                class="text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="closeDisabled"
                @click="handleCloseClick"
              >
                <svg
                  class="w-5 h-5 cursor-pointer"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </slot>
          </div>

          <slot />

          <div v-if="hasFooter" :class="footerClass">
            <slot name="footer" />
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, ref, useSlots, watch } from "vue";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: "" },
  showCloseButton: { type: Boolean, default: true },
  closeDisabled: { type: Boolean, default: false },
  closeOnBackdrop: { type: Boolean, default: true },
  maxWidth: { type: String, default: "max-w-md" },
  panelClass: { type: String, default: "p-6 shadow-xl" },
  headerClass: { type: String, default: "" },
  footerClass: { type: String, default: "mt-4" },
});

const emit = defineEmits(["request-close", "after-leave"]);

const slots = useSlots();
const isVisible = ref(props.modelValue);
const loadingTasks = ref<Record<string, boolean>>({});

watch(
  () => props.modelValue,
  (value) => {
    isVisible.value = value;
  }
);

const hasHeader = computed(() => !!props.title || !!slots.header);
const hasFooter = computed(() => !!slots.footer);

function handleCloseClick() {
  if (props.closeDisabled) return;
  emit("request-close");
}

function handleBackdropClick() {
  if (!props.closeOnBackdrop || props.closeDisabled) return;
  emit("request-close");
}

function handleAfterLeave() {
  emit("after-leave");
}

function setTaskLoading(taskKey: string, value: boolean) {
  loadingTasks.value = {
    ...loadingTasks.value,
    [taskKey]: value,
  };
}

function isTaskLoading(taskKey: string) {
  return Boolean(loadingTasks.value[taskKey]);
}

async function runWithLoading<T>(taskKey: string, task: () => Promise<T>) {
  setTaskLoading(taskKey, true);
  try {
    return await task();
  } finally {
    setTaskLoading(taskKey, false);
  }
}

defineExpose({
  runWithLoading,
  isTaskLoading,
});
</script>

