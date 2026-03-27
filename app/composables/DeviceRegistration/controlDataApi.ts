import { apiConfig } from "~~/config/api";

export function resolveControlModuleBase() {
  return (apiConfig.controlModule || "").replace(/\/$/, "");
}

export function normalizeIndexRows(payload: any) {
  return Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload)
      ? payload
      : [];
}

export async function fetchAllPages(endpoint: string, authorization: string) {
  const allRows: any[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const separator = endpoint.includes("?") ? "&" : "?";
    const pagedEndpoint = `${endpoint}${separator}per_page=200&page=${page}`;
    const response = await fetch(pagedEndpoint, {
      headers: {
        Authorization: authorization,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Failed to load data.");
    }

    allRows.push(...normalizeIndexRows(payload));
    lastPage = Number(payload?.last_page ?? payload?.meta?.last_page ?? 1);
    page += 1;
  } while (page <= lastPage);

  return allRows;
}
