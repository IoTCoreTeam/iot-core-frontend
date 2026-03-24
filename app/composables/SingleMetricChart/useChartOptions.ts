import { computed, type ComputedRef } from "vue";
import type { ApexOptions } from "apexcharts";
import type { TimeframeKey } from "@/types/dashboard";
import { formatIotDateTime } from "~~/config/iot-time-format";

const axisTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const tooltipTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

export function useChartOptions(params: {
  selectedTimeframe: ComputedRef<TimeframeKey>;
  seriesExtent: ComputedRef<{ min: number; max: number }>;
  activeSeriesCount: ComputedRef<number>;
  selectedUnit: ComputedRef<string | undefined>;
  formatValue: (value: number) => string;
}) {
  const seriesColors = computed(() => {
    const palette = [
      "#2563eb",
      "#0ea5e9",
      "#06b6d4",
      "#14b8a6",
      "#22c55e",
      "#38bdf8",
      "#60a5fa",
      "#7dd3fc",
      "#5eead4",
      "#34d399",
    ];
    return Array.from({ length: params.activeSeriesCount.value }, (_, index) => {
      return palette[index % palette.length];
    });
  });

  const chartOptions = computed<ApexOptions>(() => {
    return {
      chart: {
        id: `parameter-trend-${params.selectedTimeframe.value}`,
        height: "100%",
        type: "line",
        stacked: false,
        toolbar: { show: false },
        animations: {
          enabled: true,
          easing: "linear",
          speed: 300,
          dynamicAnimation: { speed: 300 },
        },
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth" as const, width: 3 },
      fill: { opacity: 1 },
      markers: {
        size: 4,
        strokeWidth: 2,
        strokeColors: "#ffffff",
        hover: { size: 6 },
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          formatter: (value: string, timestamp?: number) =>
            formatIotDateTime(
              typeof timestamp === "number" ? timestamp : value,
              { formatter: axisTimeFormatter, fallback: "--" },
            ),
          style: { fontSize: "11px", colors: "#6b7280" },
        },
        axisBorder: { color: "#e5e7eb" },
        axisTicks: { color: "#e5e7eb" },
      },
      yaxis: {
        min: params.seriesExtent.value.min,
        max: params.seriesExtent.value.max,
        labels: {
          style: { fontSize: "11px", colors: "#6b7280" },
          formatter: (val: number) => val.toFixed(3),
        },
      },
      grid: {
        strokeDashArray: 3,
        borderColor: "#e5e7eb",
      },
      colors: seriesColors.value,
      tooltip: {
        x: {
          formatter: (value: string | number) =>
            formatIotDateTime(value, {
              formatter: tooltipTimeFormatter,
              fallback: "--",
            }),
        },
        y: {
          formatter: (val: number) => {
            const unit = params.selectedUnit.value;
            return `${params.formatValue(val)}${unit ? ` ${unit}` : ""}`;
          },
        },
      },
    };
  });

  return {
    chartOptions,
    seriesColors,
  };
}
