<template>
  <div class="relative min-h-screen flex flex-col bg-white">
    <NuxtLayout>
      <NuxtPage :key="$route.fullPath" />
    </NuxtLayout>
  </div>
</template>
