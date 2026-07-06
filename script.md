# SBI AURA — Demo Script & Functionality Map

**One line:** Every SBI customer gets a living **Customer Digital Twin** with a swarm of AI agents around it — sensing, reasoning, and engaging *before the customer asks*.

---

## 1. Landing page (`/`) — the story

| Moment | What to say | What's happening |
|---|---|---|
| **Hero** | "Banking that senses you — before you ask." | Interactive aurora ribbons track the cursor (click shifts palette). Sets the 'living system' tone. |
| **Problem → Vision** | "Campaigns convert <3%. AURA replaces campaigns with relationships." | Reactive banking vs. anticipatory agentic engagement. |
| **Exploded View** (scroll) | "This is the engagement brain — exploded." | Six engines burst out of the Twin, then scroll-assemble into the pipeline: **Signals → Memory → Reasoning → Decision → Engagement → Channels**. |
| **Agent Swarm deck** (scroll) | "Six specialist agents per relationship." | Pinned scroll deck — each scroll step brings the next agent card to the front. |
| **Impact** | "1% uplift at SBI scale = thousands of crores." | +15–20% revenue, –30% dormancy, 4× cross-sell, 22 languages, 52 Cr twins. |

## 2. Command Center (`/demo`) — the product

**The agentic loop, live:**

1. **Pick a Twin** — 4 synthetic customers (salaried / farmer / pensioner / MSME). Each carries live **signals** (transactions, YONO behaviour, bureau, branch) and **memory** — episodic ("dismissed a loan push in 2s") + semantic ("responds to numbers, after 7pm").
2. **Run the agent swarm** — one click fires five agents against the Twin, reasoning live on an LLM:
   - **Sensor Agent** → correlates raw signals
   - **Life-Event Agent** → infers the life moment + urgency window
   - **Risk & Compliance Agent** → RBI/DPDP guardrails, consent, suitability
   - **Offer Agent** → ONE next-best-action, never a blast
   - **Conversation Agent** → drafts outreach in the customer's language, channel, tone, hour
3. **Next-Best-Action card** — product, rationale, channel/timing/language, 4 compliance checks, human-override on.
4. **Converse** — WhatsApp-style chat; reply as the customer, AURA answers contextually and compliantly (LLM, in persona). Try Ramesh → full Hindi journey.
5. **Feedback loop** — every outcome writes back to the Twin's memory (the learning loop).

**Resilience:** endpoint down → cached twin snapshots. The demo never stalls on stage.

## 3. Agentic architecture

```
Signals ─▶ Digital Twin (Memory Layer) ─▶ Reasoning ─▶ Decision (guardrails
+ human override) ─▶ Engagement (22 languages) ─▶ Channels ─▶ feedback ↩ Twin
```

- **Orchestration:** `/api/agents/run` — server-side swarm prompt, structured JSON out (per-agent findings + confidence + NBA)
- **Conversation:** `/api/chat` — persona-grounded, compliance-ruled dialogue
- **Twin data:** `src/lib/data.ts` — fully synthetic
- **Reasoning client:** `src/lib/reasoning.ts` — key server-side only, never in the browser

## 4. Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** — light "aurora glass" system, SBI palette
- **GSAP ScrollTrigger** — exploded-view assembly + pinned card deck
- **Framer Motion** — staged reveals, micro-interactions
- **Azure AI Foundry (Responses API)** — server-side LLM for agent swarm + chat, with cached-snapshot fallback
- **Production path:** Kafka-class event streaming, vector DB memory, Kubernetes microservices, channel APIs (YONO / WhatsApp / RCS / IVR) — accelerated on **Kellton's KAI agentic platform**

---

*SBI × Kellton · GFF 2026 · all customer data synthetic*
