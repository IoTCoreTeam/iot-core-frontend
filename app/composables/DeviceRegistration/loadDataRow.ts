import type { Ref } from "vue";
import type { DeviceRow } from "@/types/devices-control";
import type { GatewayEventPayload } from "@/composables/DeviceRegistration/SSEHandle";

type DeviceRowRefs = {
  gatewayRows: Ref<DeviceRow[]>;
  nodeRows: Ref<DeviceRow[]>;
};

const KNOWN_DEVICE_STATUSES = new Set<DeviceRow["status"]>([
  "online",
  "offline",
]);

function parseTimestamp(value?: string | null) {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function normalizeStatus(value?: string | null): DeviceRow["status"] {
  if (!value) {
    return "offline";
  }

  const normalized = value.toLowerCase();
  if (KNOWN_DEVICE_STATUSES.has(normalized as DeviceRow["status"])) {
    return normalized as DeviceRow["status"];
  }
  return "offline";
}

export function useLoadDataRow(refs: DeviceRowRefs) {
  const gatewayCache = new Map<string, DeviceRow>();
  let deviceStatusPoller: ReturnType<typeof setInterval> | null = null;

  function syncGatewayRows() {
    refs.gatewayRows.value = Array.from(gatewayCache.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }

  function updateGatewayFromPayload(payload: GatewayEventPayload) {
    if (!payload?.id) {
      return;
    }

    const existing = gatewayCache.get(payload.id);
    const row: DeviceRow = {
      id: payload.id,
      name: payload.name ?? existing?.name ?? `Gateway ${payload.id}`,
      ip: payload.ip ?? existing?.ip ?? null,
      mac: payload.mac ?? existing?.mac ?? null,
      status: normalizeStatus(payload.status),
      registered: payload.registered ?? false,
      lastSeen: payload.last_seen ?? payload.lastSeen ?? existing?.lastSeen ?? null,
    };

    gatewayCache.set(row.id, row);
    syncGatewayRows();
  }

  function markRowsOfflineByLastSeen(rows: DeviceRow[]) {
    const now = Date.now();
    const thresholdMs = 30_000;

    rows.forEach((row) => {
      const lastSeenTimestamp = parseTimestamp(row.lastSeen);
      if (!lastSeenTimestamp || now - lastSeenTimestamp > thresholdMs) {
        row.status = "offline";
      }
    });
  }

  function pollDeviceStatuses() {
    markRowsOfflineByLastSeen(refs.gatewayRows.value);
    markRowsOfflineByLastSeen(refs.nodeRows.value);
  }

  function startDeviceStatusPolling() {
    if (!import.meta.client || deviceStatusPoller) return;
    deviceStatusPoller = setInterval(pollDeviceStatuses, 30_000);
    pollDeviceStatuses();
  }

  function stopDeviceStatusPolling() {
    if (!deviceStatusPoller) return;
    clearInterval(deviceStatusPoller);
    deviceStatusPoller = null;
  }

  return {
    updateGatewayFromPayload,
    startDeviceStatusPolling,
    stopDeviceStatusPolling,
  };
}
