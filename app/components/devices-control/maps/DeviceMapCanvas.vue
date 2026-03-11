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
import { computed, onMounted, onBeforeUnmount, ref, nextTick, watch, shallowRef } from "vue";
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
const connectionSourceId = "node-connections";
const connectionLayerId = "node-connections-line";
const routeSourceId = "nearest-route";
const routeLayerId = "nearest-route-line";
const { nodeRows } = useMapSectionActiveDevices();

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

function buildNodeMarkerPopup(row: DeviceRow) {
  const label = row.name ?? row.id ?? "Node";
  const status = row.status ?? "unknown";
  const lat = typeof row.lat === "number" ? row.lat.toFixed(6) : "N/A";
  const lng = typeof row.lng === "number" ? row.lng.toFixed(6) : "N/A";
  return `<div class="text-xs"><strong>${label}</strong><br/>${row.id} - ${status}<br/>${lat}, ${lng}</div>`;
}

function syncNodeMarkers() {
  const mapInstance = mapRef.value;
  const maplibre = maplibreRef.value;
  if (!mapInstance || !maplibre) return;

  const nextIds = new Set<string>();

  nodeRows.value.forEach((row) => {
    const coords = resolveNodeLatLng(row);
    if (!coords) return;
    nextIds.add(row.id);

    const existing = nodeMarkers.get(row.id);
    if (existing) {
      existing.setLngLat([coords.lng, coords.lat]);
      existing.getPopup()?.setHTML(buildNodeMarkerPopup(row));
      return;
    }

    const popup = new maplibre.Popup({ offset: 12 }).setHTML(
      buildNodeMarkerPopup(row)
    );
    const marker = new maplibre.Marker({
      color: "#2563eb",
    })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(popup)
      .addTo(mapInstance);
    nodeMarkers.set(row.id, marker);
  });

  nodeMarkers.forEach((marker, id) => {
    if (nextIds.has(id)) return;
    marker.remove();
    nodeMarkers.delete(id);
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
    if (row?.id) {
      nodeById.set(row.id, row);
    }
  });

  const features: any[] = [];

  nodeRows.value.forEach((row) => {
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
  routePathIds,
  () => {
    if (!isMapLoaded.value) return;
    syncRoutePath();
  },
  { deep: true },
);

const reloadMap = async (options?: { silent?: boolean }) => {
  const mapInstance = mapRef.value;
  const mapElement = mapEl.value;
  if (!mapElement) return;
  try {
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
    });
    if (!options?.silent) {
      message.success("Map reloaded.");
    }
  } catch (error) {
    const msg = (error as Error)?.message ?? "Failed to reload.";
    message.error(msg);
  }
};

onBeforeUnmount(() => {
  if (mapRef.value) {
    mapRef.value.remove();
    mapRef.value = null;
  }
  nodeMarkers.forEach((marker) => marker.remove());
  nodeMarkers.clear();
  drawRef.value = null;
  maplibreRef.value = null;
});

defineExpose({
  isAreasLoading,
  managedAreas,
  focusArea,
  zoomToNode,
  reloadMap,
});
</script>
