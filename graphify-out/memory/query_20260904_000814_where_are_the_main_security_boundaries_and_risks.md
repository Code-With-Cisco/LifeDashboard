---
type: "query"
date: "2026-09-04T00:08:14.526483+00:00"
question: "Where are the main security boundaries and risks?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Security", "Security model", "escapeHtml()", "Supabase User Data Tables", "Runtime Config Generation"]
---

# Q: Where are the main security boundaries and risks?

## Answer

The public client depends on Supabase Auth and per-user RLS. SecurityService now protects rendering and persisted logs, while privileged user administration, provider tokens, and AI calls must move behind a server-side broker. GitHub and Supabase account protections still need to be enabled.

## Outcome

- Signal: useful

## Source Nodes

- Security
- Security model
- escapeHtml()
- Supabase User Data Tables
- Runtime Config Generation