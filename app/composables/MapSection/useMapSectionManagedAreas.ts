import type { Map as MapLibreMap } from "maplibre-gl";
import type MapboxDraw from "@mapbox/mapbox-gl-draw";
import type { Ref } from "vue";
import { watch } from "vue";
import { useAuthStore } from "~~/stores/auth";
import { useHandleMap } from "@/composables/Map/handleMap";

type MapHandleDeps = {
  mapRef: Ref<MapLibreMap | null>;
  drawRef: Ref<MapboxDraw | null>;
  maplibreRef: Ref<typeof import("maplibre-gl") | null>;
};

export const useMapSectionManagedAreas = ({
  mapRef,
  drawRef,
  maplibreRef,
}: MapHandleDeps) => {
  const authStore = useAuthStore();

  const {
    isAreasLoading,
    managedAreas,
    loadManagedAreas,
    refreshAreas,
    focusArea,
    registerDrawHandlers,
    closeContextMenu,
  } = useHandleMap({
    mapRef,
    drawRef,
    maplibreRef,
  });

  watch(
    () => authStore.authorizationHeader,
    async (token) => {
      if (!token) return;
      if (!mapRef.value || !drawRef.value) return;
      await loadManagedAreas();
    },
  );

  return {
    isAreasLoading,
    managedAreas,
    loadManagedAreas,
    refreshAreas,
    focusArea,
    registerDrawHandlers,
    closeContextMenu,
  };
};
