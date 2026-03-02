import { apiConfig } from "~~/config/api";

export type WorkflowDefinition = {
  version: number;
  nodes: any[];
  edges: any[];
};

export type WorkflowRow = {
  id: string | number;
  name: string | null;
  status: string | null;
  definition: Record<string, unknown> | null;
  control_definition?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type FetchOptions = {
  authorization: string | null;
};

function getBaseUrl() {
  return (apiConfig.controlModule || "").replace(/\/$/, "");
}

function buildHeaders(authorization: string | null) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (authorization) {
    headers.Authorization = authorization;
  }
  return headers;
}

export async function fetchWorkflows(
  authorization: string | null,
  params: URLSearchParams,
) {
  const base = getBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const response = await fetch(`${base}/workflows?${params.toString()}`, {
    headers: buildHeaders(authorization),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "Failed to load workflows.");
  }
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
  return rows as WorkflowRow[];
}

export async function fetchWorkflowDetail(id: string | number, authorization: string | null) {
  const base = getBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const response = await fetch(`${base}/workflows/${id}`, {
    headers: buildHeaders(authorization),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message ?? "Failed to load workflow.");
  }
  return (payload?.data ?? payload) as WorkflowRow;
}

export async function createWorkflow(
  authorization: string | null,
  payload: {
    name: string;
    status: string;
    definition: Record<string, unknown>;
    control_definition?: Record<string, unknown>;
  },
) {
  const base = getBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const response = await fetch(`${base}/workflows`, {
    method: "POST",
    headers: {
      ...buildHeaders(authorization),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Failed to create workflow.");
  }
  return (result?.data ?? result) as WorkflowRow;
}

export async function updateWorkflow(
  id: string | number,
  authorization: string | null,
  payload: Partial<{
    name: string;
    status: string;
    definition: Record<string, unknown>;
    control_definition: Record<string, unknown>;
  }>,
) {
  const base = getBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const response = await fetch(`${base}/workflows/${id}`, {
    method: "PUT",
    headers: {
      ...buildHeaders(authorization),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Failed to upd ate workflow.");
  }
  return (result?.data ?? result) as WorkflowRow;
}

export async function deleteWorkflow(id: string | number, authorization: string | null) {
  const base = getBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const response = await fetch(`${base}/workflows/${id}`, {
    method: "DELETE",
    headers: buildHeaders(authorization),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message ?? "Failed to delete workflow.");
  }
  return result;
}

export async function runWorkflow(id: string | number, authorization: string | null) {
  const base = getBaseUrl();
  if (!base) throw new Error("API base URL is not configured.");
  const response = await fetch(`${base}/workflows/${id}/run`, {
    method: "POST",
    headers: buildHeaders(authorization),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    throw new Error(result?.message ?? "Failed to run workflow.");
  }
  return result;
}

export function buildWorkflowListParams(filters: {
  name?: string;
  status?: string;
  created_from?: string;
  created_to?: string;
  search?: string;
  per_page?: string;
}) {
  const params = new URLSearchParams();
  params.set("per_page", filters.per_page ?? "200");
  if (filters.name) params.set("name", filters.name);
  if (filters.status) params.set("status", filters.status);
  if (filters.created_from) params.set("created_from", filters.created_from);
  if (filters.created_to) params.set("created_to", filters.created_to);
  if (filters.search) params.set("search", filters.search);
  return params;
}
