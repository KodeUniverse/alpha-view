/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.join(import.meta.dirname, ".."), "");

  return {
    server: {
      host: "0.0.0.0",
      port: 5379,
      hmr: {
        clientPort: Number(env.HOST_PORT),
        port: 5379,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    test: {
      globals: true,
      environment: "happy-dom",
    },
    define: {
      "import.meta.env.API_URL": JSON.stringify(
        `http://localhost:${env.HOST_API_PORT}`,
      ),
    },
  };
});
