<template>
  <section :class="sectionClass">
    <div class="mx-auto w-full pt-4">
      <div :class="layoutClass">
        <div :class="mapPaneClass">
          <DeviceMapCanvas ref="mapCanvasRef" :map-height="mapHeight" />
        </div>

        <div :class="sidePaneClass">
          <ActiveDevicesPanel
            :show-header="false"
            :show-view-all="false"
            :show-map-tab="true"
            :enable-device-sse="false"
            default-tab="map"
            :map-is-areas-loading="mapIsAreasLoading"
            :map-managed-areas="mapManagedAreas"
            :map-focus-area="handleFocusArea"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Section } from "@/types/devices-control";
import { computed, ref, isRef, type Ref } from "vue";
import ActiveDevicesPanel from "@/components/devices-control/ActiveDevicesPanel.vue";
import DeviceMapCanvas from "@/components/devices-control/maps/DeviceMapCanvas.vue";

const props = withDefaults(
  defineProps<{
    section: Section;
    sectionClass?: string;
    layoutClass?: string;
    mapPaneClass?: string;
    sidePaneClass?: string;
    mapHeight?: string;
  }>(),
  {
    sectionClass: "min-h-screen",
    layoutClass: "flex flex-col lg:flex-row lg:items-start gap-4",
    mapPaneClass: "w-full lg:w-3/4 overflow-hidden",
    sidePaneClass: "w-full lg:w-1/4 shrink-0 lg:self-start",
    mapHeight: "80vh",
  },
);

const { sectionClass, layoutClass, mapPaneClass, sidePaneClass, mapHeight } = props;

type MapCanvasExpose = {
  managedAreas: Ref<any[]>;
  isAreasLoading: Ref<boolean>;
  focusArea: (area: any) => void;
};

const mapCanvasRef = ref<MapCanvasExpose | null>(null);

const mapManagedAreas = computed(() => {
  const areas = mapCanvasRef.value?.managedAreas;
  if (isRef(areas)) return Array.isArray(areas.value) ? areas.value : [];
  return Array.isArray(areas) ? areas : [];
});

const mapIsAreasLoading = computed(() => {
  const loading = mapCanvasRef.value?.isAreasLoading;
  if (isRef(loading)) return Boolean(loading.value);
  return Boolean(loading);
});

function handleFocusArea(area: any) {
  mapCanvasRef.value?.focusArea?.(area);
}
</script>
