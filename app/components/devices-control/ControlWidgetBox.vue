<template>
  <div class="space-y-3">
    <div v-if="error" class="text-xs text-red-500">
      {{ error }}
    </div>
    <div v-else-if="isLoading" class="text-xs text-slate-500">
      Loading control urls...
    </div>
    <div v-else-if="!widgets.length" class="text-xs text-slate-500">
      No control urls found.
    </div>
    <div
      v-else
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <div
        v-for="widget in widgets"
        :key="widget.id"
        class="group relative rounded border border-slate-200 bg-white p-6 transition-all duration-200"
      >
        <!-- Status Indicator -->
        <div
          class="absolute top-4 right-4 flex h-3 w-3 items-center justify-center rounded-full"
          :class="isPending(widget.id)
            ? 'bg-amber-400 ring-4 ring-amber-100 animate-pulse'
            : (isWidgetOn(widget)
              ? 'bg-emerald-500 ring-4 ring-emerald-100'
              : 'bg-slate-300 ring-4 ring-slate-100')"
        />

        <!-- Content -->
        <div class="space-y-4">
          <!-- Gateway -->
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Gateway
            </p>
            <p class="text-sm font-semibold text-slate-900">
              {{ widget.gatewayName }}
            </p>
          </div>

          <!-- Node -->
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Node
            </p>
            <p class="text-sm font-medium text-slate-800">
              {{ widget.nodeName }}
            </p>
          </div>

          <!-- Controller -->
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Controller
            </p>
            <p class="text-sm font-medium text-slate-800">
              {{ widget.controllerName }}
            </p>
          </div>
        </div>

        <div class="mt-6">
          <LoadingState
            v-if="isPending(widget.id)"
            class="!py-2"
            message="Waiting for device status..."
          />
          <div v-else class="flex gap-2">
            <!-- Toggle Button -->
            <button
              v-if="isDigitalInput(widget)"
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2.5
                     text-xs font-semibold transition-all duration-200
                     focus:outline-none focus:ring-2 focus:ring-offset-1
                     disabled:cursor-not-allowed disabled:opacity-60"
              :class="isWidgetOn(widget)
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus:ring-emerald-300'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 focus:ring-slate-300'"
              :aria-pressed="isWidgetOn(widget)"
              :disabled="!canExecute(widget) || isExecuting(widget.id)"
              @click="toggleWidget(widget)"
            >
              <span
                class="inline-block h-2 w-2 rounded-full"
                :class="isWidgetOn(widget) ? 'bg-emerald-500' : 'bg-slate-400'"
              />
              <span>
                {{ isWidgetOn(widget) ? "ON" : "OFF" }}
              </span>
            </button>
            <div
              v-else
              class="flex w-full items-center justify-center rounded-md border border-slate-200
                     bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-500"
            >
              Input type not supported.
            </div>
            <button
              type="button"
              class="flex items-center justify-center rounded-md border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              @click="openDetail(widget)"
            >
              Details
            </button>
          </div>
        </div>
      </div>
    </div>

    <ControlUrlDetailModal
      v-if="selectedWidget"
      v-model="isDetailOpen"
      :control-url="selectedWidget.raw"
      @close="closeDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { message } from "ant-design-vue";
import ControlUrlDetailModal from "@/components/Modals/Devices/ControlUrlDetailModal.vue";
import LoadingState from "@/components/common/LoadingState.vue";
import type { ControllerState } from "@/types/devices-control";

type ControlUrlItem = {
  id: string;
  controller_id?: string | null;
  name?: string | null;
  url?: string | null;
  input_type?: string | null;
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

type ControlWidget = {
  id: string;
  controllerId?: string | null;
  gatewayName: string;
  nodeName: string;
  controllerName: string;
  isOn: boolean;
  raw: ControlUrlItem;
};

const props = withDefaults(
  defineProps<{
    items: ControlUrlItem[];
    isLoading?: boolean;
    error?: string | null;
    onExecute?: (widget: ControlWidget, nextState: boolean) => Promise<void>;
    hasSse?: boolean;
    controllerStatesByNode?: Record<string, ControllerState[]>;
  }>(),
  {
    hasSse: true,
  },
);

const widgetState = ref<Record<string, boolean>>({});
const executingMap = ref<Record<string, boolean>>({});
const pendingMap = ref<Record<string, boolean>>({});
const expectedStateMap = ref<Record<string, boolean>>({});
const pendingTimeoutMap = new Map<string, number>();
const PENDING_TIMEOUT_MS = 10000;
const isDetailOpen = ref(false);
const selectedWidget = ref<ControlWidget | null>(null);

const widgets = computed<ControlWidget[]>(() =>
  (props.items ?? []).map((item) => ({
    id: item.id,
    controllerId: item.controller_id ?? null,
    gatewayName:
      item.node?.gateway?.name ??
      item.node?.gateway?.external_id ??
      "N/A",
    nodeName: item.node?.name ?? item.node?.external_id ?? "N/A",
    controllerName: item.name ?? item.url ?? "N/A",
    isOn: false,
    raw: item,
  })),
);

function isWidgetOn(widget: ControlWidget) {
  const sseState = resolveSseState(widget);
  if (typeof sseState === "boolean") {
    return sseState;
  }
  if (typeof widgetState.value[widget.id] === "boolean") {
    return widgetState.value[widget.id];
  }
  return widget.isOn;
}

function isExecuting(id: string) {
  return executingMap.value[id] === true;
}

function isPending(id: string) {
  return pendingMap.value[id] === true;
}

function canExecute(widget: ControlWidget) {
  if (!props.hasSse) return false;
  if (isPending(widget.id)) return false;
  return typeof resolveSseState(widget) === "boolean";
}

function normalizeKey(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length ? normalized : null;
}

function resolveNodeKey(widget: ControlWidget) {
  const node = widget.raw.node;
  return normalizeKey(
    node?.external_id ??
      node?.id ??
      node?.name ??
      null,
  );
}

function resolveControllerId(widget: ControlWidget) {
  return normalizeKey(
    widget.controllerId ??
      widget.raw.controller_id ??
      null,
  );
}

function resolveControllerStateValue(state: ControllerState) {
  const raw = state.status ?? state.state ?? state.value ?? null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw !== 0;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["on", "true", "1", "open", "opened", "enabled"].includes(normalized)) {
      return true;
    }
    if (["off", "false", "0", "close", "closed", "disabled"].includes(normalized)) {
      return false;
    }
  }
  return null;
}

function resolveSseState(widget: ControlWidget) {
  const nodeKey = resolveNodeKey(widget);
  if (!nodeKey) return null;
  const controllers = props.controllerStatesByNode?.[nodeKey];
  if (!Array.isArray(controllers) || controllers.length === 0) {
    return null;
  }
  const controllerId = resolveControllerId(widget);
  if (!controllerId) return null;
  const match = controllers.find(
    (controller) => normalizeKey(controller.id) === controllerId,
  );
  if (!match) return null;
  return resolveControllerStateValue(match);
}

function clearPending(widgetId: string) {
  pendingMap.value[widgetId] = false;
  delete expectedStateMap.value[widgetId];
  const timeoutId = pendingTimeoutMap.get(widgetId);
  if (typeof timeoutId === "number") {
    clearTimeout(timeoutId);
    pendingTimeoutMap.delete(widgetId);
  }
}

function markPending(widgetId: string, expectedState: boolean) {
  pendingMap.value[widgetId] = true;
  expectedStateMap.value[widgetId] = expectedState;
  const timeoutId = window.setTimeout(() => {
    if (pendingMap.value[widgetId]) {
      clearPending(widgetId);
      message.warning("Waiting for device status update. Please try again.");
    }
  }, PENDING_TIMEOUT_MS);
  pendingTimeoutMap.set(widgetId, timeoutId);
}

async function toggleWidget(widget: ControlWidget) {
  if (!props.hasSse || !canExecute(widget)) {
    message.warning("The device is currently offline.");
    return;
  }

  const nextState = !isWidgetOn(widget);
  if (!props.onExecute) {
    widgetState.value[widget.id] = nextState;
    return;
  }

  if (isExecuting(widget.id)) {
    return;
  }

  executingMap.value[widget.id] = true;
  try {
    await props.onExecute(widget, nextState);
    widgetState.value[widget.id] = nextState;
    markPending(widget.id, nextState);
  } catch (error: any) {
    message.error(error?.message ?? "Failed to execute control url.");
  } finally {
    executingMap.value[widget.id] = false;
  }
}

function isDigitalInput(widget: ControlWidget) {
  return String(widget.raw.input_type ?? "").toLowerCase() === "digital";
}

function openDetail(widget: ControlWidget) {
  selectedWidget.value = widget;
  isDetailOpen.value = true;
}

function closeDetail() {
  isDetailOpen.value = false;
  selectedWidget.value = null;
}

watch(
  () => [props.controllerStatesByNode, widgets.value],
  () => {
    for (const widget of widgets.value) {
      if (!isPending(widget.id)) continue;
      const sseState = resolveSseState(widget);
      const expectedState = expectedStateMap.value[widget.id];
      if (typeof sseState === "boolean" && sseState === expectedState) {
        clearPending(widget.id);
      }
    }
  },
  { deep: true },
);
</script>
