import type { DeviceRow } from "@/types/devices-control";

type LngLat = [number, number];
type PolygonRings = LngLat[][];

const EPSILON = 1e-9;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isValidPoint = (point: LngLat) => {
  const [lng, lat] = point;
  return (
    isFiniteNumber(lng) &&
    isFiniteNumber(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

const normalizePolygonRings = (geometry: any): PolygonRings[] => {
  if (!geometry) return [];
  const coords = geometry.coordinates ?? geometry;
  const type = geometry.type;

  if (type === "Polygon" && Array.isArray(coords)) {
    return [coords as PolygonRings];
  }
  if (type === "MultiPolygon" && Array.isArray(coords)) {
    return coords as PolygonRings[];
  }

  if (!Array.isArray(coords)) return [];

  if (Array.isArray(coords[0]) && isFiniteNumber(coords[0][0])) {
    return [[coords as LngLat[]]];
  }
  if (
    Array.isArray(coords[0]) &&
    Array.isArray(coords[0][0]) &&
    isFiniteNumber(coords[0][0][0])
  ) {
    return [coords as PolygonRings];
  }
  if (
    Array.isArray(coords[0]) &&
    Array.isArray(coords[0][0]) &&
    Array.isArray(coords[0][0][0]) &&
    isFiniteNumber(coords[0][0][0][0])
  ) {
    return coords as PolygonRings[];
  }

  return [];
};

const isPointOnSegment = (point: LngLat, start: LngLat, end: LngLat) => {
  const [px, py] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const cross = (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  if (Math.abs(cross) > EPSILON) return false;
  const dot = (px - x1) * (px - x2) + (py - y1) * (py - y2);
  return dot <= EPSILON;
};

const isPointInRing = (point: LngLat, ring: LngLat[]) => {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    if (isPointOnSegment(point, a, b)) return true;
    const [xi, yi] = a;
    const [xj, yj] = b;
    const intersects =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi + EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const isPointInPolygon = (point: LngLat, rings: PolygonRings) => {
  const [outer, ...holes] = rings;
  if (!outer || !isPointInRing(point, outer)) return false;
  for (const hole of holes) {
    if (hole && isPointInRing(point, hole)) return false;
  }
  return true;
};

const getNodePoint = (row: DeviceRow): LngLat | null => {
  if (!isFiniteNumber(row.lng) || !isFiniteNumber(row.lat)) {
    return null;
  }
  const point: LngLat = [row.lng, row.lat];
  return isValidPoint(point) ? point : null;
};

export const filterNodesInArea = (nodes: DeviceRow[], area: any) => {
  const geometry = area?.geometry;
  const polygons = normalizePolygonRings(geometry);
  if (!polygons.length) return [];

  return nodes.filter((row) => {
    const point = getNodePoint(row);
    if (!point) return false;
    return polygons.some((rings) => isPointInPolygon(point, rings));
  });
};
