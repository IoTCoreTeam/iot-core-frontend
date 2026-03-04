import type { FeatureGroup, Map as LeafletMap } from "leaflet";
import { ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";

type ManagedAreaPayload = {
  name?: string | null;
  geom_type: "polygon" | "rectangle";
  geometry: Record<string, any>;
  bbox?: [number, number, number, number] | null;
};

type MapHandleDeps = {
  mapRef: Ref<LeafletMap | null>;
  drawnItemsRef: Ref<FeatureGroup | null>;
  leafletRef: Ref<typeof import("leaflet") | null>;
};

export const useHandleMap = ({
  mapRef,
  drawnItemsRef,
  leafletRef,
}: MapHandleDeps) => {
  const authStore = useAuthStore();
  const isAreasLoading = ref(false);
  const managedAreas = ref<any[]>([]);
  const hasLoadedAreas = ref(false);
  const popupCounter = ref(0);

  const pendingStyle = {
    color: "#9ca3af",
    weight: 2,
    fillColor: "#d1d5db",
    fillOpacity: 0.35,
  };

  const savedStyle = {
    color: "#3b82f6",
    weight: 2,
    fillColor: "#60a5fa",
    fillOpacity: 0.25,
  };

  const getAuthHeaders = () => {
    const authorization = authStore.authorizationHeader;
    if (!authorization) {
      throw new Error("Missing access token. Please sign in again.");
    }
    return {
      Authorization: authorization,
      "Content-Type": "application/json",
    };
  };

  const applyLayerStyle = (layer: any, style: Record<string, any>) => {
    if (layer?.setStyle) {
      layer.setStyle(style);
    }
  };

  const getLayerBounds = (layer: any) => {
    if (!layer?.getBounds) return null;
    const bounds = layer.getBounds();
    if (!bounds) return null;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    return [sw.lng, sw.lat, ne.lng, ne.lat] as [number, number, number, number];
  };

  const resolveGeomType = (layer: any): ManagedAreaPayload["geom_type"] => {
    const L = leafletRef.value;
    if (L && layer instanceof L.Rectangle) {
      return "rectangle";
    }
    return "polygon";
  };

  const buildPayload = (layer: any, name?: string): ManagedAreaPayload => {
    const geojson = layer.toGeoJSON();
    return {
      name: name?.trim() || undefined,
      geom_type: resolveGeomType(layer),
      geometry: geojson.geometry ?? geojson,
      bbox: getLayerBounds(layer),
    };
  };

  const bindContextMenu = (layer: any, isSaved: boolean) => {
    layer.off?.("contextmenu");
    layer.on?.("contextmenu", (event: any) => {
      showContextMenu(layer, event?.latlng, isSaved);
    });
  };

  const showContextMenu = (layer: any, latlng: any, isSaved: boolean) => {
    const mapInstance = mapRef.value;
    const L = leafletRef.value;
    if (!mapInstance || !L) return;
    const popupId = `managed-area-menu-${popupCounter.value++}`;
    const content = isSaved
      ? `
    <div id="${popupId}" class="flex flex-col gap-1 text-xs">
      <button data-action="clear" class="px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700">Delete</button>
    </div>
  `
      : `
    <div id="${popupId}" class="flex flex-col gap-2 text-xs">
      <input data-field="name" placeholder="Area name" class="w-40 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200" />
      <div class="flex items-center gap-2">
        <button data-action="save" class="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Save</button>
        <button data-action="clear" class="px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200">Clear</button>
      </div>
    </div>
  `;
    const popup = L.popup({ closeButton: false, autoClose: true })
      .setLatLng(latlng)
      .setContent(content);

    popup.openOn(mapInstance);

    setTimeout(() => {
      const root = document.getElementById(popupId);
      if (!root) return;
      const saveBtn = root.querySelector('[data-action="save"]');
      const clearBtn = root.querySelector('[data-action="clear"]');

      saveBtn?.addEventListener("click", async () => {
        if (isSaved) {
          message.info("Area already saved.");
          return;
        }
        const nameInput = root.querySelector(
          '[data-field="name"]'
        ) as HTMLInputElement | null;
        const name = nameInput?.value?.trim() ?? "";
        if (!name) {
          message.warning("Name is required.");
          return;
        }
        await saveLayer(layer, name);
        mapInstance.closePopup();
      });

      clearBtn?.addEventListener("click", async () => {
        await clearLayer(layer, isSaved);
        mapInstance.closePopup();
      });
    }, 0);
  };

  const saveLayer = async (layer: any, name?: string) => {
    try {
      const payload = buildPayload(layer, name);
      const headers = getAuthHeaders();
      const res = await fetch(`${apiConfig.auth}/managed-areas`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message ?? "Failed to save area.");
      }
      layer.__managedAreaId = data?.data?.id;
      if (data?.data) {
        managedAreas.value = [data.data, ...managedAreas.value];
      }
      applyLayerStyle(layer, savedStyle);
      bindContextMenu(layer, true);
      message.success("Area saved.");
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to save area.";
      message.error(msg);
    }
  };

  const clearLayer = async (layer: any, isSaved: boolean) => {
    try {
      if (isSaved && layer.__managedAreaId) {
        const headers = getAuthHeaders();
        const res = await fetch(
          `${apiConfig.auth}/managed-areas/${layer.__managedAreaId}`,
          {
            method: "DELETE",
            headers,
          }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data?.success === false) {
          throw new Error(data?.message ?? "Failed to delete area.");
        }
        managedAreas.value = managedAreas.value.filter(
          (area) => area.id !== layer.__managedAreaId
        );
        message.success("Area removed.");
      }
      drawnItemsRef.value?.removeLayer(layer);
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to delete area.";
      message.error(msg);
    }
  };

  const addManagedAreaLayer = (area: any) => {
    const L = leafletRef.value;
    const mapInstance = mapRef.value;
    const drawnItems = drawnItemsRef.value;
    if (!L || !mapInstance || !drawnItems) return;
    const geometry = area?.geometry;
    if (!geometry) return;

    const layer = L.geoJSON(geometry, {
      style: savedStyle,
    });

    layer.eachLayer((child: any) => {
      child.__managedAreaId = area?.id;
      bindContextMenu(child, true);
    });

    layer.addTo(drawnItems);
  };

  const removeSavedLayers = () => {
    const drawnItems = drawnItemsRef.value;
    if (!drawnItems) return;
    const toRemove: any[] = [];
    drawnItems.eachLayer((layer: any) => {
      if (layer?.__managedAreaId) {
        toRemove.push(layer);
      }
    });
    toRemove.forEach((layer) => drawnItems.removeLayer(layer));
  };

  const loadManagedAreas = async (force = false) => {
    try {
      if (hasLoadedAreas.value && !force) return;
      if (!authStore.authorizationHeader) return;
      isAreasLoading.value = true;
      const headers = getAuthHeaders();
      const res = await fetch(`${apiConfig.auth}/managed-areas?per_page=200`, {
        method: "GET",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message ?? "Failed to load managed areas.");
      }
      const items = Array.isArray(data?.data?.data)
        ? data.data.data
        : Array.isArray(data?.data)
          ? data.data
          : [];
      managedAreas.value = items;
      if (force) {
        removeSavedLayers();
      }
      items.forEach(addManagedAreaLayer);
      hasLoadedAreas.value = true;
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to load managed areas.";
      message.error(msg);
    } finally {
      isAreasLoading.value = false;
    }
  };

  const refreshAreas = async () => {
    await loadManagedAreas(true);
  };

  const focusArea = (area: any) => {
    const mapInstance = mapRef.value;
    const L = leafletRef.value;
    if (!mapInstance || !L) return;
    if (Array.isArray(area?.bbox) && area.bbox.length === 4) {
      const [minLng, minLat, maxLng, maxLat] = area.bbox;
      mapInstance.fitBounds(
        [
          [minLat, minLng],
          [maxLat, maxLng],
        ],
        { padding: [20, 20] }
      );
      return;
    }
    if (area?.geometry) {
      const layer = L.geoJSON(area.geometry);
      mapInstance.fitBounds(layer.getBounds(), { padding: [20, 20] });
    }
  };

  const deleteArea = async (area: any) => {
    if (!area?.id) return;
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${apiConfig.auth}/managed-areas/${area.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message ?? "Failed to delete area.");
      }
      managedAreas.value = managedAreas.value.filter(
        (item) => item.id !== area.id
      );
      const drawnItems = drawnItemsRef.value;
      if (drawnItems) {
        const toRemove: any[] = [];
        drawnItems.eachLayer((layer: any) => {
          if (layer?.__managedAreaId === area.id) {
            toRemove.push(layer);
          }
        });
        toRemove.forEach((layer) => drawnItems.removeLayer(layer));
      }
      message.success("Area removed.");
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to delete area.";
      message.error(msg);
    }
  };

  return {
    isAreasLoading,
    managedAreas,
    pendingStyle,
    savedStyle,
    applyLayerStyle,
    bindContextMenu,
    loadManagedAreas,
    refreshAreas,
    focusArea,
    deleteArea,
    removeSavedLayers,
    addManagedAreaLayer,
  };
};
