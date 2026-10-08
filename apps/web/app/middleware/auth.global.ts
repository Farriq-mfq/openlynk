export default defineNuxtRouteMiddleware(async (to) => {
  const { admin, fetchMe } = useAuth();
  if (!admin.value) await fetchMe();

  if (to.path.startsWith("/dashboard") && !admin.value) {
    return navigateTo("/login");
  }
  if (to.path === "/login" || to.path === "/register") {
    if (admin.value) return navigateTo("/dashboard");
  }
});
