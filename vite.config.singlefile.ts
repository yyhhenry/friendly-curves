import fs from "fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import { viteSingleFile } from "vite-plugin-singlefile"

function inlineFavicon(): Plugin {
  return {
    name: "inline-favicon",
    enforce: "post",
    transformIndexHtml(html) {
      return html.replace(
        /<link\s+rel="icon"\s+type="image\/svg\+xml"\s+href="[^"]*"\s*\/>/,
        () => {
          const svg = fs.readFileSync(
            path.resolve(__dirname, "public/favicon.svg"),
            "utf-8"
          )
          const dataUri = "data:image/svg+xml," + encodeURIComponent(svg.trim())
          return `<link rel="icon" type="image/svg+xml" href="${dataUri}" />`
        }
      )
    },
    closeBundle() {
      const favicon = path.resolve(__dirname, "dist-single/favicon.svg")
      if (fs.existsSync(favicon)) fs.unlinkSync(favicon)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), inlineFavicon()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-single",
  },
})
