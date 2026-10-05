---
name: agentguard
description: >-
  Integrate the AgentGuard SDK into an AI application: detect the stack, install the right SDK, wire it in, verify the first trace, then guide the user through Observability, AI Quality, Security and Governance in the AgentGuard console. Use when the user wants to add AgentGuard, check an existing AgentGuard integration, trace or guard LLM/agent calls, or asks what to do after integrating.
---

# AgentGuard

AgentGuard traces and guards LLM and agent calls. One `init()` at startup auto-instruments the app's LLM clients. Guardrails are configured per project in the console and enforced inside the SDK, in the app's process.

## Core principles

1. **The installed SDK README is the source of truth.** It matches the exact version you installed. Read it before writing code:
   - Node: `node_modules/@actaclad/agentguard/README.md`
   - Python: `python -c "import importlib.metadata as m; print(m.metadata('actaclad-agentguard').get_payload())"`

   The console docs at `<AGENTGUARD_BASE_URL>/docs/onboarding` are secondary: a fetch shows only the Node.js code, and some pages lag the SDK. When they disagree, follow the README.
2. **Protect secrets.** Never print, echo, log or commit a key value; check presence only. See Getting credentials below.
3. **Instrumentation must not change what the app returns.** Guardrails start disabled; enabling or blocking is the user's decision, made after integration.

## Credentials

Both SDKs read the same variables:

| Variable | Needed for |
|---|---|
| `AGENTGUARD_PUBLIC_KEY` (`pk-lf-…`), `AGENTGUARD_SECRET_KEY` (`sk-lf-…`) | Everything |
| `AGENTGUARD_BASE_URL` | Everything; the customer's own host, there is no shared default |
| `AGENTGUARD_PROJECT_ID` | Required. Without it guardrails are silently off (tracing only, with a warning) |

The app's own LLM provider key (e.g. `OPENAI_API_KEY`) must also be set, or the first trace cannot be produced.

### Getting credentials

Check for missing keys as soon as the code is in place — they are needed before the first trace, not before. If any are missing:

1. Make sure `.env` is listed in `.gitignore` (add it if not), then create `.env` if it does not exist, adding every missing variable name from the table above — all four `AGENTGUARD_*` variables, the project ID included — with empty values. Never overwrite existing values.
2. Stop and ask the user to fill in those values **in `.env`**, not in the chat — anything pasted in chat is sent to the model provider and kept in the chat history. Tell them where to get the keys: the API keys page at `<AGENTGUARD_BASE_URL>/project/<projectId>/settings/api-keys` (or **Project Settings → API Keys** if you don't know the host yet). If they have no project yet, they must create one in the console first; the SDK cannot. Ask them to reply "done" when finished, and wait.
3. When they reply, confirm each variable is set (presence only). If any is still empty, name it and wait again.
4. If the user pastes a key into the chat anyway, write it into `.env`, do not repeat it back, and tell them that key is now exposed and should be revoked and replaced in the console.
5. Once every variable is set, continue with the first trace.

## Reading project data

There is no CLI. Use the public REST API with basic auth, passing credentials from env so they never appear in output:

```bash
curl -s -u "$AGENTGUARD_PUBLIC_KEY:$AGENTGUARD_SECRET_KEY" "$AGENTGUARD_BASE_URL/api/public/<resource>"
```

Useful resources: `traces`, `traces/<traceId>`, `observations`, `scores`, `guardrails?projectId=<projectId>` (the guardrail config exactly as the SDK receives it).

## Console links

Project pages live at `<AGENTGUARD_BASE_URL>/project/<projectId>/<page>`; a single trace is `traces/<traceId>`. Always give the user the full link, not just a page name.

## Use case specific references

- integrating the SDK into an application, or checking and fixing an existing integration: references/instrumentation.md
- guiding the user through the console after integration (guardrails, prompts, scores, LLM evals, human review, governance): references/post-integration-guide.md
