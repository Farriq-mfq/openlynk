import { Elysia, t } from "elysia";
import { join } from "node:path";
import { apiError, clientIp } from "../../lib/http";
import { resolveAdminId } from "../../middlewares/auth";
import { isRateLimited } from "../../middlewares/ratelimit";

const MAX_BYTES = 2 * 1024 * 1024;
// NOTE: no SVG — inline <script> inside SVG is an XSS vector when served.
const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};
// Server-generated uuid filenames only — the client name is never used.
const FILENAME_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpe?g|webp|gif)$/;

const UPLOAD_DIR = join(process.cwd(), "uploads");

// Browser-facing API base for stored file URLs. Uploads are served by the
// api, which may live on a different origin than the dashboard — so the
// request Origin (the web app) is the WRONG base here.
const API_PUBLIC_URL = (process.env.API_PUBLIC_URL ?? "http://localhost:3001").replace(/\/$/, "");

export const uploadsModule = new Elysia({ prefix: "/uploads" })
  // Public file serving MUST stay above the auth guard: Elysia applies
  // onBeforeHandle only to routes defined after it in the same instance.
  .get("/:name", async ({ params, status }) => {
    if (!FILENAME_RE.test(params.name)) {
      return status(404, apiError("NOT_FOUND", "File not found"));
    }
    const f = Bun.file(join(UPLOAD_DIR, params.name));
    if (!(await f.exists())) {
      return status(404, apiError("NOT_FOUND", "File not found"));
    }
    const ext = params.name.split(".").pop()!.toLowerCase();
    return new Response(f, {
      headers: {
        "content-type": MIME_BY_EXT[ext]!,
        // Filenames are uuid-random and never reused: immutable is safe.
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  })
  .derive(async ({ cookie }) => ({ adminId: await resolveAdminId(cookie) }))
  .onBeforeHandle(({ adminId, status }) => {
    if (!adminId) return status(401, apiError("UNAUTHORIZED", "Authentication required"));
  })
  .post(
    "/image",
    async ({ body, request, status }) => {
      if (isRateLimited(`uploads:${clientIp(request.headers)}`)) {
        return status(429, apiError("RATE_LIMITED", "Too many attempts, try again later"));
      }
      const file = body.file;
      if (!(file instanceof File)) {
        return status(400, apiError("NO_FILE", "Attach an image as the `file` field"));
      }
      const ext = EXT_BY_MIME[file.type];
      if (!ext) {
        return status(415, apiError("UNSUPPORTED_MEDIA_TYPE", "Only PNG, JPEG, WebP, or GIF images"));
      }
      if (file.size <= 0 || file.size > MAX_BYTES) {
        return status(413, apiError("FILE_TOO_LARGE", "Image must be under 2 MB"));
      }
      const filename = `${crypto.randomUUID()}.${ext}`;
      await Bun.write(join(UPLOAD_DIR, filename), file);
      return { url: `${API_PUBLIC_URL}/api/v1/uploads/${filename}` };
    },
    { body: t.Object({ file: t.File() }) },
  );
