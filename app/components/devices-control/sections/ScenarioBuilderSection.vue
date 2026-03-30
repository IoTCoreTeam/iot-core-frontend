<template>
  <section class="bg-white rounded border border-slate-200 p-4">
    <div class="border-b border-gray-200 pb-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            aria-label="Back to list"
            title="Back to list"
            @click="$emit('back')"
          >
            <BootstrapIcon name="arrow-left" class="h-3.5 w-3.5" />
          </button>
            <h3 class="text-sm font-semibold text-gray-800">Scenario Builder</h3>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            @click="resetFlow"
          >
            <BootstrapIcon name="trash" class="h-3 w-3" />
            Remove All
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            @click="openConstantsModal"
          >
            <BootstrapIcon name="info-circle" class="h-3 w-3" />
            Constants
          </button>
          <button
            v-if="isCanvasDirty"
            type="button"
            class="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            @click="saveFlow"
          >
            <BootstrapIcon name="save" class="h-3 w-3" />
            Save
          </button>
          <span v-if="isCanvasDirty" class="text-xs text-gray-400" aria-hidden="true">|</span>
          <button
            v-if="isFlowActive"
            type="button"
            class="inline-flex items-center gap-2 rounded border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isStoppingFlow"
            @click="stopFlow"
          >
            <BootstrapIcon name="stop-fill" class="h-3 w-3" />
            {{ isStoppingFlow ? "Stopping..." : "Stop" }}
          </button>
          <template v-else>
            <select
              v-model="runDevicePreparationMode"
              class="h-7 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isFlowActive"
            >
              <option value="turn_off_all">Turn off all devices first</option>
              <option value="keep_current">Keep current device states</option>
            </select>
            <button
              type="button"
              class="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isFlowActive || hasMissingActionNodes"
              @click="runFlow"
            >
              <BootstrapIcon name="play-fill" class="h-3 w-3" />
              {{ runButtonLabel }}
            </button>
          </template>
        </div>
      </div>
      <div class="mt-3 w-full">
        <div class="flex flex-wrap items-center gap-2">
          <div
            v-for="node in palette"
            :key="node.type"
            class="cursor-grab rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 hover:border-blue-300 active:cursor-grabbing"
            draggable="true"
            @dragstart="handleDragStart($event, node.type)"
          >
            <div class="flex items-center gap-2">
              <span class="inline-flex h-5 w-5 items-center justify-center rounded bg-blue-50 text-blue-600">
                <BootstrapIcon :name="node.icon as any" class="h-3 w-3" />
              </span>
              <div class="leading-tight">
                <div class="font-semibold">{{ node.label }}</div>
                <div class="text-[10px] text-gray-400">{{ node.subtitle }}</div>
              </div>
            </div>
          </div>
          <span class="text-[10px] text-gray-400">
            Drop nodes onto the canvas to build a flow.
          </span>
        </div>
      </div>
      <WorkflowProgressPanel
        class="mt-4"
        :workflow-steps="workflowSteps"
        :current-workflow-step="currentWorkflowStep"
        :workflow-overall-status="workflowOverallStatus"
        :workflow-error-message="workflowErrorMessage"
        @clear="resetWorkflowSteps"
      />
    </div>

    <div
      class="relative mt-4 min-h-[420px] rounded border border-gray-200 bg-slate-50"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <div
        v-if="!isFlowVisible"
        class="absolute inset-0 z-10 flex items-center justify-center rounded bg-white/70 backdrop-blur-sm"
      >
        <LoadingState message="Loading scenario canvas..." />
      </div>
      <VueFlow
        v-if="isFlowVisible"
        v-model:nodes="nodes"
        v-model:edges="edges"
        :default-viewport="{ zoom: 1 }"
        :fit-view-on-init="true"
        class="scenario-flow rounded bg-gray-50 min-h-[80vh]"
        @connect="handleConnect"
        @node-click="handleNodeClick"
        @nodes-change="handleNodesChange"
        @edges-change="handleEdgesChange"
      >
        <Background pattern-color="ffffff" :gap="20" :size="1" />
        <Controls :show-interactive="false" />
        <MiniMap />
      </VueFlow>
    </div>
  </section>

  <BaseModal
    :model-value="isActionModalOpen"
    title="Configure Action"
    max-width="max-w-md"
    panel-class="p-6 shadow-xl"
    :close-disabled="isSavingNode"
    @request-close="closeActionModal"
  >
    <form class="space-y-4 text-xs text-gray-700" @submit.prevent="saveActionNode">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-gray-700">Control URL</label>
          <span class="text-[11px] text-gray-400">Click to select (toggle)</span>
        </div>
        <div class="max-h-56 overflow-auto rounded border border-gray-200">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-slate-50 text-[11px] text-gray-500">
              <tr>
                <th class="px-3 py-2 font-medium">Name / URL</th>
                <th class="px-3 py-2 font-medium">Node ID</th>
                <th class="px-3 py-2 font-medium">Gateway ID</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in controlUrlOptions"
                :key="item.id"
                role="button"
                tabindex="0"
                class="border-t border-gray-100 transition-colors cursor-pointer"
                :class="{
                  'bg-blue-50': isControlUrlSelected(item.id),
                  'hover:bg-gray-50': !isControlUrlSelected(item.id),
                }"
                @click="toggleControlUrlSelection(item.id)"
              >
                <td class="px-3 py-2">
                  <div class="font-medium text-gray-700">
                    {{ resolveControlUrlDisplayName(item) }}
                  </div>
                  <div class="text-[11px] text-gray-400">{{ item.url || "—" }}</div>
                </td>
                <td class="px-3 py-2 text-gray-600">
                  {{ resolveControlNodeId(item) }}
                </td>
                <td class="px-3 py-2 text-gray-600">
                  {{ resolveControlGatewayId(item) }}
                </td>
              </tr>
              <tr v-if="controlUrlOptions.length === 0">
                <td colspan="3" class="px-3 py-3 text-center text-[11px] text-gray-400">
                  No control URLs found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="isSelectedDigital" class="space-y-1">
        <label class="text-xs font-semibold text-gray-700">State</label>
        <select
          v-model="actionForm.action_value"
          class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="on">On</option>
          <option value="off">Off</option>
        </select>
      </div>

      <div v-else-if="isSelectedAnalog" class="space-y-1">
        <label class="text-xs font-semibold text-gray-700">Value</label>
        <input
          v-model.number="actionForm.action_value"
          type="number"
          step="0.01"
          class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          placeholder="0"
        />
      </div>

      <div class="space-y-1">
        <label class="text-xs font-semibold text-gray-700">Duration (seconds)</label>
        <input
          v-model.number="actionForm.duration_seconds"
          type="number"
          min="0"
          step="1"
          class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          placeholder="5"
        />
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSavingNode"
          @click="closeActionModal"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded bg-blue-600 px-4 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSavingNode"
        >
          Save
        </button>
      </div>
    </form>
  </BaseModal>

  <BaseModal
    :model-value="isConditionModalOpen"
    title="Configure Condition"
    max-width="max-w-md"
    panel-class="p-6 shadow-xl"
    :close-disabled="isSavingNode"
    @request-close="closeConditionModal"
  >
    <form class="space-y-4 text-xs text-gray-700" @submit.prevent="saveConditionNode">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-xs font-semibold text-gray-700">Metric</label>
          <span class="text-[11px] text-gray-400">Click to select (toggle)</span>
        </div>
        <div class="max-h-56 overflow-auto rounded border border-gray-200">
          <table class="min-w-full text-left text-xs">
            <thead class="bg-slate-50 text-[11px] text-gray-500">
              <tr>
                <th class="px-3 py-2 font-medium">Metric</th>
                <th class="px-3 py-2 font-medium">Key</th>
                <th class="px-3 py-2 font-medium">Node</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="metric in metrics"
                :key="metric.key"
                role="button"
                tabindex="0"
                class="border-t border-gray-100 transition-colors cursor-pointer"
                :class="{
                  'bg-blue-50': isMetricSelected(metric.key),
                  'hover:bg-gray-50': !isMetricSelected(metric.key),
                }"
                @click="toggleMetricSelection(metric.key)"
              >
                <td class="px-3 py-2">
                  <div class="font-medium text-gray-700">
                    {{ metric.title }}
                  </div>
                  <div class="text-[11px] text-gray-400">{{ metric.subtitle || "—" }}</div>
                </td>
                <td class="px-3 py-2 text-gray-600">{{ metric.key }}</td>
                <td class="px-3 py-2 text-gray-600">
                  {{ resolveMetricNode(metric) }}
                </td>
              </tr>
              <tr v-if="metrics.length === 0">
                <td colspan="3" class="px-3 py-3 text-center text-[11px] text-gray-400">
                  No metrics found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="space-y-1">
          <label class="text-xs font-semibold text-gray-700">Operator</label>
          <select
            v-model="conditionForm.operator"
            class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
          >
            <option value=">">&gt;</option>
            <option value="<">&lt;</option>
            <option value=">=">&gt;=</option>
            <option value="<=">&lt;=</option>
            <option value="==">==</option>
            <option value="!=">!=</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-xs font-semibold text-gray-700">Value</label>
          <input
            v-model.number="conditionForm.value"
            type="number"
            step="0.01"
            class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            placeholder="30"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          class="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSavingNode"
          @click="closeConditionModal"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="rounded bg-blue-600 px-4 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isSavingNode"
        >
          Save
        </button>
      </div>
    </form>
  </BaseModal>

  <BaseModal
    :model-value="isConstantsModalOpen"
    title="Scenario Constants"
    max-width="max-w-lg"
    panel-class="p-5 shadow-xl"
    @request-close="closeConstantsModal"
  >
    <div class="space-y-3 text-xs text-slate-700">
      <p class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
        These constants define builder guardrails and save validation.
      </p>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Start / End uniqueness</p>
        <p class="mt-1 text-slate-600">Only one Start node and one End node are allowed in a flow.</p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Non-condition fan-out</p>
        <p class="mt-1 text-slate-600">Each non-condition node can connect to only one next node.</p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Condition branching</p>
        <p class="mt-1 text-slate-600">A Condition node can connect to at most two outgoing branches.</p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">True / False labels</p>
        <p class="mt-1 text-slate-600">If one branch is labeled True, the remaining branch is assigned False automatically.</p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Save requirement</p>
        <p class="mt-1 text-slate-600">The flow must contain a valid path from Start to End before saving.</p>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { message, Modal } from "ant-design-vue";
import {
  VueFlow,
  type Connection,
  type Edge,
  type Node,
  useVueFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
} from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import "@vue-flow/controls/dist/style.css";
import "@vue-flow/minimap/dist/style.css";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import BaseModal from "@/components/Modals/BaseModal.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import WorkflowProgressPanel from "@/components/devices-control/sections/WorkflowProgressPanel.vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import { useMetrics } from "@/composables/useMetrics";
import {
  canConnectFromNode,
  canCreateEnd,
  canCreateStart,
  resolveConditionBranch,
  validateFlow,
} from "@/composables/Scenario/flowConstants";
import { formatControlDefinition } from "@/composables/Scenario/formatControlDefinition";
import {
  type ScenarioDefinition,
  type ScenarioNodeData,
} from "@/composables/Scenario/scenarioBuilderTypes";
import {
  useScenarioControlUrls,
} from "@/composables/Scenario/useScenarioControlUrls";
import {
  createDefaultStartNode,
  useScenarioNodePresentation,
} from "@/composables/Scenario/useScenarioNodePresentation";
import { useScenarioWorkflowRuntime } from "@/composables/Scenario/useScenarioWorkflowRuntime";

type ScenarioRow = {
  id: string | number;
  name: string | null;
};

const props = defineProps<{
  scenario: ScenarioRow;
  definition?: ScenarioDefinition;
}>();

const emit = defineEmits<{
  (e: "back"): void;
  (e: "save", payload: { nodes: any[]; edges: Edge[]; controlDefinition: any }): void;
  (e: "runtime-state", payload: { workflowId: string; state: string; runId?: string | null }): void;
}>();

const palette = [
  {
    type: "start",
    label: "Start",
    subtitle: "Entry point",
    icon: "play-fill",
  },
  {
    type: "action",
    label: "Action",
    subtitle: "Trigger control",
    icon: "lightning-fill",
  },
  {
    type: "condition",
    label: "Condition",
    subtitle: "If / else",
    icon: "shuffle",
  },
  {
    type: "end",
    label: "End",
    subtitle: "Stop flow",
    icon: "stop-fill",
  },
] as const;

type NodeData = {
  label?: ScenarioNodeData["label"];
  kind?: ScenarioNodeData["kind"];
  control_url_id?: ScenarioNodeData["control_url_id"];
  json_command_id?: ScenarioNodeData["json_command_id"];
  json_command_name?: ScenarioNodeData["json_command_name"];
  duration_seconds?: ScenarioNodeData["duration_seconds"];
  action_value?: ScenarioNodeData["action_value"];
  metric_key?: ScenarioNodeData["metric_key"];
  operator?: ScenarioNodeData["operator"];
  value?: ScenarioNodeData["value"];
};

const { addNodes, addEdges, project } = useVueFlow();

const nodes = ref<Node<NodeData>[]>([
  createDefaultStartNode() as Node<NodeData>,
]);

const edges = ref<Edge[]>([]);
const { metrics: metricsRef } = useMetrics();
const metrics = computed(() => metricsRef.value);
const metricNodesByKey = ref<Record<string, string[]>>({});
const authStore = useAuthStore();
const authorizationHeader = computed(() => authStore.authorizationHeader);
const controlModuleBase = computed(() =>
  (apiConfig.controlModule || "").replace(/\/$/, ""),
);
const queueStreamBase = computed(() => (apiConfig.server || "").replace(/\/$/, ""));
const isActionModalOpen = ref(false);
const isConditionModalOpen = ref(false);
const isConstantsModalOpen = ref(false);
const isSavingNode = ref(false);
const isFlowVisible = ref(false);
const activeNode = ref<Node<NodeData> | null>(null);
const actionForm = ref({
  control_url_id: "",
  duration_seconds: 5,
  action_value: "on" as "on" | "off" | number | "",
});
const conditionForm = ref({
  metric_key: "",
  operator: ">",
  value: 0,
});
const isMetricNodesLoading = ref(false);
const lastActionInputKind = ref<string | null>(null);
const isCanvasDirty = ref(false);
const runDevicePreparationMode = ref<"turn_off_all" | "keep_current">("turn_off_all");
const shouldTurnOffDevicesBeforeRun = computed(
  () => runDevicePreparationMode.value === "turn_off_all",
);

function markCanvasAsDirty() {
  isCanvasDirty.value = true;
}

function markCanvasAsSaved() {
  isCanvasDirty.value = false;
}

const {
  controlUrlOptions,
  fetchControlUrls,
  hasLoadedControlUrls,
  resolveControlGatewayId,
  resolveControlInputTypeById,
  resolveControlNodeId,
} = useScenarioControlUrls({
  controlModuleBase,
  authorizationHeader,
});

const {
  applyDefinition,
  hasMissingActionNodes,
  updateNodeLabel,
  validateConditionBranches,
} = useScenarioNodePresentation({
  controlUrlOptions,
  hasLoadedControlUrls,
  metrics,
  nodes: nodes as any,
  edges,
  onSaved: markCanvasAsSaved,
});

const {
  connectQueueStream,
  currentWorkflowStep,
  disconnectQueueStream,
  isFlowActive,
  isStoppingFlow,
  resetWorkflowSteps,
  runButtonLabel,
  runFlow,
  stopFlow,
  workflowErrorMessage,
  workflowOverallStatus,
  workflowSteps,
} = useScenarioWorkflowRuntime({
  authorizationHeader,
  hasMissingActionNodes,
  queueStreamBase,
  scenarioId: computed(() => props.scenario.id),
  shouldTurnOffDevicesBeforeRun,
  onRuntimeStateChange: (payload) => emit("runtime-state", payload),
});

const selectedControlUrl = computed(() =>
  controlUrlOptions.value.find((item) => item.id === actionForm.value.control_url_id),
);

const selectedControlInputType = computed(() =>
  resolveControlInputTypeById(actionForm.value.control_url_id),
);

const isSelectedDigital = computed(() => selectedControlInputType.value === "digital");
const isSelectedAnalog = computed(() => selectedControlInputType.value === "analog");

function isControlUrlSelected(id: string) {
  return actionForm.value.control_url_id === id;
}

function toggleControlUrlSelection(id: string) {
  actionForm.value.control_url_id = isControlUrlSelected(id) ? "" : id;
}

function resetActionValueForInputType(kind: string | null) {
  if (kind === "analog") {
    actionForm.value.action_value =
      typeof actionForm.value.action_value === "number"
        ? actionForm.value.action_value
        : 0;
    return;
  }
  if (kind === "digital") {
    const value = actionForm.value.action_value;
    actionForm.value.action_value = value === "off" || value === "on" ? value : "on";
    return;
  }
  actionForm.value.action_value =
    actionForm.value.action_value === "" ? "on" : actionForm.value.action_value;
}

function isMetricSelected(key: string) {
  return conditionForm.value.metric_key === key;
}

function toggleMetricSelection(key: string) {
  conditionForm.value.metric_key = isMetricSelected(key) ? "" : key;
}

function resolveMetricNode(metric: any) {
  const nodes = metricNodesByKey.value[metric?.key ?? ""] ?? [];
  if (!nodes.length) return "—";
  return nodes.join(", ");
}

function resolveControlUrlDisplayName(item: any) {
  return item?.name || item?.id || "N/A";
}

function handleDragStart(event: DragEvent, type: string) {
  if (!event.dataTransfer) return;
  event.dataTransfer.setData("application/vueflow", type);
  event.dataTransfer.effectAllowed = "move";
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
}

function buildNodeLabel(type: string) {
  const item = palette.find((entry) => entry.type === type);
  return item?.label ?? type;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  if (!event.dataTransfer) return;
  const type = event.dataTransfer.getData("application/vueflow");
  if (!type) return;
  if (type === "start" && !canCreateStart(nodes.value)) {
    message.warning("Only one Start node is allowed.");
    return;
  }
  if (type === "end" && !canCreateEnd(nodes.value)) {
    message.warning("Only one End node is allowed.");
    return;
  }
  const position = project({
    x: event.clientX,
    y: event.clientY,
  });
  const id = `${type}-${Date.now()}`;
  addNodes([
    {
      id,
      type: "default",
      position,
      data: { label: buildNodeLabel(type), kind: type },
    },
  ]);
  markCanvasAsDirty();
}

function handleConnect(connection: Connection) {
  if (!connection.source || !connection.target) return;
  const connectCheck = canConnectFromNode(nodes.value, edges.value, connection.source);
  if (!connectCheck.ok) {
    message.warning(connectCheck.reason || "Cannot connect nodes.");
    return;
  }
  if (connectCheck.kind !== "condition") {
    addEdges([connection]);
    markCanvasAsDirty();
    return;
  }

  const nextBranch = resolveConditionBranch(connectCheck.outgoing || []);
  if (nextBranch) {
    addEdges([
      {
        ...connection,
        label: nextBranch === "true" ? "True" : "False",
        data: { branch: nextBranch },
      },
    ]);
    markCanvasAsDirty();
    return;
  }

  Modal.confirm({
    title: "Condition Branch",
    content: "Choose which branch this connection represents.",
    okText: "True",
    cancelText: "False",
    centered: true,
    onOk: () => {
      addEdges([
        {
          ...connection,
          label: "True",
          data: { branch: "true" },
        },
      ]);
      markCanvasAsDirty();
    },
    onCancel: () => {
      addEdges([
        {
          ...connection,
          label: "False",
          data: { branch: "false" },
        },
      ]);
      markCanvasAsDirty();
    },
  });
}

function handleNodesChange(changes: NodeChange[]) {
  const shouldMarkDirty = changes.some((change) =>
    ["add", "remove", "position", "replace"].includes(change.type),
  );
  nodes.value = applyNodeChanges(changes, nodes.value as any) as Node<NodeData>[];
  if (shouldMarkDirty) {
    markCanvasAsDirty();
  }
}

function handleEdgesChange(changes: EdgeChange[]) {
  const shouldMarkDirty = changes.some((change) =>
    ["add", "remove", "replace", "update"].includes(change.type),
  );
  edges.value = applyEdgeChanges(changes, edges.value as any) as Edge[];
  if (shouldMarkDirty) {
    markCanvasAsDirty();
  }
}

function resetFlow() {
  nodes.value = [createDefaultStartNode() as Node<NodeData>];
  edges.value = [];
  markCanvasAsDirty();
}

function saveFlow() {
  const validation = validateFlow(nodes.value, edges.value);
  if (!validation.ok) {
    message.error(validation.message ?? "Flow validation failed.");
    return;
  }
  const conditionCheck = validateConditionBranches();
  if (!conditionCheck.ok) {
    message.error(conditionCheck.message ?? "Condition branch validation failed.");
    return;
  }
  const controlDefinition = formatControlDefinition(nodes.value, edges.value);
  emit("save", {
    nodes: nodes.value as any[],
    edges: edges.value as Edge[],
    controlDefinition,
  });
  markCanvasAsSaved();
}

function resolveSelectedControlOptionId(node: NodeData | undefined) {
  const baseControlUrlId = String(node?.control_url_id ?? "").trim();
  if (!baseControlUrlId) return "";
  const jsonCommandId = String(node?.json_command_id ?? "").trim();

  if (jsonCommandId) {
    const matched = controlUrlOptions.value.find((item) => {
      const optionBaseId = String(item?.control_url_id ?? item?.id ?? "").trim();
      const optionJsonCommandId = String(item?.json_command_id ?? "").trim();
      return optionBaseId === baseControlUrlId && optionJsonCommandId === jsonCommandId;
    });
    if (matched?.id) return matched.id;
  }

  const fallback = controlUrlOptions.value.find((item) => {
    const optionBaseId = String(item?.control_url_id ?? item?.id ?? "").trim();
    return optionBaseId === baseControlUrlId;
  });
  return fallback?.id ?? baseControlUrlId;
}

function handleNodeClick(event: { node: Node<NodeData> }) {
  const node = event.node;
  const kind = node.data?.kind;
  if (kind === "action") {
    activeNode.value = node;
    const selectedOptionId = resolveSelectedControlOptionId(node.data);
    const controlInputKind = resolveControlInputTypeById(selectedOptionId);
    const rawActionValue = node.data?.action_value;
    let actionValue: "on" | "off" | number | "" =
      typeof rawActionValue === "number" || rawActionValue === "on" || rawActionValue === "off"
        ? rawActionValue
        : "";
    if (controlInputKind === "analog") {
      actionValue = typeof actionValue === "number" ? actionValue : 0;
    } else if (controlInputKind === "digital") {
      actionValue = actionValue === "off" || actionValue === "on" ? actionValue : "on";
    }
    actionForm.value = {
      control_url_id: selectedOptionId,
      duration_seconds: node.data?.duration_seconds ?? 5,
      action_value: actionValue,
    };
    isActionModalOpen.value = true;
    return;
  }
  if (kind === "condition") {
    activeNode.value = node;
    conditionForm.value = {
      metric_key: node.data?.metric_key ?? "",
      operator: node.data?.operator ?? ">",
      value: node.data?.value ?? 0,
    };
    if (!isMetricNodesLoading.value && Object.keys(metricNodesByKey.value).length === 0) {
      fetchMetricNodes();
    }
    isConditionModalOpen.value = true;
    return;
  }
}

function closeActionModal() {
  if (isSavingNode.value) return;
  isActionModalOpen.value = false;
  activeNode.value = null;
}

function closeConditionModal() {
  if (isSavingNode.value) return;
  isConditionModalOpen.value = false;
  activeNode.value = null;
}

function openConstantsModal() {
  isConstantsModalOpen.value = true;
}

function closeConstantsModal() {
  isConstantsModalOpen.value = false;
}

// Device status SSE logic removed per UI-only step tracking requirements.

function saveActionNode() {
  if (isSavingNode.value) return;
  const target = activeNode.value;
  if (!target) return;
  if (!actionForm.value.control_url_id) {
    message.warning("Please select a control URL.");
    return;
  }
  const selectedOption = selectedControlUrl.value;
  const resolvedControlUrlId = String(
    selectedOption?.control_url_id ?? selectedOption?.id ?? "",
  ).trim();
  if (!resolvedControlUrlId) {
    message.warning("Selected control URL is invalid.");
    return;
  }
  const resolvedJsonCommandId = String(selectedOption?.json_command_id ?? "").trim();
  const resolvedJsonCommandName = String(
    selectedOption?.json_command_name ?? selectedOption?.name ?? "",
  ).trim();
  const inputKind = resolveControlInputTypeById(actionForm.value.control_url_id);
  let actionValue: "on" | "off" | number | null = null;
  if (inputKind === "analog") {
    const numeric = Number(actionForm.value.action_value);
    if (!Number.isFinite(numeric)) {
      message.warning("Please enter a numeric value.");
      return;
    }
    actionValue = numeric;
  } else if (inputKind === "digital") {
    const state = String(actionForm.value.action_value ?? "").toLowerCase();
    if (state !== "on" && state !== "off") {
      message.warning("Please select On or Off.");
      return;
    }
    actionValue = state as "on" | "off";
  }
  isSavingNode.value = true;
  target.data = {
    ...(target.data ?? {}),
    kind: "action",
    control_url_id: resolvedControlUrlId,
    json_command_id: resolvedJsonCommandId || undefined,
    json_command_name: resolvedJsonCommandName || undefined,
    duration_seconds: Number(actionForm.value.duration_seconds || 0),
    action_value: actionValue ?? undefined,
  };
  updateNodeLabel(target);
  markCanvasAsDirty();
  isSavingNode.value = false;
  isActionModalOpen.value = false;
  activeNode.value = null;
}

function saveConditionNode() {
  if (isSavingNode.value) return;
  const target = activeNode.value;
  if (!target) return;
  if (!conditionForm.value.metric_key) {
    message.warning("Please select a metric.");
    return;
  }
  isSavingNode.value = true;
  target.data = {
    ...(target.data ?? {}),
    kind: "condition",
    metric_key: conditionForm.value.metric_key,
    operator: conditionForm.value.operator,
    value: Number(conditionForm.value.value ?? 0),
  };
  updateNodeLabel(target);
  markCanvasAsDirty();
  isSavingNode.value = false;
  isConditionModalOpen.value = false;
  activeNode.value = null;
}


async function fetchMetricNodes() {
  const base = (apiConfig.server || "").replace(/\/$/, "");
  if (!base) return;
  if (isMetricNodesLoading.value) return;
  isMetricNodesLoading.value = true;
  try {
    const response = await fetch(`${base}/v1/metrics/nodes`, {
      headers: { Accept: "application/json" },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load metric nodes.");
    }
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    const map: Record<string, string[]> = {};
    rows.forEach((row: any) => {
      if (!row?.key) return;
      map[row.key] = Array.isArray(row.nodes) ? row.nodes : [];
    });
    metricNodesByKey.value = map;
  } catch (error: any) {
    console.error("Failed to load metric nodes", error);
  } finally {
    isMetricNodesLoading.value = false;
  }
}

onMounted(() => {
  if (!import.meta.client) return;
  resetWorkflowSteps();
  connectQueueStream();
  fetchMetricNodes();
  fetchControlUrls();
  if (props.definition && !hasHydrated.value) {
    applyDefinition(props.definition);
    hasHydrated.value = true;
  }
  setTimeout(() => {
    isFlowVisible.value = true;
  }, 1000);
});

onBeforeUnmount(() => {
  disconnectQueueStream();
});

watch(
  () => props.definition,
  (value) => {
    if (!value) return;
    applyDefinition(value);
    hasHydrated.value = true;
  },
);

watch(
  controlUrlOptions,
  () => {
    nodes.value.forEach((node) => updateNodeLabel(node));
  },
  { deep: true },
);

watch(
  () => actionForm.value.control_url_id,
  () => {
    const kind = selectedControlInputType.value;
    if (kind !== lastActionInputKind.value) {
      resetActionValueForInputType(kind);
      lastActionInputKind.value = kind;
    }
  },
);

watch(hasLoadedControlUrls, () => {
  nodes.value.forEach((node) => updateNodeLabel(node));
});

watch(
  authorizationHeader,
  (authorization) => {
    if (!authorization) {
      disconnectQueueStream();
      return;
    }
    connectQueueStream();
  },
);

const hasHydrated = ref(false);
</script>

<style scoped>
.scenario-flow {
  height: 420px;
  width: 100%;
}

:deep(.scenario-flow .scenario-node--missing) {
  background: #fee2e2;
  border-color: #ef4444;
  color: #991b1b;
  white-space: pre-line;
}

:deep(.scenario-flow .scenario-node--missing .vue-flow__node__label) {
  white-space: pre-line;
}

</style>



