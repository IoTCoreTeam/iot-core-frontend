import { computed, ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import type { DeviceRow } from "@/types/devices-control";
import { useAuthStore } from "~~/stores/auth";
import {
  fetchAllPages,
  resolveControlModuleBase,
} from "@/composables/DeviceRegistration/controlDataApi";

type UseCommandSetupTabOptions = {
  loadingRef?: Ref<boolean>;
  includeSoftDeleted?: boolean;
};

export function useCommandSetupTab(options: UseCommandSetupTabOptions = {}) {
  const authStore = useAuthStore();
  const commandSetupRows = ref<DeviceRow[]>([]);
  const isCommandSetupModalOpen = ref(false);
  const isSavingCommandSetup = ref(false);
  const editingCommandSetupId = ref<string | null>(null);
  const controlUrlOptions = ref<Array<{ id: string; label: string }>>([]);
  const commandSetupForm = ref({
    control_url_id: "",
    name: "",
    commandText: "",
  });
  const deletingCommandSetupMap = ref<Record<string, boolean>>({});
  const isEditingCommandSetup = computed(
    () => editingCommandSetupId.value !== null,
  );

  function withLoading<T>(task: () => Promise<T>) {
    if (!options.loadingRef) {
      return task();
    }
    options.loadingRef.value = true;
    return task().finally(() => {
      options.loadingRef!.value = false;
    });
  }

  function mapCommandSetupRow(row: any): DeviceRow {
    const id = row?.id ? String(row.id) : "";
    const type =
      row?.type === "analog_signal" || row?.type === "json_command"
        ? row.type
        : null;
    const controlUrl = row?.control_url ?? null;
    const controlUrlId =
      row?.control_url_id
        ? String(row.control_url_id)
        : controlUrl?.id
          ? String(controlUrl.id)
          : "";
    const commandPayload = row?.command ?? null;
    const commandText =
      commandPayload === null || commandPayload === undefined
        ? null
        : typeof commandPayload === "string"
          ? commandPayload
          : JSON.stringify(commandPayload);
    const analogDetail =
      type === "analog_signal"
        ? {
            minValue: row?.min_value ?? null,
            maxValue: row?.max_value ?? null,
            unit: row?.unit ?? null,
            signalType: row?.signal_type ?? null,
            resolutionBits:
              row?.resolution_bits !== null && row?.resolution_bits !== undefined
                ? Number(row.resolution_bits)
                : null,
          }
        : null;
    const fallbackCommandText = analogDetail
      ? JSON.stringify({
          min_value: analogDetail.minValue,
          max_value: analogDetail.maxValue,
          unit: analogDetail.unit,
          signal_type: analogDetail.signalType,
          resolution_bits: analogDetail.resolutionBits,
        })
      : null;

    const deletedAt =
      row?.deleted_at ??
      controlUrl?.deleted_at ??
      controlUrl?.node_deleted_at ??
      controlUrl?.gateway_deleted_at ??
      null;

    return {
      id,
      name: row?.name ?? controlUrl?.name ?? `Command Setup ${id || controlUrlId || ""}`,
      status: "offline",
      registered: true,
      controlUrlId,
      nodeId:
        controlUrl?.node_external_id ??
        controlUrl?.node_id ??
        controlUrl?.controller_id ??
        null,
      controllerId: controlUrl?.controller_id ?? null,
      inputType: controlUrl?.input_type ?? null,
      url: controlUrl?.url ?? null,
      gatewayId: controlUrl?.gateway_external_id ?? null,
      command: commandText ?? fallbackCommandText,
      commandType: type,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
      deletedAt,
      controlUrlMeta: {
        id: controlUrl?.id ? String(controlUrl.id) : controlUrlId || null,
        nodeId: controlUrl?.node_id ? String(controlUrl.node_id) : null,
        nodeExternalId: controlUrl?.node_external_id ? String(controlUrl.node_external_id) : null,
        gatewayId: controlUrl?.gateway_external_id ? String(controlUrl.gateway_external_id) : null,
        controllerId: controlUrl?.controller_id ? String(controlUrl.controller_id) : null,
        name: controlUrl?.name ? String(controlUrl.name) : null,
        url: controlUrl?.url ? String(controlUrl.url) : null,
        inputType: controlUrl?.input_type ? String(controlUrl.input_type) : null,
      },
      commandDetail: {
        type,
        name: row?.name ?? null,
        command: commandPayload,
        minValue: analogDetail?.minValue ?? null,
        maxValue: analogDetail?.maxValue ?? null,
        unit: analogDetail?.unit ?? null,
        signalType: analogDetail?.signalType ?? null,
        resolutionBits: analogDetail?.resolutionBits ?? null,
      },
    };
  }

  function isDeletingCommandSetup(row: DeviceRow) {
    return Boolean(deletingCommandSetupMap.value[row.id]);
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

  function setDeletingCommandSetup(row: DeviceRow, value: boolean) {
    deletingCommandSetupMap.value = {
      ...deletingCommandSetupMap.value,
      [row.id]: value,
    };
  }

  async function loadCommandSetups() {
    const base = resolveControlModuleBase();
    if (!import.meta.client) return;
    if (!base) return;
    const authorization = authStore.authorizationHeader;
    if (!authorization) return;

    return withLoading(async () => {
      try {
        const includeParams = options.includeSoftDeleted ? "?include=all" : "";
        const commandSetupPayload = await fetchAllPages(
          `${base}/commands${includeParams}`,
          authorization,
        );
        const rows = options.includeSoftDeleted
          ? commandSetupPayload
          : commandSetupPayload.filter(
              (row: any) =>
                row?.deleted_at == null &&
                (!row?.control_url || row?.control_url?.deleted_at == null),
            );
        commandSetupRows.value = rows.map(mapCommandSetupRow).sort(sortByLatestThenId);
      } catch (error: any) {
        console.error("Failed to load command setups", error);
        commandSetupRows.value = [];
        message.error(error?.message ?? "Failed to load command setups.");
      }
    });
  }

  function canDeleteCommandSetup(row: DeviceRow) {
    return row.commandType === "json_command";
  }

  function canEditCommandSetup(row: DeviceRow) {
    return row.commandType === "json_command";
  }

  async function loadControlUrlOptions() {
    const base = resolveControlModuleBase();
    if (!import.meta.client) return;
    if (!base) return;
    const authorization = authStore.authorizationHeader;
    if (!authorization) return;

    try {
      const controlUrlPayload = await fetchAllPages(
        `${base}/control-urls?include=gateway`,
        authorization,
      );
      controlUrlOptions.value = controlUrlPayload
        .map((row: any) => {
          const id = row?.id ? String(row.id) : "";
          const name = row?.name ? String(row.name) : `Control URL ${id}`;
          const suffix = row?.url ? ` (${String(row.url)})` : "";
          return {
            id,
            label: `${name}${suffix}`,
          };
        })
        .filter((row: { id: string }) => row.id.length > 0);
    } catch (error) {
      console.error("Failed to load control url options", error);
      controlUrlOptions.value = [];
    }
  }

  function resetCommandSetupForm() {
    commandSetupForm.value = {
      control_url_id: "",
      name: "",
      commandText: "",
    };
    editingCommandSetupId.value = null;
  }

  function closeCommandSetupModal() {
    isCommandSetupModalOpen.value = false;
    editingCommandSetupId.value = null;
  }

  async function openCommandSetupModal() {
    resetCommandSetupForm();
    await loadControlUrlOptions();
    isCommandSetupModalOpen.value = true;
  }

  function serializeCommandForForm(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    if (typeof value === "string") {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  async function openEditCommandSetupModal(row: DeviceRow) {
    if (!canEditCommandSetup(row)) {
      message.warning("Only JSON command rows can be edited.");
      return;
    }
    if (!row?.id) {
      message.warning("Missing command setup id.");
      return;
    }

    await loadControlUrlOptions();
    editingCommandSetupId.value = row.id;
    commandSetupForm.value = {
      control_url_id: row.controlUrlId ?? row.controlUrlMeta?.id ?? "",
      name: row.name ?? "",
      commandText: serializeCommandForForm(row.commandDetail?.command ?? row.command),
    };
    isCommandSetupModalOpen.value = true;
  }

  async function handleCreateCommandSetup() {
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

    if (!commandSetupForm.value.control_url_id) {
      message.warning("Please select control url.");
      return;
    }
    if (!commandSetupForm.value.name.trim()) {
      message.warning("Please input command name.");
      return;
    }

    let parsedCommand: any = commandSetupForm.value.commandText;
    try {
      parsedCommand = JSON.parse(commandSetupForm.value.commandText);
    } catch {
      // Keep raw value when text is not valid JSON.
    }

    isSavingCommandSetup.value = true;
    try {
      const isEditMode = isEditingCommandSetup.value;
      const endpoint = isEditMode
        ? `${base}/control-json-commands/${encodeURIComponent(editingCommandSetupId.value ?? "")}`
        : `${base}/control-json-commands`;
      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          Authorization: authorization,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          control_url_id: commandSetupForm.value.control_url_id,
          name: commandSetupForm.value.name.trim(),
          command: parsedCommand,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ??
            (isEditMode
              ? "Failed to update command setup."
              : "Failed to create command setup."),
        );
      }

      message.success(
        payload?.message ??
          (isEditMode ? "Command setup updated." : "Command setup created."),
      );
      closeCommandSetupModal();
      resetCommandSetupForm();
      await loadCommandSetups();
    } catch (error: any) {
      console.error("Failed to create command setup", error);
      message.error(
        error?.message ??
          (isEditingCommandSetup.value
            ? "Unable to update command setup."
            : "Unable to create command setup."),
      );
    } finally {
      isSavingCommandSetup.value = false;
    }
  }

  async function handleDeleteCommandSetup(row: DeviceRow) {
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
      message.warning("Missing command setup id.");
      return;
    }
    if (!canDeleteCommandSetup(row)) {
      message.warning("Only JSON command rows can be deleted.");
      return;
    }
    if (isDeletingCommandSetup(row)) {
      return;
    }

    const encodedId = encodeURIComponent(row.id);
    const endpoint = `${base}/control-json-commands/${encodedId}`;

    setDeletingCommandSetup(row, true);
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
        throw new Error(payload?.message ?? "Failed to delete command setup.");
      }

      message.success(payload?.message ?? "Command setup deleted.");
      commandSetupRows.value = commandSetupRows.value.filter(
        (item) => item.id !== row.id,
      );
    } catch (error: any) {
      console.error("Failed to delete command setup", error);
      message.error(error?.message ?? "Unable to delete command setup.");
    } finally {
      setDeletingCommandSetup(row, false);
    }
  }

  return {
    commandSetupRows,
    isCommandSetupModalOpen,
    isSavingCommandSetup,
    isEditingCommandSetup,
    controlUrlOptions,
    commandSetupForm,
    loadCommandSetups,
    openCommandSetupModal,
    openEditCommandSetupModal,
    closeCommandSetupModal,
    resetCommandSetupForm,
    handleCreateCommandSetup,
    isDeletingCommandSetup,
    canEditCommandSetup,
    canDeleteCommandSetup,
    handleDeleteCommandSetup,
  };
}
