export default defineNuxtRouteMiddleware(async (to) => {
  const { admin, fetchMe, fetchSetupStatus } = useAuth();

  if (await fetchSetupStatus()) {
    // Fresh installation: the only reachable page is the admin setup screen.
    // In particular /login is NOT accessible until the admin account exists.
    if (to.path !== "/register") return navigateTo("/register");
    return;
  }

  if (!admin.value) await fetchMe();

  if (to.path.startsWith("/dashboard") && !admin.value) {
    return navigateTo("/login");
  }
  if (to.path === "/login" || to.path === "/register") {
    if (admin.value) return navigateTo("/dashboard");
  }
  // Setup complete: registration is closed, so never show a dead form.
  if (to.path === "/register") return navigateTo("/login");
});
