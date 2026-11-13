import { execFileSync } from "node:child_process";

import { cloudflare } from "@cloudflare/vite-plugin";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

import packageJson from "./package.json" with { type: "json" };
import { devSignInPlugin } from "./scripts/dev-sign-in.ts";
import { localDispatcherPlugin } from "./scripts/local-dispatcher.ts";

// The Vite environment of the Worker. By default, the plugin names it after the Worker, which each instance names.
const workerEnvironment = "yapir";

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.PORT);

  const local =
    command === "serve" && !isPreview ? localDispatcherPlugin(port) : undefined;

  return {
    define: {
      __APP_VERSION__: JSON.stringify(
        execFileSync(
          "git",
          ["describe", "--tags", "--match", "v*", "--always"],
          {
            encoding: "utf-8",
          }
        ).trim()
      ),
      __APP_RELEASE__: JSON.stringify(`v${packageJson.version}`),
    },
    server: {
      port,
      strictPort: true,
      host: true,
    },
    resolve: {
      tsconfigPaths: true,
    },
    environments: {
      // Split chunks of zod import each other, and the Worker fails at startup.
      [workerEnvironment]: {
        build: { rolldownOptions: { output: { codeSplitting: false } } },
      },
    },
    plugins: [
      // Before the Cloudflare plugin: its middleware must not reach the Worker.
      local?.plugin,
      env.DEV_SIGN_IN_DIR ? devSignInPlugin(env.DEV_SIGN_IN_DIR) : undefined,
      cloudflare({
        viteEnvironment: { name: workerEnvironment },
        config: (config) => {
          if (local) {
            config.vars.LOCAL_DISPATCHER_URL = local.url;
          }

          // The automated tests set the time of the server through their own Worker.
          if (mode === "test") {
            config.main = "./tests/kit/server.ts";
          }
        },
      }),
      tailwindcss(),
      tanstackRouter({
        routesDirectory: "./src/web/routes",
        generatedRouteTree: "./src/web/routeTree.gen.ts",
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
    ],
  };
});
