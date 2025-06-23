/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  defineConfig,
  transformWithEsbuild,
  searchForWorkspaceRoot,
} from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { replaceCodePlugin } from "vite-plugin-replace";
import babel from "@rollup/plugin-babel";
import svgr from "vite-plugin-svgr";
import { fileURLToPath } from "url";

const moduleResolution = [
  {
    find: "shared",
    replacement: path.resolve("./packages/shared/src"),
  },
  {
    find: "@strix",
    replacement: path.resolve("./packages/strix-website/src"),
  },
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svgr(),
    replaceCodePlugin({
      replacements: [
        {
          from: /__DEV__/g,
          to: "true",
        },
      ],
    }),
    require("@rollup/plugin-image")(),
    babel({
      babelHelpers: "bundled",
      babelrc: false,
      configFile: false,
      exclude: "/**/node_modules/**",
      extensions: ["jsx", "js", "ts", "tsx", "mjs"],
      plugins: [
        "@babel/plugin-transform-flow-strip-types",
        [
          require("./scripts/error-codes/transform-error-messages"),
          {
            noMinify: true,
          },
        ],
      ],
      presets: ["@babel/preset-react"],
    }),
    react(),
    {
      name: "load+transform-js-files-as-jsx",
      async transform(code, id) {
        if (!id.match(/src\/.*\.js$/)) {
          return null;
        }

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: "jsx",
          jsx: "automatic", // 👈 this is important
        });
      },
    },
  ],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@strix/axios": path.resolve(__dirname, "./src/API/axios.js"),
      "@strix/gameContext": path.resolve(
        __dirname,
        "./src/contexts/GameContext.jsx"
      ),
      "@strix/api": path.resolve(__dirname, "./src/hooks/useApi.js"),
      "@strix/alertsContext": path.resolve(
        __dirname,
        "./src/contexts/AlertsContext.jsx"
      ),
      "@strix/userContext": path.resolve(
        __dirname,
        "./src/contexts/UserContext.jsx"
      ),
      "@strix/themeContext": path.resolve(
        __dirname,
        "./src/contexts/ThemeContext.jsx"
      ),
      "@strix/LocalizationContext": path.resolve(
          __dirname,
          "./src/contexts/LocalizationTableContext.jsx"
      ),
      "@strix/hooks": path.resolve(
        __dirname,
        "./src/hooks/"
      ),
      shared: path.resolve(__dirname, "./src/components/shared"),
      titles: path.resolve(__dirname, "./src/components/titles/titles.jsx"),
      moduleResolution,
    },
  },

  extensions: [".js", ".ts", ".jsx", ".tsx", ".json", ".png"],

  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), ".."],
    },
  },

  build: {
    outDir: "build",
    rollupOptions: {
      input: {
        main: "src/index.jsx",
        index: "index.html",
      },
    },
  },
  base: "/",
});
