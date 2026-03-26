import { computed, ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import { runWorkflow, stopWorkflow } from "@/composables/Scenario/handleWorkflow";
import type { WorkflowRuntimeState } from "@/composables/Scenario/scenarioBuilderTypes";

type WorkflowStep = {
  key: string;
  title: string;
  status: "wait" | "process" | "finish" | "error";
  description?: string;
};

export function useScenarioWorkflowRuntime(params: {
  authorizationHeader: Ref<string | null | undefined>;
  hasMissingActionNodes: Ref<boolean>;
  queueStreamBase: Ref<string>;
  scenarioId: Ref<string | number>;
  shouldTurnOffDevicesBeforeRun: Ref<boolean>;
  onRuntimeStateChange: (payload: {
    runId?: string | null;
    state: WorkflowRuntimeState;
    workflowId: string;
  }) => void;
}) {
  const workflowSteps = ref<WorkflowStep[]>([]);
  const currentWorkflowStep = ref(0);
  const workflowErrorMessage = ref<string | null>(null);
  const workflowOverallStatus = computed(() => {
    if (workflowSteps.value.some((step) => step.status === "error")) {
      return "error";
    }
    return "process";
  });
  const queueStream = ref<EventSource | null>(null);
  const currentWorkflowRunId = ref<string | null>(null);
  const workflowRuntimeState = ref<WorkflowRuntimeState>("idle");
  const isStoppingFlow = ref(false);
  const isFlowActive = computed(
    () =>
      workflowRuntimeState.value === "queued" ||
      workflowRuntimeState.value === "running" ||
      workflowRuntimeState.value === "stopping",
  );
  const runButtonLabel = computed(() => {
    if (workflowRuntimeState.value === "queued") return "Queued...";
    if (workflowRuntimeState.value === "running") return "Running...";
    if (workflowRuntimeState.value === "stopping") return "Stopping...";
    return "Run";
  });

  function emitRuntimeState(state: WorkflowRuntimeState) {
    workflowRuntimeState.value = state;
    params.onRuntimeStateChange({
      workflowId: String(params.scenarioId.value),
      state,
      runId: currentWorkflowRunId.value,
    });
  }

  function pushWorkflowStep(step: {
    title: string;
    status: "wait" | "process" | "finish" | "error";
    description?: string;
  }) {
    workflowSteps.value.push({
      key: `step-${Date.now()}-${workflowSteps.value.length}`,
      title: step.title,
      status: step.status,
      description: step.description,
    });
    if (workflowSteps.value.length > 80) {
      workflowSteps.value.splice(0, workflowSteps.value.length - 80);
    }
    currentWorkflowStep.value = Math.max(0, workflowSteps.value.length - 1);
  }

  function resetWorkflowSteps() {
    workflowSteps.value = [];
    pushWorkflowStep({
      title: "Command Tracking",
      status: "process",
      description: "Listening for real-time command status updates.",
    });
    currentWorkflowStep.value = 0;
    workflowErrorMessage.value = null;
  }

  function resolvePayloadRunId(payload: any) {
    const runId = payload?.run_id ?? payload?.job?.run_id ?? null;
    const text = String(runId ?? "").trim();
    return text || null;
  }

  function resolvePayloadWorkflowId(payload: any) {
    const workflowId = payload?.workflow_id ?? payload?.job?.workflow_id ?? null;
    const text = String(workflowId ?? "").trim();
    return text || null;
  }

  function shouldHandleWorkflowPayload(payload: any) {
    const payloadWorkflowId = resolvePayloadWorkflowId(payload);
    const activeWorkflowId = String(params.scenarioId.value ?? "").trim();
    if (payloadWorkflowId && activeWorkflowId && payloadWorkflowId !== activeWorkflowId) {
      return false;
    }

    const activeRunId = String(currentWorkflowRunId.value ?? "").trim();
    if (!activeRunId) {
      return true;
    }

    const payloadRunId = resolvePayloadRunId(payload);
    if (!payloadRunId) {
      return !payloadWorkflowId || payloadWorkflowId === activeWorkflowId;
    }
    return payloadRunId === activeRunId;
  }

  function formatStepTime(value?: string | null) {
    if (!value) return "--:--:--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--:--:--";
    return date.toLocaleTimeString("vi-VN", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function handleQueueStatus(payload: any) {
    if (!shouldHandleWorkflowPayload(payload)) {
      return;
    }
    const status = String(payload?.status ?? "");
    const job = payload?.job ?? {};
    const timeText = formatStepTime(payload?.ts);
    const controlTarget = [job?.gateway_id, job?.node_id, job?.device]
      .filter(Boolean)
      .join(" / ");
    const stateRaw = String(job?.state ?? "").trim().toUpperCase();
    const stateText = stateRaw || "RUN";
    const durationSeconds =
      Number.isFinite(Number(job?.delayMs)) && Number(job?.delayMs) > 0
        ? Math.round(Number(job.delayMs) / 1000)
        : null;
    const commandMeta =
      durationSeconds && durationSeconds > 0
        ? `(${stateText}, ${durationSeconds}s)`
        : `(${stateText})`;
    const targetText = controlTarget
      ? `${controlTarget} ${commandMeta}`
      : `Control command ${commandMeta}`;
    switch (status) {
      case "dispatched":
        pushWorkflowStep({
          title: `Command Started (${timeText})`,
          status: "process",
          description: targetText,
        });
        break;
      case "completed":
        pushWorkflowStep({
          title: `Command Finished (${timeText})`,
          status: "finish",
          description: targetText,
        });
        break;
      case "failed":
        workflowErrorMessage.value = payload?.error ?? "Command failed.";
        pushWorkflowStep({
          title: `Command Finished (${timeText})`,
          status: "error",
          description: `${targetText} - failed: ${workflowErrorMessage.value}`,
        });
        break;
      default:
        break;
    }
  }

  function handleWorkflowStatus(payload: any) {
    if (!shouldHandleWorkflowPayload(payload)) {
      return;
    }
    const status = String(payload?.status ?? "").trim();
    const timeText = formatStepTime(payload?.ts);
    const runId = resolvePayloadRunId(payload);
    if (runId) {
      currentWorkflowRunId.value = runId;
    }

    switch (status) {
      case "workflow_started":
        emitRuntimeState("running");
        pushWorkflowStep({
          title: `Workflow Started (${timeText})`,
          status: "finish",
          description: "Workflow execution has started.",
        });
        break;
      case "workflow_completed":
        emitRuntimeState("idle");
        pushWorkflowStep({
          title: `Workflow Completed (${timeText})`,
          status: "finish",
          description: "Workflow execution completed.",
        });
        break;
      case "workflow_stopped":
        emitRuntimeState("idle");
        pushWorkflowStep({
          title: `Workflow Stopped (${timeText})`,
          status: "finish",
          description: "Workflow was stopped.",
        });
        break;
      case "workflow_failed":
        emitRuntimeState("error");
        workflowErrorMessage.value = payload?.error ?? "Workflow failed.";
        pushWorkflowStep({
          title: `Workflow Failed (${timeText})`,
          status: "error",
          description: workflowErrorMessage.value ?? undefined,
        });
        break;
      default:
        break;
    }
  }

  function disconnectQueueStream() {
    if (queueStream.value) {
      queueStream.value.close();
      queueStream.value = null;
    }
  }

  function connectQueueStream() {
    if (!import.meta.client) return;
    if (!params.queueStreamBase.value) return;
    if (!params.authorizationHeader.value) return;
    disconnectQueueStream();
    const endpoint = `${params.queueStreamBase.value}/events/control-queue`;
    const source = new EventSource(endpoint);
    source.addEventListener("ready", () => {
      pushWorkflowStep({
        title: "Tracking Connected",
        status: "finish",
        description: "Command status will update automatically.",
      });
    });
    source.addEventListener("control-queue-status", (event) => {
      const payload = JSON.parse((event as MessageEvent).data ?? "{}");
      handleQueueStatus(payload);
    });
    source.addEventListener("workflow-status", (event) => {
      const payload = JSON.parse((event as MessageEvent).data ?? "{}");
      handleWorkflowStatus(payload);
    });
    source.onerror = () => {
      pushWorkflowStep({
        title: "Tracking Disconnected",
        status: "error",
        description: "Unable to receive new status from server.",
      });
    };
    queueStream.value = source;
  }

  async function runFlow() {
    if (!import.meta.client) return;
    if (isFlowActive.value) return;
    if (params.hasMissingActionNodes.value) {
      message.error("Cannot run because some actions no longer exist.");
      return;
    }
    const authorization = params.authorizationHeader.value;
    if (!authorization) {
      message.error("Missing authorization.");
      return;
    }
    resetWorkflowSteps();
    currentWorkflowRunId.value = null;
    emitRuntimeState("queued");
    message.info("Scenario is starting...");
    try {
      const result = await runWorkflow(params.scenarioId.value, authorization, {
        turn_off_devices_before_run: params.shouldTurnOffDevicesBeforeRun.value,
      });
      const runId = String(result?.data?.run_id ?? result?.run_id ?? "").trim();
      currentWorkflowRunId.value = runId || null;
      pushWorkflowStep({
        title: "Workflow Queued",
        status: "finish",
        description: params.shouldTurnOffDevicesBeforeRun.value
          ? "Workflow is queued (devices will be turned off first)."
          : "Workflow is queued (keep current device states).",
      });
    } catch (error: any) {
      emitRuntimeState("error");
      workflowErrorMessage.value = error?.message ?? "Failed to run scenario.";
      message.error(workflowErrorMessage.value);
    } finally {
      isStoppingFlow.value = false;
    }
  }

  async function stopFlow() {
    if (!import.meta.client) return;
    if (isStoppingFlow.value) return;
    const authorization = params.authorizationHeader.value;
    if (!authorization) {
      message.error("Missing authorization.");
      return;
    }
    isStoppingFlow.value = true;
    emitRuntimeState("stopping");
    try {
      await stopWorkflow(params.scenarioId.value, authorization);
      currentWorkflowRunId.value = null;
      emitRuntimeState("idle");
      message.success("Scenario stopped.");
    } catch (error: any) {
      emitRuntimeState("error");
      message.error(error?.message ?? "Failed to stop scenario.");
    } finally {
      isStoppingFlow.value = false;
    }
  }

  return {
    connectQueueStream,
    currentWorkflowRunId,
    currentWorkflowStep,
    disconnectQueueStream,
    isFlowActive,
    isStoppingFlow,
    resetWorkflowSteps,
    runButtonLabel,
    runFlow,
    stopFlow,
    workflowErrorMessage,
    workflowOverallStatus,
    workflowRuntimeState,
    workflowSteps,
  };
}
