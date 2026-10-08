export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export const RESERVED_USERNAMES = [
  "login",
  "register",
  "dashboard",
  "api",
  "admin",
  "settings",
  "about",
  "help",
  "support",
  "static",
  "_nuxt",
] as const;

export const TITLE_MAX_LENGTH = 120;
export const BIO_MAX_LENGTH = 280;
export const DISPLAY_NAME_MAX_LENGTH = 80;
export const URL_MAX_LENGTH = 2048;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const DEVICE_TYPES = ["mobile", "desktop", "tablet", "other"] as const;

export const BUTTON_STYLES = ["rounded", "pill", "square", "outline"] as const;

export const DEFAULT_THEME = {
  theme: "minimal",
  background_color: "#ffffff",
  text_color: "#111111",
  accent_color: "#4f46e5",
  font_family: "inter",
  button_style: "rounded",
} as const;

export const ANALYTICS_RANGES = ["7d", "30d"] as const;
