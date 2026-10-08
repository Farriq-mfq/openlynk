import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { analyticsModule } from "./modules/analytics";
import { authModule } from "./modules/auth";
import { linksModule } from "./modules/links";
import { profileModule } from "./modules/profile";
import { publicModule } from "./modules/public";
import { apiError, allowedOrigins, csrfAllowed } from "./lib/http";

const PORT = Number(process.env.PORT ?? 3001);

const app = new Elysia()
  .use(
    cors({
      origin: allowedOrigins(),
      credentials: true,
    }),
  )
  .onError(({ code, error, set }) => {
    if (code === "VALIDATION") {
      set.status = 422;
      return apiError("VALIDATION_ERROR", "Invalid request payload");
    }
    if (code === "NOT_FOUND") {
      set.status = 404;
      return apiError("NOT_FOUND", "Route not found");
    }
    if (code === "PARSE") {
      set.status = 400;
      return apiError("PARSE_ERROR", "Malformed request body");
    }
    // Unexpected: log server-side, never leak stacks to clients.
    console.error(`[api] unhandled (${String(code)}):`, error);
    set.status = 500;
    return apiError("INTERNAL_ERROR", "Something went wrong");
  })
  // Second CSRF layer (after SameSite=Lax cookies): mutations need an allowlisted origin.
  .onBeforeHandle(({ request, status }) => {
    if (!csrfAllowed(request)) return status(403, apiError("FORBIDDEN", "Origin not allowed"));
  })
  .get("/", () => ({
    name: "@openlynk/api",
    status: "ok",
    version: "v1",
    docs: ["/health", "/api/v1/auth/me", "/api/v1/public/:username"],
  }))
  .get("/health", () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))
  .group("/api/v1", (api) =>
    api.use(authModule).use(profileModule).use(linksModule).use(analyticsModule).use(publicModule),
  )
  .listen(PORT);

console.log(`🦊 Elysia running at http://localhost:${PORT}`);

export type App = typeof app;
