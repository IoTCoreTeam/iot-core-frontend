<template>
  <SingleMetricChart
    class="mb-4 w-full"
    container-height="50vh"
    :selected-metric-key="selectedMetricKey"
    :selected-timeframe="selectedTimeframe"
    @update:selected-metric-key="handleMetricChange"
  />
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
            <BootstrapIcon name="arrow-counterclockwise" class="h-3 w-3" />
            Reset
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
            v-if="isRunningFlow"
            type="button"
            class="inline-flex items-center gap-2 rounded border border-amber-200 px-3 py-1 text-xs text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isStoppingFlow"
            @click="stopFlow"
          >
            <BootstrapIcon name="stop-fill" class="h-3 w-3" />
            {{ isStoppingFlow ? "Stopping..." : "Stop" }}
          </button>
          <button
            v-else
            type="button"
            class="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isRunningFlow || hasMissingActionNodes"
            @click="runFlow"
          >
            <BootstrapIcon name="play-fill" class="h-3 w-3" />
            {{ isRunningFlow ? "Running..." : "Run" }}
          </button>
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
      <div class="mt-4 rounded border border-slate-200 bg-slate-50 px-4 py-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs font-semibold bg-white">Workflow Progress</div>
          <button
            type="button"
            class="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-700"
            @click="resetWorkflowSteps"
            aria-label="Clear workflow steps"
            title="Clear"
          >
            <BootstrapIcon name="trash" class="h-3 w-3" />
          </button>
        </div>
        <div class="mt-3 text-[11px]">
          <a-steps
            :current="currentWorkflowStep"
            size="small"
            :status="workflowOverallStatus"
            direction="vertical"
            :progress-dot="true"
            class="text-[11px]"
          >
            <a-step
              v-for="step in workflowSteps"
              :key="step.key"
              :title="step.title"
              :status="step.status"
              :description="step.description"
            />
          </a-steps>
          <div v-if="workflowErrorMessage" class="mt-2 text-[11px] text-red-600">
            {{ workflowErrorMessage }}
          </div>
        </div>
      </div>
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
                    {{ item.name || item.url || item.id }}
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
    panel-class="p-6 shadow-xl"
    @request-close="closeConstantsModal"
  >
    <div class="space-y-3 text-xs text-gray-700">
      <p class="text-xs text-gray-600">
        These rules define how the flow builder behaves:
      </p>
      <ol class="list-decimal pl-4 space-y-2 text-xs text-gray-600">
        <li>Only one Start node and one End node are allowed.</li>
        <li>Each non-condition node can connect to only one other node.</li>
        <li>A Condition node can connect to at most two nodes.</li>
        <li>If one branch is labeled True, the other branch is automatically False.</li>
        <li>The flow must have a valid path from Start to End before saving.</li>
      </ol>
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
import SingleMetricChart from "@/components/SingleMetricChart.vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import { stopWorkflow } from "@/composables/Scenario/handleWorkflow";
import { useMetrics } from "@/composables/useMetrics";
import type { TimeframeKey } from "@/types/dashboard";
import { useWorkflowSteps } from "@/composables/Scenario/useWorkflowSteps";
import {
  canConnectFromNode,
  canCreateEnd,
  canCreateStart,
  resolveConditionBranch,
  validateFlow,
} from "@/composables/Scenario/flowConstants";
import { formatControlDefinition } from "@/composables/Scenario/formatControlDefinition";

type ScenarioRow = {
  id: string | number;
  name: string | null;
};

const props = defineProps<{
  scenario: ScenarioRow;
  definition?: { nodes?: Node<NodeData>[]; edges?: Edge[] } | null;
}>();

const emit = defineEmits<{
  (e: "back"): void;
  (e: "save", payload: { nodes: Node<NodeData>[]; edges: Edge[]; controlDefinition: any }): void;
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
  label?: string;
  kind?: "start" | "action" | "condition" | "end";
  control_url_id?: string;
  duration_seconds?: number;
  action_value?: string | number;
  metric_key?: string;
  operator?: string;
  value?: number;
};

type ControlUrlOption = {
  id: string;
  name?: string | null;
  url?: string | null;
  input_type?: string | null;
  node?: {
    id?: string | null;
    external_id?: string | null;
    name?: string | null;
    gateway?: {
      id?: string | null;
      external_id?: string | null;
      name?: string | null;
    } | null;
  } | null;
};

const { addNodes, addEdges, project } = useVueFlow();

const nodes = ref<Node<NodeData>[]>([
  {
    id: "start-node",
    type: "default",
    position: { x: 100, y: 80 },
    data: { label: "Start", kind: "start" },
  },
]);

const edges = ref<Edge[]>([]);
const { metrics: metricsRef } = useMetrics();
const metrics = computed(() => metricsRef.value);
const metricNodesByKey = ref<Record<string, string[]>>({});
const controlUrlLabelMap = computed(() => {
  const map = new Map<string, string>();
  controlUrlOptions.value.forEach((item) => {
    if (item?.id) {
      map.set(item.id, item.name || item.url || item.id);
    }
  });
  return map;
});
const selectedMetricKey = ref<string>("");
const selectedTimeframe = ref<TimeframeKey>("second");
const authStore = useAuthStore();
const controlModuleBase = computed(() =>
  (apiConfig.controlModule || "").replace(/\/$/, ""),
);
const controlUrlOptions = ref<ControlUrlOption[]>([]);
const hasLoadedControlUrls = ref(false);
const isActionModalOpen = ref(false);
const isConditionModalOpen = ref(false);
const isConstantsModalOpen = ref(false);
const isSavingNode = ref(false);
const isRunningFlow = ref(false);
const isStoppingFlow = ref(false);
const isFlowVisible = ref(false);
const activeNode = ref<Node<NodeData> | null>(null);
const workflowStreamAbortController = ref<AbortController | null>(null);
const {
  workflowSteps,
  currentWorkflowStep,
  workflowErrorMessage,
  hasWorkflowCompleted,
  workflowOverallStatus,
  resetWorkflowSteps,
  seedWorkflowSteps,
  handleWorkflowStreamEvent,
} = useWorkflowSteps({
  nodes,
  resolveControlUrlLabel: (controlUrlId: string) => {
    return controlUrlLabelMap.value.get(controlUrlId) ?? null;
  },
});
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

function markCanvasAsDirty() {
  isCanvasDirty.value = true;
}

function markCanvasAsSaved() {
  isCanvasDirty.value = false;
}

function normalizeControlInputType(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("analog")) return "analog";
  if (normalized.includes("digital") || normalized.includes("relay")) return "digital";
  return normalized;
}

function resolveControlInputTypeById(controlUrlId?: string | null) {
  if (!controlUrlId) return null;
  const selected = controlUrlOptions.value.find((item) => item.id === controlUrlId);
  return normalizeControlInputType(selected?.input_type);
}

const selectedControlUrl = computed(() =>
  controlUrlOptions.value.find((item) => item.id === actionForm.value.control_url_id),
);

const selectedControlInputType = computed(() =>
  normalizeControlInputType(selectedControlUrl.value?.input_type),
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

function resolveControlNodeId(item: ControlUrlOption) {
  return item?.node?.external_id || item?.node?.id || "—";
}

function resolveControlGatewayId(item: ControlUrlOption) {
  return item?.node?.gateway?.external_id || item?.node?.gateway?.id || "—";
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
  nodes.value = [
    {
      id: "start-node",
      type: "default",
      position: { x: 100, y: 80 },
      data: { label: "Start", kind: "start" },
    },
  ];
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
  emit("save", { nodes: nodes.value, edges: edges.value, controlDefinition });
  markCanvasAsSaved();
}

function parseSseBlock(block: string) {
  const lines = block.split(/\r?\n/);
  let eventName = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trim());
    }
  }

  const dataText = dataLines.join("\n");
  if (!eventName && !dataText) {
    return null;
  }
  let data: any = dataText;
  if (dataText) {
    try {
      data = JSON.parse(dataText);
    } catch {
      data = dataText;
    }
  }
  return { eventName, data };
}

async function streamWorkflow(id: string | number, authorization: string) {
  const base = controlModuleBase.value;
  if (!base) throw new Error("API base URL is not configured.");
  const controller = new AbortController();
  workflowStreamAbortController.value = controller;

  const response = await fetch(`${base}/workflows/${id}/run/stream`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      Authorization: authorization,
    },
    signal: controller.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Failed to start workflow stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split(/\n\n/);
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const parsed = parseSseBlock(part);
      if (!parsed) continue;
      handleWorkflowStreamEvent(parsed.eventName, parsed.data);
    }
  }
}

async function runFlow() {
  if (!import.meta.client) return;
  if (isRunningFlow.value) return;
  if (hasMissingActionNodes.value) {
    message.error("Cannot run because some actions no longer exist.");
    return;
  }
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  if (workflowStreamAbortController.value) {
    workflowStreamAbortController.value.abort();
    workflowStreamAbortController.value = null;
  }
  resetWorkflowSteps();
  seedWorkflowSteps();
  isRunningFlow.value = true;
  workflowErrorMessage.value = null;
  hasWorkflowCompleted.value = false;
  message.info("Scenario is starting...");
  try {
    await streamWorkflow(props.scenario.id, authorization);
    if (hasWorkflowCompleted.value) {
      message.success("Scenario ran successfully.");
    } else if (workflowErrorMessage.value) {
      message.error(workflowErrorMessage.value);
    }
  } catch (error: any) {
    if (error?.name !== "AbortError") {
      workflowErrorMessage.value = error?.message ?? "Failed to run scenario.";
      message.error(workflowErrorMessage.value);
    }
  } finally {
    isRunningFlow.value = false;
    isStoppingFlow.value = false;
    workflowStreamAbortController.value = null;
  }
}

async function stopFlow() {
  if (!import.meta.client) return;
  if (isStoppingFlow.value) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  isStoppingFlow.value = true;
  try {
    await stopWorkflow(props.scenario.id, authorization);
    if (workflowStreamAbortController.value) {
      workflowStreamAbortController.value.abort();
      workflowStreamAbortController.value = null;
    }
    message.success("Scenario stopped.");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to stop scenario.");
  } finally {
    isStoppingFlow.value = false;
    isRunningFlow.value = false;
  }
}

function handleNodeClick(event: { node: Node<NodeData> }) {
  const node = event.node;
  const kind = node.data?.kind;
  if (kind === "action") {
    activeNode.value = node;
    const controlInputKind = resolveControlInputTypeById(node.data?.control_url_id);
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
      control_url_id: node.data?.control_url_id ?? "",
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

function updateNodeLabel(node: Node<NodeData>) {
  if (node.data?.kind === "action") {
    const controlUrlId = node.data?.control_url_id ?? "";
    const isMissing = isMissingControlUrl(controlUrlId);
    const selected = controlUrlOptions.value.find((item) => item.id === controlUrlId);
    const name = selected?.name || selected?.url || "Action";
    const duration = node.data?.duration_seconds ?? 0;
    const inputKind = normalizeControlInputType(selected?.input_type);
    const actionValue = node.data?.action_value;
    let label = name;
    if (!isMissing) {
      if (inputKind === "analog") {
        const valueText =
          typeof actionValue === "number" && Number.isFinite(actionValue)
            ? actionValue
            : "0";
        label = `${name} (${valueText})`;
      } else if (inputKind === "digital") {
        const state = actionValue === "off" ? "OFF" : "ON";
        label =
          state === "ON" && duration > 0
            ? `${name} (${state}, ${duration}s)`
            : `${name} (${state})`;
      } else {
        label = `${name} (${duration}s)`;
      }
    }
    node.data = {
      ...(node.data ?? {}),
      label: isMissing ? "Action not found" : label,
    };
    node.class = isMissing ? "scenario-node--missing" : undefined;
    return;
  }
  if (node.data?.kind === "condition") {
    const metric = metrics.value.find((item) => item.key === node.data?.metric_key);
    const metricName = metric?.title ?? node.data?.metric_key ?? "Metric";
    const operator = node.data?.operator ?? ">";
    const value = node.data?.value ?? 0;
    node.data = {
      ...(node.data ?? {}),
      label: `${metricName} ${operator} ${value}`,
    };
    return;
  }
}

// Device status SSE logic removed per UI-only step tracking requirements.

function handleMetricChange(value: string) {
  selectedMetricKey.value = value;
}

function applyDefinition(definition?: { nodes?: Node<NodeData>[]; edges?: Edge[] } | null) {
  if (!definition || !Array.isArray(definition.nodes)) {
    return;
  }
  if (!definition.nodes.length) {
    nodes.value = [
      {
        id: "start-node",
        type: "default",
        position: { x: 100, y: 80 },
        data: { label: "Start", kind: "start" },
      },
    ];
    edges.value = [];
    markCanvasAsSaved();
    return;
  }
  nodes.value = definition.nodes.map((node) => ({
    ...node,
    type: node.type || "default",
  }));
  edges.value = Array.isArray(definition.edges)
    ? definition.edges.map((edge) => ({ ...edge }))
    : [];
  nodes.value.forEach((node) => updateNodeLabel(node));
  markCanvasAsSaved();
}

function saveActionNode() {
  if (isSavingNode.value) return;
  const target = activeNode.value;
  if (!target) return;
  if (!actionForm.value.control_url_id) {
    message.warning("Please select a control URL.");
    return;
  }
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
    control_url_id: actionForm.value.control_url_id,
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


async function fetchControlUrls() {
  if (!controlModuleBase.value) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  try {
    const endpoint = `${controlModuleBase.value}/control-urls?per_page=200&include=gateway`;
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
    controlUrlOptions.value = rows as ControlUrlOption[];
  } catch (error: any) {
    message.error(error?.message ?? "Failed to load control urls.");
  } finally {
    hasLoadedControlUrls.value = true;
  }
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
  if (workflowStreamAbortController.value) {
    workflowStreamAbortController.value.abort();
    workflowStreamAbortController.value = null;
  }
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
  metrics,
  (value) => {
    if (!selectedMetricKey.value && value.length > 0) {
      selectedMetricKey.value = value[0]?.key ?? "";
    }
  },
  { immediate: true },
);
const hasHydrated = ref(false);

function isMissingControlUrl(controlUrlId?: string | null) {
  if (!hasLoadedControlUrls.value) return false;
  if (!controlUrlId) return false;
  return !controlUrlOptions.value.some((item) => item?.id === controlUrlId);
}

const hasMissingActionNodes = computed(() =>
  nodes.value.some(
    (node) =>
      node.data?.kind === "action" && isMissingControlUrl(node.data?.control_url_id),
  ),
);

function validateConditionBranches() {
  const conditionNodes = nodes.value.filter((node) => node.data?.kind === "condition");
  if (!conditionNodes.length) {
    return { ok: true };
  }

  for (const node of conditionNodes) {
    const outgoing = edges.value.filter((edge) => edge.source === node.id);
    const branches = new Set(
      outgoing
        .map((edge) => edge.data?.branch ?? edge.label)
        .filter((value) => value === "true" || value === "false"),
    );
    if (!branches.has("true") || !branches.has("false")) {
      return {
        ok: false,
        message: "Each Condition node must have both True and False branches.",
      };
    }
  }

  return { ok: true };
}
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
