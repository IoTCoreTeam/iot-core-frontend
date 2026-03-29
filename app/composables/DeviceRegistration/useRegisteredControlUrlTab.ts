import { ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import type { DeviceRow } from "@/types/devices-control";
import { useAuthStore } from "~~/stores/auth";
import {
  fetchAllPages,
  resolveControlModuleBase,
} from "@/composables/DeviceRegistration/controlDataApi";

type UseRegisteredControlUrlTabOptions = {
  loadingRef?: Ref<boolean>;
  includeSoftDeleted?: boolean;
};

export function useRegisteredControlUrlTab(
  options: UseRegisteredControlUrlTabOptions = {},
) {
  const authStore = useAuthStore();
  const registeredControlUrlRows = ref<DeviceRow[]>([]);
  const deletingRegisteredControlUrlMap = ref<Record<string, boolean>>({});

  function withLoading<T>(task: () => Promise<T>) {
    if (!options.loadingRef) {
      return task();
    }
    options.loadingRef.value = true;
    return task().finally(() => {
      options.loadingRef!.value = false;
    });
  }

  function mapRegisteredControlUrlRow(row: any): DeviceRow {
    const controlUrlId = row?.id ? String(row.id) : "";
    const controllerId = row?.controller_id ? String(row.controller_id) : null;
    const nodeInternalId = row?.node?.id ? String(row.node.id) : null;
    const nodeExternalId = row?.node?.external_id
      ? String(row.node.external_id)
      : null;
    const nodeName = row?.node?.name ? String(row.node.name) : null;
    const nodeType = row?.node?.type ? String(row.node.type) : null;
    const deletedAt =
      row?.deleted_at ??
      row?.node?.deleted_at ??
      row?.node?.gateway?.deleted_at ??
      null;

    return {
      id: controlUrlId,
      externalId: nodeExternalId,
      nodeInternalId,
      nodeId: nodeExternalId,
      nodeName,
      nodeType,
      resourceType: "node",
      name: row?.name ?? controllerId ?? `Control URL ${controlUrlId}`,
      type: row?.input_type ?? null,
      status: "offline",
      registered: true,
      controllerId,
      inputType: row?.input_type ?? null,
      analogCount: Number(row?.analog_count ?? 0),
      commandCount: Number(row?.command_count ?? 0),
      url: row?.url ?? null,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
      deletedAt,
    };
  }

  function getRegisteredControlUrlKey(row: DeviceRow) {
    return row.id;
  }

  function toTimestamp(value?: string | null) {
    if (!value) return 0;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function sortByLatestThenId(a: DeviceRow, b: DeviceRow) {
    const aTime = Math.max(toTimestamp(a.updatedAt), toTimestamp(a.createdAt));
    const bTime = Math.max(toTimestamp(b.updatedAt), toTimestamp(b.createdAt));
    if (aTime !== bTime) {
      return bTime - aTime;
    }
    return a.id.localeCompare(b.id, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  function isDeletingRegisteredControlUrl(row: DeviceRow) {
    return Boolean(
      deletingRegisteredControlUrlMap.value[getRegisteredControlUrlKey(row)],
    );
  }

  function setDeletingRegisteredControlUrl(row: DeviceRow, value: boolean) {
    deletingRegisteredControlUrlMap.value = {
      ...deletingRegisteredControlUrlMap.value,
      [getRegisteredControlUrlKey(row)]: value,
    };
  }

  async function loadRegisteredControlUrls() {
    const base = resolveControlModuleBase();
    if (!import.meta.client) return;
    if (!base) return;
    const authorization = authStore.authorizationHeader;
    if (!authorization) return;

    return withLoading(async () => {
      try {
        const includeParams = options.includeSoftDeleted ? "node,all" : "node";
        const controlUrlPayload = await fetchAllPages(
          `${base}/control-urls?include=${includeParams}`,
          authorization,
        );
        const rows = options.includeSoftDeleted
          ? controlUrlPayload
          : controlUrlPayload.filter(
              (row: any) =>
                row?.deleted_at == null &&
                (!row?.node || row?.node?.deleted_at == null),
            );
        registeredControlUrlRows.value = rows.map(mapRegisteredControlUrlRow).sort(sortByLatestThenId);
      } catch (error: any) {
        console.error("Failed to load registered control urls", error);
        registeredControlUrlRows.value = [];
        message.error(error?.message ?? "Failed to load registered control urls.");
      }
    });
  }

  async function handleDeleteRegisteredControlUrl(row: DeviceRow) {
    const base = resolveControlModuleBase();
    if (!base) {
      message.warning("Control module endpoint is not configured.");
      return;
    }
    const authorization = authStore.authorizationHeader;
    if (!authorization) {
      message.warning("Missing authentication token.");
      return;
    }
    if (!row?.id) {
      message.warning("Missing control url id.");
      return;
    }
    if (isDeletingRegisteredControlUrl(row)) {
      return;
    }

    const encodedId = encodeURIComponent(row.id);
    const endpoint = `${base}/control-urls/${encodedId}`;

    setDeletingRegisteredControlUrl(row, true);
    try {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: authorization,
          Accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to delete control url.");
      }

      message.success(payload?.message ?? "Control URL deleted.");
      registeredControlUrlRows.value = registeredControlUrlRows.value.filter(
        (item) => item.id !== row.id,
      );
    } catch (error: any) {
      console.error("Failed to delete control url", error);
      message.error(error?.message ?? "Unable to delete control url.");
    } finally {
      setDeletingRegisteredControlUrl(row, false);
    }
  }

  return {
    registeredControlUrlRows,
    loadRegisteredControlUrls,
    isDeletingRegisteredControlUrl,
    handleDeleteRegisteredControlUrl,
  };
}
