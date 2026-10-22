// Run with: npm run check-skins
// Prints OK or the exact problems for every skin in skins/ and community-skins/.
import { loadSiteData } from "../lib/readSkins.js";
import { checkSkins } from "../lib/checkSkins.js";

const { skins } = loadSiteData();
const results = checkSkins(skins);
let bad = 0;

console.log("Checking skins...");
for (const r of results) {
  const label = r.id.padEnd(18);
  if (r.problems.length === 0) {
    console.log(`  ${label} OK`);
  } else {
    bad += 1;
    console.log(`  ${label} ${r.problems.length} problem${r.problems.length === 1 ? "" : "s"}`);
    for (const p of r.problems) console.log(`      ${p}`);
  }
}
const n = results.length;
console.log(bad === 0 ? `${n} skin${n === 1 ? "" : "s"} checked, all good.` : `${bad} of ${n} need a fix.`);
process.exit(bad === 0 ? 0 : 1);
