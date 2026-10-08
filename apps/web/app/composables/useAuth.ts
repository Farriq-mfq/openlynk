import type { Admin, Profile } from "@openlynk/shared";
import { apiMessage } from "./useApi";

export interface LoginInput {
  email: string;
  password: string;
}

interface MeResponse {
  admin: Admin;
  profile: Profile;
}

export function useAuth() {
  const admin = useState<Admin | null>("auth:admin", () => null);
  const profile = useState<Profile | null>("auth:profile", () => null);
  const api = useApi();

  async function fetchMe(): Promise<boolean> {
    try {
      const me = await api<MeResponse>("/auth/me");
      admin.value = me.admin;
      profile.value = me.profile;
      return true;
    } catch {
      admin.value = null;
      profile.value = null;
      return false;
    }
  }

  async function login(input: LoginInput): Promise<{ ok: boolean; message?: string }> {
    try {
      const me = await api<MeResponse>("/auth/login", {
        method: "POST",
        body: { email: input.email.trim(), password: input.password },
      });
      admin.value = me.admin;
      profile.value = me.profile;
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Login failed") };
    }
  }

  async function logout(): Promise<void> {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Cookie may already be gone — still clear local state.
    }
    admin.value = null;
    profile.value = null;
    await navigateTo("/login");
  }

  return { admin, profile, fetchMe, login, logout };
}
