import { defineConfig } from "vite";

export default defineConfig({
  // GitHub Pages project URL by default; Capacitor APK overrides this with VITE_BASE_PATH=./
  base: process.env.VITE_BASE_PATH || "/crm-core-v1/",
});
