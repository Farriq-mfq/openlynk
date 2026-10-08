<script setup lang="ts">
import {
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RESERVED_USERNAMES,
  USERNAME_PATTERN,
} from "@openlynk/shared";

definePageMeta({ layout: false });

useSeoMeta({ title: "Create your account" });

const toast = useToast();
const { register } = useAuth();

const state = reactive({ email: "", password: "", username: "", display_name: "" });
const loading = ref(false);

interface FieldError {
  path: string;
  message: string;
}

function validate(s: typeof state): FieldError[] {
  const errors: FieldError[] = [];
  if (!s.email.trim()) errors.push({ path: "email", message: "Email is required" });
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim())) {
    errors.push({ path: "email", message: "Enter a valid email" });
  }
  if (!s.password) errors.push({ path: "password", message: "Password is required" });
  else if (s.password.length < PASSWORD_MIN_LENGTH || s.password.length > PASSWORD_MAX_LENGTH) {
    errors.push({ path: "password", message: `Password must be ${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters` });
  }
  if (!s.username.trim()) errors.push({ path: "username", message: "Username is required" });
  else if (!USERNAME_PATTERN.test(s.username.trim().toLowerCase())) {
    errors.push({ path: "username", message: "Lowercase letters, numbers and _ only (3–30)" });
  } else if ((RESERVED_USERNAMES as readonly string[]).includes(s.username.trim().toLowerCase())) {
    errors.push({ path: "username", message: "This username is reserved" });
  }
  if (!s.display_name.trim()) errors.push({ path: "display_name", message: "Display name is required" });
  else if (s.display_name.trim().length > DISPLAY_NAME_MAX_LENGTH) {
    errors.push({ path: "display_name", message: `Max ${DISPLAY_NAME_MAX_LENGTH} characters` });
  }
  return errors;
}

async function onSubmit(): Promise<void> {
  loading.value = true;
  try {
    const res = await register(state);
    if (res.ok) {
      toast.add({ title: "Account created", description: "Welcome to OpenLynk", color: "success" });
      await navigateTo("/dashboard");
    } else {
      toast.add({ title: "Sign up failed", description: res.message, color: "error" });
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <UCard class="w-full max-w-md">
      <template #header>
        <div class="flex flex-col items-center gap-2 py-2">
          <span class="size-10 rounded-xl bg-primary flex items-center justify-center text-lg font-bold text-white">O</span>
          <h1 class="text-lg font-semibold">Create your page</h1>
          <p class="text-sm text-muted">One account, one public link-in-bio</p>
        </div>
      </template>

      <UForm :state="state" :validate="validate" class="flex flex-col gap-4" @submit="onSubmit">
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" type="email" placeholder="you@example.com" icon="i-lucide-mail" class="w-full" autocomplete="email" />
        </UFormField>
        <UFormField label="Password" name="password" required :hint="`${PASSWORD_MIN_LENGTH}+ characters`">
          <UInput v-model="state.password" type="password" placeholder="••••••••" icon="i-lucide-lock" class="w-full" autocomplete="new-password" />
        </UFormField>
        <UFormField label="Username" name="username" required hint="Your public URL">
          <UInput v-model="state.username" placeholder="yourname" icon="i-lucide-at-sign" class="w-full" autocomplete="username" />
        </UFormField>
        <UFormField label="Display name" name="display_name" required>
          <UInput v-model="state.display_name" type="text" placeholder="Your Name" icon="i-lucide-user" class="w-full" />
        </UFormField>
        <UButton type="submit" :loading="loading" block>Create account</UButton>
      </UForm>

      <template #footer>
        <p class="text-sm text-center text-muted">
          Already have an account?
          <NuxtLink to="/login" class="text-primary font-medium">Sign in</NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
