<template>
  <article class="bg-white border border-slate-200 rounded p-4">
    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div class="rounded border border-emerald-100 bg-emerald-50 p-3">
        <p class="text-[11px] uppercase tracking-wide text-emerald-700">Success Rate</p>
        <p class="mt-1 text-xl font-semibold text-emerald-700">{{ successRateText }}</p>
      </div>
      <div class="rounded border border-blue-100 bg-blue-50 p-3">
        <p class="text-[11px] uppercase tracking-wide text-blue-700">Avg ACK Latency</p>
        <p class="mt-1 text-xl font-semibold text-blue-700">{{ avgAckLatencyText }}</p>
      </div>
      <div class="rounded border border-violet-100 bg-violet-50 p-3">
        <p class="text-[11px] uppercase tracking-wide text-violet-700">Avg Exec Time</p>
        <p class="mt-1 text-xl font-semibold text-violet-700">{{ avgExecMsText }}</p>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, toRefs } from "vue";
import type { ControlAckBucket, ControlAckTotals, ControlLogRow } from "@/types/control-ack";

const props = defineProps<{
  totals: ControlAckTotals;
  buckets: ControlAckBucket[];
  rows: ControlLogRow[];
}>();

const { totals, buckets, rows } = toRefs(props);

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const successRate = computed(() => {
  const total = Number(totals.value.total || 0);
  const success = Number(totals.value.success || 0);
  if (total <= 0) return 0;
  return round2((success / total) * 100);
});

const successRateText = computed(() => `${successRate.value}%`);

const avgAckLatencyMs = computed(() => {
  const values = buckets.value
    .map((item) => (item.avg_latency_ms === null ? null : Number(item.avg_latency_ms)))
    .filter((value): value is number => Number.isFinite(value));
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return round2(sum / values.length);
});

const avgAckLatencyText = computed(() => {
  if (avgAckLatencyMs.value === null) return "-";
  return `${avgAckLatencyMs.value} ms`;
});

const avgExecMs = computed(() => {
  const values = rows.value
    .map((row) => Number(row.command_exec_ms))
    .filter((value) => Number.isFinite(value) && value >= 0);
  if (values.length === 0) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return round2(sum / values.length);
});

const avgExecMsText = computed(() => {
  if (avgExecMs.value === null) return "-";
  return `${avgExecMs.value} ms`;
});
</script>
