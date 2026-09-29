// Usage: node scripts/atlas-lookup.mjs "heart" "left lung" ...
// Prints matching atlas concept ids (exact name first, then contains).
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("../public/atlas/", import.meta.url);
const file = readdirSync(dir).find((f) => f.startsWith("atlas.") && f.endsWith(".json"));
const atlas = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
for (const q of process.argv.slice(2)) {
  const term = q.toLowerCase();
  const exact = atlas.concepts.filter((c) => c.name.toLowerCase() === term);
  const partial = exact.length ? [] : atlas.concepts.filter((c) => c.name.toLowerCase().includes(term)).sort((a, b) => a.name.length - b.name.length).slice(0, 6);
  const list = [...exact, ...partial].map((c) => `${c.id} "${c.name}" (${c.parts.length})`);
  console.log(`${q.padEnd(28)} ${list.join(" | ") || "—"}`);
}
