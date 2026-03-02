<template>
  <BaseModal
    :model-value="isOpen"
    title="Add New Map"
    max-width="max-w-2xl"
    panel-class="p-6 py-4 shadow-xl"
    :close-disabled="isSubmitting"
    @request-close="handleClose"
  >
    <form
      class="grid grid-cols-1 gap-4 md:grid-cols-2"
      @submit.prevent="submitForm"
    >
      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Map Name
        </label>
        <input
          v-model="map.name"
          type="text"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Main floor"
          required
          maxlength="100"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">Area</label>
        <select
          v-model="map.area_id"
          class="w-full rounded border border-gray-300 bg-white px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          required
          :disabled="isLoadingAreas"
        >
          <option value="" disabled>
            {{ isLoadingAreas ? "Loading areas..." : "Select an area" }}
          </option>
          <option
            v-for="area in areas"
            :key="area.id"
            :value="String(area.id)"
          >
            {{ area.name }}
          </option>
        </select>
        <p v-if="areaLoadError" class="mt-1 text-[11px] text-rose-600">
          {{ areaLoadError }}
        </p>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Scale (m per px)
        </label>
        <input
          v-model="map.scale_m_per_px"
          type="number"
          step="0.0001"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. 0.01"
          min="0"
        />
      </div>

      <div class="md:col-span-2">
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Description
        </label>
        <textarea
          v-model="map.description"
          rows="4"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Short description for this map"
        ></textarea>
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Width (px)
        </label>
        <input
          v-model="map.width_px"
          type="number"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. 1200"
          min="0"
        />
      </div>

      <div>
        <label class="mb-1 block text-xs font-medium text-gray-700">
          Height (px)
        </label>
        <input
          v-model="map.height_px"
          type="number"
          class="w-full rounded border border-gray-300 px-2 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. 800"
          min="0"
        />
      </div>

      <div class="mt-4 flex justify-end space-x-3 md:col-span-2">
        <button
          type="button"
          :disabled="isSubmitting"
          class="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ isSubmitting ? "Adding..." : "Add" }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { message } from "ant-design-vue";
import { apiConfig } from "~~/config/api";
import { useAuthStore } from "~~/stores/auth";
import BaseModal from "../BaseModal.vue";

interface MapForm {
  area_id: string;
  name: string;
  image_url: string;
  width_px: string;
  height_px: string;
  scale_m_per_px: string;
  description: string;
}

const emit = defineEmits(["close", "save"]);

const isOpen = ref(true);
const isSubmitting = ref(false);
const isLoadingAreas = ref(false);
const areaLoadError = ref("");
const areas = ref<Array<{ id: number; name: string }>>([]);

const authStore = useAuthStore();
const mapModuleBase = `${(apiConfig.controlModule || "").replace(/\/$/, "")}/map-module`;

const map = ref<MapForm>({
  area_id: "",
  name: "",
  image_url: "",
  width_px: "",
  height_px: "",
  scale_m_per_px: "",
  description: "",
});

function buildHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const authorization = authStore.authorizationHeader;
  if (authorization) {
    headers.Authorization = authorization;
  }
  return headers;
}

async function fetchAreas() {
  if (!import.meta.client) return;
  if (!mapModuleBase || mapModuleBase.startsWith("/")) {
    areaLoadError.value = "API base URL is not configured.";
    return;
  }
  isLoadingAreas.value = true;
  areaLoadError.value = "";
  try {
    const response = await fetch(`${mapModuleBase}/areas`, {
      headers: buildHeaders(),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message ?? `Failed to load areas (${response.status}).`);
    }
    const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
    areas.value = rows.map((row: any) => ({
      id: Number(row.id),
      name: row.name ?? `Area ${row.id}`,
    }));
  } catch (error: any) {
    areaLoadError.value = error?.message ?? "Failed to load areas.";
  } finally {
    isLoadingAreas.value = false;
  }
}

function handleClose() {
  if (isSubmitting.value) return;
  scheduleClose();
}

let closeTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleClose() {
  isOpen.value = false;
  if (closeTimer) {
    clearTimeout(closeTimer);
  }
  closeTimer = setTimeout(() => emit("close"), 450);
}

function resetForm() {
  map.value = {
    area_id: "",
    name: "",
    image_url: "",
    width_px: "",
    height_px: "",
    scale_m_per_px: "",
    description: "",
  };
}

function submitForm() {
  if (!map.value.area_id || !map.value.name) {
    message.warning("Please fill in the required fields.");
    return;
  }

  isSubmitting.value = true;
  emit("save", { ...map.value });
  resetForm();
  scheduleClose();
  isSubmitting.value = false;
}

onMounted(() => {
  fetchAreas();
});
</script>
