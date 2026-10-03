#!/usr/bin/env node
/**
 * Proves every Squish Seats level has exactly one seating in both
 * the text rules and the picture rules. Picture "between" is the
 * left-to-right order drawn on the card; text "between" is either order.
 * Run: node preview/games/squish-solver.js
 */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const html = fs.readFileSync(path.join(__dirname, "squish-seats.html"), "utf8");
const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) {
  console.error("no script");
  process.exit(1);
}
const script = m[1];
const start = script.indexOf("const LEVELS");
const end = script.indexOf("const clueOk");
if (start < 0 || end < 0) {
  console.error("could not find LEVELS/RULES");
  process.exit(1);
}
const chunk = script.slice(start, end) + "\nthis.LEVELS = LEVELS;\nthis.RULES = RULES;\n";
const ctx = {};
vm.runInNewContext(chunk, ctx);
const { LEVELS, RULES } = ctx;

function perms(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of perms(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

const pictureRules = Object.assign({}, RULES, {
  // Drawn left to right: first buddy, dots, middle, dots, last. No swap icon.
  between(s, [a, mid, b]) {
    return s.indexOf(a) < s.indexOf(mid) && s.indexOf(mid) < s.indexOf(b);
  },
});

function solves(seats, clues, rules) {
  return clues.every(c => rules[c[0]](seats, c.slice(1)));
}

let failed = 0;
LEVELS.forEach((L, i) => {
  const buddies = L.b.split("");
  const all = perms(buddies);
  for (const [label, rules] of [["text", RULES], ["picture", pictureRules]]) {
    const hits = all.filter(seats => solves(seats, L.c, rules));
    const got = hits.map(s => s.join(""));
    const ok = got.length === 1 && got[0] === L.sol;
    if (!ok) {
      failed++;
      console.error(`L${i + 1} ${L.title} ${label}: expected exactly [${L.sol}], got ${got.length ? got.join(" | ") : "(none)"}`);
    } else {
      console.log(`L${i + 1} ${L.title} ${label}: 1 solution ${L.sol} (${all.length} arrangements checked)`);
    }
  }
});

if (failed) {
  console.error(`${failed} check(s) failed`);
  process.exit(1);
}
console.log(`All ${LEVELS.length} levels have one text solution and one picture solution.`);
