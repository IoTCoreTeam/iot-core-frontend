import { computed, ref, type Ref } from "vue";
import { message } from "ant-design-vue";
import type { ControlUrlOption } from "@/composables/Scenario/scenarioBuilderTypes";

export function normalizeControlInputType(value?: string | null) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("analog")) return "analog";
  if (normalized.includes("digital") || normalized.includes("relay")) return "digital";
  return normalized;
}

export function useScenarioControlUrls(params: {
  controlModuleBase: Ref<string>;
  authorizationHeader: Ref<string | null | undefined>;
}) {
  const controlUrlOptions = ref<ControlUrlOption[]>([]);
  const hasLoadedControlUrls = ref(false);

  const controlUrlLabelMap = computed(() => {
    const map = new Map<string, string>();
    controlUrlOptions.value.forEach((item) => {
      if (item?.id) {
        map.set(item.id, item.name || item.id);
      }
    });
    return map;
  });

  function resolveControlInputTypeById(controlUrlId?: string | null) {
    if (!controlUrlId) return null;
    const selected = controlUrlOptions.value.find((item) => item.id === controlUrlId);
    return normalizeControlInputType(selected?.input_type);
  }

  function resolveControlNodeId(item: ControlUrlOption) {
    return item?.node?.external_id || item?.node?.id || "â€”";
  }

  function resolveControlGatewayId(item: ControlUrlOption) {
    return item?.node?.gateway?.external_id || item?.node?.gateway?.id || "â€”";
  }

  function isMissingControlUrl(controlUrlId?: string | null) {
    if (!hasLoadedControlUrls.value) return false;
    if (!controlUrlId) return false;
    return !controlUrlOptions.value.some((item) => item?.id === controlUrlId);
  }

  async function fetchControlUrls() {
    if (!params.controlModuleBase.value) return;
    const authorization = params.authorizationHeader.value;
    if (!authorization) {
      message.error("Missing authorization.");
      return;
    }
    try {
      const endpoint = `${params.controlModuleBase.value}/control-urls?per_page=200&include=gateway`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: authorization,
          Accept: "application/json",
        },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Failed to load control urls.");
      }
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];
      controlUrlOptions.value = (rows as ControlUrlOption[]).filter((row: any) => {
        if (row?.deleted_at != null) return false;
        if (row?.node?.deleted_at != null) return false;
        if (row?.node?.gateway?.deleted_at != null) return false;
        return true;
      });
    } catch (error: any) {
      message.error(error?.message ?? "Failed to load control urls.");
    } finally {
      hasLoadedControlUrls.value = true;
    }
  }

  return {
    controlUrlLabelMap,
    controlUrlOptions,
    fetchControlUrls,
    hasLoadedControlUrls,
    isMissingControlUrl,
    resolveControlGatewayId,
    resolveControlInputTypeById,
    resolveControlNodeId,
  };
}
