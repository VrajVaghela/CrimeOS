#!/usr/bin/env node
/**
 * i18n audit (Phase 14F) — fails the build on localization regressions.
 *
 * Checks:
 *  1. Key parity — every key in en.ts exists in hi.ts and gu.ts (and no extras).
 *  2. Untranslated leaves — a hi/gu value byte-identical to English.
 *  3. Indic literals in .tsx — Devanagari/Gujarati text must live in lib/i18n/,
 *     never inline in a component (this is what caused the original bug: a
 *     hardcoded "English / हिंदी" label showed Hindi to Gujarati users).
 *  4. Hardcoded locales — "en-IN" outside lib/format.ts and lib/language-context.tsx.
 *
 * Run: npm run i18n:audit
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const I18N_DIR = join(ROOT, "lib", "i18n");
const failures = [];

// Values that are legitimately identical across languages (brand names, IDs).
const ALLOWED_IDENTICAL = new Set(["Crime OS AI", "AI", "OSINT", "CCTNS", "SHA-256 Hash", "IMEI", "URL"]);

/** Flattens a dictionary file into { "section.key": "value" } via source parsing. */
function parseDict(file) {
  const src = readFileSync(file, "utf8");
  const out = new Map();
  const stack = [];
  for (const raw of src.split("\n")) {
    const line = raw.replace(/\/\/.*$/, "");
    const open = line.match(/^\s+([A-Za-z_]\w*):\s*\{\s*$/);
    if (open) {
      stack.push(open[1]);
      continue;
    }
    if (/^\s+\},?\s*$/.test(line)) {
      stack.pop();
      continue;
    }
    const leaf = line.match(/^\s+([A-Za-z_]\w*):\s*"((?:[^"\\]|\\.)*)"/);
    if (leaf && stack.length) out.set([...stack, leaf[1]].join("."), leaf[2]);
  }
  return out;
}

const en = parseDict(join(I18N_DIR, "en.ts"));
const hi = parseDict(join(I18N_DIR, "hi.ts"));
const gu = parseDict(join(I18N_DIR, "gu.ts"));

// 1 + 2: parity and untranslated values.
for (const [label, dict] of [["hi", hi], ["gu", gu]]) {
  for (const key of en.keys()) {
    if (!dict.has(key)) failures.push(`[parity] ${label}.ts is missing key "${key}"`);
  }
  for (const key of dict.keys()) {
    if (!en.has(key)) failures.push(`[parity] ${label}.ts has key "${key}" not in en.ts`);
  }
  for (const [key, value] of dict) {
    const source = en.get(key);
    if (
      source !== undefined &&
      source === value &&
      value.length > 3 &&
      /[A-Za-z]{4}/.test(value) &&
      !ALLOWED_IDENTICAL.has(value)
    ) {
      failures.push(`[untranslated] ${label}.ts "${key}" still reads English: "${value}"`);
    }
  }
}

// Walk .tsx/.ts sources for checks 3 and 4.
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(full)) acc.push(full);
  }
  return acc;
}

const INDIC = /[ऀ-ॿ઀-૿]/;
const sources = [
  ...walk(join(ROOT, "app")),
  ...walk(join(ROOT, "components")),
  ...walk(join(ROOT, "lib")),
  ...walk(join(ROOT, "hooks")),
];

for (const file of sources) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const isDict = rel.startsWith("lib/i18n/");
  const src = readFileSync(file, "utf8");

  src.split("\n").forEach((line, i) => {
    const n = i + 1;
    // 3. Indic literals outside the dictionaries.
    if (!isDict && INDIC.test(line)) {
      failures.push(`[indic-literal] ${rel}:${n} — move this text into lib/i18n/`);
    }
    // 4. Hardcoded locale strings.
    if (
      /["']en-IN["']/.test(line) &&
      rel !== "lib/format.ts" &&
      rel !== "lib/language-context.tsx"
    ) {
      failures.push(`[hardcoded-locale] ${rel}:${n} — use useFormatters() from lib/format.ts`);
    }
  });
}

if (failures.length) {
  console.error(`\ni18n audit FAILED — ${failures.length} issue(s):\n`);
  for (const f of failures) console.error("  " + f);
  console.error("");
  process.exit(1);
}

console.log(
  `i18n audit passed — ${en.size} keys x 3 languages, no untranslated values, ` +
    `no Indic literals outside lib/i18n/, no hardcoded locales.`
);
