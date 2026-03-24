const defaultFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "medium",
});

type FormatOptions = {
  formatter?: Intl.DateTimeFormat;
  fallback?: string;
};

export function formatIotDateTime(
  value?: string | number | Date | null,
  options: FormatOptions = {},
) {
  const { formatter = defaultFormatter } = options;
  const fallback = options.fallback ?? "N/A";

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const date =
    value instanceof Date
      ? value
      : typeof value === "number"
        ? new Date(value)
        : new Date(Date.parse(value));

  if (Number.isNaN(date.getTime())) {
    return typeof value === "string" ? value : fallback;
  }

  return formatter.format(date);
}
