import { Type, type Static } from "@sinclair/typebox";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from "./constants";

// NOTE: Elysia validates but never transforms. Handlers MUST trim() strings
// and lowercase emails/usernames before use. `https://` and blocklist checks
// that need normalization live in handlers, not here.

export const EmailSchema = Type.String({
  format: "email",
  maxLength: 255,
  description: "Lowercased + trimmed by handler before use",
});

export const PasswordSchema = Type.String({
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
});

export const UsernameSchema = Type.String({
  pattern: "^[a-z0-9_]{3,30}$",
  description: "Lowercase alphanumeric + underscore; blocklist enforced by handler",
});

export const HexColorSchema = Type.String({ pattern: "^#[0-9a-fA-F]{6}$" });

export const HttpsUrlSchema = Type.String({
  format: "uri",
  pattern: "^https://",
  maxLength: URL_MAX_LENGTH,
  description: "https:// only — rejects javascript:, data:, http:",
});

export const LoginSchema = Type.Object({
  email: EmailSchema,
  password: Type.String({ minLength: 1, maxLength: PASSWORD_MAX_LENGTH }),
});
export type LoginInput = Static<typeof LoginSchema>;

export const UpdateProfileSchema = Type.Object({
  username: Type.Optional(UsernameSchema),
  display_name: Type.Optional(Type.String({ minLength: 1, maxLength: DISPLAY_NAME_MAX_LENGTH })),
  bio: Type.Optional(Type.Union([Type.String({ maxLength: BIO_MAX_LENGTH }), Type.Null()])),
  avatar_url: Type.Optional(Type.Union([HttpsUrlSchema, Type.Null()])),
  is_published: Type.Optional(Type.Boolean()),
});
export type UpdateProfileInput = Static<typeof UpdateProfileSchema>;

export const AppearanceSchema = Type.Object({
  theme: Type.Optional(Type.String({ minLength: 1, maxLength: 32 })),
  background_color: Type.Optional(HexColorSchema),
  text_color: Type.Optional(HexColorSchema),
  accent_color: Type.Optional(HexColorSchema),
  font_family: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
  button_style: Type.Optional(
    Type.Union([Type.Literal("rounded"), Type.Literal("pill"), Type.Literal("square"), Type.Literal("outline")]),
  ),
  theme_config: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type AppearanceInput = Static<typeof AppearanceSchema>;

export const CreateLinkSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: TITLE_MAX_LENGTH }),
  url: HttpsUrlSchema,
  icon: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
  is_active: Type.Optional(Type.Boolean()),
});
export type CreateLinkInput = Static<typeof CreateLinkSchema>;

export const UpdateLinkSchema = Type.Object({
  title: Type.Optional(Type.String({ minLength: 1, maxLength: TITLE_MAX_LENGTH })),
  url: Type.Optional(HttpsUrlSchema),
  icon: Type.Optional(Type.Union([Type.String({ minLength: 1, maxLength: 64 }), Type.Null()])),
  is_active: Type.Optional(Type.Boolean()),
});
export type UpdateLinkInput = Static<typeof UpdateLinkSchema>;

export const ReorderLinksSchema = Type.Object(
  {
    ids: Type.Array(Type.String({ format: "uuid" }), { minItems: 1 }),
  },
  { description: "Complete ordered id list — must match the profile's link set exactly" },
);
export type ReorderLinksInput = Static<typeof ReorderLinksSchema>;

export const UsernameParamsSchema = Type.Object({ username: UsernameSchema });
export const LinkIdParamsSchema = Type.Object({ id: Type.String({ format: "uuid" }) });

export const AnalyticsRangeQuerySchema = Type.Object({
  range: Type.Optional(Type.Union([Type.Literal("7d"), Type.Literal("30d")])),
});
export type AnalyticsRangeQuery = Static<typeof AnalyticsRangeQuerySchema>;
