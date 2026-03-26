export type ControlAckBucket = {
  bucket: string;
  on: number;
  off: number;
  success: number;
  failed: number;
  timeout: number;
  unknown: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
};

export type ControlAckTotals = {
  success: number;
  failed: number;
  timeout: number;
  total: number;
};

export type ControlLogRow = {
  _id?: { $oid?: string } | string | null;
  gateway_id?: string | null;
  node_id?: string | null;
  device?: string | null;
  state?: string | null;
  status?: string | null;
  topic?: string | null;
  timestamp?: string | null;
  received_at?: string | null;
  command_exec_ms?: number | null;
  command_seq?: number | null;
  requested_at?: string | null;
  requested_at_ms?: number | null;
  response_deadline_at?: string | null;
  dispatched_at?: string | null;
};

export type ControlLogFilterState = {
  gateway_id: string;
  node_id: string;
  device: string;
  state: string;
  status: string;
  topic: string;
  timestamp_from: string;
  timestamp_to: string;
};

export const DEFAULT_CONTROL_ACK_TOTALS: ControlAckTotals = {
  success: 0,
  failed: 0,
  timeout: 0,
  total: 0,
};

export const DEFAULT_CONTROL_ACK_BUCKET: "hour" | "minute" = "hour";
export const DEFAULT_CONTROL_ACK_TOPIC = "esp32/controllers/status-event";
