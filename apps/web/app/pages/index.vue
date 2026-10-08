<script setup lang="ts">
definePageMeta({ layout: false });

useSeoMeta({
  title: "One page for all your links",
  description: "OpenLynk — open-source, self-hosted link-in-bio. Your data stays on your server.",
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="border-b border-default">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <span class="flex items-center gap-2">
          <span class="size-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-white">O</span>
          <span class="font-semibold">OpenLynk</span>
        </span>
        <div class="flex gap-2">
          <UButton to="/login" variant="ghost" color="neutral">Sign in</UButton>
          <UButton to="/login">Sign in</UButton>
        </div>
      </div>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 gap-8">
      <div class="flex flex-col items-center gap-4 max-w-2xl">
        <h1 class="text-3xl sm:text-5xl font-bold tracking-tight">One page for all your links</h1>
        <p class="text-muted text-base sm:text-lg">
          Open-source, self-hosted link-in-bio. Your data stays on your server —
          no trackers, no lock-in.
        </p>
        <div class="flex flex-wrap justify-center gap-2 mt-2">
          <UButton to="/login" size="lg" icon="i-lucide-rocket">Open dashboard</UButton>
          <UButton to="/login" size="lg" variant="outline">Sign in</UButton>
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-3 max-w-4xl w-full text-left">
        <UCard>
          <div class="flex flex-col gap-2">
            <UIcon name="i-lucide-link" class="size-6 text-primary" />
            <h2 class="font-semibold">Own your links</h2>
            <p class="text-sm text-muted">Unlimited links with drag-and-drop ordering and instant publishing.</p>
          </div>
        </UCard>
        <UCard>
          <div class="flex flex-col gap-2">
            <UIcon name="i-lucide-shield-check" class="size-6 text-primary" />
            <h2 class="font-semibold">Privacy-first analytics</h2>
            <p class="text-sm text-muted">Aggregate views and clicks only. No cookies, no fingerprints, no PII.</p>
          </div>
        </UCard>
        <UCard>
          <div class="flex flex-col gap-2">
            <UIcon name="i-lucide-server" class="size-6 text-primary" />
            <h2 class="font-semibold">Self-hosted</h2>
            <p class="text-sm text-muted">One Docker Compose file on any VPS. Your database, your rules.</p>
          </div>
        </UCard>
      </div>
    </main>

    <footer class="border-t border-default">
      <p class="max-w-5xl mx-auto px-4 py-4 text-xs text-muted text-center">
        OpenLynk — open-source link-in-bio
      </p>
    </footer>
  </div>
</template>
