import type { Profile, User } from "@openlynk/shared";
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
  user: User;
  profile: Profile;
}

export function useAuth() {
  const user = useState<User | null>("auth:user", () => null);
  const profile = useState<Profile | null>("auth:profile", () => null);
  const api = useApi();

  async function fetchMe(): Promise<boolean> {
    try {
      const me = await api<MeResponse>("/auth/me");
      user.value = me.user;
      profile.value = me.profile;
      return true;
    } catch {
      user.value = null;
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
      user.value = me.user;
      profile.value = me.profile;
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
      user.value = res.user;
      profile.value = res.profile;
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
    user.value = null;
    profile.value = null;
    await navigateTo("/login");
  }

  return { user, profile, fetchMe, login, register, logout };
}
