"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowUp,
  Bot,
  CircleStop,
  MessageSquareText,
  Plus,
  Sparkles,
} from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const suggestions = [
  "Help me untangle a tricky problem",
  "Explain a concept in plain English",
  "Give me a fresh idea to explore",
];

const chatApiUrl =
  process.env.NEXT_PUBLIC_CHAT_API_URL ?? "http://localhost:8000/api/chat";

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const endOfMessages = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, prompt?: string) {
    event?.preventDefault();
    const content = (prompt ?? draft).trim();
    if (!content || isLoading) return;

    const nextMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(chatApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, session_id: sessionId }),
      });
      const result: { message?: string; error?: string } = await response.json();
      if (!response.ok || !result.message) {
        throw new Error(result.error ?? "The reply could not be loaded.");
      }
      setMessages([...nextMessages, { role: "assistant", content: result.message }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
      composer.current?.focus();
    }
  }

  function startNewChat() {
    setMessages([]);
    setSessionId(crypto.randomUUID());
    setDraft("");
    setError("");
    composer.current?.focus();
  }

  return (
    <main className="chat-shell">
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="Morrow home">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.2} /></span>
          <span>morrow</span>
        </Link>
        <button className="new-chat-button" onClick={startNewChat} type="button">
          <Plus size={17} />
          <span>New conversation</span>
        </button>
        <div className="sidebar-rule" />
        <div className="sidebar-label">YOUR SPACE</div>
        <div className="empty-history">
          <MessageSquareText size={17} />
          <span>Your conversations will appear here.</span>
        </div>
        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Ready when you are</span>
        </div>
      </aside>

      <section className="chat-main" aria-label="Chat">
        <header className="topbar">
          <div className="model-label"><span className="model-dot" /> Morrow <span className="model-version">PREVIEW</span></div>
          <div className="topbar-note">A little room to think</div>
        </header>

        <div className={`conversation ${messages.length ? "has-messages" : "is-empty"}`}>
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-kicker"><span /> A CONVERSATION, NOT A SEARCH BOX</div>
              <h1>What’s on<br />your mind<span className="title-period">?</span></h1>
              <p>Bring a question, a half-formed thought, or a problem you haven’t quite named yet.</p>
              <div className="suggestion-list">
                {suggestions.map((suggestion, index) => (
                  <button key={suggestion} className="suggestion" onClick={() => void sendMessage(undefined, suggestion)} type="button">
                    <span className="suggestion-index">0{index + 1}</span>
                    <span>{suggestion}</span>
                    <ArrowUp className="suggestion-arrow" size={15} />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-list" aria-live="polite">
              {messages.map((message, index) => (
                <article className={`message message-${message.role}`} key={`${index}-${message.role}`}>
                  <div className={`message-avatar ${message.role}`}>
                    {message.role === "assistant" ? <Sparkles size={16} /> : "Y"}
                  </div>
                  <div className="message-content">
                    <div className="message-author">{message.role === "assistant" ? "Morrow" : "You"}</div>
                    <p>{message.content}</p>
                  </div>
                </article>
              ))}
              {isLoading && (
                <article className="message message-assistant">
                  <div className="message-avatar assistant"><Sparkles size={16} /></div>
                  <div className="message-content">
                    <div className="message-author">Morrow</div>
                    <div className="thinking" aria-label="Thinking"><span /><span /><span /></div>
                  </div>
                </article>
              )}
              <div ref={endOfMessages} />
            </div>
          )}
        </div>

        <div className="composer-area">
          {error && <p className="error-message" role="alert">{error}</p>}
          <form className="composer" onSubmit={sendMessage}>
            <textarea
              aria-label="Message Morrow"
              ref={composer}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Write whatever’s on your mind..."
              rows={1}
              maxLength={6000}
            />
            <button className="send-button" type="submit" disabled={!draft.trim() || isLoading} aria-label={isLoading ? "Sending message" : "Send message"} title={isLoading ? "Sending" : "Send message"}>
              {isLoading ? <CircleStop size={17} /> : <ArrowUp size={18} strokeWidth={2.4} />}
            </button>
          </form>
          <div className="composer-caption">Morrow can make mistakes. Trust your judgment on the important stuff.</div>
        </div>
      </section>
      <div className="mobile-brand"><Bot size={15} /> Morrow</div>
    </main>
  );
}
