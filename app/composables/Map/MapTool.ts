import type { Map as LeafletMap } from "leaflet";
import { ref, type Ref } from "vue";
import { message } from "ant-design-vue";

type MapToolDeps = {
  mapRef: Ref<LeafletMap | null>;
  leafletRef: Ref<typeof import("leaflet") | null>;
  defaultCenter?: [number, number];
  defaultZoom?: number;
};

export const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];
export const DEFAULT_ZOOM = 13;

export const useMapTool = ({
  mapRef,
  leafletRef,
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
    mapInstance.setView([lat, lng], 15, { animate: true });
  };

  const resetMapView = () => {
    const mapInstance = mapRef.value;
    if (!mapInstance) return;
    mapInstance.setView(defaultCenter, defaultZoom, { animate: true });
  };

  return {
    latInput,
    lngInput,
    zoomToInput,
    resetMapView,
  };
};
