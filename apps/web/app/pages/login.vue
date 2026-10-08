<script setup lang="ts">
definePageMeta({ layout: false });

useSeoMeta({ title: "Sign in" });

const toast = useToast();
const { login } = useAuth();

const state = reactive({ email: "", password: "" });
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
  return errors;
}

async function onSubmit(): Promise<void> {
  loading.value = true;
  try {
    const res = await login(state);
    if (res.ok) {
      await navigateTo("/dashboard");
    } else {
      toast.add({ title: "Sign in failed", description: res.message, color: "error" });
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
          <h1 class="text-lg font-semibold">Welcome back</h1>
          <p class="text-sm text-muted">Sign in to manage your links</p>
        </div>
      </template>

      <UForm :state="state" :validate="validate" class="flex flex-col gap-4" @submit="onSubmit">
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" type="email" placeholder="you@example.com" icon="i-lucide-mail" class="w-full" autocomplete="email" />
        </UFormField>
        <UFormField label="Password" name="password" required>
          <UInput v-model="state.password" type="password" placeholder="••••••••" icon="i-lucide-lock" class="w-full" autocomplete="current-password" />
        </UFormField>
        <UButton type="submit" :loading="loading" block>Sign in</UButton>
      </UForm>

      <template #footer>
        <p class="text-sm text-center text-muted">
          First time here?
          <NuxtLink to="/setup" class="text-primary font-medium">Set up your account</NuxtLink>
        </p>
      </template>
    </UCard>
  </div>
</template>
