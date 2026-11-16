import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  integrations: [mdx()],
  site: "https://www.improv-wifi.com",
  // Keep the plain <pre><code> markup the stylesheet was written for.
  markdown: { syntaxHighlight: false },
});
