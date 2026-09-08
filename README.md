# Valora — Ground Truth Engine

An interactive prototype for **Valora**, a trust-scoring engine for MSME logistics lending. Built for **Track 1 — Trust Scoring for the Credit-Invisible** (Build $ Bank 2026) and BITSoM Vertex Builders' Pitch Fest 2026.

## What it does

Cross-verifies a transporter's e-way bill trail against a warehouse's independently-filed activity log — two statutory records that corroborate each other for free — and turns the match into a live trust score, routed to competing NBFC lenders.

## Structure

```
index.html                    — page structure
style.css                     — all styling
script.js                     — all interactivity (demo logic, graph, marketplace)
netlify/functions/explain.js  — serverless function, calls OpenRouter server-side
netlify.toml                  — Netlify config (points to the functions folder)
```

## Running locally

Just open `index.html` in a browser — no build step required. The AI explanation feature will fall back to local, deterministic reasoning if no backend is configured (see below), so the demo always works even offline.

## Enabling live AI explanations (optional)

The "AI Reasoning Layer" can call a real model via [OpenRouter](https://openrouter.ai) instead of the local fallback — without ever exposing your API key in the browser.

1. Get a free API key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. Deploy this repo to Netlify (connect your GitHub repo, don't use drag-and-drop drop — the serverless function needs a real build).
3. In Netlify: **Site settings → Environment variables** → add `OPENROUTER_API_KEY` with your key as the value.
4. Redeploy. The site will now call `/.netlify/functions/explain`, which uses the key server-side. It's never sent to or visible from the browser.

If no key is configured, the app automatically falls back to local reasoning — nothing breaks.

## Deploying

Push this repo to GitHub, then in Netlify: **Add new site → Import an existing project → connect to GitHub → select this repo**. Netlify auto-detects `netlify.toml` and deploys both the site and the function.

## What's honest about this prototype

- The relationship-graph model (Graph Neural Network) that would score risk from a borrower's network is **not built** — the "Simulate 12 months of growth" visual demonstrates the *concept*, using simulated data, not a trained model.
- Verification scenarios are pre-scripted demo data, not live government API calls — e-way bill API access requires a licensed GSP partnership, which is a pilot-stage dependency, not something this prototype has.
- All statistics cited are either sourced (with citations shown) or explicitly labelled as direct interview testimony.
