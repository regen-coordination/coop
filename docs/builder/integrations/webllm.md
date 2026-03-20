---
title: WebLLM
slug: /builder/integrations/webllm
---

# WebLLM

WebLLM is the highest-capability local inference tier in Coop's browser-native cascade.

## Why Coop Uses It

WebLLM lets the product attempt richer synthesis inside the browser when the device has the right
WebGPU support. That keeps the AI story consistent with the local-first product posture.

## Where It Fits

WebLLM is best for:

- synthesis-heavy skill runs
- higher-value draft shaping
- contexts where the browser can afford model load and GPU use

It is not the only path. Coop still keeps a fallback ladder through transformers.js and heuristics.

## Builder Concerns

- model size and startup cost matter
- worker placement matters for keeping the UI responsive
- capability detection should happen before promising a high-end local model path
- Chrome Web Store policy and offline behavior matter for how model and WASM assets are shipped
