<template>
  <div class="relative min-h-screen flex flex-col bg-white">
    <NuxtLayout>
      <NuxtPage :key="$route.fullPath" />
    </NuxtLayout>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRoute } from "vue-router";
import { useMetrics } from "@/composables/useMetrics";

const route = useRoute();
const { fetchMetrics } = useMetrics();

onMounted(() => {
  fetchMetrics();
});
</script>
