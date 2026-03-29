import { computed, type Ref } from "vue";
import type { Edge, Node } from "@vue-flow/core";
import type {
  ControlUrlOption,
  ScenarioDefinition,
  ScenarioNodeData,
} from "@/composables/Scenario/scenarioBuilderTypes";
import { normalizeControlInputType } from "@/composables/Scenario/useScenarioControlUrls";

type MetricLike = {
  key?: string | null;
  title?: string | null;
};

export function createDefaultStartNode(): Node<ScenarioNodeData> {
  return {
    id: "start-node",
    type: "default",
    position: { x: 100, y: 80 },
    data: { label: "Start", kind: "start" },
  };
}

export function useScenarioNodePresentation(params: {
  controlUrlOptions: Ref<ControlUrlOption[]>;
  edges: Ref<Edge[]>;
  hasLoadedControlUrls: Ref<boolean>;
  metrics: Ref<MetricLike[]>;
  nodes: Ref<Node<ScenarioNodeData>[]>;
  onSaved: () => void;
}) {
  function isMissingControlUrl(controlUrlId?: string | null) {
    if (!params.hasLoadedControlUrls.value) return false;
    if (!controlUrlId) return false;
    return !params.controlUrlOptions.value.some((item) => item?.id === controlUrlId);
  }

  function updateNodeLabel(node: Node<ScenarioNodeData>) {
    if (node.data?.kind === "action") {
      const controlUrlId = node.data?.control_url_id ?? "";
      const isMissing = isMissingControlUrl(controlUrlId);
      const selected = params.controlUrlOptions.value.find((item) => item.id === controlUrlId);
      const name = selected?.name || "Action";
      const duration = node.data?.duration_seconds ?? 0;
      const inputKind = normalizeControlInputType(selected?.input_type);
      const actionValue = node.data?.action_value;
      let label = name;
      if (!isMissing) {
        if (inputKind === "analog") {
          const valueText =
            typeof actionValue === "number" && Number.isFinite(actionValue) ? actionValue : "0";
          label = `${name} (${valueText})`;
        } else if (inputKind === "digital") {
          const state = actionValue === "off" ? "OFF" : "ON";
          label = state === "ON" && duration > 0 ? `${name} (${state}, ${duration}s)` : `${name} (${state})`;
        } else {
          label = `${name} (${duration}s)`;
        }
      }
      node.data = {
        ...(node.data ?? {}),
        label: isMissing ? "Action not found" : label,
      };
      node.class = isMissing ? "scenario-node--missing" : undefined;
      return;
    }
    if (node.data?.kind === "condition") {
      const metric = params.metrics.value.find((item) => item.key === node.data?.metric_key);
      const metricName = metric?.title ?? node.data?.metric_key ?? "Metric";
      const operator = node.data?.operator ?? ">";
      const value = node.data?.value ?? 0;
      node.data = {
        ...(node.data ?? {}),
        label: `${metricName} ${operator} ${value}`,
      };
    }
  }

  function applyDefinition(definition?: ScenarioDefinition) {
    if (!definition || !Array.isArray(definition.nodes)) {
      return;
    }
    if (!definition.nodes.length) {
      params.nodes.value = [createDefaultStartNode()];
      params.edges.value = [];
      params.onSaved();
      return;
    }
    params.nodes.value = definition.nodes.map((node) => ({
      ...node,
      type: node.type || "default",
    }));
    params.edges.value = Array.isArray(definition.edges)
      ? definition.edges.map((edge) => ({ ...edge }))
      : [];
    params.nodes.value.forEach((node) => updateNodeLabel(node));
    params.onSaved();
  }

  const hasMissingActionNodes = computed(() =>
    params.nodes.value.some(
      (node) => node.data?.kind === "action" && isMissingControlUrl(node.data?.control_url_id),
    ),
  );

  function validateConditionBranches() {
    const conditionNodes = params.nodes.value.filter((node) => node.data?.kind === "condition");
    if (!conditionNodes.length) {
      return { ok: true };
    }

    for (const node of conditionNodes) {
      const outgoing = params.edges.value.filter((edge) => edge.source === node.id);
      const branches = new Set(
        outgoing
          .map((edge) => edge.data?.branch ?? edge.label)
          .filter((value) => value === "true" || value === "false"),
      );
      if (!branches.has("true") || !branches.has("false")) {
        return {
          ok: false,
          message: "Each Condition node must have both True and False branches.",
        };
      }
    }

    return { ok: true };
  }

  return {
    applyDefinition,
    hasMissingActionNodes,
    isMissingControlUrl,
    updateNodeLabel,
    validateConditionBranches,
  };
}
