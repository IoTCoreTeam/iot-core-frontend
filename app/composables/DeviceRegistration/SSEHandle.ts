import type { Ref } from "vue";
import type { ControllerState, DeviceRow } from "@/types/devices-control";

export type NodeEventPayload = {
  gateway_id?: string | null;
  // Legacy aliases kept for backward compatibility.
  gatewayId?: string | null;
  external_id?: string | null;
  externalId?: string | null;
  id?: string | null;
  node_id?: string | null;
  nodeId?: string | null;
  name?: string | null;
  ip?: string | null;
  ip_address?: string | null;
  mac?: string | null;
  mac_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  gps?: { lat?: number | null; lng?: number | null } | null;
  status?: string | null;
  registered?: boolean | null;
  inside_map?: boolean | null;
  last_seen?: string | null;
  lastSeen?: string | null;
  gateway_timestamp?: string | null;
  node_type?: string | null;
  type?: string | null;
  devices?: ControllerState[] | null;
  connected_nodes?: string[] | null;
  connectedNodes?: string[] | null;
};

export type GatewayEventPayload = {
  id?: string;
  name?: string | null;
  ip?: string | null;
  mac?: string | null;
  status?: string | null;
  registered?: boolean | null;
  last_seen?: string | null;
  lastSeen?: string | null;
  nodes?: NodeEventPayload[] | null;
};

type NodeCollectionsRefs = {
  nodeRows: Ref<DeviceRow[]>;
  controllerStatesByNode?: Ref<Record<string, ControllerState[]>>;
};

function normalizeStatus(value?: string | null): DeviceRow["status"] {
  return (value ?? "").toLowerCase() === "online" ? "online" : "offline";
}

function normalizeDeviceType(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase().trim();
  if (normalized.startsWith("node-")) {
    return normalized.slice("node-".length);
  }
  return normalized;
}

function normalizeCoord(value?: unknown, min?: number, max?: number) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  if (typeof min === "number" && num < min) return null;
  if (typeof max === "number" && num > max) return null;
  return num;
}

function pickFirst<T>(...values: Array<T | null | undefined>): T | null {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }
  return null;
}

function normalizeConnectedNodes(value?: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length > 0 ? items : null;
  }
  return null;
}

function resolveNodeLocation(payload: NodeEventPayload, existing?: DeviceRow) {
  const lat =
    normalizeCoord(payload.lat, -90, 90) ??
    normalizeCoord(payload.gps?.lat, -90, 90) ??
    existing?.lat ??
    null;
  const lng =
    normalizeCoord(payload.lng, -180, 180) ??
    normalizeCoord(payload.gps?.lng, -180, 180) ??
    existing?.lng ??
    null;
  return { lat, lng };
}

function resolveNodeId(payload: NodeEventPayload): string | null {
  return pickFirst(payload.id, payload.node_id, payload.nodeId);
}

function normalizeLastSeen(payload: NodeEventPayload, existing?: DeviceRow) {
  return pickFirst(
    payload.last_seen,
    payload.lastSeen,
    payload.gateway_timestamp,
    existing?.lastSeen,
  );
}

function buildNodeRow(
  payload: NodeEventPayload,
  existing?: DeviceRow,
  gatewayId?: string | null,
): DeviceRow {
  const id = resolveNodeId(payload) ?? existing?.id ?? "unknown-node";
  const rawName = pickFirst(payload.name, existing?.name);
  const externalId = pickFirst(
    payload.external_id,
    payload.externalId,
    existing?.externalId,
  );
  const location = resolveNodeLocation(payload, existing);
  const connectedNodes =
    normalizeConnectedNodes(pickFirst(payload.connected_nodes, payload.connectedNodes)) ??
    existing?.connectedNodes ??
    null;
  return {
    id,
    externalId,
    name: rawName ?? "N/A",
    gatewayId: pickFirst(payload.gateway_id, payload.gatewayId, gatewayId, existing?.gatewayId),
    ip: pickFirst(payload.ip, payload.ip_address, existing?.ip),
    mac: pickFirst(payload.mac, payload.mac_address, existing?.mac),
    lat: location.lat,
    lng: location.lng,
    type: normalizeDeviceType(
      pickFirst(payload.node_type, payload.type, existing?.type),
    ),
    status: normalizeStatus(payload.status ?? existing?.status ?? null),
    registered: payload.registered ?? existing?.registered ?? false,
    inside_map: payload.inside_map ?? existing?.inside_map ?? null,
    lastSeen: normalizeLastSeen(payload, existing),
    devices: payload.devices ?? existing?.devices ?? null,
    connectedNodes,
  };
}

function sortRows(rows: DeviceRow[]) {
  return rows.slice().sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

export function createNodeCollectionsStore() {
  const nodeCache = new Map<string, DeviceRow>();

  function syncToRefs(refs: NodeCollectionsRefs) {
    refs.nodeRows.value = sortRows(Array.from(nodeCache.values()));
  }

  function hydrateFromRows(refs: NodeCollectionsRefs) {
    nodeCache.clear();
    refs.nodeRows.value.forEach((row) => {
      if (!row?.id) return;
      nodeCache.set(row.id, row);
    });
  }

  function updateFromGatewayPayload(
    payload: GatewayEventPayload,
    refs: NodeCollectionsRefs,
  ) {
    const nodes = Array.isArray(payload?.nodes) ? payload.nodes : [];
    if (!nodes.length) {
      return;
    }

    nodes.forEach((node) => {
      const id = resolveNodeId(node);
      if (!id) return;

      const existing = nodeCache.get(id);

      const row = buildNodeRow(node, existing, payload.id ?? null);

      nodeCache.set(id, row);

      if (refs.controllerStatesByNode) {
        const devices = Array.isArray(node.devices) ? node.devices : [];
        refs.controllerStatesByNode.value = {
          ...refs.controllerStatesByNode.value,
          [id]: devices,
        };
      }
    });

    syncToRefs(refs);
  }

  function clearNodeCache(refs?: NodeCollectionsRefs) {
    nodeCache.clear();
    if (!refs) return;
    refs.nodeRows.value = [];
    if (refs.controllerStatesByNode) {
      refs.controllerStatesByNode.value = {};
    }
  }

  return {
    hydrateFromRows,
    updateFromGatewayPayload,
    clearNodeCache,
  };
}
