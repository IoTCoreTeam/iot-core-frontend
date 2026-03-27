<template>
  <div class="min-h-screen flex bg-slate-50">
    <DataCenterSidebar :sections="sections" v-model:activeTab="activeTab" />

    <section class="flex-1 flex flex-col">
      <main class="flex-1 bg-slate-50 overflow-y-auto">
        <component
          v-if="activeSectionComponent"
          :is="activeSectionComponent"
        />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import {
  BeakerIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  CpuChipIcon,
  CommandLineIcon,
} from "@heroicons/vue/24/outline";

import DataCenterSidebar from "@/components/data-center/layouts/DataCenterSidebar.vue";
import DataOverviewSection from "@/components/data-center/sections/DataOverviewSection.vue";
import DeviceDataSection from "@/components/data-center/sections/DeviceDataSection.vue";
import SensorDataSection from "@/components/data-center/sections/SensorDataSection.vue";
import ControlLogSection from "@/components/devices-control/sections/ControlLogSection.vue";
import ControlDataSection from "@/components/data-center/sections/ControlDataSection.vue";
import type { DataCenterSection } from "@/types/data-center";

const sections: DataCenterSection[] = [
  {
    id: "data-overview",
    label: "Overview",
    icon: ChartPieIcon,
  },
  {
    id: "device-data",
    label: "Device Data",
    icon: CpuChipIcon,
  },
  {
    id: "sensor-data",
    label: "Sensor Data",
    icon: BeakerIcon,
  },
  {
    id: "control-data",
    label: "Control Data",
    icon: CommandLineIcon,
  },
  {
    id: "control-log",
    label: "Control Log",
    icon: ClipboardDocumentCheckIcon,
  },
];

const activeTab = ref(sections[0]?.id ?? "data-overview");

const sectionComponentMap: Record<string, Component> = {
  "data-overview": DataOverviewSection,
  "device-data": DeviceDataSection,
  "sensor-data": SensorDataSection,
  "control-log": ControlLogSection,
  "control-data": ControlDataSection,
};

const activeSectionComponent = computed<Component | undefined>(
  () => sectionComponentMap[activeTab.value],
);
</script>
