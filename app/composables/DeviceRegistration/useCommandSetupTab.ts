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

type GeneratedField = {
  key: string;
  valueText: string;
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
    commandInputType: "generated" as "generated" | "raw",
    commandMode: "digital" as "digital" | "analog",
    generatedFields: [{ key: "", valueText: "" }] as GeneratedField[],
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
    const type = "json_command" as const;
    const controlUrl = row?.control_url ?? null;
    const controlUrlId =
      row?.control_url_id
        ? String(row.control_url_id)
        : controlUrl?.id
          ? String(controlUrl.id)
          : "";
    const commandPayload = row?.command ?? row?.command_payload ?? null;
    const commandText =
      commandPayload === null || commandPayload === undefined
        ? null
        : typeof commandPayload === "string"
          ? commandPayload
          : JSON.stringify(commandPayload);

    const deletedAt =
      row?.deleted_at ??
      controlUrl?.deleted_at ??
      null;

    return {
      id,
      name: row?.name ?? controlUrl?.name ?? `Command Setup ${id || controlUrlId || ""}`,
      status: "offline",
      registered: true,
      controlUrlId,
      nodeId:
        row?.node_extended_id ??
        row?.node_external_id ??
        controlUrl?.node?.extended_id ??
        controlUrl?.node?.external_id ??
        controlUrl?.node_external_id ??
        controlUrl?.node_id ??
        controlUrl?.controller_id ??
        null,
      controllerId: controlUrl?.controller_id ?? null,
      inputType: controlUrl?.input_type ?? null,
      url: controlUrl?.url ?? null,
      gatewayId: controlUrl?.gateway_external_id ?? null,
      command: commandText,
      commandType: type,
      createdAt: row?.created_at ?? null,
      updatedAt: row?.updated_at ?? null,
      deletedAt,
      controlUrlMeta: {
        id: controlUrl?.id ? String(controlUrl.id) : controlUrlId || null,
        nodeId: controlUrl?.node_id ? String(controlUrl.node_id) : null,
        nodeExternalId:
          controlUrl?.node?.extended_id
            ? String(controlUrl.node.extended_id)
            : controlUrl?.node?.external_id
              ? String(controlUrl.node.external_id)
              : controlUrl?.node_external_id
                ? String(controlUrl.node_external_id)
                : null,
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
        const listEndpoint = options.includeSoftDeleted
          ? `${base}/commands?type=json_command&include=all`
          : `${base}/control-json-commands`;
        const commandSetupPayload = await fetchAllPages(
          listEndpoint,
          authorization,
        );
        const rows = commandSetupPayload.filter(
          (row: any) => (row?.type ?? "json_command") === "json_command",
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
        .filter(
          (row: any) =>
            String(row?.input_type ?? "")
              .trim()
              .toLowerCase() === "json_command",
        )
        .map((row: any) => {
          const id = row?.id ? String(row.id) : "";
          const name = row?.name ? String(row.name) : `Control URL ${id}`;
          return {
            id,
            label: name,
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
      commandInputType: "generated",
      commandMode: "digital",
      generatedFields: [{ key: "", valueText: "" }],
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
    syncGeneratedCommandText();
    await loadControlUrlOptions();
    if (!controlUrlOptions.value.length) {
      message.warning("No control URL with input_type=json_command found.");
    }
    isCommandSetupModalOpen.value = true;
  }

  function parseGeneratedFieldValue(valueText: string): unknown {
    const normalized = valueText.trim();
    if (normalized === "") return "";

    const lowered = normalized.toLowerCase();
    if (lowered === "true") return true;
    if (lowered === "false") return false;
    if (lowered === "null") return null;

    const numberValue = Number(normalized);
    if (!Number.isNaN(numberValue)) {
      return Number.isInteger(numberValue) ? Math.trunc(numberValue) : numberValue;
    }

    if (
      (normalized.startsWith("{") && normalized.endsWith("}")) ||
      (normalized.startsWith("[") && normalized.endsWith("]"))
    ) {
      try {
        return JSON.parse(normalized);
      } catch {
        // keep string literal
      }
    }

    return normalized;
  }

  function stringifyGeneratedFieldValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  function buildGeneratedCommandObject(): Record<string, unknown> {
    const command: Record<string, unknown> = {
      mode: commandSetupForm.value.commandMode,
    };

    for (const field of commandSetupForm.value.generatedFields) {
      const fieldKey = field.key.trim();
      if (fieldKey === "" || fieldKey === "mode" || fieldKey === "value") {
        continue;
      }
      command[fieldKey] = parseGeneratedFieldValue(field.valueText);
    }

    return command;
  }

  function syncGeneratedCommandText() {
    commandSetupForm.value.commandText = JSON.stringify(
      buildGeneratedCommandObject(),
      null,
      2,
    );
  }

  function handleGeneratedModeChanged() {
    syncGeneratedCommandText();
  }

  function handleGeneratedDraftChanged() {
    syncGeneratedCommandText();
  }

  function addGeneratedFieldInput() {
    commandSetupForm.value.generatedFields.push({ key: "", valueText: "" });
  }

  function removeGeneratedFieldInput(index: number) {
    if (
      index < 0 ||
      index >= commandSetupForm.value.generatedFields.length
    ) {
      return;
    }
    commandSetupForm.value.generatedFields.splice(index, 1);
    if (!commandSetupForm.value.generatedFields.length) {
      commandSetupForm.value.generatedFields.push({ key: "", valueText: "" });
    }
    syncGeneratedCommandText();
  }

  function handleCommandInputTypeChanged() {
    if (commandSetupForm.value.commandInputType === "generated") {
      syncGeneratedCommandText();
    }
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
    const sourceCommand = row.commandDetail?.command;
    const serializedCommand = serializeCommandForForm(sourceCommand ?? row.command);
    const isObjectCommand =
      sourceCommand !== null &&
      typeof sourceCommand === "object" &&
      !Array.isArray(sourceCommand);
    const commandMode = isObjectCommand
      ? String((sourceCommand as Record<string, unknown>).mode ?? "")
          .trim()
          .toLowerCase()
      : "";
    const canUseGenerated = isObjectCommand && (commandMode === "digital" || commandMode === "analog");
    const customEntries = isObjectCommand
      ? Object.entries(sourceCommand as Record<string, unknown>).filter(
          ([key]) => key !== "mode" && key !== "value",
        )
      : [];

    commandSetupForm.value = {
      control_url_id: row.controlUrlId ?? row.controlUrlMeta?.id ?? "",
      name: row.name ?? "",
      commandInputType: canUseGenerated ? "generated" : "raw",
      commandMode: commandMode === "analog" ? "analog" : "digital",
      generatedFields: customEntries.length
        ? customEntries.map(([key, value]) => ({
            key,
            valueText: stringifyGeneratedFieldValue(value),
          }))
        : [{ key: "", valueText: "" }],
      commandText: serializedCommand,
    };
    if (canUseGenerated) {
      syncGeneratedCommandText();
    }
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
    let parsedCommand: Record<string, unknown>;
    if (commandSetupForm.value.commandInputType === "generated") {
      parsedCommand = buildGeneratedCommandObject();
      syncGeneratedCommandText();
    } else {
      if (!commandSetupForm.value.commandText.trim()) {
        message.warning("Please input command JSON.");
        return;
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(commandSetupForm.value.commandText);
      } catch {
        message.warning("Command must be valid JSON.");
        return;
      }
      if (
        parsedJson === null ||
        typeof parsedJson !== "object" ||
        Array.isArray(parsedJson)
      ) {
        message.warning("Command must be a JSON object.");
        return;
      }

      const mode = commandSetupForm.value.commandMode;
      parsedCommand = {
        ...(parsedJson as Record<string, unknown>),
        mode,
      };
    }

    isSavingCommandSetup.value = true;
    try {
      const isEditMode = isEditingCommandSetup.value;
      const endpoint = isEditMode
        ? `${base}/control-json-commands/${encodeURIComponent(editingCommandSetupId.value ?? "")}`
        : `${base}/control-json-commands`;
      const requestBody: Record<string, unknown> = {
        control_url_id: commandSetupForm.value.control_url_id,
        name: commandSetupForm.value.name.trim(),
        command: parsedCommand,
      };
      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          Authorization: authorization,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
    handleGeneratedModeChanged,
    handleGeneratedDraftChanged,
    addGeneratedFieldInput,
    removeGeneratedFieldInput,
    handleCommandInputTypeChanged,
    syncGeneratedCommandText,
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
