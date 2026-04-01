<template>
  <div class="flex flex-col gap-4 pb-4">
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
      <div class="lg:col-span-3 min-h-0 flex flex-col gap-4">
        <a-tabs
          v-model:activeKey="activeVisualTab"
          class="px-4 device-control-tabs text-xs"
          size="small"
        >
        <a-tab-pane key="map" tab="Map">
            <div class="h-[60vh] min-h-[60vh]">
              <DeviceMapCanvas ref="mapCanvasRef" class="w-full h-full" map-height="100%" />
            </div>
          </a-tab-pane>
          <a-tab-pane key="chart" tab="Chart">
            <div class="h-[60vh] min-h-[60vh]">
              <SingleMetricChart
                class="w-full h-full"
                container-height="100%"
                :selected-metric-key="selectedMetricKey"
                :selected-timeframe="selectedTimeframe"
                @update:selected-metric-key="handleMetricChange"
              />
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>

      <div class="lg:col-span-1 min-h-0 flex flex-col gap-4">
        <a-tabs
          v-model:activeKey="activeInfoTab"
          class="px-4 device-control-tabs text-xs"
          size="small"
        >
          <a-tab-pane key="panel" tab="Active Devices">
            <div class="h-[60vh] min-h-[60vh]">
              <ActiveDevicesPanel
                class="w-full"
                panel-height="60vh"
                :show-header="false"
                :show-view-all="false"
                :show-map-tab="true"
                :map-is-areas-loading="mapIsAreasLoading"
                :map-managed-areas="mapManagedAreas"
                :map-focus-area="handleFocusArea"
                :map-zoom-to-node="handleZoomToNode"
              />
            </div>
          </a-tab-pane>
          <a-tab-pane key="databox" tab="Scenarios">
            <div class="h-[60vh] min-h-[60vh]">
              <DataBoxCard
                class="w-full h-[60vh] min-h-[60vh]"
                :is-loading="isScenarioLoading"
                :columns="3"
                :has-data="displayedScenarioRows.length > 0"
                :pagination="scenarioPagination"
                :scroll-body="true"
                :elevated="false"
                :padded="false"
                loading-text="Loading scenarios..."
                @prev-page="prevScenarioPage"
                @next-page="nextScenarioPage"
                @change-per-page="changeScenarioPerPage"
              >
                <template #head>
                  <tr class="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                    <th class="px-2 py-2 text-left font-semibold">Name</th>
                    <th class="px-2 py-2 text-left font-semibold">Workflow State</th>
                    <th class="px-2 py-2 text-center font-semibold">Actions</th>
                  </tr>
                </template>

                <template #default>
                  <tr
                    v-for="row in displayedScenarioRows"
                    :key="row.id"
                    class="hover:bg-gray-50 transition-colors text-xs border-b border-gray-100"
                  >
                    <td class="px-2 py-2 text-gray-700 text-left align-middle">
                      {{ row.name || "-" }}
                    </td>
                    <td class="px-2 py-2 text-left align-middle">
                      <span
                        :class="[
                          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                          getRuntimeStatus(row.id) === 'running'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : getRuntimeStatus(row.id) === 'stopping'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : getRuntimeStatus(row.id) === 'error'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200',
                        ]"
                      >
                        {{ formatRuntimeStatus(getRuntimeStatus(row.id)) }}
                      </span>
                    </td>
                    <td class="px-2 py-2 text-center align-middle">
                      <button
                        v-if="getRuntimeStatus(row.id) === 'running' || getRuntimeStatus(row.id) === 'stopping'"
                        type="button"
                        class="w-8 h-8 inline-flex items-center justify-center rounded border border-amber-200 text-amber-600 hover:bg-amber-50 cursor-pointer"
                        @click="handleStopScenario(row)"
                        title="Stop"
                        aria-label="Stop scenario"
                      >
                        <BootstrapIcon name="stop-fill" class="w-3 h-3" />
                      </button>
                      <button
                        v-else
                        type="button"
                        class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                        @click="handleRunScenario(row)"
                        title="Run"
                        aria-label="Run scenario"
                      >
                        <BootstrapIcon name="play-fill" class="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                </template>

                <template #empty> No scenarios found. </template>

                <template #footer>
                  <span>Showing {{ displayedScenarioRows.length }} entries.</span>
                </template>
              </DataBoxCard>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>
    </div>

    <div>
      <ControlWidgetBox
        class="w-full"
        :items="controlUrlItems"
        :is-loading="isLoadingControlUrls"
        :error="controlUrlLoadError"
        :on-execute="handleExecuteControlUrl"
        :on-execute-analog="handleExecuteAnalog"
        :on-analog-saved="handleAnalogSaved"
        :has-sse="isSseConnected"
        :controller-states-by-node="controllerStatesByNode"
        :desktop-columns="4"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, isRef, onBeforeUnmount, onMounted, ref, type Ref, watch } from "vue";
import { message } from "ant-design-vue";
import ActiveDevicesPanel from "@/components/devices-control/ActiveDevicesPanel.vue";
import ControlWidgetBox from "@/components/devices-control/ControlWidgetBox.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import SingleMetricChart from "@/components/SingleMetricChart.vue";
import DeviceMapCanvas from "@/components/devices-control/maps/DeviceMapCanvas.vue";
import { useMetrics } from "@/composables/useMetrics";
import type { TimeframeKey } from "@/types/dashboard";
import type { ControllerState, DeviceRow, Section } from "@/types/devices-control";
import { useAuthStore } from "~~/stores/auth";
import { apiConfig } from "~~/config/api";
import { useControlUrlActions } from "@/composables/DeviceControl/useControlUrlActions";
import {
  createNodeCollectionsStore,
  type GatewayEventPayload,
} from "@/composables/DeviceRegistration/SSEHandle";
import {
  buildWorkflowListParams,
  fetchWorkflows,
  runWorkflow,
  stopWorkflow,
  type WorkflowRow,
} from "@/composables/Scenario/handleWorkflow";

defineProps<{
  section: Section;
}>();

const { metrics } = useMetrics();
const authStore = useAuthStore();
const selectedMetricKey = ref<string>("");
const selectedTimeframe = ref<TimeframeKey>("second");
const { executeControlUrl } = useControlUrlActions();
const runtimeStatusById = ref<Record<string, string>>({});
const scenarioRows = ref<WorkflowRow[]>([]);
const isScenarioLoading = ref(false);
const scenarioPagination = ref({ page: 1, perPage: 5, lastPage: 1, total: 0 });
const controlUrlItems = ref<ControlUrlItem[]>([]);
const isLoadingControlUrls = ref(false);
const controlUrlLoadError = ref<string | null>(null);
const controllerStatesByNode = ref<Record<string, ControllerState[]>>({});
const nodeRows = ref<DeviceRow[]>([]);
const isSseConnected = ref(false);
let gatewayEventSource: EventSource | null = null;
const nodeCollectionsStore = createNodeCollectionsStore();

type ControlUrlItem = {
  id: string;
  controller_id?: string | null;
  name?: string | null;
  url?: string | null;
  input_type?: string | null;
  json_commands?: Array<{
    id?: string | null;
    control_url_id?: string | null;
    name?: string | null;
    command?: unknown;
  }> | null;
  jsonCommands?: Array<{
    id?: string | null;
    control_url_id?: string | null;
    name?: string | null;
    command?: unknown;
  }> | null;
  json_command?: {
    id?: string | null;
    control_url_id?: string | null;
    name?: string | null;
    command?: unknown;
  } | null;
  jsonCommand?: {
    id?: string | null;
    control_url_id?: string | null;
    name?: string | null;
    command?: unknown;
  } | null;
  analog_signal?: {
    id?: string | null;
    control_url_id?: string | null;
    min_value?: number | string | null;
    max_value?: number | string | null;
    unit?: string | null;
    signal_type?: string | null;
    resolution_bits?: number | string | null;
  } | null;
  analogSignal?: {
    id?: string | null;
    control_url_id?: string | null;
    min_value?: number | string | null;
    max_value?: number | string | null;
    unit?: string | null;
    signal_type?: string | null;
    resolution_bits?: number | string | null;
  } | null;
  node?: {
    id?: string | null;
    name?: string | null;
    external_id?: string | null;
    mac_address?: string | null;
    ip_address?: string | null;
    type?: string | null;
    gateway?: {
      id?: string | null;
      name?: string | null;
      external_id?: string | null;
      mac_address?: string | null;
      ip_address?: string | null;
    } | null;
  } | null;
};

type JsonCommandRow = {
  id?: string | null;
  control_url_id?: string | null;
  name?: string | null;
  command?: unknown;
  controlUrl?: any;
  control_url?: any;
};

type MapCanvasExpose = {
  managedAreas: Ref<any[]> | any[];
  isAreasLoading: Ref<boolean> | boolean;
  focusArea: (area: any) => void;
  zoomToNode: (node: DeviceRow) => void;
};

const mapCanvasRef = ref<MapCanvasExpose | null>(null);
const activeVisualTab = ref<"chart" | "map">("chart");
const activeInfoTab = ref<"panel" | "databox">("panel");

const mapManagedAreas = computed(() => {
  const areas = mapCanvasRef.value?.managedAreas;
  if (isRef(areas)) return Array.isArray(areas.value) ? areas.value : [];
  return Array.isArray(areas) ? areas : [];
});

const mapIsAreasLoading = computed(() => {
  const loading = mapCanvasRef.value?.isAreasLoading;
  if (isRef(loading)) return Boolean(loading.value);
  return Boolean(loading);
});

function handleMetricChange(value: string) {
  selectedMetricKey.value = value;
}

function handleFocusArea(area: any) {
  mapCanvasRef.value?.focusArea?.(area);
}

function handleZoomToNode(node: DeviceRow) {
  mapCanvasRef.value?.zoomToNode?.(node);
}

function normalizeActionType(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("relay")) return "relay_control";
  if (normalized.includes("digital")) return "digital";
  if (normalized.includes("analog")) return "analog";
  if (normalized.includes("servo")) return "servo_control";
  return normalized;
}

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

function resolveJsonMode(item: ControlUrlItem) {
  const list = Array.isArray(item.json_commands)
    ? item.json_commands
    : Array.isArray(item.jsonCommands)
      ? item.jsonCommands
      : (item.json_command ?? item.jsonCommand)
        ? [item.json_command ?? item.jsonCommand]
        : [];

  for (const row of list) {
    const command = parseJsonObject(row?.command);
    const mode = String(command?.mode ?? "").trim().toLowerCase();
    if (mode === "digital" || mode === "analog") {
      return mode;
    }
  }

  return null;
}

function resolveActionType(item: ControlUrlItem) {
  const inputType = String(item.input_type ?? "").trim().toLowerCase();
  if (inputType === "json_command") {
    return resolveJsonMode(item) ?? undefined;
  }
  return normalizeActionType(item.input_type) ?? undefined;
}

function extractRows(payload: any) {
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
}

function mergeJsonCommandsToControlUrls(
  controlUrlRows: ControlUrlItem[],
  jsonCommandRows: JsonCommandRow[],
) {
  const jsonCommandsByControlUrlId = new Map<
    string,
    Array<{ id?: string | null; control_url_id?: string | null; name?: string | null; command?: unknown }>
  >();

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
  });

  return controlUrlRows.map((row) => {
    const id = String(row?.id ?? "").trim();
    const existingList = Array.isArray(row?.json_commands)
      ? row.json_commands
      : Array.isArray(row?.jsonCommands)
        ? row.jsonCommands
        : [];
    const mergedList = [
      ...existingList,
      ...(jsonCommandsByControlUrlId.get(id) ?? []),
    ];
    const dedupMap = new Map<string, { id?: string | null; control_url_id?: string | null; name?: string | null; command?: unknown }>();
    mergedList.forEach((item, index) => {
      const dedupKey = String(item?.id ?? `${item?.name ?? ""}:${index}`);
      dedupMap.set(dedupKey, item);
    });

    return {
      ...row,
      json_commands: Array.from(dedupMap.values()),
    };
  });
}

async function fetchControlUrls() {
  if (!apiConfig.controlModule) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    controlUrlLoadError.value = "Missing authorization.";
    return;
  }
  isLoadingControlUrls.value = true;
  controlUrlLoadError.value = null;
  try {
    const base = apiConfig.controlModule.replace(/\/$/, "");
    const controlUrlsEndpoint = `${base}/control-urls?include=gateway,analog_signal,json_commands&per_page=500`;
    const jsonCommandsEndpoint = `${base}/control-json-commands?per_page=500`;

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

    const controlUrlRows = extractRows(controlUrlsPayload) as ControlUrlItem[];
    const jsonCommandRows = extractRows(jsonCommandsPayload) as JsonCommandRow[];
    const mergedRows = mergeJsonCommandsToControlUrls(controlUrlRows, jsonCommandRows);

    controlUrlItems.value = mergedRows.filter((row: any) => {
      if (row?.deleted_at != null) return false;
      if (row?.node?.deleted_at != null) return false;
      if (row?.node?.gateway?.deleted_at != null) return false;
      return true;
    });
  } catch (error: any) {
    controlUrlLoadError.value = error?.message ?? "Failed to load control urls.";
    controlUrlItems.value = [];
    message.error(controlUrlLoadError.value);
  } finally {
    isLoadingControlUrls.value = false;
  }
}

function handleAnalogSaved() {
  fetchControlUrls();
}

async function handleExecuteControlUrl(
  widget: {
    id: string;
    baseId?: string;
    raw: ControlUrlItem;
    selectedJsonCommand?: {
      id?: string | null;
      name?: string | null;
    } | null;
  },
  nextState: boolean,
) {
  const authorization = authStore.authorizationHeader;
  if (!authorization) throw new Error("Missing authorization.");
  const url = widget.raw.url ?? "";
  if (!url) throw new Error("Missing control URL.");
  const actionType = resolveActionType(widget.raw);
  const device = String(widget.raw.name ?? "").trim();
  const jsonCommandId = String(widget.selectedJsonCommand?.id ?? "").trim();
  const jsonCommandName = String(widget.selectedJsonCommand?.name ?? "").trim();
  const controlUrlId = String(widget.baseId ?? widget.id ?? "").trim();
  if (!controlUrlId) throw new Error("Missing control URL id.");
  await executeControlUrl(authorization, controlUrlId, {
    url,
    state: nextState ? "on" : "off",
    action_type: actionType,
    device: device || undefined,
    json_command_id: jsonCommandId || undefined,
    json_command_name: jsonCommandName || undefined,
  });
}

async function handleExecuteAnalog(
  widget: {
    id: string;
    baseId?: string;
    raw: ControlUrlItem;
    selectedJsonCommand?: {
      id?: string | null;
      name?: string | null;
    } | null;
  },
  value: number,
) {
  const authorization = authStore.authorizationHeader;
  if (!authorization) throw new Error("Missing authorization.");
  const url = widget.raw.url ?? "";
  if (!url) throw new Error("Missing control URL.");
  const actionType = resolveActionType(widget.raw);
  const device = String(widget.raw.name ?? "").trim();
  const jsonCommandId = String(widget.selectedJsonCommand?.id ?? "").trim();
  const jsonCommandName = String(widget.selectedJsonCommand?.name ?? "").trim();
  const controlUrlId = String(widget.baseId ?? widget.id ?? "").trim();
  if (!controlUrlId) throw new Error("Missing control URL id.");
  await executeControlUrl(authorization, controlUrlId, {
    url,
    value,
    action_type: actionType,
    device: device || undefined,
    json_command_id: jsonCommandId || undefined,
    json_command_name: jsonCommandName || undefined,
  });
}

function handleGatewayUpdate(event: MessageEvent) {
  if (!event.data) return;
  try {
    const payload = JSON.parse(event.data) as GatewayEventPayload;
    nodeCollectionsStore.updateFromGatewayPayload(payload, {
      nodeRows,
      controllerStatesByNode,
    });
  } catch (error) {
    console.error("Failed to parse gateway SSE payload:", error);
  }
}

function handleGatewayReady() {
  isSseConnected.value = true;
}

function handleGatewayError(event: Event) {
  console.error("Gateway SSE error:", event);
  isSseConnected.value = false;
}

function connectGatewaySse() {
  if (!import.meta.client || !apiConfig.server) return;
  disconnectGatewaySse();
  try {
    const endpoint = `${apiConfig.server.replace(/\/$/, "")}/events/gateways`;
    const source = new EventSource(endpoint);
    source.addEventListener("gateway-update", handleGatewayUpdate);
    source.addEventListener("ready", handleGatewayReady);
    source.addEventListener("error", handleGatewayError);
    source.onopen = handleGatewayReady;
    gatewayEventSource = source;
  } catch (error) {
    console.error("Failed to connect to gateway SSE:", error);
    isSseConnected.value = false;
  }
}

function disconnectGatewaySse() {
  if (gatewayEventSource) {
    gatewayEventSource.close();
    gatewayEventSource = null;
  }
  isSseConnected.value = false;
}

const displayedScenarioRows = computed(() => {
  const start = (scenarioPagination.value.page - 1) * scenarioPagination.value.perPage;
  const end = start + scenarioPagination.value.perPage;
  return scenarioRows.value.slice(start, end);
});

function getRuntimeStatus(id: string | number) {
  return runtimeStatusById.value[String(id)] ?? "idle";
}

function setRuntimeStatus(id: string | number, status: string) {
  runtimeStatusById.value = {
    ...runtimeStatusById.value,
    [String(id)]: status,
  };
}

function formatRuntimeStatus(status: string) {
  switch (status) {
    case "running":
      return "Running";
    case "stopping":
      return "Stopping";
    case "stopped":
      return "Stopped";
    case "error":
      return "Error";
    default:
      return "Idle";
  }
}

function recalculateScenarioPagination() {
  const total = scenarioRows.value.length;
  scenarioPagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / scenarioPagination.value.perPage));
  scenarioPagination.value.lastPage = lastPage;
  if (scenarioPagination.value.page > lastPage) {
    scenarioPagination.value.page = lastPage;
  }
}

function prevScenarioPage() {
  if (scenarioPagination.value.page > 1) {
    scenarioPagination.value.page -= 1;
  }
}

function nextScenarioPage() {
  if (scenarioPagination.value.page < scenarioPagination.value.lastPage) {
    scenarioPagination.value.page += 1;
  }
}

function changeScenarioPerPage(value: number) {
  if (value <= 0) return;
  scenarioPagination.value.perPage = value;
  scenarioPagination.value.page = 1;
  recalculateScenarioPagination();
}

async function fetchScenarioRows() {
  const authorization = authStore.authorizationHeader;
  if (!authorization) return;
  isScenarioLoading.value = true;
  try {
    const params = buildWorkflowListParams({ per_page: "200" });
    scenarioRows.value = await fetchWorkflows(authorization, params);
    recalculateScenarioPagination();
  } catch (error: any) {
    scenarioRows.value = [];
    recalculateScenarioPagination();
    message.error(error?.message ?? "Failed to load scenarios.");
  } finally {
    isScenarioLoading.value = false;
  }
}

async function handleRunScenario(row: WorkflowRow) {
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  try {
    setRuntimeStatus(row.id, "running");
    await runWorkflow(row.id, authorization);
    message.success("Scenario ran successfully.");
    setRuntimeStatus(row.id, "idle");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to run scenario.");
    setRuntimeStatus(row.id, "error");
  }
}

async function handleStopScenario(row: WorkflowRow) {
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  try {
    setRuntimeStatus(row.id, "stopping");
    await stopWorkflow(row.id, authorization);
    message.success("Scenario stopped.");
    setRuntimeStatus(row.id, "stopped");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to stop scenario.");
    setRuntimeStatus(row.id, "error");
  }
}

onMounted(() => {
  connectGatewaySse();
  fetchScenarioRows();
  fetchControlUrls();
});

watch(
  metrics,
  (value) => {
    if (!selectedMetricKey.value && value.length > 0) {
      selectedMetricKey.value = value[0]?.key ?? "";
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  disconnectGatewaySse();
});
</script>

<style scoped>
:deep(.device-control-tabs > .ant-tabs-nav) {
  margin-bottom: 1rem;
}

:deep(.device-control-tabs > .ant-tabs-nav .ant-tabs-tab) {
  min-width: 100px;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 500;
}

:deep(.device-control-tabs > .ant-tabs-nav .ant-tabs-tab-btn) {
  width: 100%;
  text-align: center;
}
</style>
