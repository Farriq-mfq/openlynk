import type { Admin, Profile } from "@openlynk/shared";
import { apiMessage } from "./useApi";

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  username: string;
  display_name: string;
}

interface MeResponse {
  admin: Admin;
  profile: Profile;
}

export function useAuth() {
  const admin = useState<Admin | null>("auth:admin", () => null);
  const profile = useState<Profile | null>("auth:profile", () => null);
  const setupRequired = useState<boolean | null>("auth:setup-required", () => null);
  const api = useApi();

  // Whether the installation still needs its first admin. Cached after the
  // first check; cleared to false on successful login/register below.
  async function fetchSetupStatus(): Promise<boolean> {
    if (setupRequired.value !== null) return setupRequired.value;
    try {
      const res = await api<{ setupRequired: boolean }>("/auth/setup-status");
      setupRequired.value = res.setupRequired;
      return res.setupRequired;
    } catch {
      // API unreachable: fail open so pages surface their own errors.
      return false;
    }
  }

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
      setupRequired.value = false;
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Login failed") };
    }
  }

  async function register(input: RegisterInput): Promise<{ ok: boolean; message?: string }> {
    try {
      const res = await api<MeResponse>("/auth/register", {
        method: "POST",
        body: {
          email: input.email.trim(),
          password: input.password,
          username: input.username.trim(),
          display_name: input.display_name.trim(),
        },
      });
      admin.value = res.admin;
      profile.value = res.profile;
      setupRequired.value = false;
      return { ok: true };
    } catch (err) {
      return { ok: false, message: apiMessage(err, "Registration failed") };
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

  return { admin, profile, fetchMe, fetchSetupStatus, login, register, logout };
}
