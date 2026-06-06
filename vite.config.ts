import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    license: true,
    rolldownOptions: {
      output: {
        postBanner:
          '/* 効果音：OtoLogic その他バンドルされた依存関係のライセンスは https://example.com/license.md を参照  */',
      },
    },
  }
});
