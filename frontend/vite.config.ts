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
        "@components": path.resolve(import.meta.dirname, "src", "components"),
        "@routes": path.resolve(import.meta.dirname, "src", "routes"),
        "@services": path.resolve(import.meta.dirname, "src", "services"),
        "@assets": path.resolve(import.meta.dirname, "src", "assets"),
        "@utils": path.resolve(import.meta.dirname, "src", "utils"),
      },
    },
    define: {
      "import.meta.env.API_URL": JSON.stringify(
        `http://localhost:${env.HOST_API_PORT}`,
      ),
    },
  };
});
