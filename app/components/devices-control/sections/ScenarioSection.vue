<template>
  <section class="min-h-screen">
    <div class="pt-4 px-0">
      <div v-if="activeScenarioConfig" class="mb-4 w-full">
        <div v-if="metrics.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article
            v-for="metric in metrics"
            :key="metric.key"
            class="relative overflow-hidden rounded border border-gray-200 bg-white p-4 transition-opacity duration-300"
          >
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-md bg-gray-100 text-gray-700">
                <BootstrapIcon :name="metric.icon as any" class="h-3.5 w-3.5" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-[10px] uppercase tracking-wide text-gray-500">
                  {{ metric.subtitle }}
                </p>
                <h4 class="truncate text-sm font-semibold leading-tight text-gray-800">
                  {{ metric.title }}
                </h4>
              </div>
            </div>

            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-bold text-gray-900">
                {{ formatMetricValue(metric.value) }}
              </span>
              <span class="text-sm text-gray-500">
                {{ metric.unit }}
              </span>
            </div>
            <div class="mt-3 flex items-center justify-between text-[10px] text-gray-500">
              <span>Sensor: {{ metric.key || "-" }}</span>
              <span>{{ formatMetricTimestamp() }}</span>
            </div>
          </article>
        </div>
        <div
          v-else-if="isMetricsLoading"
          class="rounded border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500"
        >
          Loading metrics...
        </div>
      </div>
      <ScenarioBuilderSection
        v-if="activeScenarioConfig"
        :key="`builder-${activeScenarioConfig.id}`"
        :scenario="activeScenarioConfig"
        :definition="activeScenarioConfig.definition"
        @back="closeScenarioConfig"
        @save="handleScenarioDefinitionSave"
        @runtime-state="handleBuilderRuntimeState"
      />

      <div
        v-show="!activeScenarioConfig"
        :key="'scenario-list'"
        class="flex flex-col gap-4 lg:flex-row lg:items-start"
      >
            <div
              :class="[
                'bg-white rounded border border-slate-200 overflow-hidden w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
                { hidden: !isFilterVisible },
              ]"
            >
              <div class="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
                  <p class="text-xs text-gray-500">Refine the scenario list.</p>
                </div>
                <button
                  type="button"
                  class="text-xs text-gray-500 hover:text-gray-700 lg:hidden"
                  @click="toggleFilters"
                >
                  Close
                </button>
              </div>
              <AdvancedFilterPanel
                :fields="scenarioFilterFields"
                :model-value="scenarioFilters"
                :is-loading="isScenarioLoading"
                apply-label="Apply"
                reset-label="Reset"
                @update:modelValue="handleFilterModelUpdate"
                @apply="applyFilters"
                @reset="resetFilters"
              />
            </div>

            <DataBoxCard
              :class="[
                'lg:self-start',
                isFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto',
              ]"
              :is-loading="isScenarioLoading"
              :columns="scenarioTableColumns.length"
              :has-data="displayedScenarioRows.length > 0"
              :pagination="scenarioPagination"
              :loading-text="loadingText"
              @prev-page="prevScenarioPage"
              @next-page="nextScenarioPage"
              @change-per-page="changeScenarioPerPage"
            >
              <template #header>
                <div class="flex items-center gap-2">
                  <h3 class="text-gray-700 text-xs">
                    {{ title }}
                  </h3>
                  <button
                    type="button"
                    class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                    @click="toggleFilters"
                  >
                    {{ isFilterVisible ? "Hide Filters" : "Show Filters" }}
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <div class="relative">
                    <input
                      v-model="searchKeyword"
                      type="text"
                      placeholder="Search scenario..."
                      class="pl-5 pr-1 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white w-52 text-xs cursor-text"
                    />
                    <BootstrapIcon
                      name="search"
                      class="absolute left-1 top-1.5 w-3 h-3 text-gray-400"
                    />
                  </div>
                  <button
                    @click="refreshRows"
                    class="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 rounded px-3 py-1 text-xs border border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                    :disabled="isScenarioLoading"
                  >
                    <BootstrapIcon
                      name="arrow-clockwise"
                      class="w-3 h-3 mr-1"
                      :class="{ 'animate-spin': isScenarioLoading }"
                    />
                    {{ isScenarioLoading ? "Refreshing..." : "Refresh" }}
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs"
                    @click="openAddScenario"
                  >
                    <BootstrapIcon name="plus-lg" class="w-3 h-3 mr-1" />
                    Add Scenario
                  </button>
                  <button
                    type="button"
                    class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs"
                    :disabled="isScenarioLoading"
                    @click="exportRows"
                  >
                    <BootstrapIcon name="file-earmark-arrow-down" class="w-3 h-3 mr-1" />
                    Export
                  </button>
                </div>
              </template>

              <template #head>
                <tr class="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 text-center">
                  <th
                    v-for="column in scenarioTableColumns"
                    :key="column"
                    :class="[
                      'px-2 py-2 font-normal text-gray-600 text-center align-middle leading-4',
                      column === 'Name' || column === 'Status' || column === 'Workflow State'
                        ? 'text-left'
                        : '',
                    ]"
                  >
                    {{ column }}
                  </th>
                </tr>
              </template>

              <template #default>
                <tr
                  v-for="row in displayedScenarioRows"
                  :key="row.id"
                  class="hover:bg-gray-50 transition-colors text-xs align-top border-b border-gray-100 py-1 text-center"
                >
                  <td class="px-2 py-2 text-gray-700 text-left align-middle leading-4">
                    {{ row.name || "-" }}
                  </td>
                  <td class="px-2 py-2 text-left align-middle leading-4">
                    <span
                      v-if="row.status"
                      :class="[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        row.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200',
                      ]"
                    >
                      {{ row.status }}
                    </span>
                    <span v-else class="text-gray-400">-</span>
                  </td>
                  <td class="px-2 py-2 text-left align-middle leading-4">
                    <span
                      :class="[
                        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        getRuntimeStatus(row.id) === 'running'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : getRuntimeStatus(row.id) === 'queued'
                            ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
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
                  <td class="px-2 py-2 text-gray-600 text-center align-middle leading-4">
                    {{ formatDateTime(row.created_at) }}
                  </td>
                  <td class="px-2 py-2 text-gray-600 text-center align-middle leading-4">
                    {{ formatDateTime(row.updated_at) }}
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <div class="inline-flex items-center justify-center gap-2">
                      <button
                        v-if="getRuntimeStatus(row.id) === 'queued' || getRuntimeStatus(row.id) === 'running' || getRuntimeStatus(row.id) === 'stopping'"
                        type="button"
                        class="w-8 h-8 inline-flex items-center justify-center rounded border border-amber-200 text-amber-600 hover:bg-amber-50 cursor-pointer"
                        @click="handleStopScenario(row)"
                        title="Stop"
                        aria-label="Stop scenario"
                      >
                        <BootstrapIcon name="stop-fill" class="w-3 h-3" />
                        <span class="sr-only">Stop</span>
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
                        <span class="sr-only">Run</span>
                      </button>
                    </div>
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <div class="inline-flex items-center justify-center gap-2">
                      <button
                        type="button"
                        class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                        @click="openEditScenario(row)"
                        title="Edit"
                        aria-label="Edit scenario"
                      >
                        <BootstrapIcon name="pencil-square" class="w-3 h-3" />
                        <span class="sr-only">Edit</span>
                      </button>
                      <button
                        type="button"
                        class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                        @click="confirmDeleteScenario(row)"
                        title="Delete"
                        aria-label="Delete scenario"
                      >
                        <BootstrapIcon name="trash" class="w-3 h-3" />
                        <span class="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                  <td class="px-2 py-2 text-center align-middle">
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer"
                      @click="openScenarioConfig(row)"
                      title="Configure"
                      aria-label="Configure scenario"
                    >
                      <BootstrapIcon name="gear" class="w-3 h-3" />
                      <span class="sr-only">Configure</span>
                    </button>
                  </td>
                </tr>
              </template>

              <template #empty> {{ emptyText }} </template>

              <template #footer>
                <span>Showing {{ displayedScenarioRows.length }} entries on this page.</span>
                <span>
                  Total filtered:
                  <span class="text-gray-600 font-medium">{{ scenarioPagination.total }}</span>
                </span>
              </template>
            </DataBoxCard>
      </div>
    </div>

    <ScenarioFormModal
      v-model="isScenarioModalOpen"
      :is-edit="isScenarioEditMode"
      :is-saving="isScenarioSaving"
      :form="scenarioForm"
      @submit="saveScenario"
      @close="handleScenarioModalClose"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { message, Modal } from "ant-design-vue";
import ScenarioFormModal from "@/components/Modals/Devices/ScenarioFormModal.vue";
import ScenarioBuilderSection from "@/components/devices-control/sections/ScenarioBuilderSection.vue";
import AdvancedFilterPanel, {
  type FilterFieldRow,
} from "@/components/common/AdvancedFilterPanel.vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import type { Section } from "@/types/devices-control";
import { formatIotDateTime } from "~~/config/iot-time-format";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import {
  buildWorkflowListParams,
  createWorkflow,
  deleteWorkflow,
  fetchWorkflowDetail,
  fetchWorkflows,
  runWorkflow,
  stopWorkflow,
  updateWorkflow,
} from "@/composables/Scenario/handleWorkflow";
import { useMetrics } from "@/composables/useMetrics";

defineProps<{
  section: Section;
}>();

type ScenarioRow = {
  id: string | number;
  name: string | null;
  status: string | null;
  definition: Record<string, unknown> | null;
  control_definition?: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type ScenarioFilterState = {
  name: string;
  status: string;
  created_from: string;
  created_to: string;
};

const title = "Scenarios";
const loadingText = "Loading scenarios...";
const emptyText = "No scenarios found.";
const { metrics: metricsRef, isLoading: isMetricsLoading } = useMetrics();
const metrics = computed(() => metricsRef.value);

const scenarioTableColumns = [
  "Name",
  "Status",
  "Workflow State",
  "Created",
  "Updated",
  "Actions",
  "Manage",
  "Config",
];

const isScenarioLoading = ref(false);
const isFilterVisible = ref(true);
const searchKeyword = ref("");

const scenarioRows = ref<ScenarioRow[]>([]);
const scenarioPagination = ref({ page: 1, perPage: 10, lastPage: 1, total: 0 });
const activeScenarioConfig = ref<ScenarioRow | null>(null);
const runtimeStatusById = ref<Record<string, string>>({});
const runToWorkflowId = ref<Record<string, string>>({});
const workflowStatusStream = ref<EventSource | null>(null);
const queueStreamBase = computed(() => (apiConfig.server || "").replace(/\/$/, ""));

const isScenarioModalOpen = ref(false);
const isScenarioEditMode = ref(false);
const isScenarioSaving = ref(false);
const scenarioForm = reactive({
  id: "" as string | number,
  name: "",
  status: "",
  definition: "",
  control_definition: "",
});

const scenarioFilters = reactive<ScenarioFilterState>({
  name: "",
  status: "",
  created_from: "",
  created_to: "",
});
const appliedScenarioFilters = ref<ScenarioFilterState>({
  ...scenarioFilters,
});

const scenarioFilterFields: FilterFieldRow[] = [
  [{ key: "name", label: "Scenario name", type: "text", placeholder: "Name" }],
  [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "All", value: "" },
        { label: "Approved", value: "approved" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ],
  [
    {
      key: "created_from",
      label: "Created from",
      type: "datetime-local",
    },
    {
      key: "created_to",
      label: "Created to",
      type: "datetime-local",
    },
  ],
];

const filteredScenarioRows = computed(() => {
  const filters = appliedScenarioFilters.value;
  const nameFilter = normalizeText(filters.name);
  const statusFilter = normalizeText(filters.status);
  const keyword = normalizeText(searchKeyword.value);
  const createdFrom = filters.created_from ? new Date(filters.created_from) : null;
  const createdTo = filters.created_to ? new Date(filters.created_to) : null;

  return scenarioRows.value.filter((row) => {
    if (nameFilter && !normalizeText(row.name).includes(nameFilter)) return false;
    if (statusFilter && normalizeText(row.status) !== statusFilter) return false;
    if (createdFrom || createdTo) {
      const createdAt = row.created_at ? new Date(row.created_at) : null;
      if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
      if (createdFrom && createdAt < createdFrom) return false;
      if (createdTo && createdAt > createdTo) return false;
    }
    if (keyword) {
      const haystack = [
        row.name,
        row.status,
      ]
        .map((value) => normalizeText(value))
        .join(" ");
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });
});

const displayedScenarioRows = computed(() => {
  const start =
    (scenarioPagination.value.page - 1) * scenarioPagination.value.perPage;
  const end = start + scenarioPagination.value.perPage;
  return filteredScenarioRows.value.slice(start, end);
});

function normalizeText(value: string | number | null | undefined) {
  return (value ?? "").toString().trim().toLowerCase();
}

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
    case "queued":
      return "Queued";
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

function resolvePayloadWorkflowId(payload: any) {
  const value = String(payload?.workflow_id ?? "").trim();
  if (value) return value;
  const runId = String(payload?.run_id ?? "").trim();
  if (runId) {
    return runToWorkflowId.value[runId] ?? "";
  }
  return "";
}

function applyWorkflowStatusPayload(payload: any) {
  const workflowId = resolvePayloadWorkflowId(payload);
  if (!workflowId) return;
  const runId = String(payload?.run_id ?? "").trim();
  if (runId) {
    runToWorkflowId.value = {
      ...runToWorkflowId.value,
      [runId]: workflowId,
    };
  }

  const status = String(payload?.status ?? "").trim();
  if (status === "workflow_started") {
    setRuntimeStatus(workflowId, "running");
    return;
  }
  if (status === "workflow_completed" || status === "workflow_stopped") {
    setRuntimeStatus(workflowId, "idle");
    return;
  }
  if (status === "workflow_failed") {
    setRuntimeStatus(workflowId, "error");
  }
}

function disconnectWorkflowStatusStream() {
  if (!workflowStatusStream.value) return;
  workflowStatusStream.value.close();
  workflowStatusStream.value = null;
}

function connectWorkflowStatusStream() {
  if (!import.meta.client) return;
  if (!queueStreamBase.value) return;
  if (!authStore.authorizationHeader) return;

  disconnectWorkflowStatusStream();
  const source = new EventSource(`${queueStreamBase.value}/events/control-queue`);
  source.addEventListener("workflow-status", (event) => {
    const payload = JSON.parse((event as MessageEvent).data ?? "{}");
    applyWorkflowStatusPayload(payload);
  });
  source.onerror = () => {
    // keep UI stable, browser EventSource will retry automatically.
  };
  workflowStatusStream.value = source;
}

function handleBuilderRuntimeState(payload: { workflowId: string; state: string; runId?: string | null }) {
  const workflowId = String(payload?.workflowId ?? "").trim();
  if (!workflowId) return;
  const runId = String(payload?.runId ?? "").trim();
  if (runId) {
    runToWorkflowId.value = {
      ...runToWorkflowId.value,
      [runId]: workflowId,
    };
  }
  setRuntimeStatus(workflowId, payload.state || "idle");
}

function handleFilterModelUpdate(value: Record<string, string>) {
  Object.assign(scenarioFilters, value);
}

function applyFilters(payload?: Record<string, string>) {
  appliedScenarioFilters.value = {
    ...scenarioFilters,
    ...(payload ?? {}),
  };
  scenarioPagination.value.page = 1;
  fetchScenarios();
}

function resetFilters() {
  scenarioFilters.name = "";
  scenarioFilters.status = "";
  scenarioFilters.created_from = "";
  scenarioFilters.created_to = "";
  appliedScenarioFilters.value = { ...scenarioFilters };
  scenarioPagination.value.page = 1;
  fetchScenarios();
}

function toggleFilters() {
  isFilterVisible.value = !isFilterVisible.value;
}

function refreshRows() {
  if (isScenarioLoading.value) return;
  fetchScenarios();
}

function openAddScenario() {
  isScenarioEditMode.value = false;
  resetScenarioForm();
  isScenarioModalOpen.value = true;
}

function exportRows() {
  if (!import.meta.client) return;
  const rows = filteredScenarioRows.value;
  if (!rows.length) {
    message.warning("No scenarios to export.");
    return;
  }
  const headers = scenarioTableColumns.filter(
    (column) => column !== "Actions" && column !== "Config",
  );
  const escapeValue = (value: string | number | null | undefined) => {
    const str = (value ?? "").toString().replace(/"/g, '""');
    return `"${str}"`;
  };
  const csvRows = [
    headers.map(escapeValue).join(","),
    ...rows.map((row) =>
      [row.name, row.status, row.created_at, row.updated_at]
        .map(escapeValue)
        .join(","),
    ),
  ];
  const csvContent = "\uFEFF" + csvRows.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "scenarios.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

function openEditScenario(row: ScenarioRow) {
  isScenarioEditMode.value = true;
  scenarioForm.id = row.id;
  scenarioForm.name = row.name ?? "";
  scenarioForm.status = normalizeScenarioStatus(row.status);
  scenarioForm.definition = JSON.stringify(row.definition ?? defaultDefinition(), null, 2);
  scenarioForm.control_definition = JSON.stringify(row.control_definition ?? defaultDefinition(), null, 2);
  isScenarioModalOpen.value = true;
}

function confirmDeleteScenario(row: ScenarioRow) {
  Modal.confirm({
    title: "Delete Scenario",
    content: `Are you sure you want to delete ${row.name ?? `scenario #${row.id}`}?`,
    okText: "Delete",
    okType: "danger",
    cancelText: "Cancel",
    centered: true,
    onOk: () => deleteScenario(row),
  });
}

async function deleteScenario(row: ScenarioRow) {
  if (!import.meta.client) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }

  isScenarioLoading.value = true;
  try {
    await deleteWorkflow(row.id, authorization);
    scenarioRows.value = scenarioRows.value.filter((item) => item.id !== row.id);
    message.success("Scenario deleted.");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to delete scenario.");
  } finally {
    isScenarioLoading.value = false;
  }
}

async function handleRunScenario(row: ScenarioRow) {
  if (!import.meta.client) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  try {
    setRuntimeStatus(row.id, "queued");
    const result = await runWorkflow(row.id, authorization);
    const runId = String(result?.data?.run_id ?? result?.run_id ?? "").trim();
    if (runId) {
      runToWorkflowId.value = {
        ...runToWorkflowId.value,
        [runId]: String(row.id),
      };
    }
  } catch (error: any) {
    message.error(error?.message ?? "Failed to run scenario.");
    setRuntimeStatus(row.id, "error");
  }
}

async function handleStopScenario(row: ScenarioRow) {
  if (!import.meta.client) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  try {
    setRuntimeStatus(row.id, "stopping");
    await stopWorkflow(row.id, authorization);
    message.success("Scenario stopped.");
    setRuntimeStatus(row.id, "idle");
  } catch (error: any) {
    message.error(error?.message ?? "Failed to stop scenario.");
    setRuntimeStatus(row.id, "error");
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
}

function recalculateScenarioPagination() {
  const total = filteredScenarioRows.value.length;
  scenarioPagination.value.total = total;
  const lastPage = Math.max(1, Math.ceil(total / scenarioPagination.value.perPage));
  scenarioPagination.value.lastPage = lastPage;
  if (scenarioPagination.value.page > lastPage) {
    scenarioPagination.value.page = lastPage;
  }
}

function formatDateTime(value?: string | null) {
  return formatIotDateTime(value, { fallback: "-" });
}

function formatMetricValue(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Number(value.toFixed(1)).toString();
  }
  if (value === null || value === undefined || value === "") {
    return "--";
  }
  return String(value);
}

function formatMetricTimestamp() {
  return formatIotDateTime(new Date().toISOString(), { fallback: "-" });
}

function resetScenarioForm() {
  scenarioForm.id = "";
  scenarioForm.name = "";
  scenarioForm.status = "";
  scenarioForm.definition = JSON.stringify(defaultDefinition(), null, 2);
  scenarioForm.control_definition = JSON.stringify(defaultDefinition(), null, 2);
}

function handleScenarioModalClose() {
  if (isScenarioSaving.value) return;
  resetScenarioForm();
}

function parseDefinition(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return defaultDefinition();
  return JSON.parse(trimmed) as Record<string, unknown>;
}

function defaultDefinition() {
  return {
    version: 1,
    nodes: [],
    edges: [],
  };
}

function normalizeScenarioStatus(status: string | null | undefined) {
  if (!status) return "";
  if (status === "active") return "approved";
  if (status === "draft") return "";
  return status;
}

async function saveScenario() {
  if (isScenarioSaving.value) return;
  const name = scenarioForm.name.trim();
  if (!name) {
    message.warning("Scenario name is required.");
    return;
  }
  if (!scenarioForm.status) {
    message.warning("Status is required.");
    return;
  }
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }

  let definition: Record<string, unknown>;
  try {
    definition = parseDefinition(scenarioForm.definition);
  } catch (error: any) {
    message.error(error?.message ?? "Definition must be valid JSON.");
    return;
  }

  isScenarioSaving.value = true;
  try {
    const payload = {
      name,
      status: scenarioForm.status,
      definition,
    };
    const saved = isScenarioEditMode.value
      ? await updateWorkflow(scenarioForm.id, authorization, payload)
      : await createWorkflow(authorization, payload);
    if (saved) {
      const index = scenarioRows.value.findIndex((row) => row.id === saved.id);
      if (index >= 0) {
        scenarioRows.value[index] = saved;
      } else {
        scenarioRows.value.unshift(saved);
      }
    } else {
      await fetchScenarios();
    }
    message.success(isScenarioEditMode.value ? "Scenario updated." : "Scenario created.");
    isScenarioModalOpen.value = false;
    resetScenarioForm();
  } catch (error: any) {
    message.error(error?.message ?? "Failed to save scenario.");
  } finally {
    isScenarioSaving.value = false;
  }
}

async function openScenarioConfig(row: ScenarioRow) {
  activeScenarioConfig.value = row;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  try {
    const workflow = await fetchWorkflowDetail(row.id, authorization);
    if (workflow) {
      activeScenarioConfig.value = workflow;
      const index = scenarioRows.value.findIndex((item) => item.id === workflow.id);
      if (index >= 0) {
        scenarioRows.value[index] = workflow;
      }
    }
  } catch (error: any) {
    message.error(error?.message ?? "Failed to load workflow.");
  }
}

function closeScenarioConfig() {
  activeScenarioConfig.value = null;
}

async function handleScenarioDefinitionSave(payload: { nodes: any[]; edges: any[]; controlDefinition: any }) {
  if (!activeScenarioConfig.value) return;
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }
  const definition = {
    version: 1,
    nodes: payload.nodes,
    edges: payload.edges,
  };
  try {
    await updateWorkflow(activeScenarioConfig.value.id, authorization, {
      definition,
      control_definition: payload.controlDefinition,
    });
    message.success("Scenario definition saved.");
    await fetchScenarios();
  } catch (error: any) {
    message.error(error?.message ?? "Failed to save workflow definition.");
  }
}

const authStore = useAuthStore();

async function fetchScenarios() {
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    message.error("Missing authorization.");
    return;
  }

  isScenarioLoading.value = true;
  try {
    const params = buildWorkflowListParams({
      per_page: "200",
      name: appliedScenarioFilters.value.name,
      status: appliedScenarioFilters.value.status,
      created_from: appliedScenarioFilters.value.created_from,
      created_to: appliedScenarioFilters.value.created_to,
      search: searchKeyword.value.trim() || undefined,
    });
    scenarioRows.value = (await fetchWorkflows(authorization, params)) as ScenarioRow[];
    recalculateScenarioPagination();
  } catch (error: any) {
    scenarioRows.value = [];
    message.error(error?.message ?? "Failed to load scenarios.");
  } finally {
    isScenarioLoading.value = false;
  }
}

onMounted(() => {
  if (!import.meta.client) return;
  resetScenarioForm();
  fetchScenarios();
  connectWorkflowStatusStream();
});

onBeforeUnmount(() => {
  disconnectWorkflowStatusStream();
});

watch(
  filteredScenarioRows,
  () => {
    recalculateScenarioPagination();
  },
  { immediate: true },
);

watch(
  () => scenarioPagination.value.perPage,
  () => {
    scenarioPagination.value.page = 1;
    recalculateScenarioPagination();
  },
);

watch(searchKeyword, () => {
  scenarioPagination.value.page = 1;
  fetchScenarios();
});

watch(
  () => authStore.authorizationHeader,
  (authorization) => {
    if (!authorization) {
      disconnectWorkflowStatusStream();
      return;
    }
    connectWorkflowStatusStream();
  },
);
</script>
