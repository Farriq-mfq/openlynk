async function fetchPublicUsername(): Promise<string | null> {
  try {
    const api = useApi();
    const res = await api<{ profile: { username: string } }>("/public/profile");
    return res.profile.username || null;
  } catch {
    return null;
  }
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { admin, fetchMe, fetchSetupStatus } = useAuth();

  if (await fetchSetupStatus()) {
    // Fresh installation: the only reachable page is the admin setup screen.
    // In particular /login is NOT accessible until the admin account exists.
    if (to.path !== "/setup") return navigateTo("/setup");
    return;
  }

  if (!admin.value) await fetchMe();

  // `/` is an entry router, not a landing page.
  if (to.path === "/") {
    if (admin.value) return navigateTo("/dashboard");
    const username = await fetchPublicUsername();
    if (username) return navigateTo(`/${username}`);
    return; // nothing published yet — the index fallback renders
  }

  if (to.path.startsWith("/dashboard") && !admin.value) {
    return navigateTo("/login");
  }
  if (to.path === "/login" || to.path === "/setup") {
    if (admin.value) return navigateTo("/dashboard");
  }
  // Setup complete: /setup is closed, never show a dead form.
  if (to.path === "/setup") return navigateTo("/login");
});
