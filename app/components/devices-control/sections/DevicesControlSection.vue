<template>
  <div class="flex flex-col gap-4 p-4">
    <SingleMetricChart
      class="w-full"
      :selected-metric-key="selectedMetricKey"
      :selected-timeframe="selectedTimeframe"
      @update:selected-metric-key="handleMetricChange"
    />
    <ControlWidgetBox :has-sse="false" />
    <DevicesControlContentSection :section="section" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import ControlWidgetBox from "@/components/devices-control/ControlWidgetBox.vue";
import DevicesControlContentSection from "@/components/devices-control/layouts/DevicesControlContentSection.vue";
import SingleMetricChart from "@/components/SingleMetricChart.vue";
import { useMetrics } from "@/composables/useMetrics";
import type { TimeframeKey } from "@/types/dashboard";
import type { Section } from "@/types/devices-control";

defineProps<{
  section: Section;
}>();

const { metrics } = useMetrics();
const selectedMetricKey = ref<string>("");
const selectedTimeframe = ref<TimeframeKey>("second");

function handleMetricChange(value: string) {
  selectedMetricKey.value = value;
}

watch(
  metrics,
  (value) => {
    if (!selectedMetricKey.value && value.length > 0) {
      selectedMetricKey.value = value[0]?.key ?? "";
    }
  },
  { immediate: true },
);
</script>
