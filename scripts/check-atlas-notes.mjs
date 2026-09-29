#!/usr/bin/env node
/**
 * Checks that every concept id in content/atlas/notes/*.json exists in the
 * built atlas catalogue. Run after `npm run atlas`:  npm run check:atlas
 */
import { readFileSync, readdirSync } from "node:fs";

const atlasDir = new URL("../public/atlas/", import.meta.url);
const notesDir = new URL("../content/atlas/notes/", import.meta.url);
const file = readdirSync(atlasDir).find((f) => f.startsWith("atlas.") && f.endsWith(".json"));
if (!file) throw new Error("No atlas catalogue found. Run `npm run atlas` first.");
const atlas = JSON.parse(readFileSync(new URL(file, atlasDir), "utf8"));
const ids = new Set(atlas.concepts.map((c) => c.id));

let notes = 0;
const problems = [];
for (const name of readdirSync(notesDir).filter((f) => f.endsWith(".json"))) {
  for (const note of JSON.parse(readFileSync(new URL(name, notesDir), "utf8"))) {
    notes++;
    for (const concept of note.concepts) if (!ids.has(concept)) problems.push(`${name} → ${note.id}: unknown concept ${concept}`);
  }
}
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(`✓ ${notes} atlas notes reference valid concepts.`);
