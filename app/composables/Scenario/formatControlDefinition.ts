type BranchValue = "true" | "false";

export type ControlDefinitionNode = {
  id: string | null;
  type: "start" | "action" | "condition" | "end";
  control_url_id?: string | null;
  json_command_id?: string | null;
  json_command_name?: string | null;
  duration_seconds?: number | null;
  action_value?: string | number | null;
  metric_key?: string | null;
  operator?: string | null;
  value?: number | null;
};

export type ControlDefinitionEdge = {
  source: string | null;
  target: string | null;
  branch?: BranchValue | null;
};

export type ControlDefinition = {
  version: number;
  nodes: ControlDefinitionNode[];
  edges: ControlDefinitionEdge[];
};

type ControlNodeData = {
  kind?: "start" | "action" | "condition" | "end";
  control_url_id?: string;
  json_command_id?: string;
  json_command_name?: string;
  duration_seconds?: number;
  action_value?: string | number;
  metric_key?: string;
  operator?: string;
  value?: number;
};

type ControlNodeLike = {
  id?: string | null;
  data?: ControlNodeData | null;
};

type ControlEdgeLike = {
  source?: string | null;
  target?: string | null;
  label?: unknown;
  data?: {
    branch?: unknown;
  } | null;
};

function normalizeBranch(value: unknown): BranchValue | null {
  if (value === "true" || value === "false") return value;
  return null;
}

export function formatControlDefinition(
  nodes: ControlNodeLike[],
  edges: ControlEdgeLike[],
): ControlDefinition {
  const formattedNodes: ControlDefinitionNode[] = nodes.map((node) => {
    const kind = node.data?.kind ?? "action";
    const base: ControlDefinitionNode = {
      id: node.id ?? null,
      type: kind,
    };

    if (kind === "action") {
      return {
        ...base,
        control_url_id: node.data?.control_url_id ?? null,
        json_command_id: node.data?.json_command_id ?? null,
        json_command_name: node.data?.json_command_name ?? null,
        duration_seconds:
          typeof node.data?.duration_seconds === "number"
            ? node.data.duration_seconds
            : null,
        action_value:
          typeof node.data?.action_value === "number" ||
          typeof node.data?.action_value === "string"
            ? node.data.action_value
            : null,
      };
    }

    if (kind === "condition") {
      return {
        ...base,
        metric_key: node.data?.metric_key ?? null,
        operator: node.data?.operator ?? null,
        value:
          typeof node.data?.value === "number" ? node.data.value : null,
      };
    }

    return base;
  });

  const formattedEdges: ControlDefinitionEdge[] = edges.map((edge) => ({
    source: edge.source ?? null,
    target: edge.target ?? null,
    branch: normalizeBranch(edge.data?.branch ?? edge.label),
  }));

  return {
    version: 1,
    nodes: formattedNodes,
    edges: formattedEdges,
  };
}
