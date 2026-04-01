import type { DeviceRow } from "@/types/devices-control";
import {
  fetchAllPages,
  resolveControlModuleBase,
} from "@/composables/DeviceRegistration/controlDataApi";

export type DeviceInventoryRow = {
  id: string;
  external_id?: string | null;
  name?: string | null;
  gateway_id?: string | null;
  gateway_external_id?: string | null;
  mac_address?: string | null;
  ip_address?: string | null;
  type?: string | null;
  status?: string | null;
  registered?: boolean | null;
  last_seen?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
};

export function mapInventoryRow(row: any): DeviceInventoryRow {
  return {
    id: String(row?.id ?? row?.external_id ?? ""),
    external_id: row?.external_id ?? null,
    name: row?.name ?? null,
    gateway_id: row?.gateway_id ?? null,
    gateway_external_id: row?.gateway?.external_id ?? row?.gateway_external_id ?? null,
    mac_address: row?.mac_address ?? null,
    ip_address: row?.ip_address ?? null,
    type: row?.type ?? null,
    status: row?.status ?? null,
    registered: typeof row?.registered === "boolean" ? row.registered : null,
    last_seen: row?.last_seen ?? null,
    created_at: row?.created_at ?? null,
    updated_at: row?.updated_at ?? null,
    deleted_at: row?.deleted_at ?? row?.gateway?.deleted_at ?? null,
  };
}

export function buildUuidToExternalIdMap(rows: DeviceInventoryRow[]) {
  const map: Record<string, string> = {};
  rows.forEach((row) => {
    if (row.id) {
      map[row.id] = String(row.external_id ?? row.id);
    }
  });
  return map;
}

export function buildExternalToUuidMap(rows: DeviceInventoryRow[]) {
  const map: Record<string, string> = {};
  rows.forEach((row) => {
    if (row.external_id && row.id) {
      map[row.external_id] = row.id;
    }
  });
  return map;
}

export function isSoftDeletedInventoryRow(row: { deleted_at?: string | null }) {
  return Boolean(row.deleted_at);
}

export function sortInventoryRows(a: DeviceInventoryRow, b: DeviceInventoryRow) {
  const aDeleted = isSoftDeletedInventoryRow(a);
  const bDeleted = isSoftDeletedInventoryRow(b);
  if (aDeleted !== bDeleted) {
    return aDeleted ? 1 : -1;
  }

  return String(a.external_id ?? "").localeCompare(String(b.external_id ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export async function fetchGatewayInventoryRows(authorization: string) {
  const base = resolveControlModuleBase();
  if (!base) return [];

  const rows = await fetchAllPages(`${base}/gateways?include=all`, authorization);
  return rows.map(mapInventoryRow).sort(sortInventoryRows);
}

export async function fetchNodeInventoryRows(authorization: string) {
  const base = resolveControlModuleBase();
  if (!base) return [];

  const rows = await fetchAllPages(`${base}/nodes?include=all`, authorization);
  return rows.map(mapInventoryRow).sort(sortInventoryRows);
}

export async function fetchSensorInventoryRows(authorization: string) {
  const base = resolveControlModuleBase();
  if (!base) return { sensorRows: [], gatewayMap: {} };

  const [nodes, gateways] = await Promise.all([
    fetchAllPages(`${base}/nodes?type=sensor&include=all`, authorization),
    fetchAllPages(`${base}/gateways?include=all`, authorization),
  ]);

  const gatewayRows = gateways.map(mapInventoryRow);
  const sensorRows = nodes
    .map((row: any) => ({
      ...mapInventoryRow(row),
      type: row?.type ?? "sensor",
    }))
    .filter((row) => String(row.type ?? "").trim().toLowerCase() === "sensor")
    .sort(sortInventoryRows);

  return {
    sensorRows,
    gatewayMap: buildUuidToExternalIdMap(gatewayRows),
  };
}

export function mapGatewayInventoryToRegisteredDeviceRow(row: DeviceInventoryRow): DeviceRow {
  const externalId = row.external_id ? String(row.external_id) : String(row.id ?? "");
  return {
    id: externalId,
    externalId,
    resourceType: "gateway",
    name: row.name ?? `Gateway ${externalId}`,
    ip: row.ip_address ?? null,
    mac: row.mac_address ?? null,
    type: "gateway",
    status: row.status === "online" ? "online" : "offline",
    registered: true,
    lastSeen: row.last_seen ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}

export function mapNodeInventoryToRegisteredDeviceRow(row: DeviceInventoryRow): DeviceRow {
  const externalId = row.external_id ? String(row.external_id) : String(row.id ?? "");
  return {
    id: externalId,
    externalId,
    resourceType: "node",
    name: row.name ?? `Node ${externalId}`,
    gatewayId: row.gateway_external_id ?? row.gateway_id ?? null,
    ip: row.ip_address ?? null,
    mac: row.mac_address ?? null,
    type: row.type ?? null,
    status: row.status === "online" ? "online" : "offline",
    registered: true,
    lastSeen: row.last_seen ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    deletedAt: row.deleted_at ?? null,
  };
}
