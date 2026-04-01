<template>
  <section class="w-full">
    <a-tabs v-model:activeKey="activeTab" class="px-4 custom-tabs text-xs">
      <a-tab-pane key="registered_control_urls" tab="Control URL" />
            <a-tab-pane key="command_setup" tab="Command" />
    </a-tabs>

    <div class="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div
        :class="[
          'bg-white rounded border border-slate-200 overflow-hidden transition-all duration-200 w-full lg:w-64 shrink-0 h-fit lg:sticky lg:top-4',
          { hidden: !isFilterVisible },
        ]"
      >
        <div class="bg-slate-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h4 class="text-xs font-semibold text-gray-700">Filters</h4>
            <p class="text-xs text-gray-500">Refine control data list.</p>
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
          :fields="deviceFilterFields"
          :model-value="deviceFilters"
          :is-loading="isLoading"
          apply-label="Apply"
          reset-label="Reset"
          @update:modelValue="handleDeviceFilterModelUpdate"
          @apply="applyFilters"
          @reset="resetFilters"
        />
      </div>

      <div :class="['flex flex-col gap-4', isFilterVisible ? 'flex-1' : 'max-w-8xl w-full mx-auto']">
        <DataBoxCard
          class="control-data-table-card"
          :is-loading="isLoading"
          :columns="tableColumns.length"
          :has-data="displayedRows.length > 0"
          :pagination="pagination"
          loading-text="Loading control data..."
          @prev-page="prevPage"
          @next-page="nextPage"
          @change-per-page="changePerPage"
        >
          <template #header>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-700 text-xs">
                {{ activeTab === "command_setup" ? "Command" : "Control URL" }}
              </h3>
              <button
                type="button"
                class="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-2 py-0.5"
                @click="toggleFilters"
              >
                {{ isFilterVisible ? "Hide Filters" : "Show Filters" }}
              </button>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div class="relative">
                <input
                  v-model="deviceSearchKeyword"
                  type="text"
                  placeholder="Search..."
                  class="pl-5 pr-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 bg-white w-60 text-xs cursor-text"
                />
                <BootstrapIcon name="search" class="absolute left-1 top-1.5 w-3 h-3 text-gray-400" />
              </div>
              <button
                v-if="activeTab === 'command_setup'"
                type="button"
                class="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1 text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="isLoading"
                @click="openCommandSetupModal"
              >
                <BootstrapIcon name="plus-lg" class="w-3 h-3 mr-1" />
                Add
              </button>
              <button
                class="inline-flex items-center bg-gray-50 hover:bg-gray-100 text-gray-600 rounded px-3 py-1 text-xs border border-gray-300 disabled:opacity-60 disabled:cursor-not-allowed"
                :disabled="isLoading"
                @click="refreshRows"
              >
                <BootstrapIcon
                  name="arrow-clockwise"
                  class="w-3 h-3 mr-1"
                  :class="{ 'animate-spin': isLoading }"
                />
                {{ isLoading ? "Refreshing..." : "Refresh" }}
              </button>
            </div>
          </template>

          <template #head>
            <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600 text-left">
              <th
                v-for="column in tableColumns"
                :key="column.key"
                class="px-2 py-2 font-normal text-gray-600 text-xs tracking-wide"
                :class="column.key === 'actions' ? 'text-center' : 'text-left'"
              >
                {{ column.label }}
              </th>
            </tr>
          </template>

          <template #default>
            <tr
              v-for="row in displayedRows"
              :key="row.id"
              :class="[
                'transition-colors text-xs align-top border-b border-gray-100',
                isSoftDeleted(row) ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-gray-50',
              ]"
            >
              <td v-for="column in tableColumns" :key="column.key" class="px-2 py-2 align-middle" :class="column.key === 'actions' ? 'text-center' : ''">
                <template v-if="column.key === 'actions'">
                  <div v-if="activeTab === 'command_setup'" class="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      :disabled="isLoading"
                      @click="openDetailRow(row)"
                    >
                      <BootstrapIcon name="info-circle" class="w-3 h-3" />
                      <span class="sr-only">Command Detail</span>
                    </button>
                    <button
                      v-if="canEditCommandSetup(row)"
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="isLoading"
                      @click="openEditRow(row)"
                    >
                      <BootstrapIcon name="pencil-square" class="w-3 h-3" />
                      <span class="sr-only">Edit Command</span>
                    </button>
                    <button
                      v-if="canDeleteCommandSetup(row)"
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="isLoading || isDeletingCommandSetup(row)"
                      :aria-busy="isDeletingCommandSetup(row)"
                      @click="deleteRow(row)"
                    >
                      <BootstrapIcon name="trash" class="w-3 h-3" />
                      <span class="sr-only">Delete Command</span>
                    </button>
                  </div>
                  <div v-else class="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
                      :disabled="isLoading"
                      @click="openRegisteredControlUrlDetail(row)"
                    >
                      <BootstrapIcon name="info-circle" class="w-3 h-3" />
                      <span class="sr-only">Control URL Detail</span>
                    </button>
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="isLoading"
                      @click="openRegisteredControlUrlEdit(row)"
                    >
                      <BootstrapIcon name="pencil-square" class="w-3 h-3" />
                      <span class="sr-only">Edit Control URL</span>
                    </button>
                    <button
                      type="button"
                      class="w-8 h-8 inline-flex items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                      :disabled="isLoading || isDeletingRegisteredControlUrl(row)"
                      :aria-busy="isDeletingRegisteredControlUrl(row)"
                      @click="handleDeleteRegisteredControlUrl(row)"
                    >
                      <BootstrapIcon name="trash" class="w-3 h-3" />
                      <span class="sr-only">Delete Control URL</span>
                    </button>
                  </div>
                </template>
                <template v-else>{{ displayCellValue(column.key, resolveCellValue(row, column.key)) }}</template>
              </td>
            </tr>
          </template>
          <template #empty>
            {{ activeTab === "command_setup" ? "No command found." : "No control URL found." }}
          </template>
          <template #footer>
            <span>Showing {{ displayedRows.length }} entries on this page.</span>
            <span>
              Total filtered:
              <span class="text-gray-600 font-medium">{{ pagination.total }}</span>
            </span>
          </template>
        </DataBoxCard>
      </div>
    </div>

    <CommandDetailModal
      :model-value="isDetailModalOpen"
      :row="selectedDetailRow"
      @close="closeDetailRow"
    />
    <RegisteredControlUrlDetailModal
      :model-value="isRegisteredControlUrlDetailOpen"
      :row="selectedRegisteredControlUrl"
      @close="closeRegisteredControlUrlDetail"
    />
    <EditRegisteredControlUrlModal
      :model-value="isRegisteredControlUrlEditOpen"
      title="Edit Control URL"
      :form="registeredControlUrlEditForm"
      :is-saving="isSavingRegisteredControlUrlEdit"
      @close="closeRegisteredControlUrlEdit"
      @save="saveRegisteredControlUrlEdit"
    />

    <AddCommandSetupModal
      :model-value="isCommandSetupModalOpen"
      :is-editing="isEditingCommandSetup"
      :is-saving="isSavingCommandSetup"
      :control-url-options="controlUrlOptions"
      :form="commandSetupForm"
      @request-close="closeCommandSetupModal"
      @after-leave="resetCommandSetupForm"
      @save="handleCreateCommandSetup"
      @draft-changed="handleGeneratedDraftChanged"
      @add-generated-field-input="addGeneratedFieldInput"
      @remove-generated-field-input="removeGeneratedFieldInput"
      @mode-changed="handleGeneratedModeChanged"
      @input-type-changed="handleCommandInputTypeChanged"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import DataBoxCard from "@/components/common/DataBoxCard.vue";
import AdvancedFilterPanel from "@/components/common/AdvancedFilterPanel.vue";
import CommandDetailModal from "@/components/Modals/Devices/CommandDetailModal.vue";
import RegisteredControlUrlDetailModal from "@/components/Modals/Devices/RegisteredControlUrlDetailModal.vue";
import AddCommandSetupModal from "@/components/Modals/Devices/AddCommandSetupModal.vue";
import EditRegisteredControlUrlModal from "@/components/Modals/Devices/EditRegisteredControlUrlModal.vue";
import type { DeviceRow, DeviceTabKey } from "@/types/devices-control";
import { useDeviceFilter } from "@/composables/DeviceRegistration/DeviceFilter";
import { useControlDataTabs } from "@/composables/DeviceRegistration/useControlDataTabs";
import { useAuthStore } from "~~/stores/auth";
import { apiConfig } from "~~/config/api";

const activeTab = ref<DeviceTabKey>("command_setup");
const isLoading = ref(false);
const isDetailModalOpen = ref(false);
const selectedDetailRow = ref<DeviceRow | null>(null);
const isRegisteredControlUrlDetailOpen = ref(false);
const selectedRegisteredControlUrl = ref<DeviceRow | null>(null);
const isRegisteredControlUrlEditOpen = ref(false);
const isSavingRegisteredControlUrlEdit = ref(false);
const registeredControlUrlEditForm = ref({
  id: "",
  node_id: "",
  node_external_id: "",
  controller_id: "",
  name: "",
  url: "",
  input_type: "",
});
const pagination = ref({ page: 1, perPage: 10, lastPage: 1, total: 0 });
const authStore = useAuthStore();

const {
  deviceSearchKeyword,
  isDeviceFilterVisible: isFilterVisible,
  deviceFilters,
  deviceFilterFields,
  filterDeviceRows,
  handleDeviceFilterModelUpdate,
  applyDeviceFilters: applyFiltersBase,
  resetDeviceFilters: resetFiltersBase,
  toggleDeviceFilters: toggleFilters,
} = useDeviceFilter();

const {
  registeredControlUrlRows,
  loadRegisteredControlUrls,
  isDeletingRegisteredControlUrl,
  handleDeleteRegisteredControlUrl,
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
  handleGeneratedModeChanged,
  handleGeneratedDraftChanged,
  addGeneratedFieldInput,
  removeGeneratedFieldInput,
  handleCommandInputTypeChanged,
  isDeletingCommandSetup,
  canEditCommandSetup,
  canDeleteCommandSetup,
  handleDeleteCommandSetup,
  isSoftDeleted,
} = useControlDataTabs({
  loadingRef: isLoading,
  includeSoftDeleted: true,
});

const commandSetupColumns = [
  { key: "name", label: "Name" },
  { key: "nodeId", label: "Node ID" },
  { key: "url", label: "URL" },
  { key: "inputType", label: "Input Type" },
  { key: "command", label: "Command JSON" },
  { key: "actions", label: "Actions" },
];

const registeredControlUrlColumns = [
  { key: "nodeId", label: "Node External ID" },
  { key: "controllerId", label: "Controller ID" },
  { key: "nodeType", label: "Node Type" },
  { key: "name", label: "Control URL Name" },
  { key: "url", label: "URL" },
  { key: "inputType", label: "Input Type" },
  { key: "actions", label: "Actions" },
];

const rows = computed<DeviceRow[]>(() =>
  activeTab.value === "command_setup"
    ? commandSetupRows.value
    : registeredControlUrlRows.value,
);

const tableColumns = computed(() =>
  activeTab.value === "command_setup"
    ? commandSetupColumns
    : registeredControlUrlColumns,
);

const filteredRows = computed<DeviceRow[]>(() =>
  filterDeviceRows(rows.value)
    .slice()
    .sort((a, b) => {
      const aDeleted = isSoftDeleted(a);
      const bDeleted = isSoftDeleted(b);
      if (aDeleted !== bDeleted) {
        return aDeleted ? 1 : -1;
      }
      return a.id.localeCompare(b.id, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }),
);

const displayedRows = computed(() => {
  const start = (pagination.value.page - 1) * pagination.value.perPage;
  const end = start + pagination.value.perPage;
  return filteredRows.value.slice(start, end);
});

function applyFilters(payload?: Record<string, string>) {
  applyFiltersBase(payload);
  pagination.value.page = 1;
}

function resetFilters() {
  resetFiltersBase();
  pagination.value.page = 1;
}

function prevPage() {
  if (pagination.value.page > 1) pagination.value.page -= 1;
}

function nextPage() {
  if (pagination.value.page < pagination.value.lastPage) pagination.value.page += 1;
}

function changePerPage(value: number) {
  if (value > 0) pagination.value.perPage = value;
}

function recalculatePagination() {
  const total = filteredRows.value.length;
  pagination.value.total = total;
  pagination.value.lastPage = Math.max(1, Math.ceil(total / pagination.value.perPage));
  if (pagination.value.page > pagination.value.lastPage) {
    pagination.value.page = pagination.value.lastPage;
  }
}

function isUuidValue(value: unknown) {
  if (typeof value !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function isIdColumn(key: string) {
  return key === "id" || key.endsWith("Id") || key.endsWith("ID");
}

function displayCellValue(columnKey: string, value: unknown) {
  if (columnKey === "commandCount") return String(Number(value ?? 0));
  if (!value) return "N/A";
  if (columnKey === "command") {
    const content = String(value);
    return content.length > 20 ? `${content.slice(0, 20)}...` : content;
  }
  if (isIdColumn(columnKey) && isUuidValue(value)) return "N/A";
  return String(value);
}

function resolveCellValue(row: DeviceRow, columnKey: string) {
  const dataMap: Record<string, unknown> = {
    name: row.name,
    nodeId: row.nodeId,
    nodeType: row.nodeType,
    controllerId: row.controllerId,
    url: row.url,
    inputType: row.inputType,
    commandCount: row.commandCount,
    command: row.command,
  };

  return dataMap[columnKey] ?? null;
}

function openDetailRow(row: DeviceRow) {
  if (activeTab.value !== "command_setup") {
    openRegisteredControlUrlDetail(row);
    return;
  }
  selectedDetailRow.value = row;
  isDetailModalOpen.value = true;
}

function closeDetailRow() {
  isDetailModalOpen.value = false;
  selectedDetailRow.value = null;
}

function openRegisteredControlUrlDetail(row: DeviceRow) {
  selectedRegisteredControlUrl.value = row;
  isRegisteredControlUrlDetailOpen.value = true;
}

function closeRegisteredControlUrlDetail() {
  isRegisteredControlUrlDetailOpen.value = false;
  selectedRegisteredControlUrl.value = null;
}

function openEditRow(row: DeviceRow) {
  openEditCommandSetupModal(row);
}

function deleteRow(row: DeviceRow) {
  handleDeleteCommandSetup(row);
}

function openRegisteredControlUrlEdit(row: DeviceRow) {
  registeredControlUrlEditForm.value = {
    id: row.id ?? "",
    node_id: row.nodeInternalId ?? "",
    node_external_id: row.nodeId ?? "",
    controller_id: row.controllerId ?? "",
    name: row.name ?? "",
    url: row.url ?? "",
    input_type: row.inputType ?? "",
  };
  isRegisteredControlUrlEditOpen.value = true;
}

function closeRegisteredControlUrlEdit() {
  isRegisteredControlUrlEditOpen.value = false;
}

async function saveRegisteredControlUrlEdit() {
  if (!registeredControlUrlEditForm.value.id || !registeredControlUrlEditForm.value.node_id) {
    return;
  }
  const authorization = authStore.authorizationHeader;
  if (!authorization) return;
  const base = (apiConfig.controlModule || "").replace(/\/$/, "");
  if (!base) return;

  isSavingRegisteredControlUrlEdit.value = true;
  try {
    const response = await fetch(
      `${base}/control-urls/${encodeURIComponent(registeredControlUrlEditForm.value.id)}`,
      {
        method: "PUT",
        headers: {
          Authorization: authorization,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          controller_id: registeredControlUrlEditForm.value.controller_id.trim(),
          node_id: registeredControlUrlEditForm.value.node_id,
          name: registeredControlUrlEditForm.value.name.trim(),
          url: registeredControlUrlEditForm.value.url.trim(),
          input_type: registeredControlUrlEditForm.value.input_type.trim(),
        }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to update control url.");
    }
    closeRegisteredControlUrlEdit();
    await loadRegisteredControlUrls();
  } finally {
    isSavingRegisteredControlUrlEdit.value = false;
  }
}

async function refreshRows() {
  if (activeTab.value === "command_setup") {
    await loadCommandSetups();
    return;
  }
  await loadRegisteredControlUrls();
}

watch(filteredRows, recalculatePagination, { immediate: true });
watch(deviceSearchKeyword, () => {
  pagination.value.page = 1;
});

watch(activeTab, async () => {
  pagination.value.page = 1;
  await refreshRows();
});

onMounted(async () => {
  await Promise.all([loadCommandSetups(), loadRegisteredControlUrls()]);
});
</script>

<style scoped>
.control-data-table-card :deep(table) {
  table-layout: fixed;
}
</style>
