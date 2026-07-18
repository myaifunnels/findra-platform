import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { handlePayMongoRequest } from "./server/paymongo.mjs";
import { handleBrevoRequest } from "./server/brevo.mjs";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [
      react(),
      {
        name: "findra-paymongo-api",
        configureServer(server) {
          server.middlewares.use(async (request, response, next) => {
            if (await handleBrevoRequest(request, response)) return;
            if (!(await handlePayMongoRequest(request, response))) next();
          });
        },
      },
    ],
  };
});
