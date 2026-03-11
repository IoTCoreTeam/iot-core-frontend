import type { Map as MapLibreMap } from "maplibre-gl";
import { ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import { MAP_DEFAULT_CENTER } from "~~/config/map";

type MapToolDeps = {
  mapRef: Ref<MapLibreMap | null>;
  defaultCenter?: [number, number];
  defaultZoom?: number;
};

// [lng, lat]
export const DEFAULT_CENTER: [number, number] = MAP_DEFAULT_CENTER;
export const DEFAULT_ZOOM = 15;

export const useMapTool = ({
  mapRef,
  defaultCenter = DEFAULT_CENTER,
  defaultZoom = DEFAULT_ZOOM,
}: MapToolDeps) => {
  const latInput = ref<string>("");
  const lngInput = ref<string>("");

  const zoomToInput = () => {
    const mapInstance = mapRef.value;
    if (!mapInstance) return;
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
    mapInstance.flyTo({ center: [lng, lat], zoom: 15 });
  };

  const resetMapView = () => {
    const mapInstance = mapRef.value;
    if (!mapInstance) return;
    mapInstance.flyTo({ center: defaultCenter, zoom: defaultZoom });
  };

  return {
    latInput,
    lngInput,
    zoomToInput,
    resetMapView,
  };
};
