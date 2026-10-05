---
name: agentguard-instrumentation
description: Integrate the AgentGuard SDK into an application, or audit and fix an existing integration — detect the stack, install or check the SDK, add or correct the code, and verify real traces against the baseline.
---

# AgentGuard instrumentation

## Baseline requirements (mandatory)

Every integration must meet all rows. Use this table to audit existing code (step 3) and to verify traces (step 4).

| Requirement | Check | Why |
|---|---|---|
| Init placement | `init()` runs once, after env vars load, before any LLM client is created or called | Calls made earlier are neither traced nor guarded |
| Provider coverage | Every provider the app calls is instrumented (Node: the class the app imports) | An uninstrumented call bypasses tracing and guardrails |
| Model and tokens | Each LLM step shows the model and input/output tokens | Model comparison and cost |
| Cost | Billable models show non-zero cost | Spend views and budget guard depend on it |
| Trace structure | One trace per request or agent run, steps nested, descriptive names (`checkout-assistant`, not defaults) | Shows which step failed; traces are findable |
| Tool calls | Each tool call is its own step; MCP and LangChain tools are guarded, not only traced | Tool-permission guardrail and audit need them |
| Context | User id, session id, feature and tenant attached via `withPolicy` / `policy()` wherever the app has them | Sessions, Users and per-feature cost |
| Guardrail readiness | `AGENTGUARD_PROJECT_ID` set; no `[agentguard]` warnings at startup | Without it guardrails are silently off |
| Delivery | `flush()` before exit in scripts, jobs, serverless handlers and tests | Batched spans are lost otherwise |
| Content and sensitive data | `AGENTGUARD_CAPTURE_CONTENT=true` unless the user turned it off; no secrets or raw PII in metadata or tags | Traces show what was asked and answered; nothing sensitive in searchable fields |
| Single integration | One `init()`, each provider instrumented once, no second tracer reporting the same calls | Duplicate spans double counts and cost |

## 1. Detect the stack and any existing integration

Read the code before proposing anything. Record:

- **Language and package manager**: `package.json` + lockfile, or `pyproject.toml` / `requirements.txt`. Node needs ≥20.
- **LLM providers** actually called: OpenAI (incl. audio), Anthropic (incl. Bedrock/Vertex), AWS Bedrock runtime, Gemini, LiteLLM.
- **Agent frameworks**: LangChain/LangGraph, CrewAI, OpenAI Agents SDK, MCP, custom tool loops.
- **Lifecycle**: long-running server vs. script/job/serverless; where env vars are loaded.
- **Request context available**: user id, session/conversation id, feature or route, tenant.
- **Other tracing** (Langfuse, OpenTelemetry, …): never remove it without asking.
- **Existing AgentGuard integration**: the SDK in dependencies, or `init()` / `withPolicy` / `policy()` / `instrument*` calls in code. If found, work in **audit mode** below.

Show the user a findings table (and in audit mode, which baseline rows look met) before editing.

## 2. Install or check the SDK

- **New integration**: Node `@actaclad/agentguard`; Python `actaclad-agentguard[<extras>]` with only the matching extras (`openai`, `anthropic`, `gemini`, `langchain`, `crewai`, `openai-agents`). Use the project's package manager.
- **Audit mode**: do not reinstall from scratch. Confirm every detected provider and framework is covered by the installed peer deps or extras, then check the version:
  1. Installed version: the lockfile, or `npm ls @actaclad/agentguard` / `pip show actaclad-agentguard`.
  2. Latest version: `npm view @actaclad/agentguard version` / `pip index versions actaclad-agentguard`.
  3. If installed is older, **upgrade to the latest** with the project's package manager and update the lockfile. Tell the user the old → new version.
  4. Find what changed: read the changelog if the package ships one; otherwise compare the old and new README for every SDK call the app uses. A major version jump (e.g. 2.x → 3.x) means breaking changes are likely.
  5. Update every call the new version renamed, removed or changed. Step 4's run is then required to prove the upgrade broke nothing; if it cannot be made to pass, roll back to the old version and report why.

Then read the installed README (see SKILL.md) and follow its current API for every step below.

## 3. Add or correct the code

**Audit mode first**: fetch the project's recent traces from the public API and check them and the code against every baseline row. Report a table (requirement → met / gap → planned fix), fix only the gaps, and leave working code unchanged. Never add a second `init()`. If env files or config use legacy names (`AGENT_GUARD_*`, `AGENTGUARD_HOST`), rename them to the four `AGENTGUARD_*` names in the table in SKILL.md, keeping the values: edit names only and never print values. Not every code path reads the legacy names; for example, Python's `init()` ignores `AGENTGUARD_HOST`.

Then apply what is missing:

1. **Initialize once** at the entry point, per the Init placement row. Call `init()` without keys, host or project id so the SDK reads them from env. README examples pass placeholders such as `project_id="your-project-id"`; an explicit argument overrides env, so never copy them.
2. **Instrument providers.** Node: call `instrument*` with the class the app imports. Python: providers are auto-detected at `init()`; for a provider with no auto-instrumentor, route calls through `agentguard.chat()` / `achat()` (LiteLLM) per the README. Bedrock (Node): instrument the client instance if the app owns it, the class if a framework builds its own client.
3. **Frameworks**: follow the README section for the detected framework so each agent run is one nested trace. LangChain callbacks only observe; enforcement comes from the instrumented model clients.
4. **Tools**: MCP clients get the MCP instrumentation; LangChain tools (Node) get the tools subpath.
5. **Context** at the request boundary with `withPolicy` / `policy()`, in one place.
6. **Flush** where the Delivery row requires it.
7. **Environment label**: pass `environment` to `init()` from the app's own setting (e.g. `NODE_ENV`, `APP_ENV`). It defaults to `production`, so local runs would be labelled production. It is only a label; recommend one AgentGuard project per environment.
8. **Content capture**: the SDK records no prompt or response text by default. Add `AGENTGUARD_CAPTURE_CONTENT=true` to `.env` so traces show it, unless the variable already exists (keep an existing `false`). Tell the user it is on and that setting it to `false` turns it off, e.g. for regulated data. Content is recorded after input guardrails run; for streamed responses only the input is recorded.
9. **Env template**: the four `AGENTGUARD_*` variables (plus any optional ones you added) with placeholders in `.env.example`; never real keys.

For every change or fix, tell the user in one line what it enables (e.g. "session id: groups a conversation's turns in Sessions").

## 4. Run and self-audit (required)

The work is not done when the code compiles. This loop is yours to own:

1. Confirm credentials are set (presence only). If any are missing, follow Getting credentials in SKILL.md, wait for the user, then continue.
2. Run the instrumented path once, using the app's start command or a one-off script that makes a real LLM call. Send one short, harmless test message that fits the app, e.g. "Hello, this is an AgentGuard integration test. What can you help me with?". Never use real user data, personal information or secrets. Set user id `agentguard-test` and feature `integration-test` so the test trace is easy to find and filter out later.
3. Fetch the new trace via the public API (allow a few seconds for batching, or flush).
4. Check it against **every** baseline row, including that the test message appears as input (streamed responses record input only). If the user turned content capture off, missing text is expected; tell them why.
5. Fix each gap, re-run, re-fetch; repeat until all rows pass.
6. Report what you audited, what you changed and why, and give the direct trace link. Invite the user to open it in the console.

| Symptom | Likely cause |
|---|---|
| No trace | Keys or host missing; `init()` after first client use; exit before flush; wrong project |
| No LLM step (Node) | A different module copy was instrumented than the one the app imports |
| Duplicate LLM steps | Two `init()` calls, double instrumentation, or a second tracer |
| Guardrails-disabled warning though `.env` has the project id | `init()` runs before `.env` is loaded, or a placeholder `project_id` is passed to `init()` |
| Warning `AGENTGUARD_BASE_URL not set` | `AGENTGUARD_BASE_URL` missing; the SDK sends nothing. Set it in `.env` |
| DB, HTTP or RPC spans missing | Infra spans are dropped by default; set `AGENTGUARD_INCLUDE_INFRA_SPANS=true` if the user wants them |
| Cost is 0 | Model name not in the price table; check the generation's model field |
| Each turn is a new session | Session id missing or regenerated per request |
| Several traces per agent run | Framework handler not linked to the request trace; see the README's single-trace pattern |

Once all rows pass, continue with references/post-integration-guide.md.
