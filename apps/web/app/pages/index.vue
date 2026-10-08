<script setup lang="ts">
// `/` is an entry router (see auth.global.ts), not a landing page.
// This fallback only renders when no published profile exists yet.
definePageMeta({ layout: false });

useSeoMeta({ title: "OpenLynk" });
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-md text-center">
      <div class="flex flex-col items-center gap-2 py-2">
        <span class="size-10 rounded-xl bg-primary flex items-center justify-center text-lg font-bold text-white">O</span>
        <h1 class="text-lg font-semibold">Nothing published yet</h1>
        <p class="text-sm text-muted">The owner hasn't published their page.</p>
        <UButton to="/login" variant="ghost" color="neutral" class="mt-2">Admin sign in</UButton>
      </div>
    </UCard>
  </div>
</template>
