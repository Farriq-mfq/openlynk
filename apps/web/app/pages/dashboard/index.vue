<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

useSeoMeta({ title: "Overview" });

const { profile } = useAuth();
const { summary, fetchAnalytics } = useAnalytics();
const { links, pending: linksPending, fetchLinks } = useLinks();
const toast = useToast();

try {
  await Promise.all([fetchAnalytics(), fetchLinks()]);
} catch {
  if (import.meta.client) {
    toast.add({ title: "Could not load dashboard", description: "Is the API running?", color: "error" });
  }
}

const activeLinks = computed(() => links.value.filter((l) => l.is_active).length);
const topLinks = computed(() => links.value.slice(0, 5));
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold">Overview</h1>
      <p class="text-sm text-muted">
        {{ profile ? `Welcome back, ${profile.display_name} (@${profile.username})` : "Your link-in-bio at a glance" }}
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <UCard>
        <div class="flex items-center gap-3">
          <span class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-eye" class="size-5" />
          </span>
          <div>
            <p class="text-sm text-muted">Profile views (7d)</p>
            <p class="text-2xl font-semibold">{{ summary ? summary.total_views : "—" }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <span class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-mouse-pointer-click" class="size-5" />
          </span>
          <div>
            <p class="text-sm text-muted">Link clicks (7d)</p>
            <p class="text-2xl font-semibold">{{ summary ? summary.total_clicks : "—" }}</p>
          </div>
        </div>
      </UCard>
      <UCard>
        <div class="flex items-center gap-3">
          <span class="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <UIcon name="i-lucide-link" class="size-5" />
          </span>
          <div>
            <p class="text-sm text-muted">Active links</p>
            <p class="text-2xl font-semibold">{{ activeLinks }}<span class="text-sm text-muted">/{{ links.length }}</span></p>
          </div>
        </div>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Top links</h2>
          <UButton to="/dashboard/links" variant="ghost" size="sm" trailing-icon="i-lucide-arrow-right">
            Manage
          </UButton>
        </div>
      </template>

      <div v-if="linksPending" class="flex flex-col gap-2">
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
        <USkeleton class="h-12 w-full" />
      </div>
      <UEmpty
        v-else-if="topLinks.length === 0"
        icon="i-lucide-link-2"
        title="No links yet"
        description="Add your first link to start sharing."
      >
        <template #actions>
          <UButton to="/dashboard/links" icon="i-lucide-plus">Add link</UButton>
        </template>
      </UEmpty>
      <ul v-else class="divide-y divide-default">
        <li v-for="link in topLinks" :key="link.id" class="flex items-center justify-between gap-3 py-2.5">
          <div class="min-w-0">
            <p class="text-sm font-medium truncate">{{ link.title }}</p>
            <p class="text-xs text-muted truncate">{{ link.url }}</p>
          </div>
          <UBadge :color="link.is_active ? 'success' : 'neutral'" variant="subtle">
            {{ link.is_active ? "Live" : "Hidden" }}
          </UBadge>
        </li>
      </ul>
    </UCard>

    <div class="flex flex-wrap gap-2">
      <UButton to="/dashboard/links" icon="i-lucide-plus">Add link</UButton>
      <UButton to="/dashboard/appearance" variant="outline" icon="i-lucide-palette">Edit appearance</UButton>
      <UButton to="/dashboard/analytics" variant="outline" icon="i-lucide-bar-chart-3">View analytics</UButton>
    </div>
  </div>
</template>
