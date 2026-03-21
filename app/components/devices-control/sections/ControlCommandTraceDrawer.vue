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
          <p class="mb-2 font-semibold text-slate-700">Timeline</p>
          <ol class="space-y-2">
            <li class="rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="font-medium text-slate-700">1. Requested (backend)</p>
              <p class="text-slate-500">{{ formatDate(row.requested_at) }}</p>
            </li>
            <li class="rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="font-medium text-slate-700">2. Status Event Timestamp (gateway)</p>
              <p class="text-slate-500">{{ formatDate(row.timestamp) }}</p>
            </li>
            <li class="rounded border border-slate-100 bg-slate-50 px-3 py-2">
              <p class="font-medium text-slate-700">3. Received (server)</p>
              <p class="text-slate-500">{{ formatDate(row.received_at) }}</p>
            </li>
          </ol>
        </section>

        <section class="rounded border border-slate-200 p-3">
          <p class="mb-2 font-semibold text-slate-700">Durations</p>
          <div class="grid grid-cols-1 gap-2">
            <p><span class="text-slate-500">Queue + Transport (requested -> timestamp):</span> {{ formatMs(queueToGatewayMs) }}</p>
            <p><span class="text-slate-500">Ingest (timestamp -> received):</span> {{ formatMs(gatewayToServerMs) }}</p>
            <p><span class="text-slate-500">End-to-end (requested -> received):</span> {{ formatMs(endToEndMs) }}</p>
            <p><span class="text-slate-500">Controller exec:</span> {{ formatMs(row.command_exec_ms) }}</p>
          </div>
        </section>

        <section class="rounded border border-slate-200 p-3">
          <p class="mb-2 font-semibold text-slate-700">Deadline</p>
          <p><span class="text-slate-500">response_deadline_at:</span> {{ formatDate(row.response_deadline_at) }}</p>
          <p><span class="text-slate-500">Missed deadline:</span> {{ isMissedDeadline ? "Yes" : "No" }}</p>
        </section>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import { formatIotDateTime } from "~~/config/iot-time-format";
import type { ControlLogRow } from "@/types/control-ack";

const props = defineProps<{
  open: boolean;
  row: ControlLogRow | null;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { row } = toRefs(props);

function toMs(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getTime();
}

function formatDate(value?: string | null) {
  return formatIotDateTime(value, { fallback: "-" });
}

function formatMs(value?: number | null) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) return "-";
  return `${Math.round(normalized)} ms`;
}

const queueToGatewayMs = computed(() => {
  const requested = toMs(row.value?.requested_at ?? null);
  const gateway = toMs(row.value?.timestamp ?? null);
  if (requested === null || gateway === null) return null;
  return gateway - requested;
});

const gatewayToServerMs = computed(() => {
  const gateway = toMs(row.value?.timestamp ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (gateway === null || received === null) return null;
  return received - gateway;
});

const endToEndMs = computed(() => {
  const requested = toMs(row.value?.requested_at ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (requested === null || received === null) return null;
  return received - requested;
});

const isMissedDeadline = computed(() => {
  const deadline = toMs(row.value?.response_deadline_at ?? null);
  const received = toMs(row.value?.received_at ?? null);
  if (deadline === null || received === null) return false;
  return received > deadline;
});
</script>
