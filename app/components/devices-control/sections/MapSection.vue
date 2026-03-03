<template>
  <section class="min-h-screen">
    <div class="mx-auto w-full">
      <div class="flex flex-col lg:flex-row lg:items-start">
        <div class="w-full lg:w-3/4 overflow-hidden border border-gray-200">
          <ClientOnly>
            <div class="relative h-[90vh] w-full">
              <div
                v-if="isLoadingMap"
                class="absolute inset-0 animate-pulse bg-gray-100"
              ></div>
              <div ref="mapEl" class="h-[90vh] w-full"></div>
              <div class="absolute right-3 top-3 z-[450] w-fit">
                <DataBoxCard
                  :is-loading="false"
                  :has-data="true"
                  :columns="1"
                  :padded="false"
                >
                  <template #default>
                    <tr>
                      <td class="px-2 py-2">
                        <div class="flex items-center justify-end gap-2">
                          <input
                            v-model="latInput"
                            type="number"
                            step="any"
                            min="-90"
                            max="90"
                            placeholder="Latitude"
                            class="h-8 w-28 rounded border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                          <input
                            v-model="lngInput"
                            type="number"
                            step="any"
                            min="-180"
                            max="180"
                            placeholder="Longitude"
                            class="h-8 w-28 rounded border border-gray-300 bg-white px-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                          />
                          <button
                            type="button"
                            class="inline-flex items-center rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                            @click="zoomToPinned"
                          >
                            Zoom to Pin
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                            @click="zoomToInput"
                          >
                            Zoom to Input
                          </button>
                          <button
                            type="button"
                            class="inline-flex items-center rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                            @click="resetMapView"
                          >
                            Reset
                          </button>
                        </div>
                      </td>
                    </tr>
                  </template>
                </DataBoxCard>
              </div>
            </div>
          </ClientOnly>
        </div>

        <DataBoxCard
          class="w-full lg:w-1/4 shrink-0 lg:self-start"
          :is-loading="isAreasLoading"
          :columns="2"
          :has-data="managedAreas.length > 0"
        >
          <template #header>
            <div class="flex items-center justify-between w-full">
              <h3 class="text-gray-700 text-xs font-semibold">Managed Areas</h3>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  class="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 rounded px-2 py-0.5 text-xs border border-gray-300"
                  :disabled="isAreasLoading"
                  @click="refreshAreas"
                >
                  <BootstrapIcon
                    name="arrow-clockwise"
                    class="w-3 h-3 mr-1"
                    :class="{ 'animate-spin': isAreasLoading }"
                  />
                  {{ isAreasLoading ? "Refreshing..." : "Refresh" }}
                </button>
              </div>
            </div>
          </template>

          <template #head>
            <tr class="bg-slate-50 border-b border-gray-200 text-xs text-gray-600">
              <th class="px-2 py-2 font-normal text-center">Name</th>
              <th class="px-2 py-2 font-normal text-center">Actions</th>
            </tr>
          </template>

          <template #default>
            <tr
              v-for="area in managedAreas"
              :key="area.id"
              class="hover:bg-gray-50 transition-colors text-xs border-b border-gray-100"
            >
              <td class="px-2 py-2 text-gray-700 text-center">
                {{ area.name || `Area ${area.id}` }}
              </td>
              <td class="px-2 py-2 text-center">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    class="w-8 h-8 inline-flex items-center justify-center rounded border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer"
                    @click="focusArea(area)"
                    title="Focus"
                    aria-label="Focus area"
                  >
                    <BootstrapIcon name="geo-alt" class="w-3 h-3" />
                  </button>
                </div>
              </td>
            </tr>
          </template>

          <template #empty> No managed areas yet. </template>

          <template #footer>
            <span>Showing {{ managedAreas.length }} entries.</span>
          </template>
        </DataBoxCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { Section } from "@/types/devices-control";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { onMounted, onBeforeUnmount, ref, nextTick, watch } from "vue";
import { message } from "ant-design-vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import DataBoxCard from "@/components/common/DataBoxCard.vue";

defineProps<{ section: Section }>();

const mapEl = ref<HTMLDivElement | null>(null);
const isLoadingMap = ref(true);
const latInput = ref<string>("");
const lngInput = ref<string>("");
const isAreasLoading = ref(false);
const managedAreas = ref<any[]>([]);
let mapInstance: import("leaflet").Map | null = null;
let drawnItems: import("leaflet").FeatureGroup | null = null;
let leaflet: typeof import("leaflet") | null = null;
let popupCounter = 0;
let hasLoadedAreas = false;
let pinnedMarker: import("leaflet").Marker | null = null;
const PIN_KEY = "iotcore.map.pinnedLocation";

const authStore = useAuthStore();

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


type ManagedAreaPayload = {
  name?: string | null;
  geom_type: "polygon" | "rectangle";
  geometry: Record<string, any>;
  bbox?: [number, number, number, number] | null;
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
  if (leaflet && layer instanceof leaflet.Rectangle) {
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
  if (!mapInstance || !leaflet) return;
  const popupId = `managed-area-menu-${popupCounter++}`;
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
  const popup = leaflet
    .popup({ closeButton: false, autoClose: true })
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
      mapInstance?.closePopup();
    });

    clearBtn?.addEventListener("click", async () => {
      await clearLayer(layer, isSaved);
      mapInstance?.closePopup();
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
    drawnItems?.removeLayer(layer);
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to delete area.";
    message.error(msg);
  }
};

const addManagedAreaLayer = (area: any) => {
  if (!leaflet || !mapInstance || !drawnItems) return;
  const geometry = area?.geometry;
  if (!geometry) return;

  const layer = leaflet.geoJSON(geometry, {
    style: savedStyle,
  });

  layer.eachLayer((child: any) => {
    child.__managedAreaId = area?.id;
    bindContextMenu(child, true);
  });

  layer.addTo(drawnItems);
};

const removeSavedLayers = () => {
  if (!drawnItems) return;
  const toRemove: any[] = [];
  drawnItems.eachLayer((layer: any) => {
    if (layer?.__managedAreaId) {
      toRemove.push(layer);
    }
  });
  toRemove.forEach((layer) => drawnItems?.removeLayer(layer));
};

const loadManagedAreas = async (force = false) => {
  try {
    if (hasLoadedAreas && !force) return;
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
    hasLoadedAreas = true;
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to load managed areas.";
    message.error(msg);
  } finally {
    isAreasLoading.value = false;
  }
};

const loadPinnedLocation = () => {
  if (!leaflet || !mapInstance) return;
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number"
    ) {
      return;
    }
    const latlng: [number, number] = [parsed.lat, parsed.lng];
    pinnedMarker?.remove();
    pinnedMarker = leaflet
      .marker(latlng)
      .addTo(mapInstance)
      .bindPopup("Pinned location");
    mapInstance.setView(latlng, parsed.zoom ?? 14, { animate: true });
  } catch {
    // ignore malformed storage
  }
};

const savePinnedLocation = (latlng: { lat: number; lng: number }) => {
  if (!leaflet || !mapInstance) return;
  const zoom = mapInstance.getZoom();
  localStorage.setItem(PIN_KEY, JSON.stringify({ ...latlng, zoom }));
  pinnedMarker?.remove();
  pinnedMarker = leaflet
    .marker([latlng.lat, latlng.lng])
    .addTo(mapInstance)
    .bindPopup("Pinned location");
  message.success("Pinned location saved.");
};

const zoomToPinned = () => {
  if (!leaflet || !mapInstance) return;
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (!raw) {
      message.warning("No pinned location found.");
      return;
    }
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed.lat !== "number" ||
      typeof parsed.lng !== "number"
    ) {
      message.warning("Pinned location is invalid.");
      return;
    }
    mapInstance.setView([parsed.lat, parsed.lng], parsed.zoom ?? 14, {
      animate: true,
    });
  } catch {
    message.warning("Pinned location is invalid.");
  }
};

const zoomToInput = () => {
  if (!leaflet || !mapInstance) return;
  if (!latInput.value.trim() || !lngInput.value.trim()) {
    message.warning("Latitude and longitude are required.");
    return;
  }
  const lat = Number(latInput.value);
  const lng = Number(lngInput.value);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    message.warning("Invalid latitude or longitude.");
    return;
  }
  if (lat < -90 || lat > 90) {
    message.warning("Latitude must be between -90 and 90.");
    return;
  }
  if (lng < -180 || lng > 180) {
    message.warning("Longitude must be between -180 and 180.");
    return;
  }
  mapInstance.setView([lat, lng], 15, { animate: true });
};

onMounted(async () => {
  if (!import.meta.client) return;
  await nextTick();
  if (!mapEl.value) return;

  const L = await import("leaflet");
  await import("leaflet-draw");
  leaflet = L;

  mapInstance = L.map(mapEl.value, {
    center: [10.7769, 106.7009],
    zoom: 13,
    zoomControl: true,
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(mapInstance);

  mapInstance?.setView([10.7769, 106.7009], 13);

  // Leaflet Draw
  drawnItems = new L.FeatureGroup();
  mapInstance.addLayer(drawnItems);
  const drawControl = new (L as any).Control.Draw({
    edit: {
      featureGroup: drawnItems,
    },
    draw: {
      polygon: true,
      rectangle: true,
      circle: false,
      circlemarker: false,
      polyline: false,
      marker: false,
    },
  });
  mapInstance.addControl(drawControl);

  mapInstance.on((L as any).Draw.Event.CREATED, (event: any) => {
    const layer = event.layer;
    if (!drawnItems) return;
    applyLayerStyle(layer, pendingStyle);
    drawnItems.addLayer(layer);
    bindContextMenu(layer, false);
  });

  mapInstance.on("contextmenu", (event: any) => {
    savePinnedLocation(event.latlng);
  });

  await loadManagedAreas();
  loadPinnedLocation();
  setTimeout(() => {
    isLoadingMap.value = false;
  }, 1000);
});

watch(
  () => authStore.authorizationHeader,
  async (token) => {
    if (!token) return;
    if (!mapInstance || !drawnItems) return;
    await loadManagedAreas();
  }
);

const refreshAreas = async () => {
  await loadManagedAreas(true);
};

const focusArea = (area: any) => {
  if (!mapInstance || !leaflet) return;
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
    const layer = leaflet.geoJSON(area.geometry);
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
    managedAreas.value = managedAreas.value.filter((item) => item.id !== area.id);
    if (drawnItems) {
      const toRemove: any[] = [];
      drawnItems.eachLayer((layer: any) => {
        if (layer?.__managedAreaId === area.id) {
          toRemove.push(layer);
        }
      });
      toRemove.forEach((layer) => drawnItems?.removeLayer(layer));
    }
    message.success("Area removed.");
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to delete area.";
    message.error(msg);
  }
};

const reloadMap = async () => {
  if (!mapInstance || !mapEl.value || !leaflet) return;
  try {
    const currentCenter = mapInstance.getCenter();
    const currentZoom = mapInstance.getZoom();
    mapInstance.remove();

    mapInstance = leaflet.map(mapEl.value, {
      center: [currentCenter.lat, currentCenter.lng],
      zoom: currentZoom,
      zoomControl: true,
    });

    leaflet
      .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      })
      .addTo(mapInstance);

    drawnItems = new leaflet.FeatureGroup();
    mapInstance.addLayer(drawnItems);
    const drawControl = new (leaflet as any).Control.Draw({
      edit: { featureGroup: drawnItems },
      draw: {
        polygon: true,
        rectangle: true,
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: false,
      },
    });
    mapInstance.addControl(drawControl);
    mapInstance.on((leaflet as any).Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      if (!drawnItems) return;
      applyLayerStyle(layer, pendingStyle);
      drawnItems.addLayer(layer);
      bindContextMenu(layer, false);
    });
    mapInstance.on("contextmenu", (event: any) => {
      savePinnedLocation(event.latlng);
    });

    hasLoadedAreas = false;
    await loadManagedAreas(true);
    loadPinnedLocation();
    message.success("Map reloaded.");
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to reload.";
    message.error(msg);
  }
};

const resetMapView = () => {
  if (!mapInstance) return;
  mapInstance.setView([10.7769, 106.7009], 13, { animate: true });
};

onBeforeUnmount(() => {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
  drawnItems = null;
  leaflet = null;
});
</script>
