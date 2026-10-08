<script setup lang="ts">
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HEX_COLOR_PATTERN,
  HTTP_URL_PATTERN,
  USERNAME_PATTERN,
  type ButtonStyle,
} from "@openlynk/shared";

definePageMeta({ layout: "dashboard" });

useSeoMeta({ title: "Appearance" });

const toast = useToast();
const { profile, saving, saveProfile, saveAppearance, uploadImage } = useProfile();
const { fetchMe } = useAuth();

try {
  await fetchMe();
} catch {
  if (import.meta.client) {
    toast.add({ title: "Could not load profile", description: "Is the API running?", color: "error" });
  }
}

const profileForm = reactive({
  display_name: profile.value?.display_name ?? "",
  username: profile.value?.username ?? "",
  bio: profile.value?.bio ?? "",
  avatar_url: profile.value?.avatar_url ?? "",
  is_published: profile.value?.is_published ?? true,
});

const appearanceForm = reactive({
  theme: profile.value?.theme ?? "minimal",
  background_color: profile.value?.background_color ?? "#ffffff",
  text_color: profile.value?.text_color ?? "#111111",
  accent_color: profile.value?.accent_color ?? "#4f46e5",
  font_family: profile.value?.font_family ?? "inter",
  button_style: profile.value?.button_style ?? "rounded",
});

// Background image lives in theme_config (no schema migration needed).
const backgroundImage = ref(profile.value?.theme_config?.background_image_url ?? "");
const uploadingAvatar = ref(false);
const uploadingBg = ref(false);
const avatarInput = ref<HTMLInputElement | null>(null);
const bgInput = ref<HTMLInputElement | null>(null);

watch(profile, (p) => {
  if (!p) return;
  profileForm.display_name = p.display_name;
  profileForm.username = p.username;
  profileForm.bio = p.bio ?? "";
  profileForm.avatar_url = p.avatar_url ?? "";
  profileForm.is_published = p.is_published;
  appearanceForm.theme = p.theme;
  appearanceForm.background_color = p.background_color;
  appearanceForm.text_color = p.text_color;
  appearanceForm.accent_color = p.accent_color;
  appearanceForm.font_family = p.font_family;
  appearanceForm.button_style = p.button_style;
  backgroundImage.value = p.theme_config?.background_image_url ?? "";
});

interface FieldError {
  path: string;
  message: string;
}

const fontOptions = [
  { label: "Inter", value: "inter" },
  { label: "System", value: "system" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "mono" },
];

const buttonOptions = [
  { label: "Rounded", value: "rounded" },
  { label: "Pill", value: "pill" },
  { label: "Square", value: "square" },
  { label: "Outline", value: "outline" },
];

interface ThemePreset {
  name: string;
  theme: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  button_style: ButtonStyle;
}

const themePresets: ThemePreset[] = [
  { name: "Minimal", theme: "minimal", background_color: "#ffffff", text_color: "#111111", accent_color: "#4f46e5", font_family: "inter", button_style: "rounded" },
  { name: "Midnight", theme: "midnight", background_color: "#0f172a", text_color: "#f8fafc", accent_color: "#38bdf8", font_family: "inter", button_style: "rounded" },
  { name: "Sunset", theme: "sunset", background_color: "#fff7ed", text_color: "#431407", accent_color: "#ea580c", font_family: "serif", button_style: "pill" },
  { name: "Forest", theme: "forest", background_color: "#f0fdf4", text_color: "#14532d", accent_color: "#16a34a", font_family: "system", button_style: "square" },
  { name: "Ocean", theme: "ocean", background_color: "#eff6ff", text_color: "#1e3a8a", accent_color: "#2563eb", font_family: "inter", button_style: "pill" },
  { name: "Blush", theme: "blush", background_color: "#fdf2f8", text_color: "#831843", accent_color: "#db2777", font_family: "serif", button_style: "rounded" },
];

function applyPreset(p: ThemePreset): void {
  appearanceForm.theme = p.theme;
  appearanceForm.background_color = p.background_color;
  appearanceForm.text_color = p.text_color;
  appearanceForm.accent_color = p.accent_color;
  appearanceForm.font_family = p.font_family;
  appearanceForm.button_style = p.button_style;
}

function validImageFile(file: File): string | null {
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return "Only PNG, JPEG, WebP, or GIF images";
  if (file.size <= 0 || file.size > 2 * 1024 * 1024) return "Image must be under 2 MB";
  return null;
}

async function onAvatarFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const invalid = validImageFile(file);
  if (invalid) {
    toast.add({ title: "Invalid image", description: invalid, color: "error" });
    return;
  }
  uploadingAvatar.value = true;
  try {
    const res = await uploadImage(file);
    if (res.ok && res.url) {
      profileForm.avatar_url = res.url;
      toast.add({ title: "Avatar uploaded", description: "Save profile to apply", color: "success" });
    } else {
      toast.add({ title: "Upload failed", description: res.message, color: "error" });
    }
  } finally {
    uploadingAvatar.value = false;
  }
}

async function onBgFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  const invalid = validImageFile(file);
  if (invalid) {
    toast.add({ title: "Invalid image", description: invalid, color: "error" });
    return;
  }
  uploadingBg.value = true;
  try {
    const res = await uploadImage(file);
    if (res.ok && res.url) {
      backgroundImage.value = res.url;
      toast.add({ title: "Background uploaded", description: "Save theme to apply", color: "success" });
    } else {
      toast.add({ title: "Upload failed", description: res.message, color: "error" });
    }
  } finally {
    uploadingBg.value = false;
  }
}

function validateProfile(): FieldError[] {
  const errors: FieldError[] = [];
  if (!profileForm.display_name.trim()) {
    errors.push({ path: "display_name", message: "Display name is required" });
  } else if (profileForm.display_name.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    errors.push({ path: "display_name", message: `Max ${DISPLAY_NAME_MAX_LENGTH} characters` });
  }
  if (!USERNAME_PATTERN.test(profileForm.username.trim().toLowerCase())) {
    errors.push({ path: "username", message: "Lowercase letters, numbers and _ only (3–30)" });
  }
  if (profileForm.bio.trim().length > BIO_MAX_LENGTH) {
    errors.push({ path: "bio", message: `Max ${BIO_MAX_LENGTH} characters` });
  }
  if (profileForm.avatar_url.trim() && !HTTP_URL_PATTERN.test(profileForm.avatar_url.trim())) {
    errors.push({ path: "avatar_url", message: "Must be an http(s) URL" });
  }
  return errors;
}

function validateAppearance(): FieldError[] {
  const errors: FieldError[] = [];
  for (const key of ["background_color", "text_color", "accent_color"] as const) {
    if (!HEX_COLOR_PATTERN.test(appearanceForm[key])) {
      errors.push({ path: key, message: "Must be a hex color like #4f46e5" });
    }
  }
  if (!appearanceForm.theme.trim()) errors.push({ path: "theme", message: "Pick a theme preset" });
  if (backgroundImage.value.trim() && !HTTP_URL_PATTERN.test(backgroundImage.value.trim())) {
    errors.push({ path: "background_image", message: "Must be an http(s) URL" });
  }
  return errors;
}

async function onSaveProfile(): Promise<void> {
  const res = await saveProfile({ ...profileForm });
  toast.add(
    res.ok
      ? { title: "Profile saved", color: "success" }
      : { title: "Save failed", description: res.message, color: "error" },
  );
}

async function onSaveAppearance(): Promise<void> {
  const res = await saveAppearance({
    ...appearanceForm,
    theme_config: {
      ...(profile.value?.theme_config ?? {}),
      background_image_url: backgroundImage.value.trim() || null,
    },
  });
  toast.add(
    res.ok
      ? { title: "Appearance saved", color: "success" }
      : { title: "Save failed", description: res.message, color: "error" },
  );
}

const previewStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = {
    backgroundColor: appearanceForm.background_color,
    color: appearanceForm.text_color,
  };
  if (backgroundImage.value.trim()) {
    style.backgroundImage = `url("${backgroundImage.value.trim()}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }
  return style;
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-xl font-semibold">Appearance</h1>
      <p class="text-sm text-muted">Profile info and public page theme</p>
    </div>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div class="flex flex-col gap-6 min-w-0">
        <UCard>
          <template #header><h2 class="font-semibold">Profile</h2></template>
          <UForm :state="profileForm" :validate="validateProfile" class="flex flex-col gap-4" @submit="onSaveProfile">
            <UFormField label="Display name" name="display_name" required>
              <UInput v-model="profileForm.display_name" class="w-full" />
            </UFormField>
            <UFormField label="Username" name="username" required hint="Your public URL path">
              <UInput v-model="profileForm.username" class="w-full" />
            </UFormField>
            <UFormField label="Bio" name="bio">
              <UTextarea v-model="profileForm.bio" :rows="3" class="w-full" placeholder="A line about you" />
            </UFormField>
            <UFormField label="Avatar" name="avatar_url">
              <div class="flex items-center gap-3">
                <UAvatar
                  v-if="profileForm.avatar_url"
                  :src="profileForm.avatar_url"
                  :alt="profileForm.display_name || 'avatar'"
                  size="lg"
                />
                <span
                  v-else
                  class="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold"
                >
                  {{ (profileForm.display_name || "?").slice(0, 1).toUpperCase() }}
                </span>
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="hidden"
                  @change="onAvatarFile"
                >
                <UButton
                  variant="outline"
                  size="sm"
                  icon="i-lucide-upload"
                  :loading="uploadingAvatar"
                  @click="avatarInput?.click()"
                >
                  Upload
                </UButton>
                <UButton
                  v-if="profileForm.avatar_url"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  @click="profileForm.avatar_url = ''"
                >
                  Remove
                </UButton>
              </div>
              <p class="text-xs text-muted mt-1">PNG, JPEG, WebP or GIF, max 2 MB. Save profile to apply.</p>
            </UFormField>
            <UFormField label="Published" name="is_published" description="Hidden pages return 404">
              <USwitch v-model="profileForm.is_published" />
            </UFormField>
            <div><UButton type="submit" :loading="saving">Save profile</UButton></div>
          </UForm>
        </UCard>

        <UCard>
          <template #header><h2 class="font-semibold">Theme</h2></template>
          <UForm :state="appearanceForm" :validate="validateAppearance" class="flex flex-col gap-4" @submit="onSaveAppearance">
            <div>
              <p class="text-sm font-medium mb-2">Theme preset</p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  v-for="preset in themePresets"
                  :key="preset.theme"
                  type="button"
                  class="flex items-center gap-2 rounded-lg border p-2 text-left transition-colors"
                  :class="appearanceForm.theme === preset.theme ? 'border-primary' : 'border-default'"
                  @click="applyPreset(preset)"
                >
                  <span class="flex -space-x-1">
                    <span class="size-5 rounded-full border border-default" :style="{ backgroundColor: preset.background_color }" />
                    <span class="size-5 rounded-full border border-default" :style="{ backgroundColor: preset.text_color }" />
                    <span class="size-5 rounded-full border border-default" :style="{ backgroundColor: preset.accent_color }" />
                  </span>
                  <span class="text-sm">{{ preset.name }}</span>
                </button>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <UFormField label="Background" name="background_color">
                <div class="flex items-center gap-2">
                  <input v-model="appearanceForm.background_color" type="color" class="size-9 rounded border border-default cursor-pointer" aria-label="Background color picker" >
                  <UInput v-model="appearanceForm.background_color" class="flex-1" />
                </div>
              </UFormField>
              <UFormField label="Text" name="text_color">
                <div class="flex items-center gap-2">
                  <input v-model="appearanceForm.text_color" type="color" class="size-9 rounded border border-default cursor-pointer" aria-label="Text color picker" >
                  <UInput v-model="appearanceForm.text_color" class="flex-1" />
                </div>
              </UFormField>
              <UFormField label="Accent" name="accent_color">
                <div class="flex items-center gap-2">
                  <input v-model="appearanceForm.accent_color" type="color" class="size-9 rounded border border-default cursor-pointer" aria-label="Accent color picker" >
                  <UInput v-model="appearanceForm.accent_color" class="flex-1" />
                </div>
              </UFormField>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <UFormField label="Font" name="font_family">
                <USelect v-model="appearanceForm.font_family" :items="fontOptions" class="w-full" />
              </UFormField>
              <UFormField label="Button style" name="button_style">
                <USelect v-model="appearanceForm.button_style" :items="buttonOptions" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="Background image" name="background_image" hint="Overrides the solid color on your public page">
              <div class="flex items-center gap-3">
                <img
                  v-if="backgroundImage"
                  :src="backgroundImage"
                  alt="Background preview"
                  class="h-14 w-24 rounded-lg border border-default object-cover"
                >
                <span v-else class="h-14 w-24 rounded-lg border border-dashed border-default flex items-center justify-center text-xs text-muted">
                  None
                </span>
                <input
                  ref="bgInput"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  class="hidden"
                  @change="onBgFile"
                >
                <UButton
                  variant="outline"
                  size="sm"
                  icon="i-lucide-upload"
                  :loading="uploadingBg"
                  @click="bgInput?.click()"
                >
                  Upload
                </UButton>
                <UButton
                  v-if="backgroundImage"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  @click="backgroundImage = ''"
                >
                  Remove
                </UButton>
              </div>
            </UFormField>
            <div><UButton type="submit" :loading="saving">Save theme</UButton></div>
          </UForm>
        </UCard>
      </div>

      <div>
        <div class="xl:sticky xl:top-6">
          <p class="text-sm font-medium mb-2">Live preview</p>
          <div
            class="max-w-md mx-auto rounded-2xl border border-default p-6 flex flex-col items-center gap-3"
            :style="previewStyle"
          >
            <USkeleton v-if="!profile" class="size-16 rounded-full" />
            <UAvatar
              v-else-if="profileForm.avatar_url"
              :src="profileForm.avatar_url"
              :alt="profileForm.display_name || 'avatar'"
              size="xl"
            />
            <span
              v-else
              class="size-16 rounded-full flex items-center justify-center text-xl font-bold"
              :style="{ backgroundColor: appearanceForm.accent_color, color: '#ffffff' }"
            >
              {{ (profile.display_name || "?").slice(0, 1).toUpperCase() }}
            </span>
            <p class="font-semibold">{{ profileForm.display_name || "Your name" }}</p>
            <p class="text-sm opacity-70 text-center">{{ profileForm.bio || "Your bio" }}</p>
            <span
              class="w-full text-center text-sm font-medium py-2.5"
              :style="{
                backgroundColor: appearanceForm.button_style === 'outline' ? 'transparent' : appearanceForm.accent_color,
                color: appearanceForm.button_style === 'outline' ? appearanceForm.accent_color : '#ffffff',
                border: appearanceForm.button_style === 'outline' ? `1px solid ${appearanceForm.accent_color}` : 'none',
                borderRadius:
                  appearanceForm.button_style === 'pill' ? '9999px' : appearanceForm.button_style === 'square' ? '0' : '0.75rem',
              }"
            >
              Example link
            </span>
            <span
              class="w-full text-center text-sm font-medium py-2.5"
              :style="{
                backgroundColor: appearanceForm.button_style === 'outline' ? 'transparent' : appearanceForm.accent_color,
                color: appearanceForm.button_style === 'outline' ? appearanceForm.accent_color : '#ffffff',
                border: appearanceForm.button_style === 'outline' ? `1px solid ${appearanceForm.accent_color}` : 'none',
                borderRadius:
                  appearanceForm.button_style === 'pill' ? '9999px' : appearanceForm.button_style === 'square' ? '0' : '0.75rem',
              }"
            >
              Another link
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
