<template>
  <div
    class="bg-white border border-slate-200 rounded p-2 flex flex-col min-h-0 h-full"
    :style="mapHeightStyle"
  >
    <ClientOnly>
      <div class="relative w-full h-full min-h-0 rounded">
      <div
        v-if="showControls"
        class="absolute left-3 top-3 z-10 flex items-center gap-2"
      >
        <button
          type="button"
          class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
          @click="startPolygonDraw"
        >
          Draw
        </button>
        <button
          type="button"
          class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
          @click="exitDrawMode"
        >
          View
        </button>
        <button
          type="button"
          class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 shadow-sm hover:bg-gray-50"
          @click="handleRefresh"
        >
          Refresh
        </button>
      </div>
        <div
          v-if="isLoadingMap"
          class="absolute inset-0 z-0 animate-pulse bg-gray-100"
        ></div>
        <div ref="mapEl" class="w-full h-full z-0"></div>
      </div>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { DeviceRow } from "@/types/devices-control";
import "maplibre-gl/dist/maplibre-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { computed, onMounted, onBeforeUnmount, ref, nextTick, watch, shallowRef, createApp, defineComponent, h } from "vue";
import { message } from "ant-design-vue";
import { DEFAULT_CENTER, DEFAULT_ZOOM } from "@/composables/Map/MapTool";
import { useMapSectionActiveDevices } from "@/composables/MapSection/useMapSectionActiveDevices";
import { useMapSectionManagedAreas } from "@/composables/MapSection/useMapSectionManagedAreas";
import type {
  Map as MapLibreMap,
  Marker,
  GeoJSONSource,
  StyleSpecification,
  IControl,
} from "maplibre-gl";
import type MapboxDraw from "@mapbox/mapbox-gl-draw";

const props = withDefaults(
  defineProps<{
    mapHeight?: string;
    showControls?: boolean;
  }>(),
  {
    mapHeight: "80vh",
    showControls: true,
  },
);

const mapHeightStyle = computed(() => ({
  height: props.mapHeight,
  minHeight: props.mapHeight,
}));

const mapEl = ref<HTMLDivElement | null>(null);
const isLoadingMap = ref(true);
const mapRef = shallowRef<MapLibreMap | null>(null);
const drawRef = shallowRef<MapboxDraw | null>(null);
const maplibreRef = shallowRef<typeof import("maplibre-gl") | null>(null);
const isMapLoaded = ref(false);
const nodeMarkers = new Map<string, Marker>();
const nodePopups = new Map<string, { cleanup: () => void }>();
const connectionSourceId = "node-connections";
const connectionLayerId = "node-connections-line";
const routeSourceId = "nearest-route";
const routeLayerId = "nearest-route-line";
const { nodeRows, clearNodeCache } = useMapSectionActiveDevices();

const {
  isAreasLoading,
  managedAreas,
  loadManagedAreas,
  focusArea,
  registerDrawHandlers,
  closeContextMenu,
} = useMapSectionManagedAreas({
  mapRef,
  drawRef,
  maplibreRef,
});

const clearAllDraw = () => {
  const draw = drawRef.value;
  if (!draw) return;
  draw.deleteAll();
  draw.changeMode("static");
};

const routePathIds = ref<string[]>([]);

function startPolygonDraw() {
  const draw = drawRef.value;
  if (!draw) return;
  draw.changeMode("draw_polygon");
}

function exitDrawMode() {
  const draw = drawRef.value;
  if (!draw) return;
  draw.changeMode("static");
}

const buildOsmStyle = (): StyleSpecification => ({
  version: 8 as const,
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "&copy; OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
});

const buildDrawModes = (MapboxDrawCtor: typeof MapboxDraw) => ({
  ...MapboxDrawCtor.modes,
  static: {
    ...MapboxDrawCtor.modes.simple_select,
    onDrag() {
      return;
    },
    onMouseMove() {
      return;
    },
    onTouchMove() {
      return;
    },
    onClick() {
      return;
    },
  },
});

function resolveNodeLatLng(row: DeviceRow): { lat: number; lng: number } | null {
  const lat = typeof row.lat === "number" ? row.lat : null;
  const lng = typeof row.lng === "number" ? row.lng : null;
  if (lat === null || lng === null) {
    return null;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat, lng };
}

function isOnlineRow(row: DeviceRow) {
  return (row.status ?? "").toLowerCase() === "online";
}

function ensureConnectionLineLayer(mapInstance: MapLibreMap) {
  if (mapInstance.getSource(connectionSourceId)) return;
  mapInstance.addSource(connectionSourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });
  mapInstance.addLayer({
    id: connectionLayerId,
    type: "line",
    source: connectionSourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#3B82F6",
      "line-width": 2,
      "line-opacity": 0.6,
      "line-dasharray": [2, 2],
    },
  });
}

function ensureRouteLineLayer(mapInstance: MapLibreMap) {
  if (mapInstance.getSource(routeSourceId)) return;
  mapInstance.addSource(routeSourceId, {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features: [],
    },
  });
  mapInstance.addLayer({
    id: routeLayerId,
    type: "line",
    source: routeSourceId,
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": "#ef4444",
      "line-width": 4,
      "line-opacity": 0.9,
    },
  });
}

function zoomToNode(row: DeviceRow) {
  const coords = resolveNodeLatLng(row);
  if (!coords || !mapRef.value) {
    message.warning("Node location is unavailable.");
    return;
  }
  closeContextMenu();
  clearAllDraw();
  mapRef.value.flyTo({ center: [coords.lng, coords.lat], zoom: 18 });
}

function createNodePopupContent(row: DeviceRow) {
  const container = document.createElement("div");
  container.className = "text-xs text-gray-700";

  const PopupContent = defineComponent({
    name: "NodeAreaPopup",
    setup() {
      return () =>
        h("div", { class: "space-y-1" }, [
          h("div", { class: "font-semibold text-gray-800" }, row.name ?? row.id ?? "Node"),
          h("div", { class: "text-gray-500" }, `${row.id} - ${row.status ?? "unknown"}`),
          h("div", { class: "text-gray-500" }, `${row.lat?.toFixed?.(6) ?? "N/A"}, ${row.lng?.toFixed?.(6) ?? "N/A"}`),
        ]);
    },
  });

  const app = createApp(PopupContent);
  app.mount(container);

  return {
    container,
    cleanup: () => app.unmount(),
  };
}

function getNodeMarkerColor(row: DeviceRow) {
  if (row.registered === false) return "#ef4444";
  if (row.registered === true && row.inside_map === false) return "#eab308";
  if (row.registered === true && row.inside_map === true) return "#22c55e";
  return "#ef4444";
}

function createNodeMarkerElement(color: string) {
  const el = document.createElement("div");
  el.style.width = "14px";
  el.style.height = "14px";
  el.style.borderRadius = "9999px";
  el.style.backgroundColor = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxShadow = "0 0 0 2px rgba(15, 23, 42, 0.18)";
  el.dataset.color = color;
  return el;
}

function syncNodeMarkers() {
  const mapInstance = mapRef.value;
  const maplibre = maplibreRef.value;
  if (!mapInstance || !maplibre) return;

  const nextIds = new Set<string>();

  nodeRows.value.forEach((row) => {
    if (!isOnlineRow(row)) return;
    const coords = resolveNodeLatLng(row);
    if (!coords) return;
    nextIds.add(row.id);

    const desiredColor = getNodeMarkerColor(row);
    const existing = nodeMarkers.get(row.id);
    if (existing) {
      const existingColor = existing.getElement()?.dataset?.color;
      if (existingColor !== desiredColor) {
        existing.remove();
        nodeMarkers.delete(row.id);
        const popup = nodePopups.get(row.id);
        if (popup) {
          popup.cleanup();
          nodePopups.delete(row.id);
        }
      } else {
        existing.setLngLat([coords.lng, coords.lat]);
        const popupContent = createNodePopupContent(row);
        existing.getPopup()?.setDOMContent(popupContent.container);
        const previous = nodePopups.get(row.id);
        if (previous) {
          previous.cleanup();
        }
        nodePopups.set(row.id, { cleanup: popupContent.cleanup });
        return;
      }
    }

    const popupContent = createNodePopupContent(row);
    const popup = new maplibre.Popup({ offset: 12 }).setDOMContent(
      popupContent.container
    );
    const marker = new maplibre.Marker({
      element: createNodeMarkerElement(desiredColor),
      anchor: "center",
    })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(popup)
      .addTo(mapInstance);
    nodePopups.set(row.id, { cleanup: popupContent.cleanup });
    nodeMarkers.set(row.id, marker);
  });

  nodeMarkers.forEach((marker, id) => {
    if (nextIds.has(id)) return;
    marker.remove();
    nodeMarkers.delete(id);
    const popup = nodePopups.get(id);
    if (popup) {
      popup.cleanup();
      nodePopups.delete(id);
    }
  });
}

function syncConnectionLines() {
  const mapInstance = mapRef.value;
  if (!mapInstance || !isMapLoaded.value) return;
  ensureConnectionLineLayer(mapInstance);
  const source = mapInstance.getSource(
    connectionSourceId
  ) as GeoJSONSource | null;
  if (!source) return;

  const nodeById = new Map<string, DeviceRow>();
  nodeRows.value.forEach((row) => {
    if (!isOnlineRow(row)) return;
    if (row?.id) {
      nodeById.set(row.id, row);
    }
  });

  const features: any[] = [];

  nodeRows.value.forEach((row) => {
    if (!isOnlineRow(row)) return;
    const sourceCoords = resolveNodeLatLng(row);
    if (!sourceCoords) return;
    const connectedNodes = Array.isArray(row.connectedNodes) ? row.connectedNodes : [];
    connectedNodes.forEach((targetId) => {
      if (!targetId || targetId === row.id) return;
      const target = nodeById.get(targetId);
      if (!target) return;
      const targetCoords = resolveNodeLatLng(target);
      if (!targetCoords) return;
      const key = row.id < targetId ? `${row.id}--${targetId}` : `${targetId}--${row.id}`;
      if (features.some((feature) => feature.properties?.key === key)) return;
      features.push({
        type: "Feature",
        properties: { key },
        geometry: {
          type: "LineString",
          coordinates: [
            [sourceCoords.lng, sourceCoords.lat],
            [targetCoords.lng, targetCoords.lat],
          ],
        },
      });
    });
  });

  source.setData({
    type: "FeatureCollection",
    features,
  });
}

function syncRoutePath() {
  const mapInstance = mapRef.value;
  if (!mapInstance || !isMapLoaded.value) return;
  ensureRouteLineLayer(mapInstance);
  const source = mapInstance.getSource(routeSourceId) as GeoJSONSource | null;
  if (!source) return;

  if (!routePathIds.value.length) {
    source.setData({
      type: "FeatureCollection",
      features: [],
    });
    return;
  }

  const nodeById = new Map<string, DeviceRow>();
  nodeRows.value.forEach((row) => {
    if (!isOnlineRow(row)) return;
    if (row?.id) {
      nodeById.set(row.id, row);
    }
  });

  const coordinates: [number, number][] = [];
  routePathIds.value.forEach((nodeId) => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const coords = resolveNodeLatLng(node);
    if (!coords) return;
    coordinates.push([coords.lng, coords.lat]);
  });

  if (coordinates.length < 2) {
    source.setData({
      type: "FeatureCollection",
      features: [],
    });
    return;
  }

  source.setData({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates,
        },
      },
    ],
  });
}

onMounted(async () => {
  if (!import.meta.client) return;
  await nextTick();
  if (!mapEl.value) return;
  const maplibre = await import("maplibre-gl");
  const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;
  maplibreRef.value = maplibre;

  const mapInstance = new maplibre.Map({
    container: mapEl.value,
    style: buildOsmStyle(),
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    attributionControl: { compact: true },
  });

  mapRef.value = mapInstance;

  mapInstance.on("load", async () => {
    isMapLoaded.value = true;
    ensureConnectionLineLayer(mapInstance);

    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {},
      modes: buildDrawModes(MapboxDraw),
    });
    mapInstance.addControl(draw as unknown as IControl, "top-left");
    drawRef.value = draw;
    registerDrawHandlers();
    draw.changeMode("static");

    await loadManagedAreas();
    syncNodeMarkers();
    syncConnectionLines();
    syncRoutePath();
    setTimeout(() => {
      isLoadingMap.value = false;
    }, 300);
  });
});

watch(
  nodeRows,
  () => {
    if (!isMapLoaded.value) return;
    syncNodeMarkers();
    syncConnectionLines();
    syncRoutePath();
  },
  { deep: true },
);

watch(
  managedAreas,
  () => {
    if (!isMapLoaded.value) return;
    syncNodeMarkers();
  },
  { deep: true },
);

watch(
  routePathIds,
  () => {
    if (!isMapLoaded.value) return;
    syncRoutePath();
  },
  { deep: true },
);

const reloadMap = async (options?: { silent?: boolean }) => {
  clearNodeCache();
  const mapInstance = mapRef.value;
  const mapElement = mapEl.value;
  if (!mapElement) return;
  try {
    isLoadingMap.value = true;
    const maplibre = maplibreRef.value ?? (await import("maplibre-gl"));
    const MapboxDraw = (await import("@mapbox/mapbox-gl-draw")).default;
    maplibreRef.value = maplibre;

    const currentCenter = mapInstance?.getCenter();
    const currentZoom = mapInstance?.getZoom();
    mapInstance?.remove();
    nodeMarkers.forEach((marker) => marker.remove());
    nodeMarkers.clear();
    drawRef.value = null;
    isMapLoaded.value = false;

    const newMap = new maplibre.Map({
      container: mapElement,
      style: buildOsmStyle(),
      center: currentCenter
        ? [currentCenter.lng, currentCenter.lat]
        : DEFAULT_CENTER,
      zoom: currentZoom ?? DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.value = newMap;

    newMap.on("load", async () => {
      isMapLoaded.value = true;
      ensureConnectionLineLayer(newMap);
      const draw = new MapboxDraw({
        displayControlsDefault: false,
        controls: {},
        modes: buildDrawModes(MapboxDraw),
      });
      newMap.addControl(draw as unknown as IControl, "top-left");
      drawRef.value = draw;
      registerDrawHandlers();
      draw.changeMode("static");
      await loadManagedAreas(true);
      syncNodeMarkers();
      syncConnectionLines();
      syncRoutePath();
      setTimeout(() => {
        isLoadingMap.value = false;
      }, 300);
    });
    if (!options?.silent) {
      message.success("Map reloaded.");
    }
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to reload.";
    message.error(msg);
    isLoadingMap.value = false;
  }
};

const handleRefresh = () => {
  clearNodeCache();
  reloadMap();
};

onBeforeUnmount(() => {
  if (mapRef.value) {
    mapRef.value.remove();
    mapRef.value = null;
  }
  nodeMarkers.forEach((marker) => marker.remove());
  nodeMarkers.clear();
  nodePopups.forEach((popup) => popup.cleanup());
  nodePopups.clear();
  drawRef.value = null;
  maplibreRef.value = null;
});

defineExpose({
  mapRef,
  isAreasLoading,
  managedAreas,
  focusArea,
  zoomToNode,
  reloadMap,
});
</script>
