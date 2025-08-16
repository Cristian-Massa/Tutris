import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true, // or '0.0.0.0'
    allowedHosts: ["2ad98676e6be.ngrok-free.app"],
  },
  // other configurations
});
