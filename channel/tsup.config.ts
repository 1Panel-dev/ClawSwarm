import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/setup-entry.ts"],
    format: ["esm"],
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: true,
    noExternal: ["zod", "undici"],
    external: ["openclaw", /^openclaw\//],
});
