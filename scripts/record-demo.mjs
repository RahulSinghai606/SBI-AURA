// SBI AURA — scripted demo recording (~2:45)
import { chromium } from "playwright";

const BASE = "http://localhost:3042";
const OUT = "/private/tmp/claude-502/-Users-rahul-singh-Downloads-SBI-AURA/63f53a63-53ab-4217-835a-809cc46bc0cb/scratchpad/video";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function caption(page, text, sub = "") {
  await page.evaluate(
    ({ text, sub }) => {
      let el = document.getElementById("aura-cap");
      if (!el) {
        el = document.createElement("div");
        el.id = "aura-cap";
        el.style.cssText =
          "position:fixed;left:50%;bottom:42px;transform:translateX(-50%);z-index:99999;max-width:900px;padding:16px 30px;border-radius:18px;background:rgba(16,27,62,.92);backdrop-filter:blur(10px);color:#fff;font-family:system-ui,-apple-system,sans-serif;text-align:center;box-shadow:0 12px 40px rgba(16,27,62,.35);transition:opacity .45s ease;pointer-events:none;";
        document.body.appendChild(el);
      }
      if (!text) {
        el.style.opacity = "0";
        return;
      }
      el.style.opacity = "1";
      el.innerHTML =
        `<div style="font-size:19px;font-weight:700;letter-spacing:.01em;line-height:1.35">${text}</div>` +
        (sub ? `<div style="font-size:14px;color:#8fd8f5;margin-top:4px;font-weight:500">${sub}</div>` : "");
    },
    { text, sub }
  );
}

async function smoothScroll(page, to, duration) {
  await page.evaluate(
    ({ to, duration }) =>
      new Promise((res) => {
        const from = window.scrollY;
        const start = performance.now();
        const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
        const step = (now) => {
          const p = Math.min((now - start) / duration, 1);
          window.scrollTo(0, from + (to - from) * ease(p));
          if (p < 1) requestAnimationFrame(step);
          else res();
        };
        requestAnimationFrame(step);
      }),
    { to, duration }
  );
}

async function mouseSweep(page, points, stepDelay = 28) {
  for (const [x, y] of points) {
    await page.mouse.move(x, y, { steps: 18 });
    await sleep(stepDelay);
  }
}

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();

  // ── Title card (local HTML) ──
  await page.setContent(`
    <body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:radial-gradient(1100px 600px at 85% -10%, rgba(0,181,239,.18), transparent 60%),radial-gradient(900px 500px at -10% 30%, rgba(34,64,154,.12), transparent 55%),#f4f8fc;font-family:system-ui,-apple-system,sans-serif;">
      <div style="text-align:center">
        <div style="font-size:15px;letter-spacing:.35em;color:#00b5ef;font-weight:700;margin-bottom:22px">GFF 2026 · AGENTIC AI · SBI × KELLTON</div>
        <div style="font-size:96px;font-weight:800;color:#1a1f5c;letter-spacing:-.03em;line-height:1">SBI <span style="background:linear-gradient(92deg,#22409a,#00b5ef);-webkit-background-clip:text;color:transparent">AURA</span></div>
        <div style="font-size:26px;color:#4a5578;margin-top:26px;font-weight:500">A living Digital Twin for every one of SBI's 52 crore customers</div>
        <div style="font-size:16px;color:#8b94b3;margin-top:14px">Autonomous Universal Relationship Agents · Live product demo</div>
      </div>
    </body>`);
  await sleep(4200);

  // ── Landing hero ──
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await caption(page, "Every SBI customer gets a living Customer Digital Twin", "AI that senses, reasons and engages — before the customer asks");
  await mouseSweep(page, [[500, 400], [900, 300], [1200, 500], [800, 620], [1100, 350], [600, 450]]);
  await page.mouse.click(1100, 350);
  await mouseSweep(page, [[700, 300], [1000, 550], [1300, 400]]);
  await sleep(1200);

  // ── Problem / vision ──
  await caption(page, "Today, banking engagement is reactive", "Mass campaigns · under 3% conversion · silent dormancy");
  await smoothScroll(page, 1050, 2100);
  await sleep(2800);

  // ── Exploded view ──
  const explodedTop = await page.evaluate(() => document.getElementById("how-it-works").offsetTop);
  await caption(page, "How AURA works — the architecture, exploded", "Scroll-driven assembly of the multi-agent engagement brain");
  await smoothScroll(page, explodedTop, 1600);
  await sleep(800);
  await caption(page, "Six engines orbit every customer's Digital Twin", "Signals · Memory · Reasoning · Decision · Engagement · Channels");
  await smoothScroll(page, explodedTop + 1150, 4200);
  await sleep(1400);
  await caption(page, "…then lock into a continuous learning loop", "Every outcome flows back into the Twin's memory");
  await smoothScroll(page, explodedTop + 2400, 4200);
  await sleep(1600);

  // ── Agent swarm cards ──
  const agentsTop = await page.evaluate(() => document.getElementById("agents").offsetTop);
  await caption(page, "A swarm of six specialised agents per relationship", "Sensing · inferring · compliance-checking · conversing · learning");
  await smoothScroll(page, agentsTop - 60, 2200);
  await sleep(7000);

  // ── Impact ──
  const impactTop = await page.evaluate(() => document.getElementById("impact").offsetTop);
  await caption(page, "Impact at SBI scale", "+15–20% revenue · –30% dormancy · 4× cross-sell conversion");
  await smoothScroll(page, impactTop - 40, 2400);
  await sleep(4200);

  // ── Command Center ──
  await caption(page, "");
  await page.goto(`${BASE}/demo`, { waitUntil: "networkidle" });
  await caption(page, "The AURA Command Center — live", "Synthetic customers, real agentic reasoning");
  await sleep(3000);

  await caption(page, "Priya's Digital Twin: signals the bank already has", "Salary hike +18% · 4× home-loan calculator use · 36 months of rent");
  await sleep(3800);

  // memory tab
  await page.click("text=Twin memory");
  await caption(page, "The Twin remembers — episodic and semantic memory", "She ignores discount pushes. She responds to numbers, after 7pm.");
  await sleep(4200);
  await page.click("text=Live signals");
  await sleep(800);

  // run swarm
  await caption(page, "Now watch the agent swarm reason — live", "Five agents · one next-best-action · compliance built in");
  await page.click("text=Run AURA agent swarm");
  await sleep(2500);
  await caption(page, "The Reasoning Engine is thinking…", "LLM agents inferring intent from the Twin's signals");
  await page.waitForSelector("text=Next-Best-Action", { timeout: 90000 });
  await caption(page, "Each agent reports its finding, with confidence", "Sensor → Life-Event → Risk & Compliance → Offer → Conversation");
  await sleep(3000);

  // scroll results panel to NBA card
  await page.evaluate(() => {
    const nba = [...document.querySelectorAll("p")].find((p) => p.textContent.includes("Next-Best-Action"));
    nba?.closest("div.rounded-2xl")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  await caption(page, "Next-best-action: a pre-approved home loan, not a blast", "EMI ₹34,900 vs rent ₹32,000 · every RBI/DPDP guardrail checked");
  await sleep(6000);

  // open chat
  await page.click("text=open conversation");
  await caption(page, "Delivered on WhatsApp — as a conversation, not a campaign", "In her language, at her reading hour");
  await sleep(4500);

  const input = page.locator('input[placeholder^="Reply as"]');
  await caption(page, "The customer talks back…", "");
  await input.click();
  await input.pressSequentially("Looks interesting! But what about the down payment? I only have ₹12 lakhs saved.", { delay: 26 });
  await page.click('button[aria-label="Send"]');
  await caption(page, "…and AURA answers with reasoning, not scripts", "Contextual, compliant, human-override always on");
  await page.waitForSelector("text=typing…", { state: "detached", timeout: 60000 }).catch(() => {});
  await sleep(6500);

  // Ramesh — vernacular reach
  await caption(page, "And it speaks every India", "Ramesh, a farmer in Sitapur — his daughter just cleared JEE");
  await page.click("text=Ramesh Yadav");
  await sleep(3500);
  await caption(page, "Same loop → a Hindi education-loan journey via voice + branch RM", "22 languages · every channel · one platform");
  await sleep(3500);

  // ── End card ──
  await page.setContent(`
    <body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1f5c,#22409a);font-family:system-ui,-apple-system,sans-serif;">
      <div style="text-align:center;color:#fff">
        <div style="font-size:54px;font-weight:800;letter-spacing:-.02em;line-height:1.2">“The future of intelligent banking<br/><span style="color:#00b5ef">begins here.”</span></div>
        <div style="font-size:22px;color:rgba(255,255,255,.75);margin-top:28px;font-weight:500">SBI × Kellton · Agentic AI, deployed at the scale of India</div>
        <div style="font-size:15px;color:rgba(255,255,255,.5);margin-top:16px">github.com/RahulSinghai606/SBI-AURA · all demo data synthetic</div>
      </div>
    </body>`);
  await sleep(4500);

  await ctx.close();
  await browser.close();
  console.log("DONE");
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
