import type { Ref } from "vue";
import { ref } from "vue";
import { message } from "ant-design-vue";
import { apiConfig } from "~~/config/api";
import type { ControllerState, DeviceRow, DeviceTabKey } from "@/types/devices-control";
import { useAuthStore } from "~~/stores/auth";
import { useControlUrlActions } from "@/composables/DeviceControl/useControlUrlActions";

export type ControlUrlItem = {
  id: string;
  controller_id?: string;
  name: string;
  url: string;
  input_type: string;
};

type HandleUrlControlOptions = {
  activeDeviceTab: Ref<DeviceTabKey>;
  nodeIdMap: Ref<Record<string, string>>;
  loadNodeIdMap: () => Promise<void> | void;
  isGatewayRegisteredForRow: (row: DeviceRow) => boolean;
  getGatewayIdFromRow: (row: DeviceRow) => string | null;
  controllerStatesByNode?: Ref<Record<string, ControllerState[]>>;
};

export function useHandleUrlControl(options: HandleUrlControlOptions) {
  const {
    activeDeviceTab,
    nodeIdMap,
    loadNodeIdMap,
    isGatewayRegisteredForRow,
    getGatewayIdFromRow,
    controllerStatesByNode,
  } = options;

  const authStore = useAuthStore();
  const { updateControlUrl, deleteControlUrl } =
    useControlUrlActions();

  const activeControlUrlNodeId = ref<string | null>(null);
  const activeControlNodeUuid = ref<string | null>(null);
  const isSavingControlUrl = ref(false);
  const isLoadingControlUrls = ref(false);
  const controlUrlLoadError = ref<string | null>(null);
  const controlUrlItems = ref<ControlUrlItem[]>([]);

  function normalizeControllerDeviceKey(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim().toLowerCase();
    return trimmed.length ? trimmed : null;
  }

  function resolveControllerKey(state: ControllerState) {
    return (
      normalizeControllerDeviceKey(state.device) ||
      normalizeControllerDeviceKey(state.name) ||
      normalizeControllerDeviceKey(state.id) ||
      null
    );
  }

  function resolveControllerKind(state: ControllerState) {
    return (
      normalizeControllerDeviceKey(state.kind) ||
      normalizeControllerDeviceKey(state.type) ||
      "digital"
    );
  }

  function resolveControlUrlKey(item: ControlUrlItem) {
    if (item.name) {
      const normalized = item.name.trim().toLowerCase();
      if (normalized) {
        return normalized.split(/\s+/)[0] ?? normalized;
      }
    }
    if (item.controller_id) {
      const normalized = item.controller_id.trim().toLowerCase();
      if (normalized) {
        return normalized;
      }
    }
    return null;
  }

  function applyControllerStates(nodeId: string) {
    if (!controllerStatesByNode) return;
    const controllers = controllerStatesByNode.value[nodeId];
    if (!Array.isArray(controllers) || controllers.length === 0) {
      return;
    }

    const controllerMap = new Map<string, { kind: string; controllerId?: string }>();
    controllers.forEach((state) => {
      const key = resolveControllerKey(state);
      if (!key) return;
      controllerMap.set(key, {
        kind: resolveControllerKind(state),
        controllerId:
          typeof state.id === "string" && state.id.trim().length
            ? state.id.trim()
            : undefined,
      });
    });

    if (!controllerMap.size) {
      return;
    }

    const existingByKey = new Map<string, ControlUrlItem>();
    controlUrlItems.value.forEach((item) => {
      const key = resolveControlUrlKey(item);
      if (key) {
        existingByKey.set(key, item);
      }
    });

    const nextItems: ControlUrlItem[] = [];

    controllerMap.forEach((controller, key) => {
      const existing = existingByKey.get(key);
      const controllerId = controller.controllerId ?? existing?.controller_id;
      if (existing) {
        nextItems.push({
          ...existing,
          name: key,
          input_type: controller.kind || existing.input_type,
          controller_id: controllerId ?? existing.controller_id,
          id: controllerId ?? existing.id,
        });
        return;
      }

      nextItems.push({
        id: controllerId ?? key,
        controller_id: controllerId ?? undefined,
        name: key,
        url: "",
        input_type: controller.kind || "digital",
      });
    });

    controlUrlItems.value = nextItems.map((item) => {
      const key = resolveControlUrlKey(item);
      if (!key || !controllerMap.has(key)) {
        return item;
      }
      const controller = controllerMap.get(key)!;
      const next = { ...item };
      next.name = key;
      if (controller.kind) {
        next.input_type = controller.kind;
      }
      if (controller.controllerId) {
        next.controller_id = controller.controllerId;
        next.id = controller.controllerId;
      }
      return next;
    });
  }

  function isControlNode(row: DeviceRow) {
    return (row.type ?? "").toLowerCase() === "control";
  }

  async function resolveControlNodeId(row: DeviceRow) {
    const externalNodeId = row.externalId ?? row.id;
    if (!nodeIdMap.value[externalNodeId]) {
      await loadNodeIdMap();
    }
    return nodeIdMap.value[externalNodeId] ?? null;
  }

  async function fetchControlUrls(nodeUuid: string) {
    if (!apiConfig.controlModule) return;
    const authorization = authStore.authorizationHeader;
    if (!authorization) return;

    isLoadingControlUrls.value = true;
    controlUrlLoadError.value = null;
    try {
      const endpoint = `${apiConfig.controlModule.replace(/\/$/, "")}/control-urls?node_id=${encodeURIComponent(nodeUuid)}&per_page=100`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: authorization,
          Accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to load control urls.");
      }
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      controlUrlItems.value = rows.map((row: any) => ({
        id: row.controller_id ?? row.id,
        controller_id: row.controller_id ?? undefined,
        name: row.name ?? "",
        url: row.url ?? "",
        input_type: row.input_type ?? "",
      }));
      if (activeControlUrlNodeId.value) {
        applyControllerStates(activeControlUrlNodeId.value);
      }
    } catch (error: any) {
      controlUrlLoadError.value =
        error?.message ?? "Failed to load control urls.";
      controlUrlItems.value = [];
    } finally {
      isLoadingControlUrls.value = false;
    }
  }

  async function toggleControlUrlInline(row: DeviceRow) {
    if (activeDeviceTab.value !== "nodes" || !isControlNode(row)) return;
    if (activeControlUrlNodeId.value === row.id) {
      activeControlUrlNodeId.value = null;
      activeControlNodeUuid.value = null;
      return;
    }
    const controlNodeId = await resolveControlNodeId(row);
    if (!controlNodeId) {
      message.warning(
        `Node ${row.externalId ?? row.id} not found in Control Module.`,
      );
      return;
    }
    activeControlUrlNodeId.value = row.id;
    activeControlNodeUuid.value = controlNodeId;
    await fetchControlUrls(controlNodeId);
  }

  async function handleControlUrlClick(row: DeviceRow) {
    if (row.registered === false) {
      if (!isGatewayRegisteredForRow(row)) {
        const gatewayId = getGatewayIdFromRow(row);
        message.info(
          gatewayId
            ? `Please register gateway ${gatewayId} first.`
            : "Please register the node's gateway first.",
        );
        return;
      }
      message.info("Please register this node before adding control URLs.");
      return;
    }
    await toggleControlUrlInline(row);
  }

  function showControlUrlInline(row: DeviceRow) {
    return (
      activeDeviceTab.value === "nodes" &&
      isControlNode(row) &&
      activeControlUrlNodeId.value === row.id
    );
  }

  function closeControlUrlInline() {
    activeControlUrlNodeId.value = null;
    activeControlNodeUuid.value = null;
  }

  function syncControlUrlItemsFromControllerStates() {
    if (!activeControlUrlNodeId.value) {
      return;
    }
    applyControllerStates(activeControlUrlNodeId.value);
  }

  async function handleUpdateControlUrl(item: ControlUrlItem) {
    const authorization = authStore.authorizationHeader;
    if (!authorization) {
      message.error("Missing authorization.");
      return;
    }
    const nodeId = activeControlNodeUuid.value;
    if (!nodeId) {
      message.warning("Missing node id.");
      return;
    }
    if (!item.controller_id) {
      message.warning("Missing controller id from SSE.");
      return;
    }
    if (!item.url || !item.url.trim().startsWith("/")) {
      message.warning("URL must start with '/'.");
      return;
    }

    const resolvedName = item.name || item.controller_id || item.id;
    const resolvedInputType = item.input_type || "digital";
    try {
      await updateControlUrl(authorization, item.id, {
        controller_id: item.controller_id,
        node_id: nodeId,
        name: resolvedName,
        url: item.url,
        input_type: resolvedInputType,
      });
      message.success("Control URL updated.");
    } catch (error: any) {
      message.error(error?.message ?? "Failed to update control url.");
    }
  }

  async function handleDeleteControlUrl(item: ControlUrlItem) {
    const authorization = authStore.authorizationHeader;
    if (!authorization) {
      message.error("Missing authorization.");
      return;
    }
    try {
      await deleteControlUrl(authorization, item.id);
      controlUrlItems.value = controlUrlItems.value.filter(
        (row) => row.id !== item.id,
      );
      message.success("Control URL deleted.");
    } catch (error: any) {
      message.error(error?.message ?? "Failed to delete control url.");
    }
  }

  return {
    controlUrlItems,
    controlUrlLoadError,
    activeControlUrlNodeId,
    isControlNode,
    isLoadingControlUrls,
    isSavingControlUrl,
    handleControlUrlClick,
    showControlUrlInline,
    closeControlUrlInline,
    handleUpdateControlUrl,
    handleDeleteControlUrl,
    syncControlUrlItemsFromControllerStates,
  };
}
