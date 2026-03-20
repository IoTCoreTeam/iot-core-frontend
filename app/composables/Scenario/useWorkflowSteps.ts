import { computed, ref, type Ref } from "vue";
import type { Node } from "@vue-flow/core";

export type WorkflowStepStatus = "wait" | "process" | "finish" | "error";

export type WorkflowStep = {
  key: string;
  title: string;
  status: WorkflowStepStatus;
  description?: string;
  controlUrlId?: string | null;
};

type WorkflowNodeData = {
  label?: string;
  kind?: "start" | "action" | "condition" | "end" | string;
  control_url_id?: string | null;
};

export function useWorkflowSteps(params: {
  nodes: Ref<Node<WorkflowNodeData>[]>;
  resolveControlUrlLabel: (controlUrlId: string) => string | null;
}) {
  const workflowSteps = ref<WorkflowStep[]>([]);
  const currentWorkflowStep = ref<number>(0);
  const workflowErrorMessage = ref<string | null>(null);
  const hasWorkflowCompleted = ref(false);
  const lastNodeStepIndex = ref<number | null>(null);
  const lastNodeContext = ref<{
    label: string;
    controlUrlId?: string | null;
  } | null>(null);

  const workflowOverallStatus = computed(() => {
    if (workflowSteps.value.some((step) => step.status === "error")) {
      return "error";
    }
    if (hasWorkflowCompleted.value) {
      return "finish";
    }
    return "process";
  });

  function resetWorkflowSteps() {
    workflowSteps.value = [];
    currentWorkflowStep.value = 0;
    workflowErrorMessage.value = null;
    hasWorkflowCompleted.value = false;
    lastNodeStepIndex.value = null;
    lastNodeContext.value = null;
  }

  function seedWorkflowSteps() {
    workflowSteps.value = [
      {
        key: "check-devices",
        title: "Check devices in workflow",
        status: "process",
      },
      {
        key: "shutdown-devices",
        title: "Shutdown all devices",
        status: "wait",
      },
    ];
    currentWorkflowStep.value = 0;
  }

  function findStepByKey(key: string) {
    return workflowSteps.value.find((step) => step.key === key) ?? null;
  }

  function updateStepStatus(key: string, status: WorkflowStepStatus, description?: string) {
    const step = findStepByKey(key);
    if (!step) return;
    step.status = status;
    if (description !== undefined) {
      step.description = description;
    }
  }

  function finalizeLastNodeStep(status: WorkflowStepStatus = "finish") {
    if (lastNodeStepIndex.value === null) return;
    const step = workflowSteps.value[lastNodeStepIndex.value];
    if (!step) return;
    if (step.status !== "error") {
      step.status = status;
    }
  }

  function ensureEndStep(status: WorkflowStepStatus = "finish") {
    const existing = findStepByKey("end");
    if (existing) {
      existing.status = status;
      return;
    }
    workflowSteps.value.push({
      key: "end",
      title: "End",
      status,
    });
  }

  function updateCurrentNodeDescription(description: string) {
    if (lastNodeStepIndex.value === null) return;
    const step = workflowSteps.value[lastNodeStepIndex.value];
    if (!step) return;
    step.description = description;
  }

  function appendActionPhaseStep(label: string, phase: "ON" | "OFF") {
    const step: WorkflowStep = {
      key: `action-${phase.toLowerCase()}-${workflowSteps.value.length}`,
      title: `${label} ${phase}`,
      status: "finish",
      controlUrlId: lastNodeContext.value?.controlUrlId ?? null,
    };
    workflowSteps.value.push(step);
    currentWorkflowStep.value = workflowSteps.value.length - 1;
  }

  function markCurrentNodeError(messageText: string) {
    if (lastNodeStepIndex.value !== null) {
      const step = workflowSteps.value[lastNodeStepIndex.value];
      if (step) {
        step.status = "error";
      }
    }
    workflowErrorMessage.value = messageText;
  }

  function resolveActionLabelFromPayload(payload: Record<string, any>) {
    const nodeId = payload.node_id;
    if (nodeId) {
      const flowNode = params.nodes.value.find((node) => node.id === nodeId);
      if (flowNode) {
        const nodeLabel = flowNode.data?.label ?? `Node ${nodeId}`;
        return `Action: ${nodeLabel}`;
      }
    }
    const controlUrlId = payload.control_url_id;
    if (controlUrlId) {
      const fallback = params.resolveControlUrlLabel(controlUrlId) ?? controlUrlId;
      return `Action: ${fallback}`;
    }
    return "Action";
  }

  function handleWorkflowEvent(payload: Record<string, any>) {
    if (!payload || typeof payload !== "object") {
      return;
    }

    const type = payload.type;
    switch (type) {
      case "devices_check_started": {
        updateStepStatus("check-devices", "process", "Checking devices...");
        currentWorkflowStep.value = 0;
        break;
      }
      case "device_offline": {
        const label = payload.device ?? "Unknown device";
        updateStepStatus("check-devices", "error", `Offline: ${label}`);
        workflowErrorMessage.value = `Device offline: ${label}`;
        break;
      }
      case "devices_check_passed": {
        updateStepStatus("check-devices", "finish", "All devices online");
        updateStepStatus("shutdown-devices", "process", "Turning devices off...");
        const shutdownIndex = workflowSteps.value.findIndex(
          (step) => step.key === "shutdown-devices",
        );
        currentWorkflowStep.value =
          shutdownIndex >= 0 ? shutdownIndex : currentWorkflowStep.value;
        break;
      }
      case "workflow_devices_off_started": {
        const countText = typeof payload.count === "number" ? ` (${payload.count})` : "";
        updateStepStatus(
          "shutdown-devices",
          "process",
          `Turning devices off${countText}`,
        );
        break;
      }
      case "workflow_device_off_failed": {
        updateStepStatus(
          "shutdown-devices",
          "error",
          `Failed to turn off ${payload.control_url_id ?? "device"}`,
        );
        workflowErrorMessage.value = "Failed to shutdown devices.";
        break;
      }
      case "workflow_devices_ensured_off": {
        updateStepStatus("shutdown-devices", "finish", "All devices are off");
        break;
      }
      case "node_enter": {
        finalizeLastNodeStep("finish");
        const nodeId = payload.node_id;
        const flowNode = params.nodes.value.find((node) => node.id === nodeId);
        const nodeKind = (flowNode?.data?.kind ?? payload.type ?? "node") as string;
        const nodeLabel = flowNode?.data?.label ?? `Node ${nodeId}`;
        const titlePrefix =
          nodeKind === "action"
            ? "Action"
            : nodeKind === "condition"
              ? "Condition"
              : "Node";
        const controlUrlId = flowNode?.data?.control_url_id ?? null;
        const label = `${titlePrefix}: ${nodeLabel}`;
        const step: WorkflowStep = {
          key: `node-${nodeId}-${workflowSteps.value.length}`,
          title: label,
          status: "process",
          controlUrlId,
        };
        workflowSteps.value.push(step);
        lastNodeStepIndex.value = workflowSteps.value.length - 1;
        currentWorkflowStep.value = lastNodeStepIndex.value;
        lastNodeContext.value = {
          label,
          controlUrlId,
        };
        break;
      }
      case "condition_evaluated": {
        const resultLabel = payload.result ? "TRUE" : "FALSE";
        const current = payload.current ?? "n/a";
        const operator = payload.operator ?? "";
        const threshold = payload.value ?? "n/a";
        updateCurrentNodeDescription(
          `Condition result: ${resultLabel} (${current} ${operator} ${threshold})`,
        );
        break;
      }
      case "action_on": {
        updateCurrentNodeDescription("Action ON");
        const label = lastNodeContext.value?.label ?? resolveActionLabelFromPayload(payload);
        appendActionPhaseStep(label, "ON");
        break;
      }
      case "action_off": {
        updateCurrentNodeDescription("Action OFF");
        const label = lastNodeContext.value?.label ?? resolveActionLabelFromPayload(payload);
        appendActionPhaseStep(label, "OFF");
        break;
      }
      case "action_on_failed":
      case "action_off_failed":
      case "action_device_offline": {
        markCurrentNodeError(payload.error ?? "Action failed.");
        break;
      }
      case "workflow_end_reached": {
        finalizeLastNodeStep("finish");
        ensureEndStep("finish");
        break;
      }
      case "workflow_failed": {
        markCurrentNodeError(payload.error ?? "Workflow failed.");
        ensureEndStep("error");
        break;
      }
      default:
        break;
    }
  }

  function handleWorkflowStreamEvent(eventName: string, data: any) {
    if (eventName === "workflow-event") {
      handleWorkflowEvent(data as Record<string, any>);
      return;
    }
    if (eventName === "workflow-complete") {
      hasWorkflowCompleted.value = true;
      workflowSteps.value.forEach((step) => {
        if (step.status !== "error") {
          step.status = "finish";
        }
      });
      ensureEndStep("finish");
      return;
    }
    if (eventName === "workflow-error") {
      workflowErrorMessage.value = data?.message ?? "Workflow failed.";
      markCurrentNodeError(workflowErrorMessage.value ?? "Workflow failed.");
      ensureEndStep("error");
    }
  }

  return {
    currentWorkflowStep,
    handleWorkflowStreamEvent,
    hasWorkflowCompleted,
    resetWorkflowSteps,
    seedWorkflowSteps,
    workflowErrorMessage,
    workflowOverallStatus,
    workflowSteps,
  };
}
