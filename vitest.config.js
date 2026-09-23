import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      strict: false,
    },
  },
  test: {
    globals: true,
    projects: [
      {
        test: {
          name: "backend",
          globals: true,
          include: ["backend/**/*.test.js"],
          environment: "node",
        },
      },
      {
        test: {
          name: "frontend",
          globals: true,
          include: ["frontend/**/*.test.{js,jsx}"],
          environment: "jsdom",
          setupFiles: ["./frontend/src/setupTests.js"],
          css: true,
        },
      },
    ],
  },
});
