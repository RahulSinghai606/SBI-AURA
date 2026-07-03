<div align="center">

# SBI AURA — Autonomous Universal Relationship Agents

**A living Customer Digital Twin for every SBI customer.**
Proactive, compliant, hyper-personal engagement — powered by an agentic AI swarm.

*SBI × Kellton · GFF 2026 · Pillar 3: Digital Engagement · Accelerated on the KAI Agentic Platform*

</div>

---

## What this is

Banking engagement today is reactive: mass campaigns, <3% conversion, silent dormancy. AURA flips the model — every customer gets a **Digital Twin** (a persistent AI model of their goals, habits and life context) surrounded by a **swarm of specialised agents** that senses signals, infers life events, checks compliance, picks the next-best-action and starts the conversation — in the customer's language, on their channel, at the right moment.

This repository is a **fully working concept demo**:

- **Landing experience** (`/`) — interactive aurora hero, scroll-driven "exploded view" of the architecture, agent-swarm card carousel, business value & roadmap.
- **AURA Command Center** (`/demo`) — pick a synthetic customer, inspect their Digital Twin (signals + episodic/semantic memory), run the live agent swarm, review the next-best-action with RBI/DPDP guardrail checks, then hold a WhatsApp-style conversation with AURA.

All customer data is **fully synthetic**. Live reasoning runs server-side through an Azure AI Foundry deployment; if the endpoint is unreachable, the demo falls back to cached twin snapshots so it never stalls on stage.

## Architecture

```
Signals (txns · app behaviour · life events · bureau/AA · branch)
   └─▶ Customer Digital Twin  ── Memory Layer (episodic + semantic)
          └─▶ Reasoning Engine   — Sensor & Life-Event agents infer intent, stress, moments
                 └─▶ Decision Engine — Risk & Compliance agent: RBI/DPDP guardrails + human override
                        └─▶ Engagement Engine — Offer & Conversation agents: tone, language, timing
                               └─▶ Channels — YONO · WhatsApp/RCS · voice · SMS · branch RM co-pilot
                                      └─▶ Feedback agent writes outcomes back to memory (learning loop)
```

**In this codebase:**

| Layer | Where |
|---|---|
| Digital Twin dataset (synthetic) | `src/lib/data.ts` |
| Reasoning Engine client (server-side, key never exposed) | `src/lib/reasoning.ts` |
| Agent swarm orchestration API | `src/app/api/agents/run/route.ts` |
| Conversational engagement API | `src/app/api/chat/route.ts` |
| Command Center UI | `src/app/demo/page.tsx` |
| Landing + exploded-view + card swap + loader | `src/app/page.tsx`, `src/components/` |

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** — light "aurora glass" design system in SBI brand palette
- **GSAP + ScrollTrigger** — exploded-view assembly, card-swap carousel
- **Framer Motion** — micro-interactions and staged reveals
- **Azure AI Foundry (Responses API)** — server-side LLM reasoning for the agent swarm and conversations

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your Azure AI Foundry endpoint, key & deployment
npm run dev                  # http://localhost:3000
```

Without keys the app still runs — the Command Center serves cached twin snapshots instead of live reasoning.

## Demo script (3 minutes)

1. **Landing (45s)** — hero + cursor aura, scroll through the exploded architecture view until it assembles into the pipeline.
2. **Command Center (90s)** — select *Priya Sharma*, show Twin summary + live signals + memory, hit **Run AURA agent swarm**, watch the five agents reason live, land on the pre-approved home-loan next-best-action with all four compliance guardrails green.
3. **Conversation (45s)** — deliver via WhatsApp, reply as the customer ("what about the down payment?"), watch AURA answer contextually and compliantly. Switch to *Ramesh Yadav* to show the same loop producing a Hindi education-loan journey.

---

*Concept demo for Global Fintech Fest 2026. All figures are projected targets based on published agentic-AI banking benchmarks; all customer data is synthetic.*
