import pw from "/home/philflow/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js";
const { chromium } = pw;
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, statSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const url = "file://" + join(__dirname, "index.html");
const SIZES = [
  { w: 1920, h: 1080, tag: "1080" },
  { w: 1366, h: 768, tag: "beamer" },
  { w: 1280, h: 720, tag: "720" },
  { w: 1680, h: 1050, tag: "16x10" },
];
const opts = existsSync("/usr/bin/chromium") ? { executablePath: "/usr/bin/chromium" } : {};
const browser = await chromium.launch(opts);

let problems = 0;
for (const sz of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  for (let i = 1; i <= 7; i++) {
    await page.evaluate((n) => window.dispatchEvent(new KeyboardEvent("keydown", { key: String(n), bubbles: true })), i);
    await page.waitForTimeout(850);
    const report = await page.evaluate((n) => {
      const slide = document.querySelector(`[data-slide="${n}"]`);
      const sb = slide.getBoundingClientRect();
      const out = [];
      if (slide.scrollHeight - slide.clientHeight > 2) out.push(`scrollH +${slide.scrollHeight - slide.clientHeight}px`);
      if (slide.scrollWidth - slide.clientWidth > 2) out.push(`scrollW +${slide.scrollWidth - slide.clientWidth}px`);
      const pad = 4;
      slide.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const cls = (el.className && el.className.toString()) || el.tagName;
        if (r.bottom > sb.bottom + pad) out.push(`bottom +${Math.round(r.bottom - sb.bottom)}px [${cls.slice(0,38)}]`);
        if (r.top < sb.top - pad) out.push(`top ${Math.round(r.top - sb.top)}px [${cls.slice(0,38)}]`);
        if (r.right > sb.right + pad) out.push(`right +${Math.round(r.right - sb.right)}px [${cls.slice(0,38)}]`);
        if (r.left < sb.left - pad) out.push(`left ${Math.round(r.left - sb.left)}px [${cls.slice(0,38)}]`);
      });
      return [...new Set(out)];
    }, i);
    const tag = `s${i}@${sz.tag}`;
    if (report.length) {
      problems += report.length;
      console.log(`\x1b[31m[FAIL] ${tag}\x1b[0m`);
      report.slice(0, 10).forEach((p) => console.log("   - " + p));
    } else {
      console.log(`\x1b[32m[ OK ] ${tag}\x1b[0m`);
    }
    if (sz.tag === "1080") await page.screenshot({ path: join(__dirname, `_shot_s${i}.png`) });
  }
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport:{width:1920,height:1080}, reducedMotion:"reduce" });
  const p = await ctx.newPage();
  await p.goto(url,{waitUntil:"networkidle"}); await p.waitForTimeout(300);
  const hidden = await p.evaluate(() => { let bad=0; document.querySelectorAll("#s2 [data-r], #s5 [data-r], #s6 [data-r]").forEach(el=>{ if(+getComputedStyle(el).opacity < .99) bad++; }); return bad; });
  console.log(hidden===0 ? "[ OK ] reduced-motion: alle Reveals sichtbar" : `[FAIL] reduced-motion: ${hidden} unsichtbar`);
  await ctx.close();
}
{
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.goto(url,{waitUntil:"networkidle"}); await p.waitForTimeout(300);
  await p.emulateMedia({ media:"print" });
  await p.pdf({ path: join(__dirname,"_deck.pdf"), width:"1280px", height:"720px", printBackground:true, pageRanges:"1-7" });
  console.log(`[ OK ] PDF erzeugt (${(statSync(join(__dirname,"_deck.pdf")).size/1024).toFixed(0)} KB)`);
  await ctx.close();
}
await browser.close();
console.log(problems ? `\n=== ${problems} Overflow-Probleme ===` : "\n=== Alle Slides overflow-frei ===");
process.exit(problems ? 1 : 0);
