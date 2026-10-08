// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",

  future: {
    compatibilityVersion: 4,
  },

  devtools: { enabled: true },

  modules: ["@nuxt/ui"],

  // Public Sans is referenced only through the --font-sans theme token, which
  // the font scanner skips — declare it explicitly so it is bundled locally.
  // (Do NOT enable processCSSVariables: it misreads calc() values as families.)
  fonts: {
    families: [{ name: "Public Sans", provider: "google", global: true, weights: [400, 500, 600, 700] }],
  },

  ui: {
    theme: {
      // Must list every default alias when adding custom ones (module default
      // is exactly these minus nuxt-green). Generates --color-{name} mappings.
      colors: ["primary", "secondary", "success", "info", "warning", "error", "neutral", "nuxt-green"],
    },
  },

  css: ["~/assets/css/main.css"],

  devServer: {
    port: 3000,
  },

  runtimeConfig: {
    // Server-only override for docker (web container reaches api via service name).
    apiBaseInternal: process.env.NUXT_API_BASE_INTERNAL || "",
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3001",
    },
  },

  nitro: {
    externals: {
      inline: ["nuxt", "nuxt/internal"],
    },
    devProxy: {
      "/api-proxy": {
        target: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
