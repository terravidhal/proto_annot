import path from "path" // add for shadcn ui
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],

  resolve: { // add for shadcn ui
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
