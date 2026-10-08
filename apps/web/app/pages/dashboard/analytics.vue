<script setup lang="ts">
definePageMeta({ layout: "dashboard" });

useSeoMeta({ title: "Analytics" });

const toast = useToast();
const { range, summary, perLink, pending, fetchAnalytics } = useAnalytics();

try {
  await fetchAnalytics();
} catch {
  if (import.meta.client) {
    toast.add({ title: "Could not load analytics", description: "Is the API running?", color: "error" });
  }
}

const rangeOptions = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
];

const tableColumns = [
  { accessorKey: "title", header: "Link" },
  { accessorKey: "clicks", header: "Clicks" },
  { accessorKey: "unique_clicks", header: "Unique" },
];

async function onRangeChange(): Promise<void> {
  try {
    await fetchAnalytics();
  } catch {
    toast.add({ title: "Could not load analytics", color: "error" });
  }
}

const maxViews = computed(() =>
  Math.max(1, ...(summary.value?.points.map((p) => p.views) ?? [0])),
);

const totals = computed(() => ({
  views: summary.value?.total_views ?? 0,
  clicks: summary.value?.total_clicks ?? 0,
  uniqueViews: summary.value?.points.reduce((s, p) => s + p.unique_views, 0) ?? 0,
  uniqueClicks: summary.value?.points.reduce((s, p) => s + p.unique_clicks, 0) ?? 0,
}));
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Analytics</h1>
        <p class="text-sm text-muted">Privacy-first aggregates — no visitor tracking</p>
      </div>
      <USelect v-model="range" :items="rangeOptions" class="w-40" @update:model-value="onRangeChange()" />
    </div>

    <div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <UCard v-for="stat in [
        { label: 'Views', value: totals.views },
        { label: 'Unique views', value: totals.uniqueViews },
        { label: 'Clicks', value: totals.clicks },
        { label: 'Unique clicks', value: totals.uniqueClicks },
      ]" :key="stat.label">
        <p class="text-sm text-muted">{{ stat.label }}</p>
        <USkeleton v-if="pending && !summary" class="h-8 w-16 mt-1" />
        <p v-else class="text-2xl font-semibold">{{ stat.value }}</p>
      </UCard>
    </div>

    <UCard>
      <template #header><h2 class="font-semibold">Daily views</h2></template>
      <div v-if="pending && !summary" class="flex items-end gap-1 h-32">
        <USkeleton v-for="i in 7" :key="i" class="flex-1" :style="{ height: `${30 + i * 8}%` }" />
      </div>
      <UEmpty
        v-else-if="!summary || summary.points.every((p) => p.views === 0)"
        icon="i-lucide-bar-chart-3"
        title="No views yet"
        description="Share your public page — views appear here."
      />
      <div v-else class="flex items-end gap-1 h-32" role="img" aria-label="Daily profile views bar chart">
        <div
          v-for="p in summary.points"
          :key="p.day"
          class="flex-1 rounded-t bg-primary/70 min-h-[2px]"
          :style="{ height: `${Math.max(2, (p.views / maxViews) * 100)}%` }"
          :title="`${p.day}: ${p.views} views`"
        />
      </div>
      <div v-if="summary && summary.points.some((p) => p.views > 0)" class="flex justify-between text-xs text-muted mt-1">
        <span>{{ summary.points[0]?.day }}</span>
        <span>{{ summary.points[summary.points.length - 1]?.day }}</span>
      </div>
    </UCard>

    <UCard>
      <template #header><h2 class="font-semibold">Clicks per link</h2></template>
      <div v-if="pending && perLink.length === 0" class="flex flex-col gap-2">
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
        <USkeleton class="h-10 w-full" />
      </div>
      <UEmpty
        v-else-if="perLink.length === 0"
        icon="i-lucide-mouse-pointer-click"
        title="No clicks yet"
        description="Clicks on your links are counted here."
      />
      <UTable v-else :data="perLink" :columns="tableColumns" />
    </UCard>
  </div>
</template>
