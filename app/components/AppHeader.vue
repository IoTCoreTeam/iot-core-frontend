<template>
  <header class="w-full bg-white border-b border-gray-200">
    <div class="max-w-8xl mx-auto flex items-center py-3 px-5">
      <!-- Left: App name -->
      <NuxtLink to="/">
        <h1 class="text-xs font-bold text-blue-800 tracking-tight px-1">
          IOT CORE SYSTEM
        </h1>
      </NuxtLink>

      <!-- Navigation -->
      <nav class="hidden md:flex items-center space-x-10 ml-16">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 text-gray-700 text-xs font-semibold hover:text-blue-700 transition-colors border-b-2 border-transparent py-1 hover:border-blue-500"
        >
          <BootstrapIcon name="grid-1x2" class="w-3 h-3" />
          Dashboard
        </NuxtLink>

        <NuxtLink
          to="/devices-control/device-control-center"
          class="flex items-center gap-2 text-gray-700 text-xs font-semibold hover:text-blue-700 transition-colors border-b-2 border-transparent py-1 hover:border-blue-500"
        >
          <BootstrapIcon name="hdd-network" class="w-3 h-3" />
          Devices Control Center
        </NuxtLink>

        <NuxtLink
          to="/system-logs"
          class="flex items-center gap-2 text-gray-700 text-xs font-semibold hover:text-blue-700 transition-colors border-b-2 border-transparent py-1 hover:border-blue-500"
        >
          <BootstrapIcon name="clipboard-data" class="w-3 h-3" />
          System Monitoring
        </NuxtLink>

        <!-- Internal dropdown -->
        <div class="relative text-xs font-semibold cursor-pointer">
          <button
            @click="toggleDropdown('internal')"
            class="flex items-center gap-2 text-gray-700 hover:text-blue-700 transition-colors border-b-2 border-transparent py-1 hover:border-blue-500 text-xs"
          >
            <BootstrapIcon name="building" class="w-3 h-3" />
            Internal
            <svg
              class="w-2 h-2 ml-1 mt-1 transition-transform duration-200"
              :class="{ 'rotate-180': openDropdown === 'internal' }"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <div
            v-if="openDropdown === 'internal'"
            @click.outside="closeDropdown"
            class="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          >
            <NuxtLink
              to="/users-management"
              class="block px-4 py-2 text-gray-700 text-xs hover:bg-blue-50 hover:text-blue-700"
              @click="closeDropdown"
            >
              Users Management
            </NuxtLink>

            <NuxtLink
              to="/company-setup"
              class="block px-4 py-2 text-gray-700 text-xs hover:bg-blue-50 hover:text-blue-700"
              @click="closeDropdown"
            >
              Company Setup
            </NuxtLink>
          </div>
        </div>
      </nav>
      <div class="flex ml-auto space-x-10">
        <!-- Notification -->
        <div class="relative ml-4 hidden md:block">
          <button
            @click="showDrawer"
            class="flex items-center gap-2 text-gray-700 text-xs font-semibold hover:text-blue-700 transition-colors border-b-2 border-transparent py-1 hover:border-blue-500 relative"
            aria-label="Notifications"
          >
            <BootstrapIcon name="bell" class="w-3 h-3" />
            <span>Notification</span>

            <!-- Dot thông báo -->
            <span
              class="absolute -top-0.5 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"
            ></span>
          </button>
        </div>
        <!-- Account dropdown -->
        <div
          class="relative hidden md:block text-xs font-semibold cursor-pointer"
        >
          <button
            @click="toggleDropdown('account')"
            class="flex items-center gap-2 text-gray-700 hover:text-blue-700 transition-colors border-b-2 border-transparent py-1 hover:border-blue-500"
          >
            {{ userName }}
            <svg
              class="w-2 h-2 ml-1 mt-1 transition-transform duration-200"
              :class="{ 'rotate-180': openDropdown === 'account' }"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          <div
            v-if="openDropdown === 'account'"
            @click.outside="closeDropdown"
            class="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
          >
            <NuxtLink
              to="/user-account"
              class="block px-4 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              @click="closeDropdown"
            >
              Management
            </NuxtLink>

            <button
              type="button"
              class="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
              :disabled="isLoggingOut"
              @click="handleLogout"
            >
              {{ isLoggingOut ? "Logging out..." : "Logout" }}
            </button>
          </div>
        </div>
      </div>

      <a-drawer
        v-model:open="open"
        class="custom-class"
        root-class-name="root-class-name"
        :root-style="{ color: 'blue' }"
        style="color: red"
        title="Notifications"
        placement="right"
        @after-open-change="afterOpenChange"
      >
        <div class="space-y-4">
          <div class="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p class="text-xs font-semibold text-blue-800">System Update</p>
            <p class="text-xs text-blue-600">
              The system has been updated to version 2.1.0.
            </p>
          </div>
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p class="text-xs font-semibold text-gray-800">
              New Device Connected
            </p>
            <p class="text-xs text-gray-600">
              Gateway #12 has been successfully registered.
            </p>
          </div>
          <div class="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p class="text-xs font-semibold text-gray-800">
              Low Battery Warning
            </p>
            <p class="text-xs text-gray-600">
              Sensor TH-01 battery level is below 15%.
            </p>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end p-2">
            <a-button type="link" class="text-xs">Mark all as read</a-button>
          </div>
        </template>
      </a-drawer>

      <!-- Mobile menu button -->
      <button
        type="button"
        class="ml-auto inline-flex items-center justify-center rounded-md border border-gray-300 p-2 text-gray-700 hover:bg-gray-100 md:hidden"
        @click="openMobileMenu"
        aria-label="Open navigation"
      >
        <BootstrapIcon name="list" class="w-3 h-3" />
      </button>
    </div>

    <!-- Mobile menu -->
    <transition name="fade">
      <div v-if="isMobileMenuOpen" class="fixed inset-0 z-50 md:hidden">
        <div class="absolute inset-0 bg-black/40" @click="closeMobileMenu" />
        <div
          class="relative ml-auto h-full w-72 bg-white shadow-xl flex flex-col"
        >
          <div class="flex items-center justify-between border-b px-4 py-3">
            <h2 class="text-xs font-semibold text-gray-800">Navigation</h2>
            <button
              type="button"
              class="rounded-md border p-1 text-gray-600 hover:bg-gray-50"
              @click="closeMobileMenu"
            >
              <BootstrapIcon name="x" class="w-3 h-3" />
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-4 py-5 text-xs">
            <NuxtLink
              to="/"
              class="block px-3 py-2 hover:bg-blue-50"
              @click="closeMobileMenu"
            >
              Dashboard
            </NuxtLink>

            <NuxtLink
              to="/devices-control/device-control-center"
              class="block px-3 py-2 hover:bg-blue-50"
              @click="closeMobileMenu"
            >
              Devices Control Center
            </NuxtLink>

            <NuxtLink
              to="/devices-control/device-control-center"
              class="block px-3 py-2 hover:bg-blue-50"
              @click="closeMobileMenu"
            >
              System Monitoring
            </NuxtLink>

            <NuxtLink
              to="/users-management"
              class="block px-3 py-2 hover:bg-blue-50"
              @click="closeMobileMenu"
            >
              Users Management
            </NuxtLink>

            <NuxtLink
              to="/company-setup"
              class="block px-3 py-2 hover:bg-blue-50"
              @click="closeMobileMenu"
            >
              Company Setup
            </NuxtLink>
          </div>
        </div>
      </div>
    </transition>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useAuthStore } from "~~/stores/auth";
import { apiConfig } from "../../config/api";

const openDropdown = ref<string | null>(null);
const isMobileMenuOpen = ref(false);
const isLoggingOut = ref(false);
const open = ref<boolean>(false);

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const AUTH_API = apiConfig.auth;

const userName = computed(() => authStore.user?.name ?? "Account");

function toggleDropdown(name: "internal" | "account") {
  openDropdown.value = openDropdown.value === name ? null : name;
}

function closeDropdown() {
  openDropdown.value = null;
}

function openMobileMenu() {
  isMobileMenuOpen.value = true;
  closeDropdown();
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false;
}

const showDrawer = () => {
  open.value = true;
};

const afterOpenChange = (bool: boolean) => {
  console.log("open", bool);
};

watch(
  () => route.fullPath,
  () => {
    closeDropdown();
    closeMobileMenu();
  },
);

async function handleLogout() {
  if (!import.meta.client || isLoggingOut.value) return;
  isLoggingOut.value = true;

  try {
    if (authStore.authorizationHeader) {
      await fetch(`${AUTH_API}/logout`, {
        method: "POST",
        headers: {
          Authorization: authStore.authorizationHeader,
          Accept: "application/json",
        },
        credentials: "include",
      });
    }
  } finally {
    authStore.clearSession();
    localStorage.removeItem("remember_me");
    isLoggingOut.value = false;
    closeDropdown();
    closeMobileMenu();
    router.push("/login");
  }
}
</script>
