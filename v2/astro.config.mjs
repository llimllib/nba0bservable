import { defineConfig } from "astro/config"

export default defineConfig({
  site: "https://billmill.org",
  base: "/nba",
  vite: {
    // optimize these up front, or the first load after a restart can fail
    // with "504 Outdated Optimize Dep" while vite discovers them
    optimizeDeps: {
      include: ["d3", "roughjs", "hyparquet", "hyparquet-compressors"],
    },
  },
})
