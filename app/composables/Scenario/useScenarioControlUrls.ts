import { computed, ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import type { ControlUrlOption } from "@/composables/Scenario/scenarioBuilderTypes";

export function normalizeControlInputType(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("analog")) return "analog";
  if (normalized.includes("digital") || normalized.includes("relay")) return "digital";
  return normalized;
}

type JsonCommandRow = {
  id?: string | null;
  control_url_id?: string | null;
  name?: string | null;
  command?: unknown;
  controlUrl?: any;
  control_url?: any;
};

function parseJsonObject(value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
}

function resolveJsonCommandMode(value: unknown) {
  const payload = parseJsonObject(value);
  const mode = String(payload?.mode ?? "").trim().toLowerCase();
  if (mode === "digital" || mode === "analog") {
    return mode;
  }
  return "json_command";
}

export function useScenarioControlUrls(params: {
  controlModuleBase: Ref<string>;
  authorizationHeader: Ref<string | null | undefined>;
}) {
  const controlUrlOptions = ref<ControlUrlOption[]>([]);
  const hasLoadedControlUrls = ref(false);

  const controlUrlLabelMap = computed(() => {
    const map = new Map<string, string>();
    controlUrlOptions.value.forEach((item) => {
      const key = String(item?.control_url_id ?? item?.id ?? "").trim();
      if (key) {
        map.set(key, item.name || key);
      }
    });
    return map;
  });

  function resolveControlInputTypeById(controlUrlId?: string | null) {
    if (!controlUrlId) return null;
    const selected = controlUrlOptions.value.find((item) => item.id === controlUrlId);
    return normalizeControlInputType(selected?.input_type);
  }

  function resolveControlNodeId(item: ControlUrlOption) {
    return item?.node?.extended_id || item?.node?.external_id || item?.node?.id || "—";
  }

  function resolveControlGatewayId(item: ControlUrlOption) {
    return item?.node?.gateway?.extended_id || item?.node?.gateway?.external_id || item?.node?.gateway?.id || "—";
  }

  function isMissingControlUrl(controlUrlId?: string | null) {
    if (!hasLoadedControlUrls.value) return false;
    if (!controlUrlId) return false;
    return !controlUrlOptions.value.some((item) => {
      const baseControlUrlId = String(item?.control_url_id ?? item?.id ?? "").trim();
      return baseControlUrlId === controlUrlId;
    });
  }

  function extractRows(payload: any) {
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  async function fetchControlUrls() {
    if (!params.controlModuleBase.value) return;
    const authorization = params.authorizationHeader.value;
    if (!authorization) {
      message.error("Missing authorization.");
      return;
    }
    try {
      const controlUrlsEndpoint = `${params.controlModuleBase.value}/control-urls?per_page=200&include=gateway`;
      const jsonCommandsEndpoint = `${params.controlModuleBase.value}/control-json-commands?per_page=200`;

      const [controlUrlsResponse, jsonCommandsResponse] = await Promise.all([
        fetch(controlUrlsEndpoint, {
          headers: {
            Authorization: authorization,
            Accept: "application/json",
          },
        }),
        fetch(jsonCommandsEndpoint, {
          headers: {
            Authorization: authorization,
            Accept: "application/json",
          },
        }),
      ]);

      const controlUrlsPayload = await controlUrlsResponse.json().catch(() => null);
      if (!controlUrlsResponse.ok) {
        throw new Error(controlUrlsPayload?.message ?? "Failed to load control urls.");
      }

      const jsonCommandsPayload = await jsonCommandsResponse.json().catch(() => null);
      if (!jsonCommandsResponse.ok) {
        throw new Error(jsonCommandsPayload?.message ?? "Failed to load control json commands.");
      }

      const controlUrlRows = extractRows(controlUrlsPayload) as ControlUrlOption[];
      const jsonCommandRows = extractRows(jsonCommandsPayload) as JsonCommandRow[];

      const jsonCommandsByControlUrlId = new Map<
        string,
        Array<{ id?: string | null; control_url_id?: string | null; name?: string | null; command?: unknown }>
      >();
      const controlUrlMetaById = new Map<string, any>();

      jsonCommandRows.forEach((row) => {
        const controlUrlId = String(
          row?.control_url_id ?? row?.controlUrl?.id ?? row?.control_url?.id ?? "",
        ).trim();
        if (!controlUrlId) return;

        const list = jsonCommandsByControlUrlId.get(controlUrlId) ?? [];
        list.push({
          id: row?.id ? String(row.id) : null,
          control_url_id: controlUrlId,
          name: row?.name ? String(row.name) : null,
          command: row?.command ?? null,
        });
        jsonCommandsByControlUrlId.set(controlUrlId, list);

        const meta = row?.controlUrl ?? row?.control_url ?? null;
        if (meta && !controlUrlMetaById.has(controlUrlId)) {
          controlUrlMetaById.set(controlUrlId, meta);
        }
      });

      const merged = controlUrlRows.map((row: any) => {
        const id = String(row?.id ?? "").trim();
        const meta = controlUrlMetaById.get(id) ?? null;
        const node = row?.node ?? meta?.node ?? null;
        const gateway = node?.gateway ?? null;

        return {
          ...row,
          url: row?.url ?? meta?.url ?? null,
          json_commands: jsonCommandsByControlUrlId.get(id) ?? null,
          node: node
            ? {
                ...node,
                extended_id: node?.extended_id ?? node?.external_id ?? null,
                gateway: gateway
                  ? {
                      ...gateway,
                      extended_id: gateway?.extended_id ?? gateway?.external_id ?? null,
                    }
                  : null,
              }
            : null,
        } as ControlUrlOption;
      });

      const filteredRows = merged.filter((row: any) => {
        if (row?.deleted_at != null) return false;
        if (row?.node?.deleted_at != null) return false;
        if (row?.node?.gateway?.deleted_at != null) return false;
        return true;
      });

      const expandedRows: ControlUrlOption[] = [];
      filteredRows.forEach((row: any) => {
        const baseControlUrlId = String(row?.id ?? "").trim();
        const inputType = normalizeControlInputType(row?.input_type);
        const commands = Array.isArray(row?.json_commands) ? row.json_commands : [];

        if (inputType !== "json_command") {
          expandedRows.push({
            ...row,
            id: baseControlUrlId,
            control_url_id: baseControlUrlId,
          });
          return;
        }

        if (!commands.length) {
          expandedRows.push({
            ...row,
            id: baseControlUrlId,
            control_url_id: baseControlUrlId,
            json_command_id: null,
            json_command_name: null,
          });
          return;
        }

        commands.forEach((command: any, index: number) => {
          const jsonCommandId = String(command?.id ?? "").trim() || null;
          const jsonCommandName = String(command?.name ?? "").trim() || null;
          const optionId = jsonCommandId
            ? `${baseControlUrlId}::${jsonCommandId}`
            : `${baseControlUrlId}::${index + 1}`;
          expandedRows.push({
            ...row,
            id: optionId,
            control_url_id: baseControlUrlId,
            name: jsonCommandName ?? row?.name ?? baseControlUrlId,
            input_type: resolveJsonCommandMode(command?.command),
            json_command_id: jsonCommandId,
            json_command_name: jsonCommandName,
            json_commands: [command],
          });
        });
      });

      controlUrlOptions.value = expandedRows;
    } catch (error: any) {
      message.error(error?.message ?? "Failed to load control urls.");
    } finally {
      hasLoadedControlUrls.value = true;
    }
  }

  return {
    controlUrlLabelMap,
    controlUrlOptions,
    fetchControlUrls,
    hasLoadedControlUrls,
    isMissingControlUrl,
    resolveControlGatewayId,
    resolveControlInputTypeById,
    resolveControlNodeId,
  };
}
