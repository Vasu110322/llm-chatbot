---
name: agentguard-post-integration-guide
description: After a verified first trace, guide the user through the AgentGuard console — Observability, AI Quality, Security and Governance — with recommendations tailored to their application.
---

# After integration: guide the user

Tailor this to the app you just instrumented. Recommend only what fits (e.g. PII redaction only if the app handles personal data) and explain each recommendation in one line. Give every console page as a full link: `<AGENTGUARD_BASE_URL>/project/<projectId>/<page>`.

Present it as a short prioritized list, security first, then ask which item the user wants to set up. Do not enable or change console settings yourself unless the user asks.

**Start from the project's real state**, not defaults — existing clients may already have set things up. Read `guardrails?projectId=` and `scores` from the public API, then say what is already in place and recommend only the next gaps.

## 1. Security — guardrails start OFF

Page: `guardrails`. Every guardrail starts disabled in a new project; nothing is enforced until the user enables it. Report which ones this project has enabled, if any.

Recommend from what the code does:

| App trait | Guardrail |
|---|---|
| Users send free text | `prompt-injection`, `toxic-content` |
| Personal data in prompts or answers | `pii-redaction` |
| Keys, tokens or credentials could appear | `secret-scanner`, `token-scanner` |
| Agent calls tools | `tool-permission` (plus tool instrumentation from step 3.4 of instrumentation) |
| Cost or abuse risk | `budget-guard`, `rate-limit`, `token-limit`, `allowed-model-list` |
| Structured output expected | `schema-validation` |
| Answers grounded in provided context | `hallucination` (LLM judge, needs a provider key) |

Rollout advice to give:

1. Start in observe mode and read a few days of findings before choosing redact or block.
2. Before switching to block, make sure the app handles a block: catch `AgentGuardBlocked`, or set the on-block mode to refuse so callers get a safe refusal. Offer to add this handling.
3. `prompt-injection`, `toxic-content` and `hallucination` are ML/LLM detectors and are opt-in in code: Node needs the ML guardrails registered after `init()` (native deps; gate behind `AGENTGUARD_ENABLE_ML_GUARDRAILS`), Python needs the `guardrails` extra. Without this they pass silently.
4. Config changes reach running apps by polling — no redeploy.

To check what the SDK actually receives, read `guardrails?projectId=` from the public API. Names like `secrets-token-scanner`, `allowlist`, `schema`, `hallucination-guard` are old names the SDK ignores; tell the user to switch to the current names.

Then point to `owasp-llm-top-10` (which risks have a control configured) and `red-teaming` (run against staging first; each bypass is a finding to fix).

## 2. Observability

- `traces`: filter by user, session, model or score, then work down the tree.
- `sessions` and `users`: only useful if session/user ids were attached — say so if the app lacks them.
- **Prompt management** (`prompts`): if the code has hardcoded prompts, suggest moving them into Prompts and fetching by the `production` label, so prompt changes ship without a deploy and each generation links to its prompt version. Runtime fetching is in the Node SDK; check the installed Python README before promising it there.

## 3. AI Quality

- **Scores** (`scores`): every evaluation lands here, attached to the specific step it judged.
- **LLM-as-a-judge** (`evals`): suggest one evaluator for the app's main risk (e.g. answer relevance, groundedness). Start with a narrow filter and sampling — every evaluation is a billed model call and runs only on new traffic.
- **Human review** (`annotation-queues`): queues for domain experts; their verdicts become scores and are the way to check the judge agrees with people.
- **Test Sets and Experiments** (`datasets`, `experiments`): collect failing production traces into a Test Set and compare prompt/model versions on the same cases before promoting.

## 4. Governance

- **Compliance** (`compliance`): coverage for EU AI Act, ISO/IEC 42001, NIST AI RMF, OWASP LLM Top 10 and others, derived from runtime evidence. It shows "Not Assessed" until traffic plus enabled guardrails or evaluators produce evidence — enabling a guardrail alone does not close a gap until it has run.
- **AI Bill of Materials** (`ai-bill-of-materials`): models and providers are inventoried from traces automatically; the user should assign an owner and risk tier to each system.
- **Audit Trail** (`audit-trail`): tamper-evident record; verify integrity before exporting evidence.
- **Trust Profile** (`trust-profile`): rolls the pillars into one score; blank dimensions name what is missing.
- Policy as Code is a preview with sample data — do not present it as enforced.

End with a summary: what is integrated, which guardrails you recommend enabling first, and the one quality and one governance step to do next.
