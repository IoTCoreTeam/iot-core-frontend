<template>
  <div class="flex flex-col items-center justify-start pb-10 bg-gray-50 p-4">
    <div
      class="w-full max-w-5xl bg-white rounded p-8 px-12 text-xs border border-slate-200"
    >
      <div class="mb-6">
        <h2 class="text-base font-semibold text-gray-800">
          Company Information
        </h2>
      </div>
      <div v-if="loading">
        <LoadingState class="w-full" message="Loading company details..." />
      </div>
      <form v-else @submit.prevent="saveCompany" class="text-xs">
        <!-- Company Name -->
        <div class="flex items-center mb-4">
          <label class="w-1/4 text-gray-700 font-medium">Company Name</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="Enter company name"
            class="flex-1 border border-gray-300 rounded-sm px-3 py-2 focus:ring focus:ring-blue-300"
          />
        </div>

        <!-- Address -->
        <div class="flex items-center mb-4">
          <label class="w-1/4 text-gray-700 font-medium">Company Address</label>
          <input
            v-model="form.address"
            type="text"
            placeholder="Enter address"
            class="flex-1 border border-gray-300 rounded-sm px-3 py-2 focus:ring focus:ring-blue-300"
          />
        </div>

        <!-- Phone -->
        <div class="flex items-center mb-4">
          <label class="w-1/4 text-gray-700 font-medium">Company Phone</label>
          <input
            v-model="form.phone"
            type="text"
            placeholder="Enter phone number"
            class="flex-1 border border-gray-300 rounded-sm px-3 py-2 focus:ring focus:ring-blue-300"
          />
        </div>

        <!-- Fax -->
        <div class="flex items-center mb-4">
          <label class="w-1/4 text-gray-700 font-medium">Company Fax</label>
          <input
            v-model="form.fax"
            type="text"
            placeholder="Enter fax number"
            class="flex-1 border border-gray-300 rounded-sm px-3 py-2 focus:ring focus:ring-blue-300"
          />
        </div>

        <!-- Email -->
        <div class="flex items-center mb-4">
          <label class="w-1/4 text-gray-700 font-medium">Company Email</label>
          <input
            v-model="form.email"
            type="email"
            placeholder="Enter email address"
            class="flex-1 border border-gray-300 rounded-sm px-3 py-2 focus:ring focus:ring-blue-300"
          />
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end mt-6">
          <button
            type="submit"
            class="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-2 rounded-lg"
          >
            Save Company
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { message } from "ant-design-vue";
import LoadingState from "@/components/common/LoadingState.vue";
import { apiConfig } from "../../config/api";
import { useAuthStore } from "~~/stores/auth";

const form = ref({
  name: "",
  address: "",
  email: "",
  phone: "",
  fax: "",
});
const loading = ref(false);
const authStore = useAuthStore();
const apiUrl = apiConfig.auth + "/company";

const buildAuthHeaders = () => {
  const authorization = authStore.authorizationHeader;
  if (!authorization) {
    throw new Error("Missing access token. Please sign in again.");
  }
  return {
    Authorization: authorization,
  };
};

const fetchCompanyData = async () => {
  if (loading.value) return;
  loading.value = true;
  try {
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...buildAuthHeaders(),
      },
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch company data (${res.status})`);
    }
    const data = await res.json().catch(() => ({}));

    const company = data?.data ?? data;
    Object.assign(form.value, {
      name: company?.name ?? "",
      address: company?.address ?? "",
      email: company?.email ?? "",
      phone: company?.phone ?? "",
      fax: company?.fax ?? "",
    });
  } catch (error) {
    if (error?.message?.includes("Missing access token")) {
      message.error("Missing access token");
      return;
    }
    message.error("Failed to fetch company data");
  } finally {
    loading.value = false;
  }
};

const saveCompany = async () => {
  if (loading.value) return;
  try {
    const res = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...buildAuthHeaders(),
      },
      body: JSON.stringify(form.value),
    });
    if (!res.ok) {
      throw new Error(`Failed to update company (${res.status})`);
    }
    await res.json().catch(() => ({}));

    message.success("Company information updated successfully");
  } catch (error) {
    if (error?.message?.includes("Missing access token")) {
      message.error("Missing access token");
      return;
    }
    message.error("Failed to update company");
  }
};

onMounted(fetchCompanyData);
</script>
