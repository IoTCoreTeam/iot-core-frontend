import type { Edge, Node } from "@vue-flow/core";

export type ScenarioNodeData = {
  label?: string;
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

export type ScenarioDefinition = {
  nodes?: Node<ScenarioNodeData>[];
  edges?: Edge[];
} | null;

export type ControlUrlOption = {
  id: string;
  control_url_id?: string | null;
  name?: string | null;
  url?: string | null;
  input_type?: string | null;
  json_command_id?: string | null;
  json_command_name?: string | null;
  json_commands?: Array<{
    id?: string | null;
    control_url_id?: string | null;
    name?: string | null;
    command?: unknown;
  }> | null;
  node?: {
    id?: string | null;
    external_id?: string | null;
    extended_id?: string | null;
    name?: string | null;
    gateway?: {
      id?: string | null;
      external_id?: string | null;
      extended_id?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

export type WorkflowRuntimeState =
  | "idle"
  | "queued"
  | "running"
  | "stopping"
  | "error";
