<template>
  <div class="min-h-screen flex bg-slate-50">
    <DevicesControlSidebar
      :sections="sections"
      v-model:activeTab="activeTab"
      :is-sidebar-collapsed="isSidebarCollapsed"
      @toggle-sidebar="toggleSidebar"
    />

    <section class="flex-1 flex flex-col">
      <main class="flex-1 bg-slate-50 overflow-y-auto">
        <component
          v-if="activeSectionComponent"
          :is="activeSectionComponent"
          :section="activeSection"
        />
      </main>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from "vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import {
  CpuChipIcon,
  MapIcon,
  Squares2X2Icon,
  RectangleStackIcon,
} from "@heroicons/vue/24/outline";

import DevicesControlSidebar from "@/components/devices-control/layouts/DevicesControlSidebar.vue";
import DeviceRegistration from "@/components/devices-control/sections/DeviceRegistrationSection.vue";
import MapSection from "@/components/devices-control/sections/MapSection.vue";
import ScenarioSection from "@/components/devices-control/sections/ScenarioSection.vue";
import DeviceControlSection from "@/components/devices-control/sections/DeviceControlSection.vue";
import type { Section } from "@/types/devices-control";

const controlModuleBase = (apiConfig.controlModule || "").replace(/\/$/, "");
const authStore = useAuthStore();

const ACTIVE_SECTION_STORAGE_KEY = "device-registration-active-section";

const sections: Section[] = [
  {
    id: "device-control",
    label: "Device Control",
    icon: CpuChipIcon,
  },
  {
    id: "device-registration",
    label: "Devices Registration",
    icon: RectangleStackIcon,
  },
  {
    id: "map",
    label: "Map Configuration",
    icon: MapIcon,
  },
  {
    id: "scenario",
    label: "Scenario",
    icon: Squares2X2Icon,
  },
];

const sectionComponentMap: Record<string, Component> = {
  "device-registration": DeviceRegistration,
  map: MapSection,
  "device-control": DeviceControlSection,
  scenario: ScenarioSection,
};
const defaultSection =
  sections.find((section) => section.id === "device-registration") ??
  sections[0];

if (!defaultSection) {
  throw new Error("No sections configured for device-registration view.");
}

const activeTab = ref(defaultSection.id);
const isSidebarCollapsed = ref(true);
const activeSection = computed<Section>(
  () =>
    sections.find((section) => section.id === activeTab.value) ?? defaultSection
);
const activeSectionComponent = computed<Component | undefined>(
  () =>
    sectionComponentMap[activeTab.value] ??
    sectionComponentMap[defaultSection.id]
);

function toggleSidebar() {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
}

watch(activeTab, (value) => {
  if (!import.meta.client) return;
  window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, value);
});

onMounted(() => {
  if (!import.meta.client) return;
  const storedSection = window.localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
  if (
    storedSection &&
    sections.some((section) => section.id === storedSection)
  ) {
    activeTab.value = storedSection;
  }

});

</script>
