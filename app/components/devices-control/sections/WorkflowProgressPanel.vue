<template>
  <div class="rounded border border-slate-200 bg-slate-50 px-4 py-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="text-xs font-semibold bg-white">Workflow Progress</div>
      <button
        type="button"
        class="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
        aria-label="Clear workflow steps"
        title="Clear"
        @click="$emit('clear')"
      >
        <BootstrapIcon name="arrow-clockwise" class="h-4 w-3 cursor-pointer" />
      </button>
    </div>
    <div class="mt-3 text-[11px]">
      <a-steps
        :current="currentWorkflowStep"
        size="small"
        :status="workflowOverallStatus"
        direction="vertical"
        :progress-dot="true"
        class="workflow-progress-steps text-[11px]"
      >
        <a-step
          v-for="step in workflowSteps"
          :key="step.key"
          :title="step.title"
          :status="step.status"
          :description="step.description"
        />
      </a-steps>
      <div v-if="workflowErrorMessage" class="mt-2 text-[11px] text-red-600">
        {{ workflowErrorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type WorkflowStep = {
  key: string;
  title: string;
  status: "wait" | "process" | "finish" | "error";
  description?: string;
};

defineProps<{
  workflowSteps: WorkflowStep[];
  currentWorkflowStep: number;
  workflowOverallStatus: "wait" | "process" | "finish" | "error";
  workflowErrorMessage?: string | null;
}>();

defineEmits<{
  (e: "clear"): void;
}>();
</script>

<style scoped>
:deep(.workflow-progress-steps .ant-steps-item-icon .ant-steps-icon-dot) {
  width: 10px !important;
  height: 10px !important;
  border-radius: 9999px !important;
}

:deep(.workflow-progress-steps .ant-steps-item-wait .ant-steps-icon-dot),
:deep(.workflow-progress-steps .ant-steps-item-process .ant-steps-icon-dot),
:deep(.workflow-progress-steps .ant-steps-item-finish .ant-steps-icon-dot),
:deep(.workflow-progress-steps .ant-steps-item-error .ant-steps-icon-dot) {
  background-color: #2563eb !important;
}

:deep(.workflow-progress-steps .ant-steps-item-tail::after) {
  background-color: #cbd5e1 !important;
}
</style>
