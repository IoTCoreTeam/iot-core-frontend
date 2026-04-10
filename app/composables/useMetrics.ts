import type { DashboardMetric } from "@/types/dashboard";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";

const METRICS_STATE_KEY = "metrics_state";
const METRICS_LOADING_KEY = "metrics_loading";
const METRICS_ERROR_KEY = "metrics_error";
const METRICS_LOADED_KEY = "metrics_loaded";

function getMetricsState() {
  return {
    metrics: useState<DashboardMetric[]>(METRICS_STATE_KEY, () => []),
    isLoading: useState<boolean>(METRICS_LOADING_KEY, () => false),
    error: useState<string | null>(METRICS_ERROR_KEY, () => null),
    hasLoaded: useState<boolean>(METRICS_LOADED_KEY, () => false),
  };
}

function getBaseUrl() {
  return (apiConfig.server || "").replace(/\/$/, "");
}

async function fetchMetrics(force = false) {
  const { metrics, isLoading, error, hasLoaded } = getMetricsState();
  const authStore = useAuthStore();
  const authorization = authStore.authorizationHeader;

  if (hasLoaded.value && !force) return;
  if (isLoading.value) return;
  if (!authorization) return;
  const base = getBaseUrl();
  if (!base) {
    metrics.value = [];
    hasLoaded.value = true;
    return;
  }
  isLoading.value = true;
  error.value = null;
  try {
    const response = await fetch(`${base}/v1/metrics`, {
      headers: { Accept: "application/json", Authorization: authorization },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load metrics.");
    }
    metrics.value = Array.isArray(payload) ? payload : [];
    hasLoaded.value = true;
  } catch (err: any) {
    error.value = err?.message ?? "Failed to load metrics.";
    metrics.value = [];
    hasLoaded.value = true;
  } finally {
    isLoading.value = false;
  }
}

export function useMetrics() {
  const { metrics, isLoading, error, hasLoaded } = getMetricsState();

  if (import.meta.client && !hasLoaded.value && !isLoading.value) {
    fetchMetrics();
  }

  return {
    metrics,
    isLoading,
    error,
    fetchMetrics,
  };
}
