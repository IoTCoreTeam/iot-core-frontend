import { reactive, ref } from "vue";
import type { FilterFieldRow } from "@/components/common/AdvancedFilterPanel.vue";
import type { DeviceRow } from "@/types/devices-control";

export type GatewayFilterState = {
  id: string;
  name: string;
  ip: string;
  mac: string;
  status: string;
  registered: string;
};

export const defaultDeviceFilters: GatewayFilterState = {
  id: "",
  name: "",
  ip: "",
  mac: "",
  status: "",
  registered: "",
};

const deviceFilterFields: FilterFieldRow[] = [
  [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "All", value: "" },
        { label: "Online", value: "online" },
        { label: "Offline", value: "offline" },
      ],
    },
  ],
  [
    {
      key: "registered",
      label: "Registered",
      type: "select",
      options: [
        { label: "All", value: "" },
        { label: "Registered", value: "true" },
        { label: "Unregistered", value: "false" },
      ],
    },
  ],
  [
    {
      key: "name",
      label: "Name",
      type: "text",
      placeholder: "e.g. Gateway 001",
    },
  ],
  [
    {
      key: "id",
      label: "Gateway ID",
      type: "text",
      placeholder: "e.g. GW_001",
    },
  ],
  [
    {
      key: "ip",
      label: "IP Address",
      type: "text",
      placeholder: "e.g. 192.168.1.1",
    },
  ],
  [
    {
      key: "mac",
      label: "MAC Address",
      type: "text",
      placeholder: "e.g. 00:1A:2B:3C:4D:5E",
    },
  ],
];

function snapshotDeviceFilters(filters: GatewayFilterState) {
  return { ...filters };
}

export function useDeviceFilter() {
  const deviceSearchKeyword = ref("");
  const isDeviceFilterVisible = ref(true);
  const deviceFilters = reactive<GatewayFilterState>({
    ...defaultDeviceFilters,
  });
  const appliedDeviceFilters = ref<GatewayFilterState>({
    ...defaultDeviceFilters,
  });

  function filterDeviceRows(rows: DeviceRow[]) {
    const keyword = deviceSearchKeyword.value.trim().toLowerCase();
    const filters = appliedDeviceFilters.value;

    return rows.filter((row) => {
      if (keyword) {
        const haystack = [
          row.id,
          row.externalId,
          row.name,
          row.controllerId,
          row.url,
          row.inputType,
          row.gatewayId,
          row.ip,
          row.mac,
          row.status,
          row.type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }

      if (
        filters.name &&
        !row.name.toLowerCase().includes(filters.name.toLowerCase())
      )
        return false;
      if (filters.id && !row.id.toLowerCase().includes(filters.id.toLowerCase()))
        return false;
      if (
        filters.ip &&
        !(row.ip || "").toLowerCase().includes(filters.ip.toLowerCase())
      )
        return false;
      if (
        filters.mac &&
        !(row.mac || "").toLowerCase().includes(filters.mac.toLowerCase())
      )
        return false;
      if (filters.status && row.status !== filters.status) return false;
      if (filters.registered) {
        const isRegistered = row.registered ? "true" : "false";
        if (isRegistered !== filters.registered) return false;
      }

      return true;
    });
  }

  function handleDeviceFilterModelUpdate(value: Record<string, string>) {
    Object.assign(deviceFilters, value);
  }

  function applyDeviceFilters(payload?: Record<string, string>) {
    if (payload) Object.assign(deviceFilters, payload);
    appliedDeviceFilters.value = snapshotDeviceFilters(deviceFilters);
  }

  function resetDeviceFilters() {
    Object.assign(deviceFilters, defaultDeviceFilters);
    applyDeviceFilters();
  }

  function toggleDeviceFilters() {
    isDeviceFilterVisible.value = !isDeviceFilterVisible.value;
  }

  return {
    deviceSearchKeyword,
    isDeviceFilterVisible,
    deviceFilters,
    appliedDeviceFilters,
    deviceFilterFields,
    filterDeviceRows,
    handleDeviceFilterModelUpdate,
    applyDeviceFilters,
    resetDeviceFilters,
    toggleDeviceFilters,
  };
}
