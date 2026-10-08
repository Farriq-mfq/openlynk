<script setup lang="ts">
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HEX_COLOR_PATTERN,
  USERNAME_PATTERN,
} from "@openlynk/shared";

definePageMeta({ layout: "dashboard" });

useSeoMeta({ title: "Appearance" });

const toast = useToast();
const { profile, saving, saveProfile, saveAppearance } = useProfile();
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
  if (profileForm.avatar_url.trim() && !/^https:\/\//.test(profileForm.avatar_url.trim())) {
    errors.push({ path: "avatar_url", message: "Must be an https:// URL" });
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
  if (!appearanceForm.theme.trim()) errors.push({ path: "theme", message: "Theme is required" });
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
  const res = await saveAppearance({ ...appearanceForm });
  toast.add(
    res.ok
      ? { title: "Appearance saved", color: "success" }
      : { title: "Save failed", description: res.message, color: "error" },
  );
}
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
            <UFormField label="Avatar URL" name="avatar_url" hint="https:// only, blank for initial">
              <UInput v-model="profileForm.avatar_url" inputmode="url" class="w-full" placeholder="https://…" />
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
            <UFormField label="Theme preset" name="theme">
              <UInput v-model="appearanceForm.theme" class="w-full" placeholder="minimal" />
            </UFormField>
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
            <div><UButton type="submit" :loading="saving">Save theme</UButton></div>
          </UForm>
        </UCard>
      </div>

      <div>
        <div class="xl:sticky xl:top-6">
          <p class="text-sm font-medium mb-2">Live preview</p>
          <div
            class="max-w-md mx-auto rounded-2xl border border-default p-6 flex flex-col items-center gap-3"
            :style="{ backgroundColor: appearanceForm.background_color, color: appearanceForm.text_color }"
          >
            <USkeleton v-if="!profile" class="size-16 rounded-full" />
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
