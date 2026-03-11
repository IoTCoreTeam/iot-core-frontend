import type { Map as MapLibreMap, LngLatLike } from "maplibre-gl";
import type MapboxDraw from "@mapbox/mapbox-gl-draw";
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
  mapRef: Ref<MapLibreMap | null>;
  drawRef: Ref<MapboxDraw | null>;
  maplibreRef: Ref<typeof import("maplibre-gl") | null>;
};

export const useHandleMap = ({
  mapRef,
  drawRef,
  maplibreRef,
}: MapHandleDeps) => {
  const authStore = useAuthStore();
  const isAreasLoading = ref(false);
  const managedAreas = ref<any[]>([]);
  const hasLoadedAreas = ref(false);
  const popupCounter = ref(0);
  const popupRef = ref<any | null>(null);
  const hasRegisteredHandlers = ref(false);

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

  const collectCoords = (coords: any, out: [number, number][]) => {
    if (!coords) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      out.push([coords[0], coords[1]]);
      return;
    }
    if (Array.isArray(coords)) {
      coords.forEach((entry) => collectCoords(entry, out));
    }
  };

  const getGeometryBbox = (geometry: any) => {
    if (!geometry?.coordinates) return null;
    const points: [number, number][] = [];
    collectCoords(geometry.coordinates, points);
    const first = points[0];
    if (!first) return null;
    let minLng = first[0];
    let minLat = first[1];
    let maxLng = first[0];
    let maxLat = first[1];
    points.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    });
    return [minLng, minLat, maxLng, maxLat] as [number, number, number, number];
  };

  const resolveGeomType = (feature: any): ManagedAreaPayload["geom_type"] => {
    const hint = feature?.properties?.geom_type;
    if (hint === "rectangle") return "rectangle";
    return "polygon";
  };

  const buildPayload = (feature: any, name?: string): ManagedAreaPayload => {
    const geometry = feature?.geometry;
    return {
      name: name?.trim() || undefined,
      geom_type: resolveGeomType(feature),
      geometry,
      bbox: getGeometryBbox(geometry),
    };
  };

  const showContextMenu = async (
    feature: any,
    lngLat: LngLatLike,
    isSaved: boolean,
  ) => {
    const mapInstance = mapRef.value;
    const maplibre = maplibreRef.value;
    if (!mapInstance || !maplibre) return;
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
    popupRef.value?.remove();
    const popup = new maplibre.Popup({ closeButton: false, closeOnClick: true })
      .setLngLat(lngLat)
      .setHTML(content)
      .addTo(mapInstance);
    popupRef.value = popup;

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
        await saveFeature(feature, name);
        popup.remove();
      });

      clearBtn?.addEventListener("click", async () => {
        await clearFeature(feature, isSaved);
        popup.remove();
      });
    }, 0);
  };

  const closeContextMenu = () => {
    popupRef.value?.remove();
    popupRef.value = null;
  };

  const saveFeature = async (feature: any, name?: string) => {
    const draw = drawRef.value;
    if (!draw) return;
    try {
      const payload = buildPayload(feature, name);
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
      const id = data?.data?.id;
      const featureId = feature?.id;
      if (featureId) {
        draw.setFeatureProperty(featureId, "managedAreaId", id);
        draw.setFeatureProperty(featureId, "saved", true);
        if (name) draw.setFeatureProperty(featureId, "name", name);
      }
      if (data?.data) {
        managedAreas.value = [data.data, ...managedAreas.value];
      }
      message.success("Area saved.");
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to save area.";
      message.error(msg);
    }
  };

  const clearFeature = async (feature: any, isSaved: boolean) => {
    const draw = drawRef.value;
    if (!draw) return;
    try {
      const managedAreaId = feature?.properties?.managedAreaId;
      if (isSaved && managedAreaId) {
        const headers = getAuthHeaders();
        const res = await fetch(
          `${apiConfig.auth}/managed-areas/${managedAreaId}`,
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
          (area) => area.id !== managedAreaId
        );
        message.success("Area removed.");
      }
      if (feature?.id) {
        draw.delete(feature.id);
      }
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to delete area.";
      message.error(msg);
    }
  };

  const addManagedAreaLayer = (area: any) => {
    const draw = drawRef.value;
    if (!draw) return;
    const geometry = area?.geometry;
    if (!geometry) return;
    draw.add({
      type: "Feature",
      id: `managed-${area?.id}`,
      properties: {
        managedAreaId: area?.id,
        saved: true,
        name: area?.name,
        geom_type: area?.geom_type ?? "polygon",
      },
      geometry,
    } as any);
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
      if (force && drawRef.value) {
        const draw = drawRef.value;
        const all = draw.getAll();
        all.features.forEach((feature: any) => {
          if (feature?.properties?.managedAreaId) {
            draw.delete(feature.id);
          }
        });
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
    if (!mapInstance) return;
    if (Array.isArray(area?.bbox) && area.bbox.length === 4) {
      const [minLng, minLat, maxLng, maxLat] = area.bbox;
      mapInstance.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 20 }
      );
      return;
    }
    const bbox = getGeometryBbox(area?.geometry);
    if (!bbox) return;
    mapInstance.fitBounds(
      [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]],
      ],
      { padding: 20 }
    );
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
      const draw = drawRef.value;
      if (draw) {
        const all = draw.getAll();
        all.features.forEach((feature: any) => {
          if (feature?.properties?.managedAreaId === area.id) {
            draw.delete(feature.id);
          }
        });
      }
      message.success("Area removed.");
    } catch (error) {
      const msg = (error as Error)?.message ?? "Failed to delete area.";
      message.error(msg);
    }
  };

  const registerDrawHandlers = () => {
    const mapInstance = mapRef.value;
    const draw = drawRef.value;
    if (!mapInstance || !draw) return;
    if (hasRegisteredHandlers.value) return;
    hasRegisteredHandlers.value = true;

    mapInstance.on("draw.create", (event: any) => {
      const feature = event?.features?.[0];
      if (!feature) return;
      if (feature?.id) {
        draw.setFeatureProperty(feature.id, "saved", false);
        draw.setFeatureProperty(feature.id, "geom_type", "polygon");
      }
      if (event?.lngLat) {
        showContextMenu(feature, event.lngLat, false);
      }
    });

    mapInstance.on("contextmenu", (event: any) => {
      const ids = (draw as any).getFeatureIdsAt?.(event.point) as
        | string[]
        | undefined;
      if (!ids || ids.length === 0) return;
      const firstId = ids[0];
      if (!firstId) return;
      const feature = draw.get(firstId);
      if (!feature) return;
      const isSaved = Boolean(feature?.properties?.managedAreaId);
      showContextMenu(feature, event.lngLat, isSaved);
    });
  };

  return {
    isAreasLoading,
    managedAreas,
    loadManagedAreas,
    refreshAreas,
    focusArea,
    deleteArea,
    addManagedAreaLayer,
    registerDrawHandlers,
    closeContextMenu,
  };
};
