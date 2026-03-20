import { onBeforeUnmount, onMounted, ref } from "vue";
import { apiConfig } from "~~/config/api";

type UseMetricSSEOptions = {
  fetchOnce: () => Promise<void> | void;
  pollIntervalMs?: number;
};

export function useMetricSSE(options: UseMetricSSEOptions) {
  const isStreamConnected = ref(false);
  const baseUrl = (apiConfig.server || "").replace(/\/$/, "");
  const STREAM_ENDPOINT = baseUrl ? `${baseUrl}/events/sensors` : "";
  const pollIntervalMs = options.pollIntervalMs ?? 5000;

  let stream: EventSource | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      options.fetchOnce();
    }, pollIntervalMs);
  };

  const stopPolling = () => {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  };

  const stopStream = () => {
    if (!stream) return;
    stream.close();
    stream = null;
    isStreamConnected.value = false;
  };

  const startStream = () => {
    if (!import.meta.client) return;
    if (!STREAM_ENDPOINT || stream) return;
    try {
      const source = new EventSource(STREAM_ENDPOINT);
      source.onopen = () => {
        isStreamConnected.value = true;
      };
      source.onerror = () => {
        stopStream();
        startPolling();
      };
      source.addEventListener("sensor-update", () => {
        options.fetchOnce();
      });
      source.onmessage = () => {
        options.fetchOnce();
      };
      stream = source;
    } catch {
      stopStream();
      startPolling();
    }
  };

  onMounted(() => {
    options.fetchOnce();
    startStream();
    if (!STREAM_ENDPOINT) {
      startPolling();
    }
  });

  onBeforeUnmount(() => {
    stopStream();
    stopPolling();
  });

  return {
    isStreamConnected,
    stopStream,
    stopPolling,
  };
}
