import type { Profile } from "@openlynk/shared";
import { apiMessage } from "./useApi";
import { useAuth } from "./useAuth";

export interface ProfileForm {
  display_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  is_published: boolean;
}

export interface AppearanceForm {
  theme: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  button_style: string;
}

export function useProfile() {
  const { profile } = useAuth();
  const saving = useState<boolean>("profile:saving", () => false);
  const api = useApi();

  async function saveProfile(form: ProfileForm): Promise<{ ok: boolean; message?: string }> {
    saving.value = true;
    try {
      const res = await api<{ profile: Profile }>("/profile/me", {
        method: "PUT",
        body: {
          display_name: form.display_name.trim(),
          username: form.username.trim(),
          bio: form.bio.trim() || null,
          avatar_url: form.avatar_url.trim() || null,
          is_published: form.is_published,
        },
      });
      profile.value = res.profile;
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Could not save profile") };
    } finally {
      saving.value = false;
    }
  }

  async function saveAppearance(form: AppearanceForm): Promise<{ ok: boolean; message?: string }> {
    saving.value = true;
    try {
      const res = await api<{ profile: Profile }>("/profile/appearance", {
        method: "PUT",
        body: {
          theme: form.theme.trim() || undefined,
          background_color: form.background_color,
          text_color: form.text_color,
          accent_color: form.accent_color,
          font_family: form.font_family,
          button_style: form.button_style,
        },
      });
      profile.value = res.profile;
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Could not save appearance") };
    } finally {
      saving.value = false;
    }
  }

  return { profile, saving, saveProfile, saveAppearance };
}
