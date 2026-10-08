import type { Link } from "@openlynk/shared";
import { apiMessage } from "./useApi";

export interface LinkForm {
  title: string;
  url: string;
  icon: string;
  is_active: boolean;
}

export function emptyLinkForm(): LinkForm {
  return { title: "", url: "", icon: "", is_active: true };
}

export function useLinks() {
  const links = useState<Link[]>("links:list", () => []);
  const pending = useState<boolean>("links:pending", () => false);
  const api = useApi();

  async function fetchLinks(): Promise<void> {
    pending.value = true;
    try {
      const res = await api<{ links: Link[] }>("/links");
      links.value = res.links;
    } finally {
      pending.value = false;
    }
  }

  async function createLink(form: LinkForm): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await api<{ link: Link }>("/links", {
        method: "POST",
        body: {
          title: form.title.trim(),
          url: form.url.trim(),
          icon: form.icon.trim() || undefined,
          is_active: form.is_active,
        },
      });
      links.value = [...links.value, res.link];
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Could not create link") };
    }
  }

  async function updateLink(
    id: string,
    patch: Partial<Pick<Link, "title" | "url" | "icon" | "is_active">>,
  ): Promise<{ ok: boolean; message?: string }> {
    try {
      const body: Record<string, unknown> = {};
      if (patch.title !== undefined) body.title = patch.title.trim();
      if (patch.url !== undefined) body.url = patch.url.trim();
      if (patch.icon !== undefined) body.icon = patch.icon ? patch.icon.trim() || null : null;
      if (patch.is_active !== undefined) body.is_active = patch.is_active;
      const res = await api<{ link: Link }>(`/links/${id}`, { method: "PUT", body });
      links.value = links.value.map((l) => (l.id === id ? res.link : l));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Could not update link") };
    }
  }

  async function removeLink(id: string): Promise<{ ok: boolean; message?: string }> {
    const snapshot = links.value;
    links.value = links.value.filter((l) => l.id !== id);
    try {
      await api(`/links/${id}`, { method: "DELETE" });
      await fetchLinks();
      return { ok: true };
    } catch (err) {
      links.value = snapshot;
      return { ok: false, message: apiMessage(err, "Could not delete link") };
    }
  }

  function moveLocal(from: number, to: number): void {
    if (to < 0 || to >= links.value.length) return;
    const next = [...links.value];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    links.value = next;
  }

  async function persistOrder(): Promise<{ ok: boolean; message?: string }> {
    const snapshot = links.value;
    try {
      const res = await api<{ links: Link[] }>("/links/reorder", {
        method: "PUT",
        body: { ids: links.value.map((l) => l.id) },
      });
      links.value = res.links;
      return { ok: true };
    } catch (err) {
      links.value = snapshot;
      return { ok: false, message: apiMessage(err, "Could not save order") };
    }
  }

  return {
    links,
    pending,
    fetchLinks,
    createLink,
    updateLink,
    removeLink,
    moveLocal,
    persistOrder,
  };
}
