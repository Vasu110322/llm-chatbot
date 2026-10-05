# Morrow

A small, thoughtful AI chat with a TypeScript/Next.js frontend and a Python/FastAPI backend.

## Run locally

1. Copy `.env.example` to `.env` and add your OpenAI API key to `OPENAI_API_KEY`.
   Add your AgentGuard project credentials to `AGENTGUARD_PUBLIC_KEY`,
   `AGENTGUARD_SECRET_KEY`, `AGENTGUARD_BASE_URL`, and `AGENTGUARD_PROJECT_ID`.
   Get these from Project Settings → API Keys in your AgentGuard project.
2. In a terminal, create and activate a Python environment, then install the backend dependencies:

	```powershell
	py -m venv .venv
	.\.venv\Scripts\Activate.ps1
	pip install -r requirements.txt
	```

3. Start the Python API from the project root:

	```powershell
	python -m uvicorn main:app --app-dir backend --reload --port 8000
	```

4. In a second terminal, run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The Python backend loads `.env.local` and `.env`; do not commit either file or expose API keys in frontend code. Set `CORS_ORIGINS` to the frontend origin when deploying.

Set `OPENAI_MODEL` in `.env` to use a different model. It defaults to `gpt-4.1-mini`. `NEXT_PUBLIC_CHAT_API_URL` selects the backend URL used by the frontend.

When all four AgentGuard credentials are set, the backend initializes AgentGuard once and creates a named trace for each chat request. Conversation turns share a generated session ID. Without credentials, AgentGuard stays off rather than sending telemetry to a local fallback; restart the backend after adding them. Guardrail configuration is managed in the AgentGuard console; new projects start with guardrails disabled, so enable suitable policies there and begin in observe mode. Requests use safe refusals for configured blocks, while AgentGuard service failures fail open.

The prompt-injection, toxicity, and ML-based PII detectors require Python 3.13 or earlier; the `guardrails` extra is installed automatically on those versions. On Python 3.14, tracing and the SDK's non-ML guardrails remain available, but those ML detectors are not installed.

`AGENTGUARD_CAPTURE_CONTENT=true` records prompts and responses in traces. Set it to `false` in `.env` if chat content may contain sensitive information or should not be retained.

## Checks

Run `npm run lint`, `npm run build`, and `python -m compileall backend` before deploying.
