<script setup lang="ts">
useHead({
  titleTemplate: (title) => (title ? `${title} | OpenLynk` : "OpenLynk"),
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
