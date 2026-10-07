import os
from uuid import UUID

import agentguard
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from openai import APIError, AsyncOpenAI
from pydantic import BaseModel, Field

load_dotenv(".env.local")
load_dotenv(".env")

agentguard_settings = (
    "AGENTGUARD_PUBLIC_KEY",
    "AGENTGUARD_SECRET_KEY",
    "AGENTGUARD_BASE_URL",
    "AGENTGUARD_PROJECT_ID",
)
if all(os.getenv(name, "").strip() for name in agentguard_settings):
    agentguard.init(
        environment=os.getenv("APP_ENV", "development"),
        fail="open",
    )

app = FastAPI(title="Morrow Chat API")
allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["POST"],
    allow_headers=["Content-Type"],
)


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=6000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    session_id: UUID | None = None 


@app.post("/api/chat")
async def chat(request: ChatRequest) -> JSONResponse:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=503,
            content={"error": "Add your OpenAI API key to .env to start chatting."},
        )

    client = AsyncOpenAI(api_key=api_key)
    try:
        with agentguard.policy(
            session_id=str(request.session_id) if request.session_id else None,
            feature="chat",
            name="morrow-chat",
            fail="open",
            on_block="refuse",
        ):
            response = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are Morrow, a thoughtful and clear conversational assistant. "
                            "Be helpful, warm, and concise. Ask a follow-up when it would genuinely help."
                        ),
                    },
                    *[message.model_dump() for message in request.messages],
                ],
            )
        return JSONResponse(
            content={"message": response.choices[0].message.content or ""}
        )
    except APIError:
        return JSONResponse(
            status_code=502,
            content={"error": "The model could not respond just now. Check your API key and try again."},
        )
    finally:
        await client.close()