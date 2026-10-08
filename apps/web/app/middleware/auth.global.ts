export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchMe } = useAuth();
  if (!user.value) await fetchMe();

  if (to.path.startsWith("/dashboard") && !user.value) {
    return navigateTo("/login");
  }
  if ((to.path === "/login" || to.path === "/register") && user.value) {
    return navigateTo("/dashboard");
  }
});
