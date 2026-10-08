<script setup lang="ts">
import type { Link, Profile } from "@openlynk/shared";

definePageMeta({ layout: false });

const route = useRoute();
const rawUsername = computed(() => String(route.params.username ?? ""));
const username = computed(() => rawUsername.value.replace(/^@/, "").toLowerCase());

// Canonical URL is /:username — /@:username permanently redirects.
if (rawUsername.value.startsWith("@") && username.value) {
  await navigateTo(`/${username.value}`, { redirectCode: 301 });
}

const config = useRuntimeConfig();
const serverBase =
  import.meta.server && config.apiBaseInternal ? config.apiBaseInternal : config.public.apiBase;

interface PublicPayload {
  profile: Profile;
  links: Link[];
}

const { data, error } = await useAsyncData<PublicPayload>(
  `public:${username.value}`,
  () =>
    $fetch<PublicPayload>(
      `${serverBase}/api/v1/public/${encodeURIComponent(username.value)}`,
    ),
);

if (error.value || !data.value) {
  const errRec = error.value as {
    response?: { status?: number };
    statusCode?: number;
    status?: number;
  } | null;
  const apiStatus = errRec?.response?.status ?? errRec?.statusCode ?? errRec?.status;
  throw createError({
    statusCode: apiStatus === 404 ? 404 : 502,
    statusMessage: apiStatus === 404 ? "Page not found" : "Upstream unavailable",
    fatal: true,
  });
}

const profile = computed(() => data.value!.profile);
const links = computed(() => data.value!.links);

const pageTitle = computed(() => `${profile.value.display_name} (@${profile.value.username})`);
const pageDescription = computed(
  () => profile.value.bio?.trim() || `${profile.value.display_name}'s links on OpenLynk`,
);

useSeoMeta({
  title: () => pageTitle.value,
  description: () => pageDescription.value,
  ogTitle: () => pageTitle.value,
  ogDescription: () => pageDescription.value,
  ogType: "profile",
  ...(profile.value.avatar_url ? { ogImage: profile.value.avatar_url } : {}),
  twitterCard: "summary",
  twitterTitle: () => pageTitle.value,
  twitterDescription: () => pageDescription.value,
});

const fontStacks: Record<string, string> = {
  inter: "Inter, ui-sans-serif, system-ui, sans-serif",
  system: "ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const backgroundImageUrl = computed(() => {
  const raw = profile.value.theme_config?.background_image_url;
  if (typeof raw !== "string" || !raw.trim()) return null;
  return safeUrl(raw.trim());
});

const pageStyle = computed(() => ({
  backgroundColor: profile.value.background_color,
  ...(backgroundImageUrl.value
    ? {
        backgroundImage: `url("${backgroundImageUrl.value}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }
    : {}),
  color: profile.value.text_color,
  fontFamily: fontStacks[profile.value.font_family] ?? fontStacks.inter,
}));

const buttonRadius = computed(() => {
  switch (profile.value.button_style) {
    case "pill":
      return "9999px";
    case "square":
      return "0";
    default:
      return "0.75rem";
  }
});

function buttonStyle(): Record<string, string> {
  const outline = profile.value.button_style === "outline";
  return {
    backgroundColor: outline ? "transparent" : profile.value.accent_color,
    color: outline ? profile.value.accent_color : "#ffffff",
    border: outline ? `1px solid ${profile.value.accent_color}` : "none",
    borderRadius: buttonRadius.value,
  };
}

function safeUrl(url: string): string | null {
  return /^https?:\/\//.test(url) ? url : null;
}

function beacon(path: string): void {
  try {
    const url = `${config.public.apiBase}/api/v1${path}`;
    if (!navigator.sendBeacon(url)) {
      fetch(url, { method: "POST", keepalive: true }).catch(() => {});
    }
  } catch {
    // Tracking must never break the page (private mode, blockers, …).
  }
}

// Passive view trigger: once per tab session, after first paint (SSR unaffected).
onMounted(() => {
  try {
    const key = `ol-viewed:${username.value}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    beacon(`/public/${encodeURIComponent(username.value)}/view`);
  } catch {
    // Storage unavailable — skip silently rather than spamming views.
  }
});

function trackClick(id: string): void {
  beacon(`/public/links/${id}/click`);
}
</script>

<template>
  <div class="min-h-screen" :style="pageStyle">
    <main class="max-w-md mx-auto px-5 py-10 flex flex-col items-center gap-4">
      <UAvatar
        v-if="profile.avatar_url"
        :src="profile.avatar_url"
        :alt="profile.display_name"
        size="3xl"
      />
      <span
        v-else
        class="size-20 rounded-full flex items-center justify-center text-2xl font-bold"
        :style="{ backgroundColor: profile.accent_color, color: '#ffffff' }"
      >
        {{ (profile.display_name || "?").slice(0, 1).toUpperCase() }}
      </span>

      <div class="text-center">
        <h1 class="text-xl font-bold">{{ profile.display_name }}</h1>
        <p class="text-sm opacity-70">@{{ profile.username }}</p>
      </div>

      <p v-if="profile.bio" class="text-sm text-center opacity-80">{{ profile.bio }}</p>

      <nav class="w-full flex flex-col gap-3 mt-2" aria-label="Links">
        <a
          v-for="link in links"
          :key="link.id"
          :href="safeUrl(link.url) ?? undefined"
          target="_blank"
          rel="noopener"
          class="block w-full text-center text-sm font-medium py-3 px-4 transition-opacity hover:opacity-90"
          :style="buttonStyle()"
          @click="trackClick(link.id)"
        >
          {{ link.title }}
        </a>
      </nav>

      <p v-if="links.length === 0" class="text-sm opacity-60 mt-2">No links yet.</p>

      <footer class="mt-6 text-xs opacity-50">
        Made with OpenLynk
      </footer>
    </main>
  </div>
</template>
