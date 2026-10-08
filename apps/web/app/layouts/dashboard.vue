<script setup lang="ts">
const { admin, profile, logout } = useAuth();

const navItems = [
  { label: "Overview", icon: "i-lucide-layout-dashboard", to: "/dashboard" },
  { label: "Links", icon: "i-lucide-link", to: "/dashboard/links" },
  { label: "Appearance", icon: "i-lucide-palette", to: "/dashboard/appearance" },
  { label: "Analytics", icon: "i-lucide-bar-chart-3", to: "/dashboard/analytics" },
];

const publicPath = computed(() => (profile.value ? `/${profile.value.username}` : null));
</script>

<template>
  <div class="min-h-screen lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <aside class="hidden lg:flex flex-col gap-4 border-r border-default p-4">
      <NuxtLink to="/dashboard" class="flex items-center gap-2 px-2 py-1">
        <span class="size-8 rounded-lg bg-primary flex items-center justify-center text-sm font-bold text-white">O</span>
        <span class="font-semibold">OpenLynk</span>
      </NuxtLink>

      <UNavigationMenu :items="navItems" orientation="vertical" class="flex-1" />

      <div class="flex flex-col gap-1 border-t border-default pt-3">
        <UButton
          v-if="publicPath"
          :to="publicPath"
          target="_blank"
          variant="ghost"
          color="neutral"
          icon="i-lucide-external-link"
          class="justify-start"
        >
          View public page
        </UButton>
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-lucide-log-out"
          class="justify-start"
          @click="logout()"
        >
          Sign out{{ admin ? ` (${admin.email})` : "" }}
        </UButton>
      </div>
    </aside>

    <div class="min-w-0">
      <header class="lg:hidden sticky top-0 z-10 border-b border-default bg-default/80 backdrop-blur px-4 py-2">
        <div class="flex items-center justify-between mb-1">
          <NuxtLink to="/dashboard" class="flex items-center gap-2">
            <span class="size-7 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-white">O</span>
            <span class="font-semibold text-sm">OpenLynk</span>
          </NuxtLink>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-log-out"
            size="sm"
            @click="logout()"
          />
        </div>
        <UNavigationMenu :items="navItems" orientation="horizontal" />
      </header>

      <main class="p-4 sm:p-6 lg:p-8 mx-auto w-full max-w-5xl">
        <slot />
      </main>
    </div>
  </div>
</template>
