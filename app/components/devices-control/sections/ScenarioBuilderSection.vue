<template>
  <SingleMetricChart
    class="mb-4 w-full"
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
            type="button"
            class="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
            @click="saveFlow"
          >
            <BootstrapIcon name="save" class="h-3 w-3" />
            Save
          </button>
          <span class="text-xs text-gray-400" aria-hidden="true">|</span>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="isRunningFlow"
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
      <div class="space-y-1">
        <label class="text-xs font-semibold text-gray-700">Control URL</label>
        <select
          v-model="actionForm.control_url_id"
          class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="">Select control</option>
          <option
            v-for="item in controlUrlOptions"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name || item.url || item.id }}
          </option>
        </select>
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
      <div class="space-y-1">
        <label class="text-xs font-semibold text-gray-700">Metric</label>
        <select
          v-model="conditionForm.metric_key"
          class="w-full rounded border border-gray-300 px-3 py-2 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        >
          <option value="">Select metric</option>
          <option v-for="metric in metrics" :key="metric.key" :value="metric.key">
            {{ metric.title }}
          </option>
        </select>
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
import { computed, onMounted, ref, watch } from "vue";
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
import { useMetrics } from "@/composables/useMetrics";
import type { TimeframeKey } from "@/types/dashboard";
import {
  canConnectFromNode,
  canCreateEnd,
  canCreateStart,
  resolveConditionBranch,
  validateFlow,
} from "@/composables/Scenario/flowConstants";
import { formatControlDefinition } from "@/composables/Scenario/formatControlDefinition";
import { runWorkflow } from "@/composables/Scenario/handleWorkflow";

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
  metric_key?: string;
  operator?: string;
  value?: number;
};

type ControlUrlOption = {
  id: string;
  name?: string | null;
  url?: string | null;
  input_type?: string | null;
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
const { metrics: metricsRef, fetchMetrics } = useMetrics();
const metrics = computed(() => metricsRef.value);
const selectedMetricKey = ref<string>("");
const selectedTimeframe = ref<TimeframeKey>("second");
const authStore = useAuthStore();
const controlModuleBase = computed(() =>
  (apiConfig.controlModule || "").replace(/\/$/, ""),
);
const controlUrlOptions = ref<ControlUrlOption[]>([]);
const isActionModalOpen = ref(false);
const isConditionModalOpen = ref(false);
const isConstantsModalOpen = ref(false);
const isSavingNode = ref(false);
const isRunningFlow = ref(false);
const isFlowVisible = ref(false);
const activeNode = ref<Node<NodeData> | null>(null);
const actionForm = ref({
  control_url_id: "",
  duration_seconds: 5,
});
const conditionForm = ref({
  metric_key: "",
  operator: ">",
  value: 0,
});

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
    },
    onCancel: () => {
      addEdges([
        {
          ...connection,
          label: "False",
          data: { branch: "false" },
        },
      ]);
    },
  });
}

function handleNodesChange(changes: NodeChange[]) {
  nodes.value = applyNodeChanges(changes, nodes.value as any) as Node<NodeData>[];
}

function handleEdgesChange(changes: EdgeChange[]) {
  edges.value = applyEdgeChanges(changes, edges.value as any) as Edge[];
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
}

async function runFlow() {
  if (!import.meta.client) return;
  if (isRunningFlow.value) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  isRunningFlow.value = true;
  message.info("Scenario is starting...");
  try {
    await runWorkflow(props.scenario.id, authorization);
    message.success("Scenario ran successfully.");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to run scenario.");
  } finally {
    isRunningFlow.value = false;
  }
}

function handleNodeClick(event: { node: Node<NodeData> }) {
  const node = event.node;
  const kind = node.data?.kind;
  if (kind === "action") {
    activeNode.value = node;
    actionForm.value = {
      control_url_id: node.data?.control_url_id ?? "",
      duration_seconds: node.data?.duration_seconds ?? 5,
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
    const selected = controlUrlOptions.value.find(
      (item) => item.id === node.data?.control_url_id,
    );
    const name = selected?.name || selected?.url || node.data?.control_url_id || "Action";
    const duration = node.data?.duration_seconds ?? 0;
    node.data = {
      ...(node.data ?? {}),
      label: `${name} (${duration}s)`,
    };
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
}

function saveActionNode() {
  if (isSavingNode.value) return;
  const target = activeNode.value;
  if (!target) return;
  if (!actionForm.value.control_url_id) {
    message.warning("Please select a control URL.");
    return;
  }
  isSavingNode.value = true;
  target.data = {
    ...(target.data ?? {}),
    kind: "action",
    control_url_id: actionForm.value.control_url_id,
    duration_seconds: Number(actionForm.value.duration_seconds || 0),
  };
  updateNodeLabel(target);
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
    const endpoint = `${controlModuleBase.value}/control-urls?per_page=200`;
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
  }
}

onMounted(() => {
  if (!import.meta.client) return;
  fetchMetrics();
  fetchControlUrls();
  if (props.definition && !hasHydrated.value) {
    applyDefinition(props.definition);
    hasHydrated.value = true;
  }
  setTimeout(() => {
    isFlowVisible.value = true;
  }, 1000);
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
  metrics,
  (value) => {
    if (!selectedMetricKey.value && value.length > 0) {
      selectedMetricKey.value = value[0]?.key ?? "";
    }
  },
  { immediate: true },
);
const hasHydrated = ref(false);

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
</style>
