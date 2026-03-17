import type { Ref } from "vue";
import { computed, ref } from "vue";
import type { DeviceRow, NodeInfo } from "@/types/devices-control";

type ActiveDevicePayload = { kind: "gateway" | "node"; row: DeviceRow };

type UiDeps = {
  nodeRows: Ref<DeviceRow[]>;
};

export const useMapSectionUi = ({ nodeRows }: UiDeps) => {
  const isGatewayDetailOpen = ref(false);
  const selectedGateway = ref<DeviceRow | null>(null);
  const isNodeDetailOpen = ref(false);
  const selectedNodeDetail = ref<NodeInfo | null>(null);

  const connectedGatewayNodes = computed<DeviceRow[]>(() => {
    if (!selectedGateway.value) return [];
    return nodeRows.value.filter(
      (node) => node.gatewayId === selectedGateway.value?.id,
    );
  });

  function mapDeviceRowToNodeInfo(row: DeviceRow): NodeInfo {
    return {
      id: null,
      external_id: row.externalId ?? row.id ?? null,
      name: row.name ?? null,
      type: row.type ?? null,
      gateway_id: row.gatewayId ?? null,
      ip_address: row.ip ?? null,
      mac_address: row.mac ?? null,
      lat: row.lat ?? null,
      lng: row.lng ?? null,
      status: row.status ?? null,
      registered: row.registered ?? null,
      inside_map: row.inside_map ?? null,
      last_seen: row.lastSeen ?? null,
      connected_nodes: row.connectedNodes ?? null,
    };
  }

  function openGatewayDetail(row: DeviceRow) {
    selectedGateway.value = row;
    isGatewayDetailOpen.value = true;
  }

  function closeGatewayDetail() {
    isGatewayDetailOpen.value = false;
    selectedGateway.value = null;
  }

  function openNodeDetail(row: DeviceRow) {
    selectedNodeDetail.value = mapDeviceRowToNodeInfo(row);
    isNodeDetailOpen.value = true;
  }

  function closeNodeDetail() {
    isNodeDetailOpen.value = false;
    selectedNodeDetail.value = null;
  }

  function openActiveDeviceDetail(payload: ActiveDevicePayload) {
    if (payload.kind === "gateway") {
      openGatewayDetail(payload.row);
      return;
    }
    openNodeDetail(payload.row);
  }

  return {
    isGatewayDetailOpen,
    selectedGateway,
    isNodeDetailOpen,
    selectedNodeDetail,
    connectedGatewayNodes,
    openGatewayDetail,
    closeGatewayDetail,
    openNodeDetail,
    closeNodeDetail,
    openActiveDeviceDetail,
  };
};
