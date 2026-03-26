<template>
  <a-drawer
    :open="open"
    title="Control Command Trace"
    placement="right"
    width="460"
    @close="emit('close')"
  >
    <template v-if="row">
      <div class="space-y-4 text-xs">
    
        <section class="rounded border border-slate-200 bg-slate-50 p-3">
          <div class="grid grid-cols-2 gap-2">
            <p><span class="text-slate-500">Gateway:</span> {{ row.gateway_id || "-" }}</p>
            <p><span class="text-slate-500">Node:</span> {{ row.node_id || "-" }}</p>
            <p><span class="text-slate-500">Device:</span> {{ row.device || "-" }}</p>
            <p><span class="text-slate-500">State:</span> {{ row.state || "-" }}</p>
            <p><span class="text-slate-500">Status:</span> {{ row.status || "-" }}</p>
            <p><span class="text-slate-500">Seq:</span> {{ row.command_seq ?? "-" }}</p>
          </div>
        </section>

        <section class="rounded border border-slate-200 p-3">
          <p class="mb-2 font-semibold text-slate-700">Server Timeline</p>
          <p
            v-if="!row.dispatched_at"
            class="mb-2 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] text-amber-700"
          >
            Legacy record: missing dispatched_at, some durations may be unavailable.
          </p>
          <ol class="space-y-2">
            <li class="rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="font-medium text-slate-700">1. Requested (server)</p>
              <p class="text-slate-500">{{ formatDate(row.requested_at) }}</p>
            </li>
            <li class="rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="font-medium text-slate-700">2. Dispatched (server)</p>
              <p class="text-slate-500">{{ formatDate(row.dispatched_at) }}</p>
            </li>
            <li class="rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="font-medium text-slate-700">3. Received (server)</p>
              <p class="text-slate-500">{{ formatDate(row.received_at) }}</p>
            </li>
          </ol>
        </section>

        <section class="rounded border border-slate-200 p-3">
          <div class="mb-2 flex items-center justify-between">
            <p class="font-semibold text-slate-700">Durations</p>
            <button
              type="button"
              class="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
              aria-label="Explain durations"
              @click="isDurationHelpOpen = true"
            >
              <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 16h.01M9.09 9a3 3 0 115.82 1c0 2-3 2-3 4"
                />
                <circle cx="12" cy="12" r="10" stroke-width="2" />
              </svg>
            </button>
          </div>
          <div class="grid grid-cols-1 gap-2">
            <p><span class="text-slate-500">Queue Wait (requested -> dispatched):</span> {{ formatMs(queueToDispatchMs) }}</p>
            <p><span class="text-slate-500">Delivery + Device + Ingest (dispatched -> received):</span> {{ formatMs(dispatchToReceivedMs) }}</p>
            <p><span class="text-slate-500">End-to-end (server requested -> server received):</span> {{ formatMs(endToEndMs) }}</p>
            <p><span class="text-slate-500">ACK Latency (gateway timestamp -> server received):</span> {{ formatMs(ackLatencyMs) }}</p>
            <p><span class="text-slate-500">Controller exec:</span> {{ formatMs(row.command_exec_ms) }}</p>
          </div>
        </section>

        <section class="rounded border border-slate-200 p-3">
          <p class="mb-2 font-semibold text-slate-700">Deadline</p>
          <p><span class="text-slate-500">response_deadline_at:</span> {{ formatDeadline(row.response_deadline_at) }}</p>
          <p><span class="text-slate-500">Missed deadline:</span> {{ isMissedDeadline ? "Yes" : "No" }}</p>
        </section>
      </div>
    </template>
  </a-drawer>

  <BaseModal
    :model-value="isDurationHelpOpen"
    title="Durations Meaning"
    max-width="max-w-lg"
    panel-class="p-5 shadow-xl"
    @request-close="isDurationHelpOpen = false"
  >
    <div class="space-y-3 text-xs text-slate-700">
      <p class="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700">
        Time source: server-side timestamps only (UTC).
      </p>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Queue Wait</p>
        <p class="mt-1 text-slate-600">Time from command creation to MQTT publish.</p>
        <p class="mt-1 text-slate-500">Formula: <span class="font-mono">dispatched_at - requested_at</span></p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Delivery + Device + Ingest</p>
        <p class="mt-1 text-slate-600">From MQTT publish until server receives status-event (network + device processing + server ingest).</p>
        <p class="mt-1 text-slate-500">Formula: <span class="font-mono">received_at - dispatched_at</span></p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">End-to-end</p>
        <p class="mt-1 text-slate-600">Total elapsed time from request creation to server receive.</p>
        <p class="mt-1 text-slate-500">Formula: <span class="font-mono">received_at - requested_at</span></p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">ACK Latency</p>
        <p class="mt-1 text-slate-600">Latency from gateway event timestamp to server receive time.</p>
        <p class="mt-1 text-slate-500">Formula: <span class="font-mono">received_at - timestamp</span></p>
      </div>
      <div class="rounded border border-slate-200 p-3">
        <p class="font-semibold text-slate-800">Controller exec</p>
        <p class="mt-1 text-slate-600">Execution duration reported by firmware/controller.</p>
        <p class="mt-1 text-slate-500">Source field: <span class="font-mono">command_exec_ms</span></p>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, toRefs, watch } from "vue";
import { formatIotDateTime } from "~~/config/iot-time-format";
import BaseModal from "@/components/Modals/BaseModal.vue";
import type { ControlLogRow } from "@/types/control-ack";

const props = defineProps<{
  open: boolean;
  row: ControlLogRow | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { row } = toRefs(props);
const isDurationHelpOpen = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      isDurationHelpOpen.value = false;
    }
  },
);

function toMs(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function formatDate(value?: string | null) {
  return formatIotDateTime(value, { fallback: "-" });
}

function formatDeadline(value?: string | null) {
  if (!value) return "No deadline";
  return formatDate(value);
}

function formatMs(value?: number | null) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return "-";
  return `${Math.round(normalized)} ms`;
}

const queueToDispatchMs = computed(() => {
  const requested = toMs(row.value?.requested_at ?? null);
  const dispatched = toMs(row.value?.dispatched_at ?? null);
  if (requested === null || dispatched === null) return null;
  return dispatched - requested;
});

const dispatchToReceivedMs = computed(() => {
  const dispatched = toMs(row.value?.dispatched_at ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (dispatched === null || received === null) return null;
  return received - dispatched;
});

const endToEndMs = computed(() => {
  const requested = toMs(row.value?.requested_at ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (requested === null || received === null) return null;
  return received - requested;
});

const ackLatencyMs = computed(() => {
  const gatewayTimestamp = toMs(row.value?.timestamp ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (gatewayTimestamp === null || received === null) return null;
  return received - gatewayTimestamp;
});

const isMissedDeadline = computed(() => {
  const deadline = toMs(row.value?.response_deadline_at ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (deadline === null || received === null) return false;
  return received > deadline;
});
</script>
