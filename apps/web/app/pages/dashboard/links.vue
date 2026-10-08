<script setup lang="ts">
import type { Link } from "@openlynk/shared";
import { TITLE_MAX_LENGTH, URL_MAX_LENGTH } from "@openlynk/shared";

definePageMeta({ layout: "dashboard" });

useSeoMeta({ title: "Links" });

const toast = useToast();
const { links, pending, fetchLinks, createLink, updateLink, removeLink, moveLocal, persistOrder } =
  useLinks();

try {
  await fetchLinks();
} catch {
  if (import.meta.client) {
    toast.add({ title: "Could not load links", description: "Is the API running?", color: "error" });
  }
}

const showForm = ref(false);
const editing = ref<Link | null>(null);
const formSaving = ref(false);
const form = reactive({ title: "", url: "", icon: "", is_active: true });

const showDelete = ref(false);
const deleting = ref<Link | null>(null);
const deleteSaving = ref(false);

const dragIndex = ref<number | null>(null);

interface FieldError {
  path: string;
  message: string;
}

function validateForm(): FieldError[] {
  const errors: FieldError[] = [];
  if (!form.title.trim()) errors.push({ path: "title", message: "Title is required" });
  else if (form.title.trim().length > TITLE_MAX_LENGTH) {
    errors.push({ path: "title", message: `Max ${TITLE_MAX_LENGTH} characters` });
  }
  if (!form.url.trim()) errors.push({ path: "url", message: "URL is required" });
  else if (!/^https:\/\//.test(form.url.trim()) || form.url.trim().length > URL_MAX_LENGTH) {
    errors.push({ path: "url", message: "Must be an https:// URL" });
  }
  return errors;
}

function openAdd(): void {
  editing.value = null;
  form.title = "";
  form.url = "";
  form.icon = "";
  form.is_active = true;
  showForm.value = true;
}

function openEdit(link: Link): void {
  editing.value = link;
  form.title = link.title;
  form.url = link.url;
  form.icon = link.icon ?? "";
  form.is_active = link.is_active;
  showForm.value = true;
}

async function onSubmitForm(): Promise<void> {
  formSaving.value = true;
  try {
    const res = editing.value
      ? await updateLink(editing.value.id, {
          title: form.title,
          url: form.url,
          icon: form.icon,
          is_active: form.is_active,
        })
      : await createLink(form);
    if (res.ok) {
      toast.add({
        title: editing.value ? "Link updated" : "Link added",
        color: "success",
      });
      showForm.value = false;
    } else {
      toast.add({ title: "Save failed", description: res.message, color: "error" });
    }
  } finally {
    formSaving.value = false;
  }
}

async function onToggle(link: Link, value: boolean): Promise<void> {
  const res = await updateLink(link.id, { is_active: value });
  if (!res.ok) toast.add({ title: "Toggle failed", description: res.message, color: "error" });
}

function askDelete(link: Link): void {
  deleting.value = link;
  showDelete.value = true;
}

async function onConfirmDelete(): Promise<void> {
  if (!deleting.value) return;
  deleteSaving.value = true;
  try {
    const res = await removeLink(deleting.value.id);
    if (res.ok) {
      toast.add({ title: "Link deleted", color: "success" });
      showDelete.value = false;
    } else {
      toast.add({ title: "Delete failed", description: res.message, color: "error" });
    }
  } finally {
    deleteSaving.value = false;
  }
}

async function onMove(from: number, to: number): Promise<void> {
  moveLocal(from, to);
  const res = await persistOrder();
  if (!res.ok) {
    toast.add({ title: "Reorder failed", description: res.message, color: "error" });
    await fetchLinks();
  }
}

function onDragStart(index: number): void {
  dragIndex.value = index;
}

async function onDrop(index: number): Promise<void> {
  if (dragIndex.value === null || dragIndex.value === index) return;
  const from = dragIndex.value;
  dragIndex.value = null;
  await onMove(from, index);
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">Links</h1>
        <p class="text-sm text-muted">Drag to reorder — order saves automatically</p>
      </div>
      <UButton icon="i-lucide-plus" @click="openAdd()">Add link</UButton>
    </div>

    <div v-if="pending" class="flex flex-col gap-3">
      <USkeleton class="h-20 w-full" />
      <USkeleton class="h-20 w-full" />
      <USkeleton class="h-20 w-full" />
    </div>

    <UEmpty
      v-else-if="links.length === 0"
      icon="i-lucide-link-2"
      title="No links yet"
      description="Add your first link — it appears on your public page instantly."
    >
      <template #actions>
        <UButton icon="i-lucide-plus" @click="openAdd()">Add link</UButton>
      </template>
    </UEmpty>

    <div v-else class="flex flex-col gap-3">
      <UCard
        v-for="(link, i) in links"
        :key="link.id"
        draggable="true"
        :class="{ 'opacity-50': dragIndex === i }"
        :ui="{ body: 'p-3 sm:p-4' }"
        @dragstart="onDragStart(i)"
        @dragover.prevent
        @drop="onDrop(i)"
      >
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="cursor-grab text-muted shrink-0" title="Drag to reorder">
            <UIcon name="i-lucide-grip-vertical" class="size-5" />
          </span>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">{{ link.title }}</p>
            <p class="text-xs text-muted truncate">{{ link.url }}</p>
          </div>

          <UBadge :color="link.is_active ? 'success' : 'neutral'" variant="subtle" class="shrink-0 hidden sm:inline-flex">
            {{ link.is_active ? "Live" : "Hidden" }}
          </UBadge>

          <USwitch
            :model-value="link.is_active"
            :aria-label="`Toggle ${link.title}`"
            @update:model-value="(v: boolean) => onToggle(link, v)"
          />

          <div class="flex items-center shrink-0">
            <UButton
              icon="i-lucide-arrow-up"
              variant="ghost"
              color="neutral"
              size="sm"
              :disabled="i === 0"
              :aria-label="`Move ${link.title} up`"
              @click="onMove(i, i - 1)"
            />
            <UButton
              icon="i-lucide-arrow-down"
              variant="ghost"
              color="neutral"
              size="sm"
              :disabled="i === links.length - 1"
              :aria-label="`Move ${link.title} down`"
              @click="onMove(i, i + 1)"
            />
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="sm"
              :aria-label="`Edit ${link.title}`"
              @click="openEdit(link)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              :aria-label="`Delete ${link.title}`"
              @click="askDelete(link)"
            />
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="showForm" :title="editing ? 'Edit link' : 'Add link'">
      <template #body>
        <UForm :state="form" :validate="validateForm" class="flex flex-col gap-4" @submit="onSubmitForm">
          <UFormField label="Title" name="title" required>
            <UInput v-model="form.title" placeholder="My awesome project" class="w-full" />
          </UFormField>
          <UFormField label="URL" name="url" required hint="https:// only">
            <UInput v-model="form.url" placeholder="https://example.com" inputmode="url" class="w-full" />
          </UFormField>
          <UFormField label="Icon" name="icon" hint="Optional short label, e.g. github">
            <UInput v-model="form.icon" placeholder="github" class="w-full" />
          </UFormField>
          <UFormField label="Visibility" name="is_active">
            <USwitch v-model="form.is_active" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showForm = false">Cancel</UButton>
            <UButton type="submit" :loading="formSaving">Save</UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <UModal v-model:open="showDelete" title="Delete link?">
      <template #body>
        <p class="text-sm text-muted">
          {{ deleting ? `"${deleting.title}" will be removed from your public page.` : "" }}
          This cannot be undone.
        </p>
        <div class="flex justify-end gap-2 mt-4">
          <UButton variant="ghost" color="neutral" @click="showDelete = false">Cancel</UButton>
          <UButton color="error" :loading="deleteSaving" @click="onConfirmDelete()">Delete</UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
