import type { Component } from "vue";

export type DeviceTabKey =
  | "gateways"
  | "nodes"
  | "command_setup"
  | "registered"
  | "registered_control_urls";

export type DeviceRowStatus = "online" | "offline";

export type ControllerState = {
  device?: string | null;
  kind?: string | null;
  state?: string | null;
  id?: string | null;
  name?: string | null;
  type?: string | null;
  status?: string | null;
  value?: string | number | boolean | null;
  timestamp?: string | null;
};

export type DeviceRow = {
  id: string;
  externalId?: string | null;
  resourceType?: "gateway" | "node" | null;
  name: string;
  gatewayId?: string | null;
  ip?: string | null;
  mac?: string | null;
  lat?: number | null;
  lng?: number | null;
  type?: string | null;
  status: DeviceRowStatus;
  registered?: boolean;
  inside_map?: boolean | null;
  lastSeen?: string | null;
  devices?: ControllerState[] | null;
  connectedNodes?: string[] | null;
  managed_areas?: { id: number; name: string }[] | null;
  controllerId?: string | null;
  controlUrlId?: string | null;
  nodeId?: string | null;
  nodeInternalId?: string | null;
  nodeName?: string | null;
  nodeType?: string | null;
  inputType?: string | null;
  analogCount?: number | null;
  commandCount?: number | null;
  url?: string | null;
  command?: string | null;
  commandType?: "json_command" | "analog_signal" | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  controlUrlMeta?: {
    id?: string | null;
    nodeId?: string | null;
    nodeExternalId?: string | null;
    gatewayId?: string | null;
    controllerId?: string | null;
    name?: string | null;
    url?: string | null;
    inputType?: string | null;
  } | null;
  commandDetail?: {
    type?: "json_command" | "analog_signal" | null;
    name?: string | null;
    command?: unknown;
    minValue?: number | string | null;
    maxValue?: number | string | null;
    unit?: string | null;
    signalType?: string | null;
    resolutionBits?: number | null;
  } | null;
};

export type NodeInfo = {
  id?: string | number | null;
  external_id?: string | null;
  name?: string | null;
  type?: string | null;
  gateway_id?: string | null;
  ip_address?: string | null;
  mac_address?: string | null;
  lat?: number | null;
  lng?: number | null;
  status?: string | null;
  registered?: boolean | null;
  inside_map?: boolean | null;
  last_seen?: string | null;
  connected_nodes?: string[] | null;
  managed_areas?: { id: number; name: string }[] | null;
};

export type DeviceTab = {
  key: DeviceTabKey;
  label: string;
  rows: DeviceRow[];
};

export type DeviceFilterState = {
  name: string;
  serialNumber: string;
  connectionKey: string;
  location: string;
  ipAddress: string;
  status: string;
};

export type SectionCard = {
  kicker: string;
  title: string;
  description: string;
};

export type Section = {
  id: string;
  label: string;
  description?: string;
  icon?: Component;
  headline?: string;
  body?: string;
  cards?: SectionCard[];
};
